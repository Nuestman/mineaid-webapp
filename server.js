const express = require('express');
const ejs = require('ejs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session'); // Added session support
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport'); // Added passport
const LocalStrategy = require('passport-local').Strategy; // Local Strategy for authentication
const nodemailer = require('nodemailer'); // Nodemailer for sending emails
const bcrypt = require('bcryptjs'); // For hashing passwords
const flash = require('connect-flash'); // Add this line to import connect-flash
const db = require('./database/mineaid');  // Load the database setup
const crypto = require('crypto');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware setup
app.use(express.static(path.join(__dirname, 'public'))); // For static assets like CSS and JS
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Make 'USER' available in all templates.
app.use((req, res, next) => {
    res.locals.user = req.user || null;  // Make user available in all templates
    next();
});

require('dotenv').config();
//make variable globally accessible
global.loggedIn = false //default value is false


// Express session middleware
app.use(session({
    secret: 'mineaidlovescookies',           // Use a strong secret
    resave: false,                        // Avoids resaving the session on every request
    saveUninitialized: false,             // Only saves sessions when they are modified
    store: new SQLiteStore({ db: 'sessions.sqlite', concurrentDB: true }), // Database file for sessions
    cookie: {
        secure: false,                    // Set to `true` if using HTTPS in production
        maxAge: 30 * 60 * 1000       // Set session cookie expiration time to 30mins 
    },
    rolling: true // Resets the session expiration on each request
}));

// Flash message middleware setup
app.use(flash());

// Use flash with session - Flash message setup in middleware
// Custom middleware to make flash messages accessible in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // For passport error messages
    next();
});


// Initialize passport and session handling
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy for login
// Passport Local Strategy for authentication
passport.use(new LocalStrategy(
    (username, password, done) => {
         // Retrieve the user from the database by username
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
            if (err) return done(err);

            // Check if user exists
            if (!user) return done(null, false, { message: 'No user found with that username. Please Register.' });
            
            // Check user status - restrict if pending or blocked
            if (user.status === 'Pending') {
                return done(null, false, { message: 'Your account is pending approval. Contact Admin.' });
            }
            if (user.status === 'Blocked') {
                console.log('Your account  is blocked')
                return done(null, false, { message: 'Your account has been blocked. Contact Admin.' });
            }
    
            // Verify password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) return done(err);

                if (isMatch) {
                    console.log('User authenticated successfully:', username);
                    return done(null, user); // Pass user if password matches
                } else {
                    return done(null, false, { message: 'Incorrect password.' });
                }
            });
        });
    }
));

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// Multer Configuration

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'public/uploads/';

        // Determine subdirectory based on route or field name
        if (file.fieldname === 'profilePic') {
            uploadPath += 'profile-pics/';
        } else if (file.fieldname === 'itemImage') {
            uploadPath += 'item-images/';
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});


// 4. Optional: Refactor for Multiple Upload Types

// If you anticipate handling more types of uploads in the future, you can generalize the logic for better scalability. For instance, pass the subdirectory or field-specific logic as options to a helper function:

// const createMulterConfig = (subDir) => {
//     return multer({
//         storage: multer.diskStorage({
//             destination: (req, file, cb) => {
//                 const uploadPath = `public/uploads/${subDir}`;
//                 cb(null, uploadPath);
//             },
//             filename: (req, file, cb) => {
//                 cb(null, `${Date.now()}-${file.originalname}`);
//             }
//         }),
//         fileFilter,
//         limits: { fileSize: 5 * 1024 * 1024 } // 5MB
//     });
// };

// // Create separate upload configurations
// const uploadProfilePic = createMulterConfig('profile-pics');
// const uploadItemImage = createMulterConfig('item-images');

// // Use them in routes
// app.post('/profile/upload-pic', uploadProfilePic.single('profilePic'), ...);
// app.post('/inventory/add-new-item', uploadItemImage.single('itemImage'), ...);



// Filter for image uploads only
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed.'));
    }
};

// Configure multer middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Route: Show User Profile Update Form
app.get('/users/user-update', (req, res) => {
    res.render('users/user-update', { user: req.user });
});

// Route to add Socials
app.post('/profile/update-social', (req, res) => {
    const { linkedInAccount, githubAccount } = req.body;
    const userId = req.user.user_id;

    // Helper function to save or update an account link
    const saveOrUpdateAccount = (platform, url) => {
        if (url) {
            db.get(`SELECT * FROM connected_accounts WHERE user_id = ? AND platform = ?`, [userId, platform], (err, row) => {
                if (err) {
                    console.error(`Error checking ${platform} account:`, err);
                    req.flash('error_msg', `Error checking ${platform} account.`);
                } else if (row) {
                    // Update existing record if it already exists
                    db.run(`UPDATE connected_accounts SET url = ?, linkedAt = CURRENT_TIMESTAMP WHERE id = ?`, [url, row.id], (err) => {
                        if (err) {
                            console.error(`Error updating ${platform} account:`, err);
                            req.flash('error_msg', `Error updating ${platform} account.`);
                        } else {
                            console.log(`${platform} account updated successfully.`);
                            req.flash('success_msg', `${platform} account updated successfully.`);
                        }
                    });
                } else {
                    // Insert new record
                    db.run(`INSERT INTO connected_accounts (user_id, platform, url) VALUES (?, ?, ?)`, [userId, platform, url], (err) => {
                        if (err) {
                            console.error(`Error connecting ${platform} account:`, err);
                            req.flash('error_msg', `Error connecting ${platform} account.`);
                        } else {
                            console.log(`${platform} account linked successfully.`);
                            req.flash('success_msg', `${platform} account linked successfully.`);
                        }
                    });
                }
            });
        } else {
            console.log(`No URL provided for ${platform}.`);
        }
    };

    // Process each account separately
    saveOrUpdateAccount('LinkedIn', linkedInAccount);
    saveOrUpdateAccount('GitHub', githubAccount);

    // Redirect back to profile with flash messages
    res.redirect('/users/user-profile');
});



// Route: Profile Picture Upload
app.post('/profile/upload-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) {
        req.flash('error_msg', 'Please upload a valid image.');
        return res.redirect('/users/user-update');
    }

    // Update profilePicUrl in the database
    const profilePicUrl = `/uploads/profile-pics/${req.file.filename}`;
    db.run(`UPDATE users SET profilePicUrl = ? WHERE id = ?`, [profilePicUrl, req.user.id], (err) => {
        if (err) {
            req.flash('error_msg', 'Error updating profile picture.');
            return res.redirect('/users/user-update');
        }
        req.flash('success_msg', 'Profile picture updated successfully.');
        res.redirect('/users/user-profile');
    });
});

// Route: Update Contact Number
app.post('/profile/update-contact', (req, res) => {
    const { contactNumber } = req.body;
    db.run(`UPDATE users SET contactNumber = ? WHERE id = ?`, [contactNumber, req.user.id], (err) => {
        if (err) {
            req.flash('error_msg', 'Error updating contact number.');
            return res.redirect('/users/user-update');
        }
        req.flash('success_msg', 'Contact number updated successfully.');
        res.redirect('/users/user-profile');
    });
});

// Route: Update Password
app.post('/profile/update-password', (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match.');
        return res.redirect('/users/user-update');
    }

    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
            req.flash('error_msg', 'Error updating password.');
            return res.redirect('/users/user-update');
        }

        db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, req.user.id], (err) => {
            if (err) {
                req.flash('error_msg', 'Error saving new password.');
                return res.redirect('/users/user-update');
            }
            req.flash('success_msg', 'Password updated successfully.');
            res.redirect('/users/user-profile');
        });
    });
});

// Route: Update Notification Preferences
app.post('/profile/update-notifications', (req, res) => {
    const notifications = req.body.notifications === 'on' ? 1 : 0;

    db.run(`UPDATE users SET notifications = ? WHERE id = ?`, [notifications, req.user.id], (err) => {
        if (err) {
            req.flash('error_msg', 'Error updating notification preferences.');
            return res.redirect('/users/user-update');
        }
        req.flash('success_msg', 'Notification preferences updated.');
        res.redirect('/users/user-profile');
    });
});

// Theme Update Route: Add a route to handle theme changes:
app.post('/profile/update-theme', (req, res) => {
    const userId = req.user.id;
    const { theme } = req.body;
    db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, userId], function(err) {
        if (err) {
            req.flash('error_msg', 'Could not update theme.');
            return res.redirect('/users/user-update');
        }
        req.flash('success_msg', 'Theme updated successfully!');
        res.redirect('/users/user-profile');
    });
});

// Activity Logging Middleware
function logActivity(req, res, next) {
    if (req.user) { // Log only if user is authenticated
        const userId = req.user.user_id;
        const currentPost = req.session.current_post;
        const activity = `${req.method} ${req.originalUrl}`;
        db.run('INSERT INTO recent_activities (user_id, post_location, activity, timestamp) VALUES (?, ?, ?, datetime("now", "localtime"))',
            [userId, currentPost, activity],
            (err) => {
                if (err) console.error('Activity log failed:', err);
            });
    }
    next();
}
app.use(logActivity); // Apply globally, or to specific routes if preferred


// LOGIN/LOGOUT TOGGLER
// Middleware to Track Login State and Pass User Data
app.use((req, res, next) => {
    res.locals.loggedIn = req.isAuthenticated(); // `true` if user is authenticated, `false` otherwise
    console.log(req.isAuthenticated());
    console.log(req.body);
    res.locals.user = req.user || {}; // Provide user data to the views
    next();
});




// Route: Home (index)
app.get('/', (req, res) => {
    res.render('landing-page'); 
});

// Route: Coming Soon
app.get('/coming-soon', (req, res) => {
    res.render('coming-soon'); 
});


// TRIAGE BOOK
// Route: Triage (GET) form page
app.get('/triage', attachPostFilter, (req, res) => {
    const userPost = res.locals.post || ''; // Fetch from session or DB
    res.render('triage', { userPost }); // This will render triage.ejs (the form page)
});

// Route to handle form submission 
app.post('/triage', attachPostFilter, (req, res) => {
    const { post_location, date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, condition, reporting } = req.body;
    
    const userId = req.user.user_id; // From authentication middleware
    const currentPost = req.session.current_post; // From session middleware
    
    const entry_by = req.user.user_id; // Or req.user.user_id if using a foreign key
    const query = `INSERT INTO triagebook (post_location, entry_id, date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, condition, reporting, entry_by) 
    VALUES (?, (SELECT 'tri-0' || IFNULL(MAX(rowid) + 1, 0) FROM triagebook), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [post_location, date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, condition, reporting, entry_by], function(err) {
        if (err) {
            console.error('Error inserting into triagebook:', err.message);
            res.status(500).render('error/error', { message: 'Submission failed' });
        }

            // Log the update action into recent_activities
            const activity = `Added a new triagebook entry.`;
            db.run(
                'INSERT INTO recent_activities (user_id, post_location, activity, timestamp) VALUES (?, ?, ?, datetime("now", "localtime"))',
                [userId, currentPost, activity],
                (err) => {
                    if (err) {
                        console.error('Activity log failed:', err);
                    }
                }
            );
            // Log user activity
            const logActivityQuery = `
            INSERT INTO user_activity_logs (user_id, action, table_name, record_id, logged_by)
            VALUES (?, ?, ?, ?, ?)
            `;

            db.run(
                logActivityQuery,
                [req.user.user_id, activity, 'triagebook', 'entry_id', req.user.username],
                (logErr) => {
                    if (logErr) {
                        console.error('Error logging activity:', logErr.message);
                        req.flash('error_msg', 'Triage entry submitted, but activity log failed.');
                        console.log('error_msg', 'Triage entry submitted, but activity log failed.');
                    } else {
                        req.flash('success_msg', `Triage entry ${name} submitted successfully.`);
                        res.render('success', { title: 'Triage Submission Successful' });
                    }
                }
            );
        });
});

// Route to display triage book
app.get('/triage-book', attachPostFilter, (req, res) => {
    const query = 'SELECT * FROM triagebook';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching triagebook records:', err.message);
            res.status(500).render('error', { message: 'Error fetching records' });
        } else {
            res.render('triage-book', { triagebook: rows });
        }
    });
});

// INCIDENT REPORTING
// Display incident form
app.get('/incident-form', attachPostFilter, (req, res) => {
    const userPost = res.locals.post || ''; // Fetch from session or DB
    res.render('incident-form', { userPost });
})

// Route to handle incident form submission 
app.post('/incident/submit', attachPostFilter, (req, res) => {
    
    const { post_location, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reporting } = req.body;

    const userId = req.user.user_id; // From authentication middleware
    const currentPost = req.session.current_post; // From session middleware
    
    // Convert reporting checkboxes to a single string, if multiple are selected
    const reportingStr = Array.isArray(reporting) ? reporting.join(', ') : reporting;

    const entry_by = req.user.user_id;
    const query = `INSERT INTO incident_book (post_location, entry_id, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reporting, entry_by) 
    VALUES (?, (SELECT 'inci-0' || IFNULL(MAX(rowid) + 1, 0) FROM incident_book), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [post_location, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reportingStr, entry_by], function(err) {
        if (err) {
            console.error('Error inserting into incident_book:', err.message);
            res.status(500).render('error/500', { message: 'Incident submission failed' });
        } 
        
        
            // Log the update action into recent_activities
            const activity = `Added a new incident_book entry.`;
            db.run(
                'INSERT INTO recent_activities (user_id, post_location, activity, timestamp) VALUES (?, ?, ?, datetime("now", "localtime"))',
                [userId, currentPost, activity],
                (err) => {
                    if (err) {
                        console.error('Activity log failed:', err);
                    }
                }
            );
            // Log user activity
            const logActivityQuery = `
            INSERT INTO user_activity_logs (user_id, action, table_name, record_id, logged_by)
            VALUES (?, ?, ?, ?, ?)
            `;

            db.run(
                logActivityQuery,
                [req.user.user_id, activity, 'incident_book', 'entry_id', req.user.username],
                (logErr) => {
                    if (logErr) {
                        console.error('Error logging activity:', logErr.message);
                        req.flash('error_msg', 'Incident entry submitted, but activity log failed.');
                        console.log('error_msg', 'Incident entry submitted, but activity log failed.');
                    } else {
                        req.flash('success_msg', `Incident entry ${name} submitted successfully.`);
                        res.render('success', { title: 'Incident Submission Successful' });
                    }
                }
            );
        });
});

// Route to display incident book
app.get('/incident-book', ensureAuthenticated, ensureAdmin, attachPostFilter, (req, res) => {
    const query = 'SELECT * FROM incident_book ORDER BY incident_date DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching incident records:', err.message);
            res.status(500).render('error', { message: 'Error fetching incident records' });
        } else {
            res.render('incident-book', { title: 'Incident Records', incidents: rows });
        }
    });
});



// USER REGISTRATION AND LOGIN

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
}

// Middleware to ensure the user has Admin access (Admin or Superuser)
function ensureAdmin(req, res, next) {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Superuser')) {
        return next();
    }
    req.flash('error_msg', 'Admin access required. Contact admin.');
    res.redirect('/contact');
}
// Middleware to ensure the user is a Superuser
function ensureSuperuser(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'Superuser') {
        return next();
    }
    console.log('Superuser access denied: User role is', req.user ? req.user.role : 'undefined');
    req.flash('error_msg', 'You are not authorized to view this page. Contact admin..');
    res.redirect('/contact');
}


// Nodemailer setup for sending emails after user approval
// Configure the transporter (Initialize only once)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000, // 1 minute
  });
//   Verify the SMTP Setup and log results
  transporter.verify().then(console.log('True: Transporter setup successful.')).catch(console.error);


// Route: Add Category Page (GET)
app.get('/inventory/add-inventory-category', (req, res) => {
    res.render('inventory/add-inventory-category'); // Add Category form page
});

// Route: Add Category (POST)
app.post('/inventory/add-inventory-category', (req, res) => {
    const { name, description } = req.body;

    db.run(`
        INSERT INTO inventory_categories (name, description)
        VALUES (?,?)`,
        [name, description],
        function (err) {
            if (err) {
                console.error("Error adding category:", err);
                return res.status(500).send("Failed to add category.");
            }
            req.flash('success_msg', 'Category added successfully!');
            res.redirect('/inventory'); // Redirect to the main inventory dashboard
        }
    );
});

// Route: Login (GET)
app.get('/login', (req, res) => {
    // Only set returnTo if it’s not already set, to avoid overwriting
    if (!req.session.returnTo && req.headers.referer) {
        req.session.returnTo = req.headers.referer;
    }
    res.render('login', { errors: [] });
});

app.post('/login', (req, res, next) => {
    // Route: Login (POST) - Handles login form submission
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return next(err); // Handle unexpected errors
        }

        if (!user) {
            // Authentication fails, log and set flash message
            console.log('Authentication failed. Info message:', info.message);
            req.flash('error_msg', info.message);

            // Redirect based on specific failure messages
            if (info.message === 'Your account is pending approval. Contact Admin.') {
                console.log('Redirecting to /contact (pending approval)');
                return res.redirect('/contact');
            } else if (info.message === 'Your account has been blocked. Contact Admin.') {
                console.log('Redirecting to /contact (account blocked)');
                return res.redirect('/contact');
            } else if (info.message === 'No user found with that username. Please Register.') {
                console.log('Redirecting to /register (no user found)');
                return res.redirect('/register');
            } else {
                console.log('Redirecting to /register (default case)');
                return res.redirect('/register');
            }
        }

        // If authentication and status checks pass, log the user in
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error after authentication:', err);
                return next(err);
            }
            // Update last login
            db.run('UPDATE users SET lastLogin = datetime("now", "localtime") WHERE id = ?', [user.id], (err) => {
                if (err) console.error('Failed to update last login:', err);
            });
            // Set success message upon successful login
            req.flash('success_msg', 'Successfully logged in!');
            console.log('User logged in successfully:', req.user.username);

            // Redirect to the original URL or fallback to dashboard
            const redirectUrl = req.session.returnTo || '/dashboard';
            console.log('Session ID on login:', req.sessionID);
            console.log('Redirecting to:', redirectUrl);
            delete req.session.returnTo; // Clean up the session
            res.redirect(redirectUrl); console.log(redirectUrl);
        });
    })(req, res, next);
});

