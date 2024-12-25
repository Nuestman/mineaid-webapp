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
    res.redirect('/error/403');
}
// Middleware to ensure the user is a Superuser
function ensureSuperuser(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'Superuser') {
        return next();
    }
    console.log('Superuser access denied: User role is', req.user ? req.user.role : 'undefined');
    req.flash('error_msg', 'You are not authorized to view this page. Contact admin..');
    res.redirect('/error/403');
}

// Middleware: Ensure Post is Selected & Filter Queries
function attachPostFilter(req, res, next) {
    // Define excluded routes with patterns
    const excludedRoutes = [
        '/landing-page',
        '/register',
        '/',
        '/iaid',
        '/isoup',
        '/iemerge',
        '/imanage',
        '/login',
        '/post-selection',
        '/about',
        '/contact',
        '/reset-request',
    ];

    // Add pattern-based exclusion for dynamic routes
    const excludedRoutePatterns = [/^\/reset\/[a-f0-9]{64}$/]; // Matches /reset/:token with a 64-character hex token

    // Attach a default `current_post` to avoid template errors
    res.locals.current_post = req.session.current_post || null;

    // Skip middleware for excluded routes
    if (
        excludedRoutes.includes(req.path) || 
        req.path.startsWith('/static') || 
        excludedRoutePatterns.some(pattern => pattern.test(req.path))
    ) {
        console.log(`Processing path: ${req.path} (Excluded: true)`);
        return next();
    }

    console.log(`Processing path: ${req.path} (Excluded: false)`);
    console.log(`Current post: ${req.session.current_post}`);

    // Check if `current_post` is in the session
    if (!req.session.current_post) {
        req.flash('error_msg', 'Please select your post before proceeding.');
        console.log('Redirecting: Please select your post before proceeding.');
        return res.redirect('/post-selection');
    }

    // Attach `current_post` to `req` for use in backend processing
    req.postLocation = req.session.current_post;

    next();
}

app.use(attachPostFilter);


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
        const currentPost = req.postLocation;
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
            const activity = `Added a new triagebook entry`;
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
                [userId, activity, 'triagebook', 'entry_id', req.user.username],
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
            const activity = `Added a new incident_book entry`;
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
            INSERT INTO user_activity_logs (user_id, post_location, action, table_name, record_id, logged_by)
            VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.run(
                logActivityQuery,
                [userId, post_location, activity, 'incident_book', 'entry_id', req.user.username],
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

// Test the connection
// transporter.verify((error, success) => {
//     if (error) {
//       console.log('Error setting up SMTP transporter:', error);
//     } else {
//       console.log('SMTP transporter configured successfully:', success);
//     }
//   });
//   const mailOptions = {
//     from: process.env.SMTP_USER,
//     to: 'nuestman17@gmail.com',
//     subject: 'Test Email',
//     text: 'This is a test email to confirm SMTP configuration!',
//   };
  
//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       return console.log('Error sending test email:', error);
//     }
//     console.log('Test email sent successfully:', info.response);
//   });

//end SMTP Settings. Please don't delete commented code above. They're for testing.
  

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


/* -----------------POST MANAGEMENT--------------------- */
// // Middleware: Ensure Post Location is Selected
// // Middleware to check and set the user's working post
// function ensurePostSelected(req, res, next) {
//     if (!req.session.current_post) {
//         req.flash('error_msg', 'Please select your post before proceeding.');
//         return res.redirect('/post-selection');
//     }
//  // Redirect if post is not selected
//     res.locals.post = req.session.post; // Make post available to views
//     next();
// }



// Route: Display Post-Selection Page
app.get('/post-selection', ensureAuthenticated, (req, res) => {
    res.render('post-selection', { posts: ['ODD', 'STP', 'KMS', 'GCS', 'EMS', 'AGAHF-ED', 'AGAHF-Sup', 'Nurse-Manager'] });
});

// Route: Handle Post Selection
app.post('/post-selection', ensureAuthenticated, (req, res) => {
    const { selected_post } = req.body;

    // Validate the selected post
    const validPosts = ['ODD', 'STP', 'KMS', 'GCS', 'EMS', 'AGAHF-ED', 'AGAHF-Sup', 'Nurse-Manager'];
    if (!validPosts.includes(selected_post)) {
        req.flash('error_msg', 'Invalid post selected. Please try again.');
        return res.redirect('/post-selection');
    }

    // Save selected post to session
    req.session.current_post = selected_post;

    req.flash('success_msg', `Welcome, You are now logged into ${selected_post}.`);
    // Redirect to the post-specific dashboard
    if (selected_post === 'AGAHF-Sup') {
        res.redirect(`/isoup-dashboard`);
    } else 
    if (selected_post === 'AGAHF-ED') {
        res.redirect(`/iemerge/dashboard`);
    } else
    if (selected_post === 'Nurse-Manager') {
        res.redirect(`/imanage-dashboard`);
    } else
    res.redirect(`/dashboard`);
});




/* ------------------END OF POST MGT */


// Route: Register (GET)
app.get('/register', (req, res) => {
    res.render('register'); // register.ejs
});

// Route: Register (POST) - Handles registration form submission
app.post('/register', (req, res) => {
    console.log(req.body);
    const { user_id, firstname, surname, email, username, password, confirm_password } = req.body;
    let validationError = null;

    // Server-side validations
    if (!user_id || !firstname || !surname || !email || !username || !password || !confirm_password) {
        validationError = 'Please fill in all fields';
    } else if (password !== confirm_password) {
        validationError = 'Passwords do not match';
    } else if (password.length < 6) {
        validationError = 'Password should be at least 6 characters';
    }

    // Return early if there's a validation error
    if (validationError) {
        req.flash('error_msg', validationError);
        console.log('Validation error:', validationError);  // Log the specific error message
        return res.redirect('/register');
    }

    // Check if email or username already exists
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            req.flash('error_msg', 'An error occurred. Please try again.');
            return res.redirect('/register');
        }
        if (user) {
            req.flash('error_msg', 'Username or Email already exists.');
            return res.redirect('/register');
        }

        // Hash password and insert user into database
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                console.error('Bcrypt error:', err.message);
                req.flash('error_msg', 'An error occurred. Please try again.');
                return res.redirect('/register');
            }
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) {
                    console.error('Bcrypt error:', err.message);
                    req.flash('error_msg', 'An error occurred. Please try again.');
                    return res.redirect('/register');
                }

                // Insert new user into the database
                const query = 'INSERT INTO users (user_id, firstname, surname, email, username, password) VALUES (?, ?, ?, ?, ?, ?)';
                db.run(query, [user_id, firstname, surname, email, username, hash], function (err) {
                    if (err) {
                        console.error('Database error:', err.message);
                        req.flash('error_msg', 'Registration failed. Please try again.');
                        return res.redirect('/register');
                    }

                    
                    // Send notification email to MineAid
                    const mailOptions = {
                        from: process.env.SMTP_USER,
                        to: 'mineaid.notifications@gmail.com, nuestman17@gmail.com', // Change to your notification email
                        subject: 'New User Registration Awaiting Approval',
                        html: `
                            <h1>A new user has registered on MineAid and is awaiting approval:</h1>
                            <ul>
                                <li><strong>Staff ID:</strong> ${user_id}</li>
                                <li><strong>First Name:</strong> ${firstname}</li>
                                <li><strong>Last Name:</strong> ${surname}</li>
                                <li><strong>Email:</strong> ${email}</li>
                                <li><strong>Username:</strong> ${username}</li>
                            </ul>
                        `,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error.message);
                        } else {
                            console.log('Notification email sent:', info.response);
                        }
                    });

                    req.flash('success_msg', 'You are registered and can log in');
                    res.redirect('/login');
                });
            });
        });
    });
});




// USER PROFILE AND LOGOUT ROUTES:
// Route: User Profile (GET)
app.get('/users/user-profile', (req, res) => {
    // Fetch user data from session or DB
    const userId = req.user.user_id;
    if (!userId) {
        console.log('Please log in.');
        return res.redirect('/login');
    }
    
    db.all('SELECT activity, timestamp FROM recent_activities WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5', [userId], (err, recent_activity) => {
        if (err) {
            console.error('Error fetching recent activities:', err);
            recent_activity = [];
        }

        db.all('SELECT platform, url, linkedAt FROM connected_accounts WHERE user_id = ?', [userId], (err, connected_accounts) => {
            if (err) {
                console.error('Error fetching connected accounts:', err);
                connected_accounts = [];
            }

            res.render('users/user-profile', {
                user: req.user,
                recent_activity,
                connected_accounts
            });
        });
    });
});

// Route: Logout (GET)
app.get('/logout', (req, res) => {
    req.logout(() => {
        req.flash('success_msg', 'You have logged out.');
        res.redirect('login'); // Redirect to home or any other page
    });
});



// Route: Dashboard (GET)
// Dashboard route (requires login)
app.get('/dashboard', ensureAuthenticated, attachPostFilter, async (req, res) => {
    try {
        const current_post = req.session.current_post; // Assuming a session variable for the current post

        // Fetch recent activities
        const recent_activity = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM user_activity_logs ORDER BY timestamp DESC LIMIT 5`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Fetch statistics
        const statistics = await new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    (SELECT COUNT(*) FROM triagebook WHERE strftime('%m', date) = strftime('%m', 'now')) AS triageEntries,
                    (SELECT COUNT(*) FROM triagebook) AS totalTriageEntries,
                    (SELECT COUNT(*) FROM incident_book WHERE strftime('%m', incident_date) = strftime('%m', 'now')) AS incidents,
                    (SELECT COUNT(*) FROM incident_book WHERE strftime('%Y', incident_date) = '2024') AS ytdIncidents,
                    (SELECT COUNT(*) FROM users WHERE strftime('%m', created_at) = strftime('%m', 'now')) AS newUsers,
                    (SELECT COUNT(*) FROM users) AS totalUsers
                `,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // Render the dashboard
        res.render('dashboard', {
            recent_activity,
            statistics,
            user: req.user,
            current_post,
        });
    } catch (error) {
        console.error('Error loading dashboard:', error.message);
        req.flash('error', 'Unable to load dashboard. Please try again.');
        res.redirect('/');
    }
});

//Without Async/await
// app.get('/dashboard', ensureAuthenticated, attachPostFilter, (req, res) => {
//     const current_post = req.session.current_post;// Assuming you have a session variable for the current post
    
//     // Fetch all users from DB    
//     // Fetch recent activities
//     db.all(`SELECT * FROM user_activity_logs ORDER BY timestamp DESC LIMIT 5`, (err, recent_activity) => {
//         if (err) return console.error(err.message);


//             // Fetch statistics (modify based on your data requirements)
//             db.get(`SELECT 
//                     (SELECT COUNT(*) FROM triagebook WHERE strftime('%m', date) = strftime('%m', 'now')) AS triageEntries,
//                     (SELECT COUNT(*) FROM triagebook ) AS totalTriageEntries,
//                     (SELECT COUNT(*) FROM incident_book WHERE strftime('%m', incident_date) = strftime('%m', 'now')) AS incidents,
//                     (SELECT COUNT(*) FROM incident_book WHERE incident_date INCLUDES '2024')) AS ytdIncidents,
//                     (SELECT COUNT(*) FROM users WHERE strftime('%m', created_at) = strftime('%m', 'now')) AS newUsers,
//                     (SELECT COUNT(*) FROM users ) AS totalUsers
//                     `, (err, statistics) => {
//                 if (err) return console.error(err.message);

//                 // Render the admin-users page
//                 res.render('dashboard', { recent_activity,  statistics, user: req.user, current_post });
//             });

//     });
// });
// app.get('/dashboard', ensurePostSelected, (req, res) => {
//     const currentPost = req.session.current_post;

//     const query = `
//         SELECT * FROM recent_activities WHERE post_location = ?
//     `;
//     db.all(query, [currentPost], (err, rows) => {
//         if (err) {
//             console.error('Error fetching dashboard data:', err.message);
//             req.flash('error_msg', 'Unable to load dashboard.');
//             return res.redirect('/');
//         }

//         res.render('dashboard', {
//             recent_activity: rows,
//             currentPost, // Pass the current post to the frontend
//         });
//     });
// });


// Route for the admin page (only for authenticated users)
app.get('/admin', ensureAuthenticated, ensureAdmin,  (req, res) => {
    db.all('SELECT * FROM triagebook', (err, rows) => {
        if (err) {
            console.error('Error fetching records:', err.message);
            res.send('Failed to retrieve records.');
        } else {
            res.render('admin', { records: rows });
        }
    });
});

// Protect Senior Admin routes with ensureSuperuser
app.get('/admin/super-user', ensureSuperuser, attachPostFilter, (req, res) => {
    // Fetch all users from DB    
    const query = 'SELECT * FROM users'; 
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).render('error/error', { message: 'Error fetching users' });
        } else {
            res.render('admin/super-user', { title: 'Manage Users', users: rows }); 
            console.log('Senior Admin page: Users fetched successfully.')
        }
    });
});

app.get('/admin/admin-home', ensureAuthenticated, ensureAdmin, attachPostFilter, (req, res) => {
    // Fetch all users from DB    
    // Fetch recent activities
    db.all(`SELECT activity FROM recent_activities ORDER BY timestamp DESC LIMIT 5`, (err, recent_activity) => {
        if (err) return console.error(err.message);


            // Fetch statistics (modify based on your data requirements)
            db.get(`SELECT 
                    (SELECT COUNT(*) FROM triagebook WHERE strftime('%m', date) = strftime('%m', 'now')) AS triageEntries,
                    (SELECT COUNT(*) FROM incident_book WHERE strftime('%m', incident_date) = strftime('%m', 'now')) AS incidents,
                    (SELECT COUNT(*) FROM users WHERE strftime('%m', created_at) = strftime('%m', 'now')) AS newUsers
                    `, (err, statistics) => {
                if (err) return console.error(err.message);

                // Render the admin-users page
                res.render('admin/admin-home', { recent_activity,  statistics, user: req.user });
            });

    });

});

// Route: View All Users (GET)
app.get('/admin/users', ensureAuthenticated, ensureAdmin, (req, res) => {
// Fetch all users from DB    
    const query = 'SELECT * FROM users'; 
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).render('error/error', { message: 'Error fetching users' });
        } else {
            res.render('admin/users', { title: 'Manage Users', users: rows }); 
            console.log('Users fetched successfully.')
        }
    });
});




// Route to approve a user
app.get('/admin/approve/:id', ensureAuthenticated, ensureAdmin, ensureSuperuser, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET status = ? WHERE user_id = ?', ['Approved'.trim(), userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error approving user' });
        }

        // Fetch the user details for sending email
        db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'User approved, but email sending failed' });
            }

            console.log('Sending email to:', user.email); // Check the email being sent
            // Send an approval email
            const mailOptions = {
                from: 'nuestman17@gmail.com',
                to: `${user.email}`, // Email of the approved user
                subject: 'Account Approved',
                text: `Hello ${user.firstname}, your account has been approved. 
                Reminder: To ensure you don’t miss any future notifications, please add "MineAid Obuasi Notifications" to your address book. 
                You can add us directly by clicking this link: https://drive.google.com/file/d/14qWlIPpg6SCvb9HarFQ23NX8X4ocJq_b/view?usp=sharing`
            };

            console.log('Preparing to send email...');
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    req.flash('error_msg', 'User approved, but email notification failed.');
                    console.error('Error sending email:', error);
                    return res.status(500).json({ message: 'User approved, but email sending failed' });
                }
                console.log('Email sent successfully:', info.response);
                req.flash('success_msg', 'User approved successfully and email sent!');
                res.redirect('/admin/users'); // Redirect here after handling email
            });
        });
    });
});
// Route to make a user an Admin
app.get('/admin/make-admin/:id', ensureAuthenticated, ensureSuperuser, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET role = ? WHERE id = ?', ['Admin'.trim(), userId], (err) => {
        if (err) {
            console.log('Error approving admin role.')
            req.flash('error_msg', 'Error approving admin role.');
            return res.redirect('/admin/users');
        }
        req.flash('success_msg', 'User has been made an admin successfully');
        res.redirect('/admin/users');
    });
});
// Route to make a user a SuperUser
app.get('/admin/make-super-user/:id', ensureAuthenticated, ensureSuperuser, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET role = ? WHERE id = ?', ['SuperUser'.trim(), userId], (err) => {
        if (err) {
            console.log('Error approving superuser role.')
            req.flash('error_msg', 'Error approving superuser role.');
            return res.redirect('/admin/users');
        }
        req.flash('success_msg', 'User has been made an superuser successfully');
        res.redirect('/admin/users');
    });
});
// Route to make a user a User
app.get('/admin/make-user/:id', ensureAuthenticated, ensureSuperuser, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET role = ? WHERE id = ?', ['User'.trim(), userId], (err) => {
        if (err) {
            console.log('Error approving user role.')
            req.flash('error_msg', 'Error approving user role.');
            return res.redirect('/admin/users');
        }
        req.flash('success_msg', 'User has been made a user successfully');
        res.redirect('/admin/users');
    });
});

// Route to block a user
app.get('/admin/block/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Blocked'.trim(), userId], (err) => {
        if (err) {
            console.log('Error blocking user');
            req.flash('error_msg', 'Error blocking user');
            return res.redirect('/admin/users');
        }
        console.log('User blocked successfully');
        req.flash('success_msg', 'User blocked successfully');
        res.redirect('/admin/users');
    });
});

// Route to unblock a user
app.get('/admin/unblock/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Approved'.trim(), userId], (err) => {
        if (err) {
            req.flash('error_msg', 'Error unblocking user');
            return res.redirect('/admin/users');
        }
        console.log('User unblocked successfully');
        req.flash('success_msg', 'User unblocked successfully');
        res.redirect('/admin/users');
    });
});



/* ------------------------------ EDIT ROUTES -----------------------------------*/

/* TRIAGE EDIT */
// POST route to handle the form submission and update the entry
app.post('/edit/triagebook', (req, res) => {
    const { 
        id, post_location, date, time_of_arrival, company, badge, name, age, 
        gender, incident, complaints, mobility, respiratory_rate, pulse, 
        blood_pressure, temperature, avpu, oxygen_saturation, glucose, 
        pain_score, tews_score, final_triage, detained, treatment_given, 
        disposition, disposition_time, condition, reporting 
    } = req.body; // Extract values from req.body
    itemId = req.params.id;

    const userId = req.user.user_id; // From authentication middleware
    const currentPost = req.session.current_post; // From session middleware

    // Start a transaction to ensure atomicity
    db.serialize(() => {
        // Fetch the old entry
        db.get(`SELECT * FROM triagebook WHERE id = ?`, [id], (err, oldEntry) => {
            if (err) {
                console.error(err);
                req.flash('error_msg', 'An error occurred while fetching the old entry.');
                return res.redirect('/triage-book');
            }

            if (!oldEntry) {
                req.flash('error_msg', 'Entry not found.');
                return res.redirect('/triage-book');
            }

            // Log the old entry into the triagebook_history table
            const columns = Object.keys(oldEntry).join(", ");
            const placeholders = Object.keys(oldEntry).map(() => "?").join(", ");
            const values = Object.values(oldEntry);

            db.run(
                `INSERT INTO triagebook_history (${columns}, date_modified) VALUES (${placeholders}, datetime('now', 'localtime'))`,
                [...values],
                (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('error_msg', 'An error occurred while saving the old entry to history.');
                        return res.redirect('/triage-book');
                    }

                    // Update the entry in the triagebook table
                    db.run(
                        `UPDATE triagebook 
                         SET post_location = ?, date = ?, time_of_arrival = ?, company = ?, 
                             badge = ?, name = ?, age = ?, gender = ?, incident = ?, 
                             complaints = ?, mobility = ?, respiratory_rate = ?, pulse = ?, 
                             blood_pressure = ?, temperature = ?, avpu = ?, oxygen_saturation = ?, 
                             glucose = ?, pain_score = ?, tews_score = ?, final_triage = ?, 
                             detained = ?, treatment_given = ?, disposition = ?, disposition_time = ?, 
                             condition = ?, reporting = ?
                         WHERE id = ?`, 
                        [
                            post_location, date, time_of_arrival, company, badge, name, age, 
                            gender, incident, complaints, mobility, respiratory_rate, pulse, 
                            blood_pressure, temperature, avpu, oxygen_saturation, glucose, 
                            pain_score, tews_score, final_triage, detained, treatment_given, 
                            disposition, disposition_time, condition, reporting, id
                        ],
                        function (err) {
                            if (err) {
                                console.error(err);
                                req.flash('error_msg', 'An error occurred while updating the entry.');
                                return res.redirect('/triage-book');
                            }

                            // Log the update action into recent_activities
                            const activity = `edited triagebook entry (ID: ${id})`;
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
                                [req.user.id, activity, 'triagebook', `${id}`, req.user.username],
                                (logErr) => {
                                    if (logErr) {
                                        console.error('Error logging activity:', logErr.message);
                                        req.flash('error_msg', 'Triage entry modified but activity log failed.');
                                    } else {
                                        req.flash('success_msg', `Triage entry ${name} modified successfully.`);
                                    }
                                }
                            );

                            // Check if any rows were edited
                            if (this.changes > 0) {
                                req.flash('success_msg', 'Entry edited successfully.');
                                console.log('success_msg', 'Entry edited successfully.');
                            } else {
                                req.flash('error_msg', 'Update failed. Entry not found.');
                            }

                            // Redirect after the operation
                            return res.redirect('/triage-book');
                        }
                    );
                }
            );
        });
    });
});
// View triage history book
app.get('/triage/book/history', ensureAuthenticated, ensureAdmin, attachPostFilter, (req, res) => {
    db.all('SELECT * FROM triagebook_history ORDER BY modified_at DESC', [], (error, results) => {
        if (error) {
            req.flash('error_msg', 'Error loading triage history.');
            return res.redirect('/triage-book');
        }

        res.render('triage-book-history', { entries: results, user: req.user });
    });
});


/* INCIDENT EDIT */
// POST route to handle the incident form submission and update the entry
app.post('/edit/incident-book', ensureAuthenticated, attachPostFilter, (req, res) => {
    const {
        id, post_location, incident_date, incident_time, company, badge, name,
        incident_type, incident_location, incident_details, first_aid, detained,
        treatment_given, disposition, disposition_time, reporting
    } = req.body;

    // Debug incoming request
    console.log("Incoming request:", req.body);

    // Validate ID
    if (!id) {
        req.flash('error_msg', 'No entry ID provided.');
        return res.redirect('/incident-book');
    }

    // Convert reporting checkboxes to a single string
    const reportingStr = Array.isArray(reporting) ? reporting.join(', ') : reporting;

    const userId = req.user.user_id; // From authentication middleware
    const currentPost = req.session.current_post; // From session middleware

    db.serialize(() => {
        // Fetch the old entry
        db.get(`SELECT * FROM incident_book WHERE id = ?`, [id], (err, oldEntry) => {
            if (err) {
                console.error("Error fetching old entry:", err);
                req.flash('error_msg', 'Error fetching old entry.');
                return res.redirect('/incident-book');
            }

            if (!oldEntry) {
                req.flash('error_msg', 'Entry not found.');
                return res.redirect('/incident-book');
            }

            // Log the old entry into the incident_book_history table
            const columns = Object.keys(oldEntry).join(", ");
            const placeholders = Object.keys(oldEntry).map(() => "?").join(", ");
            const values = Object.values(oldEntry);

            db.run(
                `INSERT INTO incident_book_history (${columns}, modified_at) VALUES (${placeholders}, datetime('now', 'localtime'))`,
                [...values],
                (err) => {
                    if (err) {
                        console.error("Error saving to history:", err);
                        req.flash('error_msg', 'Error saving to history.');
                        return res.redirect('/incident-book');
                    }

                    // Update the entry in the incident_book table
                    db.run(
                        `UPDATE incident_book 
                         SET post_location = ?, incident_date = ?, incident_time = ?, company = ?, 
                             badge = ?, name = ?, incident_type = ?, incident_location = ?, 
                             incident_details = ?, first_aid = ?, detained = ?, treatment_given = ?, 
                             disposition = ?, disposition_time = ?, reporting = ? 
                         WHERE id = ?`,
                        [
                            post_location, incident_date, incident_time, company, badge, name,
                            incident_type, incident_location, incident_details, first_aid,
                            detained, treatment_given, disposition, disposition_time, reportingStr, id
                        ],
                        function (err) {
                            if (err) {
                                console.error("Error updating entry:", err);
                                req.flash('error_msg', 'Error updating entry.');
                                return res.redirect('/incident-book');
                            }

                            // Log activity
                            const activity = `Edited incident_book entry (ID: ${id})`;
                            db.run(
                                'INSERT INTO recent_activities (user_id, post_location, activity, timestamp) VALUES (?, ?, ?, datetime("now", "localtime"))',
                                [userId, currentPost, activity],
                                (err) => {
                                    if (err) console.error('Activity log failed:', err);
                                }
                            );

                            db.run(
                                `INSERT INTO user_activity_logs (user_id, post_location, action, table_name, record_id, logged_by)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [userId, currentPost, activity, 'incident_book', id, req.user.username],
                                (err) => {
                                    if (err) {
                                        console.error('Error logging activity:', err);
                                        req.flash('error_msg', 'Incident updated, but logging failed.');
                                    } else {
                                        req.flash('success_msg', 'Incident updated and logged successfully.');
                                    }
                                }
                            );

                            // Check if any rows were updated
                            if (this.changes > 0) {
                                req.flash('success_msg', `Incident ID: ${name} modified successfully.`);
                                console.log('success_msg:', 'Entry edited successfully.');
                            } else {
                                req.flash('error_msg', 'Update failed. Entry not found.');
                            }

                            // Redirect after the operation
                            return res.redirect('/incident-book');
                        }
                    );
                }
            );
        });
    });
});

// Incident delete
app.post('/delete/incident/:id', ensureAdmin, attachPostFilter, (req, res) => {
    const incidentId = req.params.id;

    // Fetch the existing incident before deleting (for history)
    db.get('SELECT * FROM incident_book WHERE id = ?', [incidentId], (error, incident) => {
        if (error || !incident) {
            req.flash('error_msg', 'Error loading incident for history.');
            return res.redirect('/incident-book');
        }

        // Store the incident data in incident_book_history with deleted_on set
        const historySql = `
            INSERT INTO incident_book_history (
                id, history_id, post_location, incident_date, incident_time, company, badge, name,
                incident_type, incident_location, incident_details, first_aid, detained,
                treatment_given, disposition, disposition_time, reporting, created_at, deleted_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(historySql, [
            incident.id, history_id, incident.post_location, incident.incident_date, incident.incident_time, incident.company,
            incident.badge, incident.name, incident.incident_type, incident.incident_location, incident.incident_details,
            incident.first_aid, incident.detained, incident.treatment_given, incident.disposition,
            incident.disposition_time, incident.reporting, incident.created_at, new Date().toISOString() // Record the deletion time
        ], function(error) {
            if (error) {
                req.flash('error_msg', 'Error saving incident history.');
                return res.redirect('/incident-book');
            }

            // Now delete the incident from the incident_book table
            const deleteSql = 'DELETE FROM incident_book WHERE id = ?';
            db.run(deleteSql, [incidentId], function(error) {
                if (error) {
                    req.flash('error_msg', 'Error deleting incident.');
                    return res.redirect('/incident-book');
                }

                req.flash('success_msg', 'Incident deleted successfully.');
                res.redirect('/incident-book');
            });
        });
    });
});

// View incident history book
app.get('/incident/book/history', ensureAuthenticated, ensureAdmin, attachPostFilter, (req, res) => {
    db.all('SELECT * FROM incident_book_history ORDER BY modified_at DESC', [], (error, results) => {
        if (error) {
            req.flash('error_msg', 'Error loading incident history.');
            return res.redirect('/incident-book');
        }

        res.render('incident-book-history', { incidents: results, user: req.user });
    });
});



/* ------------------------------ ROUTES TO DELETE RECORDS ---------------------------------*/
// Route to delete a record from triagebook (Admin only)
app.get('/delete/triagebook/:id', ensureAdmin, attachPostFilter, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM triagebook WHERE id = ?', id, (err) => {
        if (err) {
            console.error('Error deleting triagebook record:', err.message);
        }
        res.redirect('/triage-book'); // Redirect to triagebook records page
    });
});

// Route to delete a record from users table (Admin only)
app.get('/delete/user/:id', ensureAdmin, attachPostFilter, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM users WHERE id = ?', id, (err) => {
        if (err) {
            console.error('Error deleting user record:', err.message);
        }
        res.redirect('/admin/users'); // Redirect to users page
    });
});

// Route to delete a record from contact_messages (Admin only)
app.get('/delete/contact/:id', ensureAdmin, attachPostFilter, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM contact_messages WHERE id = ?', id, (err) => {
        if (err) {
            console.error('Error deleting contact message:', err.message);
        }
        res.redirect('/messages'); // Redirect to messages page
    });
});




// Middleware to log every incoming request
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// PASSWORD RESET
// Route: Reset Password
// Route: Render the Reset Password Form (GET)
// Route: Render the Reset Password Form (GET)

// From "Passport Auth Code" page

//  Define the generateToken Function
function generateToken() {
    return crypto.randomBytes(32).toString('hex'); // Generates a random token
}

// Step1: User Clicks on Reset Password Button (From login with href:/reset-request)
app.get('/reset-request', (req, res) => {
    console.log('Reached the /reset route');
    res.render('users/forgot-password');
    // renders the forgot-password.ejs
});

// Step 2: User Submits Their Email Address
// Route: Handle Password Reset Request (POST)
app.post('/reset-request', (req, res) => {
    const { email } = req.body;

    // Check if the email exists in the database
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (!user) {
            req.flash('error_msg', 'Email address not found.');
            console.log('You are not one of us!', 'Email address not found.');
            return res.redirect('/reset-request');
        }

        // Generate a token and save it in the database
        const token = generateToken(); // Implement this function to create a unique token
        const expiry = Date.now() + 30 * 60 * 1000; // Token valid for 1 hour
        console.log('Welcome! You are one of us!', 'Email address found.');

        db.run('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?', [token, expiry, email], function(err) {
            if (err) {
                console.error('Error updating token in database:', err);
                return res.status(500).send('Internal Server Error');
            }

            // Send email with reset link
            const resetLink = `http://${req.headers.host}/reset/${token}`;
            console.log('Generated reset link:', resetLink);
            const mailOptions = {
                from: `"MineAid Obuasi Notifications" <${process.env.SMTP_USER}>`, // Custom display name
                to: email,
                subject: 'Password Reset Request',
                text: `Hi! ${user.firstname},You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                Please click on the following link, or paste this into your browser to complete the process:\n\n 
                ${resetLink}
                If you did not request this, please ignore this email and your password will remain unchanged.\n\n
                Reminder: To ensure you don’t miss any future notifications, please add "MineAid Obuasi Notifications" to your address book. 
                You can add us directly by clicking this link: https://drive.google.com/file/d/14qWlIPpg6SCvb9HarFQ23NX8X4ocJq_b/view?usp=sharing`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    req.flash('error_msg', 'Error sending password reset email.');
                    return res.redirect('/reset-request');
                }

                req.flash('success_msg', 'Password reset email sent successfully!');
                res.redirect('/login');
            });
        });
// COME BACK TO THS
        // Function to clean up expired tokens from the database
        function clearExpiredTokens() {
            const currentTime = Date.now();
            
            db.run('DELETE FROM users WHERE resetPasswordToken IS NOT NULL AND resetPasswordExpires < ?', [currentTime], function(err) {
                if (err) {
                    console.error('Error clearing expired tokens:', err);
                } else {
                    console.log(`Cleared ${this.changes} expired tokens.`);
                }
            });
        }
        // Run the cleanup every hour (3600000 milliseconds)
        setInterval(clearExpiredTokens, 3600000);
    });
});

// Step 3: User Clicks the Link in the Email that Renders Password Reset Form (GET)
app.get('/reset/:token', (req, res) => {
    const { token } = req.params;
    console.log('Incoming token:', token);

    // Remove expired tokens from the database
    db.run('DELETE FROM users WHERE resetPasswordExpires <= ?', [Date.now()], (err) => {
        if (err) {
            console.error('Error cleaning up expired tokens:', err);
        }
    });

    // Check if the token is valid and not expired
    db.get('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            req.flash('error_msg', 'An error occurred. Please try again.');
            return res.redirect('/login');
        }

        if (!user) {
            console.log('Invalid or expired token:', token);  // Log if token is invalid
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/login');
        }

        // Render the reset password form
        console.log('Token is valid:', token);  // Log if token is valid
        res.render('users/reset', { token });
    });
});

// Step 4: User Submits New Password
// Route: Handle New Password Submission (POST)
app.post('/reset/:token', (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    // Validate token and check if it's expired
    db.get('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            req.flash('error_msg', 'An error occurred. Please try again.');
            return res.redirect('/login');
        }

        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/login');
        }

        // Update the password and clear the token

        // Function to hash a password
        function hashPassword(password) {
            const saltRounds = 10; // Number of hashing rounds, can adjust for security vs speed
            return bcrypt.hashSync(password, saltRounds);
        }

        const hashedPassword = hashPassword(password); // Implement this function to hash the password

        db.run('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE email = ?', [hashedPassword, user.email], function(err) {
            if (err) {
                console.error('Error updating password in database:', err);
                return res.status(500).send('Internal Server Error');
            }

            req.flash('success_msg', 'Your password has been reset successfully!');
            res.redirect('/login');
        });
    });
});


// Route to export records to Excel
app.get('/export', ensureAuthenticated, attachPostFilter, (req, res) => {
    db.all('SELECT * FROM triagebook', (err, rows) => {
        if (err) {
            console.error('Error fetching records:', err.message);
            return res.status(500).send('Error retrieving records');
        }

        if (rows.length === 0) {
            return res.status(404).send('No records found to export');
        }

        try {
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Triage-Book Records');
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
            res.setHeader('Content-Disposition', 'attachment; filename="triage-book-records.xlsx"');
            res.send(buffer);
        } catch (error) {
            console.error('Error exporting to Excel:', error.message);
            return res.status(500).send('Error exporting records to Excel');
        }
    });
});


/* ROUTE TO DOWNLOAD LIVE DATABASE FILE FROM RENDER */

// Temporary download endpoint for SQLite backup
app.get('/download-db', ensureSuperuser, attachPostFilter, (req, res) => {
    const dbPath = path.join(__dirname, 'database', 'mineaid.db'); // Update the path if needed

    // // Set up a basic check to restrict access (change as needed)
    // if (req.query.secret !== process.env.DOWNLOAD_SECRET) {
    // console.error('Error getting authorization');
    // return res.status(403).render('error/403', { message: 'You are not authorized to perform this action.' });
    // }

    // Use a human-readable timestamp format for the backup filename
    const getFormattedDate = () => {
        const now = new Date();
        return now.toISOString().replace(/:/g, '-').split('.')[0]; // e.g., "2024-11-07T15-30-20"
    };
    // Send the SQLite file as a download
    res.download(dbPath, `live_backup-${getFormattedDate()}.db`, (err) => {
    if (err) {
        console.error('Error downloading database:', err);
        res.status(500).send('Error downloading the file');
    }
    });
/* END DOWNLOAD ROUTE - BRACKETS BELOW INCLUDED */
});


// OTHER GENERAL ROUTES
// Route: About Page (GET)
app.get('/about', (req, res) => {
    res.render('about'); // about.ejs
});


// CONTACT PAGE ROUTES

// Route: Contact Page (GET)
app.get('/contact', (req, res) => {
    res.render('contact'); // contact.ejs
});

// Route: Handle Contact Form Submission (POST)
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;

    // Insert the message into the database
    const query = `INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`;
    db.run(query, [name, email, message], function (err) {
        if (err) {
            req.flash('error_msg', 'There was an error saving your message.');
            return res.redirect('/contact');
        }

        // Set up email options
        const mailOptions = {
            from: `"MineAid Obuasi Notifications" <${process.env.SMTP_USER}>`, // Custom display name
            replyTo: email, // User's email from the form
            to: 'mineaid.notifications@gmail.com, nuestman17@gmail.com',
            subject: 'New MineAid Contact Form Message',
            text: `Message from: ${name} (${email})\n\nMessage:\n${message}`
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                req.flash('error_msg', 'Your message was saved, but the email failed to send.');
                console.error('Email send error:', error);
            } else {
                req.flash('success_msg', 'Your message was sent successfully!');
                console.log('Email sent:', info.response);
            }
            res.render('success');
        });
    });
});

// Route to fetch and display contact messages
app.get('/messages', (req, res) => {
    const sql = 'SELECT * FROM contact_messages';

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err);
            req.flash('error_msg', 'Could not retrieve messages. Please try again.');
            return res.redirect('errors/error'); // Redirect to a default route if needed
        }
        res.render('messages', { messages: rows });
    });
});



// GET Route to Display Survey Form
app.get('/user-survey', (req, res) => {
    res.render('user-survey', { title: 'User Feedback Survey' });
});

// POST Route to Handle Form Submission
app.post('/feedback/submit', (req, res) => {
    const { onboarding_rating, ease_of_use, forms_ease, feature_usefulness, security_confidence, fap_relevance, performance_rating, design_feedback, feature_request, overall_experience } = req.body;
    const query = `
        INSERT INTO user_feedback 
        (onboarding_rating, ease_of_use, forms_ease, feature_usefulness, security_confidence, fap_relevance, performance_rating, design_feedback, feature_request, overall_experience) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [onboarding_rating, ease_of_use, forms_ease, feature_usefulness, security_confidence, fap_relevance, performance_rating, design_feedback, feature_request, overall_experience], function(err) {
        if (err) {
            console.error('Error submitting feedback:', err.message);
            res.status(500).render('error', { message: 'Feedback submission failed' });
        } else {
        
            console.log('success_msg', 'Thank You for Your Feedback!');
            res.redirect('/feedback/results');
        }
    });
});

// GET Route to View Feedback Responses
app.get('/feedback/results', (req, res) => {
    const query = 'SELECT * FROM user_feedback ORDER BY timestamp DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error retrieving feedback:', err.message);
            res.status(500).render('error', { message: 'Error retrieving feedback' });
        } else {
            res.render('user-feedback', { title: 'Survey Results', feedback: rows }); // Ensure feedback is passed as rows
        }
    });
});


/* ----------------------------- REPORTS ------------------------------ */

// Route: Reports and Analytics (GET)
// app.get('/reports', ensureAuthenticated, ensureAdmin, (req, res) => {
//     const userId = req.user.user_id;
//     const currentPost = req.session.current_post;
//     res.render('reports/reports-home', { currentPost, userId }); // reports.ejs
// });
app.get('/reports/form', ensureAuthenticated, (req, res) => {
    const userId = req.user.user_id;
    const currentPost = req.session.current_post;
    res.render('reports/shift-report-form', { currentPost, userId }); // reports.ejs
});

// Route to handle FAP report submission
app.post('/reports/submit', ensureAuthenticated, attachPostFilter, (req, res) => {
    const { report_date, shift_type, post_location, summary, details } = req.body;
    const currentPost = req.session.current_post;
    // Generate report_id dynamically (use a trigger or a function in production)
    
    // Format today's date as YY-MM-DD
    const todaysDate = new Date();
    const formattedDate = todaysDate
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '-'); // Converts "2024-12-06" to "24-12-06"

    // Generate report_id dynamically
    const report_id = `fap-${shift_type}-${formattedDate}-${currentPost}`;
  
    const query = `
      INSERT INTO fap_reports (report_id, post_location, shift_type, report_date, summary, details, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
  
    db.run(
      query,
      [report_id, post_location, shift_type, report_date, summary, details, req.user.username],
      function (err) {
        if (err) {
          console.error('Error inserting into fap_reports:', err.message);
          res.status(500).render('error/500', { message: 'FAP report submission failed' });
          return;
        }
  
        // Log activity
        const activity = `Submitted a new FAP report for ${shift_type} shift at ${currentPost}`;
        const logQuery = `
          INSERT INTO user_activity_logs (user_id, post_location, action, table_name, record_id, logged_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
  
        db.run(
          logQuery,
          [req.user.user_id, post_location, activity, 'fap_reports', report_id, req.user.username],
          (logErr) => {
            if (logErr) {
              console.error('Error logging activity:', logErr.message);
              req.flash('error_msg', 'Report submitted, but activity log failed.');
            } else {
              req.flash('success_msg', `Report for ${shift_type} submitted successfully.`);
            }
  
            // Redirect back to the reports page or dashboard
            res.redirect('/reports');
          }
        );
      }
    );
});

// Route to view Reports in reports-hom.ejs
app.get('/reports', ensureAuthenticated, attachPostFilter, (req, res) => {
    const userId = req.user.user_id;
    const currentPost = req.session.current_post;

    const query = `
      SELECT * FROM fap_reports
      ORDER BY report_date DESC, shift_type ASC, post_location ASC
    `;

    db.all(query, (err, reports) => {
        if (err) {
            console.error('Error fetching reports:', err);
            req.flash('error_msg', 'Failed to load reports. Please try again later.');
            return res.redirect('/');
        }

        if (!reports || reports.length === 0) {
            console.warn('No reports found in the database.');
            req.flash('error_msg', 'No reports available to display.');
            return res.redirect('/');
        }

        console.log('Reports successfully fetched:', reports.length, 'records found.');

        // Format the current date to match the database date format (YYYY-MM-DD)
        const currentDate = new Date().toISOString().split('T')[0];
        console.log('Current Date:', currentDate);

        // Group reports for the recent tab (Day and Night for the current date)
        const recentReports = reports.filter((r) => r.report_date === currentDate);
        const groupedReports = {
            recent: {
                day: recentReports.filter((r) => r.shift_type === 'Day'),
                night: recentReports.filter((r) => r.shift_type === 'Night'),
            },
            odd: reports.filter((r) => r.post_location === 'ODD'),
            stp: reports.filter((r) => r.post_location === 'STP'),
            kms: reports.filter((r) => r.post_location === 'KMS'),
            gcs: reports.filter((r) => r.post_location === 'GCS'),
        };

        console.log('Grouped Reports:', groupedReports);

        res.render('reports/reports-home', {
            title: 'Shift Reports',
            groupedReports,
            currentDate,
            currentPost,
            userId,
        });

        console.log('GET /reports - Rendered reports-home.ejs successfully');
    });
});

// Route to Edit Reports in reports-hom.ejs
app.get("/report/:id", (req, res) => {
    const reportId = req.params.id;

    // Fetch the report from the database
    db.query("SELECT * FROM reports WHERE report_id = $1", [reportId], (err, result) => {
        if (err) {
            req.flash("error", "An error occurred while fetching the report.");
            return res.redirect("/reports");
        }

        if (result.rows.length === 0) {
            req.flash("error", "Report not found.");
            return res.redirect("/reports");
        }

        const selectedReport = result.rows[0];

        // Render the report view with the selected report
        res.render("report-view", {
            selectedReport,
            currentPost: req.session.currentPost || "Unknown Post", // Add session data if needed
            messages: req.flash(), // Pass flash messages
        });
    });
});



  
  





// Route: Help/Support (GET)
app.get('/help', (req, res) => {
    res.render('help'); // help.ejs
});
// Route: Messages page (GET)
app.get('/messages', (req, res) => {
    res.render('messages'); // help.ejs
});
// Route: Success page (GET)
app.get('/success', (req, res) => {
    res.render('success'); // help.ejs
});
// Route: User reset page (GET)
app.get('/users/reset', (req, res) => {
    res.render('users/reset'); // help.ejs
});
// Route: Error (GET)
app.get('/error', (req, res) => {
    res.render('error/error'); // help.ejs
});
// Route: Error 401 (GET)
app.get('/error/401', (req, res) => {
    res.render('error/401'); // help.ejs
});
// Route: Error 403 (GET)
app.get('/error/403', (req, res) => {
    res.render('error/403'); // help.ejs
});
// Route: Error 404 (GET)
app.get('/error/404', (req, res) => {
    res.render('error/404'); // help.ejs
});
// Route: Error 500 (GET)
app.get('/error/500', (req, res) => {
    res.render('error/500'); // help.ejs
});
// Route: Registration Error (GET)
app.get('/error/regis-error', (req, res) => {
    res.render('error/regis-error'); // help.ejs
});



/* NURSING PORTAL */
// Route: Nursing Portal Landing Page (GET)
app.get('/landing-page', (req, res) => {
    res.render('landing-page'); // landing-page.ejs
});
// Route: iAid Landing Page (GET)
app.get('/iaid', (req, res) => {
    res.render('index'); // landing-page.ejs
});


/* iSoup Portal */
// Route: iSoup Landing Page (GET)
app.get('/isoup', (req, res) => {
    res.render('isoup'); // landing-page.ejs
});
// Route: iSoup Dashboard (GET)
app.get('/isoup-dashboard', ensureAuthenticated, (req, res) => {
    const current_post = req.session.current_post;

    // Check if the session has the current_post
    if (!current_post) {
        req.flash('error_msg', 'Please select a post before accessing the iSoup dashboard.');
        return res.redirect('/post-selection');
    }

    res.render('isoup-dashboard', { current_post }); // Pass current_post to the template
});

// Route: View iSoup Report Form (GET)
app.get('/isoup/forms/report-form', (req, res) => {
    res.render('isoup-reports-form'); // landing-page.ejs
});
// Route: View iSoup Ward State Form (GET)
app.get('/isoup/forms/ward-state-form', (req, res) => {
    res.render('isoup-ward-state-form'); // landing-page.ejs
});
// Route: View iSoup Statistics Form (GET)
app.get('/isoup/forms/stats-form', (req, res) => {
    res.render('isoup-stats-form'); // landing-page.ejs
});
// Route: Submit iSoup Statistics (POST)
app.post('/isoup/forms/stats-form', (req, res) => {
    const {
        med_surg_prev, med_surg_beds, med_surg_cots, med_surg_pts, med_surg_adm,
        med_surg_disch, med_surg_tin, med_surg_tout, med_surg_deaths,
        mat_surg_prev, mat_surg_beds, mat_surg_cots, mat_surg_pts, mat_surg_adm,
        mat_surg_disch, mat_surg_tin, mat_surg_tout, mat_surg_deaths,
        lying_in_prev, lying_in_beds, lying_in_cots, lying_in_pts, lying_in_adm,
        lying_in_disch, lying_in_tin, lying_in_tout, lying_in_deaths,
        nicu_prev, nicu_beds, nicu_cots, nicu_pts, nicu_adm, nicu_disch, nicu_tin, nicu_tout, nicu_deaths,
        cdu_prev, cdu_beds, cdu_cots, cdu_pts, cdu_adm, cdu_disch, cdu_tin, cdu_tout, cdu_deaths,
        icu_prev, icu_beds, icu_cots, icu_pts, icu_adm, icu_disch, icu_tin, icu_tout, icu_deaths,
        recovery_prev, recovery_beds, recovery_cots, recovery_pts, recovery_adm, recovery_disch, recovery_tin, recovery_tout, recovery_deaths,
        emergency_prev, emergency_beds, emergency_cots, emergency_pts, emergency_adm, emergency_disch, emergency_tin, emergency_tout, emergency_deaths,
        site_clinic_prev, site_clinic_beds, site_clinic_cots, site_clinic_pts, site_clinic_adm, site_clinic_disch, site_clinic_tin, site_clinic_tout, site_clinic_deaths,
        nursery_prev, nursery_beds, nursery_cots, nursery_pts, nursery_adm, nursery_disch, nursery_tin, nursery_tout, nursery_deaths
    } = req.body;

    // Calculate totals for each ward row
    const totalPrev = parseInt(med_surg_prev) + parseInt(mat_surg_prev) + parseInt(lying_in_prev) + parseInt(nicu_prev) +
        parseInt(cdu_prev) + parseInt(icu_prev) + parseInt(recovery_prev) + parseInt(emergency_prev) +
        parseInt(site_clinic_prev);
    const totalBeds = parseInt(med_surg_beds) + parseInt(mat_surg_beds) + parseInt(lying_in_beds) + parseInt(nicu_beds) +
        parseInt(cdu_beds) + parseInt(icu_beds) + parseInt(recovery_beds) + parseInt(emergency_beds) +
        parseInt(site_clinic_beds);
    const totalCots = parseInt(med_surg_cots) + parseInt(mat_surg_cots) + parseInt(lying_in_cots) + parseInt(nicu_cots) +
        parseInt(cdu_cots) + parseInt(icu_cots) + parseInt(recovery_cots) + parseInt(emergency_cots) +
        parseInt(site_clinic_cots);
    const totalPts = parseInt(med_surg_pts) + parseInt(mat_surg_pts) + parseInt(lying_in_pts) + parseInt(nicu_pts) +
        parseInt(cdu_pts) + parseInt(icu_pts) + parseInt(recovery_pts) + parseInt(emergency_pts) +
        parseInt(site_clinic_pts);
    const totalAdm = parseInt(med_surg_adm) + parseInt(mat_surg_adm) + parseInt(lying_in_adm) + parseInt(nicu_adm) +
        parseInt(cdu_adm) + parseInt(icu_adm) + parseInt(recovery_adm) + parseInt(emergency_adm) +
        parseInt(site_clinic_adm);
    const totalDisch = parseInt(med_surg_disch) + parseInt(mat_surg_disch) + parseInt(lying_in_disch) + parseInt(nicu_disch) +
        parseInt(cdu_disch) + parseInt(icu_disch) + parseInt(recovery_disch) + parseInt(emergency_disch) +
        parseInt(site_clinic_disch);
    const totalTin = parseInt(med_surg_tin) + parseInt(mat_surg_tin) + parseInt(lying_in_tin) + parseInt(nicu_tin) +
        parseInt(cdu_tin) + parseInt(icu_tin) + parseInt(recovery_tin) + parseInt(emergency_tin) +
        parseInt(site_clinic_tin);
    const totalTout = parseInt(med_surg_tout) + parseInt(mat_surg_tout) + parseInt(lying_in_tout) + parseInt(nicu_tout) +
        parseInt(cdu_tout) + parseInt(icu_tout) + parseInt(recovery_tout) + parseInt(emergency_tout) +
        parseInt(site_clinic_tout);
    const totalDeaths = parseInt(med_surg_deaths) + parseInt(mat_surg_deaths) + parseInt(lying_in_deaths) + parseInt(nicu_deaths) +
        parseInt(cdu_deaths) + parseInt(icu_deaths) + parseInt(recovery_deaths) + parseInt(emergency_deaths) +
        parseInt(site_clinic_deaths);

    // Insert data for each ward
    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT INTO isoup_stats (
                ward, prev, beds, cots, pts, adm, disch, tin, tout, deaths
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run("Med/Surg", med_surg_prev, med_surg_beds, med_surg_cots, med_surg_pts, med_surg_adm,
            med_surg_disch, med_surg_tin, med_surg_tout, med_surg_deaths);
        
        stmt.run("Mat/Surg", mat_surg_prev, mat_surg_beds, mat_surg_cots, mat_surg_pts, mat_surg_adm,
            mat_surg_disch, mat_surg_tin, mat_surg_tout, mat_surg_deaths);
        
        stmt.run("Lying-In", lying_in_prev, lying_in_beds, lying_in_cots, lying_in_pts, lying_in_adm,
            lying_in_disch, lying_in_tin, lying_in_tout, lying_in_deaths);
        
        stmt.run("NICU", nicu_prev, nicu_beds, nicu_cots, nicu_pts, nicu_adm, nicu_disch, nicu_tin, nicu_tout, nicu_deaths);
        stmt.run("CDU", cdu_prev, cdu_beds, cdu_cots, cdu_pts, cdu_adm, cdu_disch, cdu_tin, cdu_tout, cdu_deaths);
        stmt.run("ICU", icu_prev, icu_beds, icu_cots, icu_pts, icu_adm, icu_disch, icu_tin, icu_tout, icu_deaths);
        stmt.run("Recovery", recovery_prev, recovery_beds, recovery_cots, recovery_pts, recovery_adm,
            recovery_disch, recovery_tin, recovery_tout, recovery_deaths);
        stmt.run("Emergency", emergency_prev, emergency_beds, emergency_cots, emergency_pts, emergency_adm,
            emergency_disch, emergency_tin, emergency_tout, emergency_deaths);
        stmt.run("Site Clinic", site_clinic_prev, site_clinic_beds, site_clinic_cots, site_clinic_pts,
            site_clinic_adm, site_clinic_disch, site_clinic_tin, site_clinic_tout, site_clinic_deaths);

        // Insert Sub-Total row
        stmt.run("Sub-Total", totalPrev, totalBeds, totalCots, totalPts, totalAdm, totalDisch, totalTin, totalTout, totalDeaths);

        // Insert the Nursery row (if applicable)
        stmt.run("Nursery", nursery_prev, nursery_beds, nursery_cots, nursery_pts, nursery_adm, nursery_disch,
            nursery_tin, nursery_tout, nursery_deaths);

        // Insert the Total row, summing Sub-Total and Nursery
        stmt.run("Total", 
            totalPrev + nursery_prev, 
            totalBeds + nursery_beds, 
            totalCots + nursery_cots, 
            totalPts + nursery_pts, 
            totalAdm + nursery_adm, 
            totalDisch + nursery_disch, 
            totalTin + nursery_tin, 
            totalTout + nursery_tout, 
            totalDeaths + nursery_deaths
        );

        stmt.finalize();
    });

    // Redirect or send success response
    res.send("Statistics successfully recorded.");
});
// Route: Submit iSoup Report (POST)
app.post('/isoup/forms/submit-report', async (req, res) => {
    const {
        report_date, plumbing_system, electrical_system, oxygen_system,
        dmo, general_supervisor, med_surg_supervisor, mat_surg_supervisor,
        emergency_cases, theatre_cases, recovery_cases, odd_cases, stp_cases, kms_cases, gcs_cases,
        staff_emergency, staff_theatre, staff_recovery, staff_odd, staff_stp, staff_kms, staff_gcs,
        staff_icu, staff_nicu, staff_paediatric, staff_female, staff_male,
        staff_lying_in, staff_maternity,
        emergency_report, rollcall_nurses, rollcall_service, rollcall_students, rollcall_drivers,
        rollcall_pharmacy, rollcall_laboratory, rollcall_revenue, rollcall_records, rollcall_security, rollcall_orderlies,
        general_comments, mine_incidents, hospital_incidents
    } = req.body;
    const entered_by = req.user.firstname; // Get user from session/middleware, assuming user object has a 'firstname' property

    const sql = `INSERT INTO isoup_reports (
        report_date, plumbing_system, electrical_system, oxygen_system,
        dmo, general_supervisor, med_surg_supervisor, mat_surg_supervisor,
        emergency_cases, theatre_cases, recovery_cases, odd_cases, stp_cases, kms_cases, gcs_cases,
        staff_emergency, staff_theatre, staff_recovery, staff_odd, staff_stp, staff_kms, staff_gcs,
        staff_icu, staff_nicu, staff_paediatric, staff_female, staff_male,
        staff_lying_in, staff_maternity,
        emergency_report, rollcall_nurses, rollcall_service, rollcall_students, rollcall_drivers,
        rollcall_pharmacy, rollcall_laboratory, rollcall_revenue, rollcall_records, rollcall_security, rollcall_orderlies,
        general_comments, mine_incidents, hospital_incidents, entered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        report_date, plumbing_system, electrical_system, oxygen_system,
        dmo, general_supervisor, med_surg_supervisor, mat_surg_supervisor,
        emergency_cases, theatre_cases, recovery_cases, odd_cases, stp_cases, kms_cases, gcs_cases,
        staff_emergency, staff_theatre, staff_recovery, staff_odd, staff_stp, staff_kms, staff_gcs,
        staff_icu, staff_nicu, staff_paediatric, staff_female, staff_male,
        staff_lying_in, staff_maternity,
        emergency_report, rollcall_nurses, rollcall_service, rollcall_students, rollcall_drivers,
        rollcall_pharmacy, rollcall_laboratory, rollcall_revenue, rollcall_records, rollcall_security, rollcall_orderlies,
        general_comments, mine_incidents, hospital_incidents, entered_by
    ];

    try {
        await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve();
            });
        });
        req.flash('success', 'Report submitted successfully!');
        res.redirect('/isoup/reports/all');
    } catch (err) {
        console.error(err.message);
        req.flash('error', 'Error saving the report.');
        res.redirect('/error/500');
    }
});

// Route: View All iSoup Reports (GET)
// app.get('/isoup/reports/all', (req, res) => {
//     const sql = `SELECT * FROM isoup_reports ORDER BY created_at DESC`;

//     db.all(sql, [], (err, rows) => {
//         if (err) {
//             console.error(err.message);
//             req.flash('error', 'Error fetching reports.');
//             return res.render('isoup-reports-all', { reports: [] });
//         }

//         res.render('isoup-reports-all', { reports: rows });
//     });
// });
// app.get('/isoup/reports/all', (req, res) => {
//     //With pagination
//     const page = parseInt(req.query.page) || 1; // Current page number, default to 1
//     const limit = parseInt(req.query.limit) || 10; // Number of items per page, default to 10
//     const offset = (page - 1) * limit;

//     const sql = `SELECT * FROM isoup_reports ORDER BY created_at DESC LIMIT ? OFFSET ?`;
//     const countSql = `SELECT COUNT(*) AS total FROM isoup_reports`;

//     db.get(countSql, [], (err, countResult) => {
//         if (err) {
//             console.error(err.message);
//             req.flash('error', 'Error fetching reports count.');
//             return res.render('isoup-reports-all', { reports: [], totalPages: 0, currentPage: page });
//         }

//         const totalReports = countResult.total;
//         const totalPages = Math.ceil(totalReports / limit);

//         db.all(sql, [limit, offset], (err, rows) => {
//             if (err) {
//                 console.error(err.message);
//                 req.flash('error', 'Error fetching reports.');
//                 return res.render('isoup-reports-all', { reports: [], totalPages: 0, currentPage: page });
//             }

//             res.render('isoup-reports-all', {
//                 reports: rows,
//                 totalPages,
//                 currentPage: page,
//             });
//         });
//     });
// });
app.get('/isoup/reports/all', (req, res) => {
    //With pagination plus filters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || ''; // Search term

    let sql = `SELECT * FROM isoup_reports WHERE report_date LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM isoup_reports WHERE report_date LIKE ?`;

    const searchTerm = `%${search}%`;

    db.get(countSql, [searchTerm], (err, countResult) => {
        if (err) {
            console.error(err.message);
            req.flash('error', 'Error fetching reports count.');
            return res.render('isoup-reports-all', { reports: [], totalPages: 0, currentPage: page });
        }

        const totalReports = countResult.total;
        const totalPages = Math.ceil(totalReports / limit);

        db.all(sql, [searchTerm, limit, offset], (err, rows) => {
            if (err) {
                console.error(err.message);
                req.flash('error', 'Error fetching reports.');
                return res.render('isoup-reports-all', { reports: [], totalPages: 0, currentPage: page });
            }

            res.render('isoup-reports-all', {
                reports: rows,
                totalPages,
                currentPage: page,
                search,
            });
        });
    });
});



// Route: View One Specific Day's iSoup Report (GET)
app.get('/isoup/report', (req, res) => {
    const { report_date } = req.query; // Extract report_date from query params

    if (!report_date || !/^\d{4}-\d{2}-\d{2}$/.test(report_date)) {
        req.flash('error', 'Invalid or missing report date.');
        return res.render('isoup-report', { reports: [] });
    }

    const sql = `SELECT * FROM isoup_reports WHERE report_date = ?`;

    db.all(sql, [report_date], (err, rows) => {
        if (err) {
            console.error(err.message);
            req.flash('error', 'Error fetching the report.');
            return res.render('isoup-report', { reports: [] });
        }

        res.render('isoup-report', { reports: rows });
    });
});




// Route to display iSoup incident book
app.get('/isoup/incidents', ensureAuthenticated, ensureAdmin, attachPostFilter, (req, res) => {
    const query = 'SELECT * FROM incident_book ORDER BY incident_date DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching incident records:', err.message);
            res.status(500).render('error', { message: 'Error fetching incident records' });
        } else {
            res.render('isoup-incidents', { title: 'Incident Records', incidents: rows });
        }
    });
});




// Route: iManage Landing Page (GET)
app.get('/imanage', (req, res) => {
    res.render('imanage/imanage'); // landing-page.ejs
});
// Route: iManage Dashboard (GET)
app.get('/imanage-dashboard', (req, res) => {
    res.render('imanage/imanage-dashboard'); // landing-page.ejs
});
//Route: View all Nurses
app.get('/imanage/nurses', (req, res) => {
    const query = 'SELECT * FROM nurses ORDER BY id ASC'; // Adjust as needed for your query
    db.all(query, (err, nurses) => {
        if (err) {
            console.error('Error retrieving nurses:', err.message);
            req.flash('error', 'Could not fetch nurses data.');
            return res.redirect('/imanage-dashboard');
        }
        res.render('imanage/nurses-register', { nurses });
    });
});
// GET route to render the add nurse form
app.get('/imanage/nurses/add-nurse', (req, res) => {
    res.render('imanage/add-nurse'); // Ensure this file exists in the 'views/imanage' folder
});

// POST route to handle nurse addition
app.post('/imanage/nurses/add-nurse', upload.single('picture'), (req, res) => {
    const {
        staff_id,
        name,
        gender,
        grade,
        emp_date,
        rank,
        department,
        email,
        phone,
        service_status,
        accommodation_status,
    } = req.body;

    const picture = req.file
        ? `/uploads/nurses/${req.file.filename}`
        : '/images/default-profile.png'; // Default image if no file uploaded

    const query = `
        INSERT INTO nurses (
            staff_id, name, gender, grade, emp_date, rank, department, 
            email, phone, service_status, accommodation_status, picture
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        staff_id,
        name,
        gender,
        grade,
        emp_date,
        rank,
        department,
        email,
        phone,
        service_status,
        accommodation_status,
        picture,
    ];

    db.run(query, params, function (err) {
        if (err) {
            console.error('Error adding nurse:', err.message);
            req.flash('error_msg', 'Failed to add nurse. Please try again.');
            return res.redirect('/imanage/nurses/add-nurse');
        }
        req.flash('success_msg', 'Nurse added successfully!');
        res.redirect('/imanage/nurses');
    });
});
// GET route to view nurse accommodations
app.get('/imanage/nurses/accommo', (req, res) => {
    const query = `
        SELECT name, accommodation_status 
        FROM nurses
        ORDER BY accommodation_status ASC, name ASC
    `;

    db.all(query, [], (err, nurses) => {
        if (err) {
            console.error('Error retrieving nurse accommodations:', err.message);
            req.flash('error_msg', 'Unable to retrieve nurse accommodations.');
            return res.redirect('/imanage/nurses');
        }
        res.render('imanage/nurse-accommodation', { nurses }); // Create a nurse-accommodation.ejs view
    });
});





// Route: iEmerge Landing Page (GET)
app.get('/iemerge', (req, res) => {
    res.render('iemerge/iemerge'); // landing-page.ejs
});
// Route: iEmerge Dashboard (GET)
app.get('/iemerge/dashboard', (req, res) => {
    res.render('iemerge/iemerge-dashboard'); // landing-page.ejs
});
// Route: iEmerge Inventory (GET)
app.get('/iemerge/inventory/equipment', (req, res) => {
    res.render('../inventory/equipment-inventory'); // landing-page.ejs
});




/* INVENTORY MANAGEMENT */

// Route: Inventory Management Landing Page (GET)
app.get('/inventory', attachPostFilter, (req, res) => {
    const current_post = req.session.current_post;
    res.render('inventory/inventory-mgt', { current_post }); // landing-page.ejs
});


//MEDICATIONS Start
// GET Route for Add Medication Form
app.get('/inventory/add-medication', attachPostFilter, (req, res) => {
    db.all('SELECT * FROM medications', [], (err, rows) => {
        if (err) {
            console.error('Error fetching medications:', err.message);
            req.flash('error_msg', 'Error fetching medications.');
            return res.redirect('/');
        }
        const userPost = res.locals.post || ''; // Fetch from session or DB
        res.render('inventory/add-medication', {medications: rows, userPost });
    });
});
// POST Route to Add Medication
app.post('/inventory/add-medication', attachPostFilter, (req, res) => {
    const { medication_name, category, dosage_form, unit, reorder_level, expiry_date, manufacturer, description } = req.body;

    const query = `
        INSERT INTO medications 
        (medication_id, medication_name, category, dosage_form, unit, reorder_level, expiry_date, manufacturer, description)
        VALUES ((SELECT 'med-' || IFNULL(MAX(rowid) + 1, 0) FROM medications), ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        query,
        [medication_name, category, dosage_form, unit, reorder_level, expiry_date, manufacturer, description],
        function (err) {
            if (err) {
                console.error('Error inserting medication:', err.message);
                req.flash('error_msg', 'Error adding medication. Please try again.');
                return res.redirect('/inventory/add-medication');
            }

            req.flash('success_msg', 'Medication added successfully.');
            res.redirect('/inventory/medication-inventory');
        }
    );
});

// Route to view the inventory medication management page
// GET Route for Medications Inventory with Search/Filter
app.get('/inventory/medication-inventory', attachPostFilter, (req, res) => {
    const { search } = req.query; // Extract the search parameter

    let query = 'SELECT * FROM medications';
    const params = [];

    // Add WHERE clause if search query exists
    if (search) {
        query += ' WHERE medication_name LIKE ?';
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching medications:', err.message);
            req.flash('error_msg', 'Error fetching medications.');
            return res.redirect('/errors/error');
        }
        res.render('inventory/medication-inventory', { medications: rows });
    });
});

// Route to edit medication details
app.get('/inventory/edit-inventory-medication/:id', attachPostFilter, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM medications WHERE medication_id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching medication:', err.message);
            req.flash('error_msg', 'Error loading medication details.');
            return res.redirect('/inventory/medication-inventory');
        }
        res.render('inventory/edit-inventory-medication', { medications: [row] });
    });
});

// Route to update medication
app.post('/inventory/edit-inventory-medication/:id', attachPostFilter, (req, res) => {
    const { medication_id, medication_name, dosage_form, unit, reorder_level, expiry_date, manufacturer, description } = req.body;

    const query = `
        UPDATE medications SET medication_name = ?, dosage_form = ?, unit = ?, reorder_level = ?, expiry_date = ?, manufacturer = ?, description = ?
        WHERE medication_id = ?
    `;
    db.run(query, [medication_name, dosage_form, unit, reorder_level, expiry_date, manufacturer, description, medication_id], function(err) {
        if (err) {
            console.error('Error updating medication:', err.message);
            req.flash('error_msg', 'Error updating medication.');
            return res.redirect('/inventory/medication-inventory');
        }
        req.flash('success_msg', 'Medication updated successfully.');
        res.redirect('/inventory/medication-inventory');
    });
});

// Route to delete medication
app.get('/inventory/delete-inventory-medication/:id', attachPostFilter, (req, res) => {
    const query = 'DELETE FROM medications WHERE medication_id = ?';
    db.run(query, function(err) {
        if (err) {
            console.error('Error deleting medication:', err.message);
            req.flash('error_msg', 'Error deleting medication.');
            return res.redirect('/inventory/medication-inventory');
        }
        req.flash('success_msg', 'Medication deleted successfully.');
        res.redirect('/inventory/medication-inventory');
    });
});

// Medication Ends



//Consumables begin

// GET Route for Consumables
app.get('/inventory/add-consumable', attachPostFilter, (req, res) => {
    db.all('SELECT * FROM consumables', [], (err, rows) => {
        if (err) {
            console.error('Error fetching consumables:', err.message);
            req.flash('error_msg', 'Error fetching consumables.');
            return res.redirect('../errors/error');
        }
        const userPost = res.locals.post || ''; // Fetch from session or DB
        res.render('inventory/add-consumable', { consumables: rows, userPost });
    });
});

// POST Route to Add Consumable
app.post('/inventory/add-consumable', attachPostFilter, (req, res) => {
    const { consumable_location, consumable_name, unit, reorder_level, expiry_date, manufacturer, description } = req.body;

    const query = `
        INSERT INTO consumables (consumable_id, consumable_location, consumable_name, unit, reorder_level, expiry_date, manufacturer, description)
        VALUES ((SELECT 'cons-' || IFNULL(MAX(rowid) + 1, 0) FROM consumables), ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [consumable_location, consumable_name, unit, reorder_level, expiry_date, manufacturer, description], function (err) {
        if (err) {
            console.error('Error inserting consumable:', err.message);
            req.flash('error_msg', 'Error adding consumable.');
            return res.redirect('/inventory/consumable-inventory');
        }
        req.flash('success_msg', 'Consumable added successfully.');
        res.redirect('/inventory/consumable-inventory');
    });
});

// GET Route for Consumable Inventory with Search/Filter
app.get('/inventory/consumable-inventory', attachPostFilter, (req, res) => {
    const { search } = req.query; // Extract the search parameter

    let query = 'SELECT * FROM consumables';
    const params = [];

    // Add WHERE clause if search query exists
    if (search) {
        query += ' WHERE consumable_name LIKE ?';
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching consumables:', err.message);
            req.flash('error_msg', 'Error fetching consumables.');
            return res.redirect('/errors/error');
        }
        res.render('inventory/consumable-inventory', { consumables: rows });
    });
});

// Route to edit consumable details
app.get('/inventory/edit-inventory-consumable/:id', attachPostFilter, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM consumables WHERE consumable_id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching consumable:', err.message);
            req.flash('error_msg', 'Error loading consumable details.');
            return res.redirect('/inventory/consumable-inventory');
        }
        res.render('inventory/edit-inventory-consumable', { consumables: [row] });
    });
});

// Route to update consumable
app.post('/inventory/edit-inventory-consumable/:id', attachPostFilter, (req, res) => {
    const { consumable_id, consumable_name, unit, reorder_level, expiry_date, manufacturer, description } = req.body;

    const query = `
        UPDATE consumables SET consumable_name = ?, unit = ?, reorder_level = ?, expiry_date = ?, manufacturer = ?, description = ?
        WHERE consumable_id = ?
    `;
    db.run(query, [consumable_name, unit, reorder_level, expiry_date, manufacturer, description, consumable_id], function(err) {
        if (err) {
            console.error('Error updating consumable:', err.message);
            req.flash('error_msg', 'Error updating consumable.');
            return res.redirect('/inventory/consumable-inventory');
        }
        req.flash('success_msg', 'Consumable updated successfully.');
        res.redirect('/inventory/consumable-inventory');
    });
});

// Route to delete consumable
app.get('/inventory/delete-inventory-consumable/:id', attachPostFilter, (req, res) => {
    const query = 'DELETE FROM consumables WHERE consumable_id = ?';
    db.run(query, function(err) {
        if (err) {
            console.error('Error deleting consumable:', err.message);
            req.flash('error_msg', 'Error deleting consumable.');
            return res.redirect('/inventory/consumable-inventory');
        }
        req.flash('success_msg', 'Consumable deleted successfully.');
        res.redirect('/inventory/consumable-inventory');
    });
});

//Consumables End


//Equipment Begins
// GET Route for Adding Equipment Form
app.get('/inventory/add-equipment', attachPostFilter, (req, res) => {
    // Show the current equipment after the form with code below
    db.all('SELECT * FROM equipment', [], (err, rows) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            req.flash('error_msg', 'Error fetching equipment.');
            return res.redirect('../errors/error');
        }
        const userPost = res.locals.post || ''; // Fetch from session or DB
        res.render('inventory/add-equipment', { equipment: rows, userPost });
    });
});

// POST Route to Add New Equipment
app.post('/inventory/add-equipment', attachPostFilter, (req, res) => {
    const {
        equipment_location, 
        equipment_name,
        unit,
        reorder_level,
        service_date,
        manufacturer,
        description
    } = req.body;

    const userId = req.user.user_id; // Assuming req.user contains the logged-in user's details

    const insertEquipmentQuery = `
        INSERT INTO equipment (equipment_id, equipment_location, equipment_name, unit, reorder_level, service_date, manufacturer, description)
        VALUES ((SELECT 'equip-' || IFNULL(MAX(rowid) + 1, 0) FROM equipment), ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        insertEquipmentQuery,
        [equipment_location, equipment_name, unit, reorder_level, service_date, manufacturer, description],
        function (err) {
            if (err) {
                console.error('Error inserting equipment:', err.message);
                req.flash('error_msg', 'Error inserting equipment.');
                return res.redirect('/inventory/equipment-inventory');
            }

            // Log user activity
            const logActivityQuery = `
                INSERT INTO user_activity_logs (user_id, action, table_name, record_id)
                VALUES (?, ?, ?, ?)
            `;
            db.run(
                logActivityQuery,
                [userId, 'Add', 'equipment', this.lastID],
                (logErr) => {
                    if (logErr) {
                        console.error('Error logging activity:', logErr.message);
                        // Proceed without interrupting user flow
                    }
                }
            );

            req.flash('success_msg', `Equipment added successfully.`);
            res.redirect('/inventory/equipment-inventory');
        }
    );
});

// Route to view the Equipment Inventory with Search/Filter
app.get('/inventory/equipment-inventory', attachPostFilter, (req, res) => {
    const { search } = req.query; // Extract the search parameter

    let query = 'SELECT * FROM equipment';
    const params = [];

    // Add WHERE clause if search query exists
    if (search) {
        query += ' WHERE equipment_name LIKE ?';
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            req.flash('error_msg', 'Error fetching equipment.');
            return res.redirect('/errors/error');
        }
        res.render('inventory/equipment-inventory', { equipment: rows });
    });
});

// Route to edit equipment details
app.get('/inventory/edit-inventory-equipment/:id', attachPostFilter, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM equipment WHERE equipment_id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            req.flash('error_msg', 'Error loading equipment details.');
            return res.redirect('/inventory/equipment-inventory');
        }
        res.render('inventory/edit-inventory-equipment', { equipment: [row] });
    });
});

// Route to update equipment
app.post('/inventory/edit-inventory-equipment', attachPostFilter, (req, res) => {
    const {
        equipment_id,
        equipment_name,
        unit,
        reorder_level,
        service_date,
        manufacturer,
        description
    } = req.body;

    const query = `
        UPDATE equipment SET 
            equipment_name = ?, 
            unit = ?, 
            reorder_level = ?, 
            service_date = ?, 
            manufacturer = ?, 
            description = ?
        WHERE equipment_id = ?
    `;

    db.run(query, [equipment_name, unit, reorder_level, service_date, manufacturer, description, equipment_id], function(err) {
        if (err) {
            console.error('Failed to update equipment:', err.message);
            req.flash('error_msg', 'Failed to update equipment.');
            return res.redirect('/inventory/equipment-inventory');
        }

        req.flash('success_msg', 'Equipment updated successfully.');
        res.redirect('/inventory/equipment-inventory');
    });
});



// Route to delete equipment
app.get('/inventory/delete-inventory-equipment/:id', attachPostFilter, (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM equipment WHERE equipment_id = ?';
    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error deleting equipment:', err.message);
            req.flash('error_msg', 'Error deleting equipment.');
            return res.redirect('/inventory/equipment-inventory');
        }
        req.flash('success_msg', 'Equipment deleted successfully.');
        res.redirect('/inventory/equipment-inventory');
    });
});
//Equipment Ends



// Route: Daily Checklist Page (GET)
app.get('/inventory/daily-checklist', attachPostFilter, (req, res) => {
    res.render('inventory/daily-checklist'); // Daily Checklist form page
});

// Route: Submit Daily Checklist (POST)
app.post('/inventory/daily-checklist', attachPostFilter, (req, res) => {
    const { item_id, item_name, stock_start, stock_used, stock_added, stock_end, remarks, logged_by } = req.body;
    
    // Validate and insert log into database
    db.run(`
        INSERT INTO daily_checklist_data (item_id, item_name, stock_start, stock_used, stock_added, stock_end, remarks, logged_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item_id, item_name, stock_start, stock_used, stock_added, stock_end, remarks, logged_by],
        function (err) {
            if (err) {
                console.error("Error inserting daily checklist:", err);
                return res.status(500).send("Error logging inventory checklist");
            }
            req.flash('success_msg', 'Checklist uploaded successfully')
            // Redirect to the inventory dashboard or logs page
            res.redirect('/inventory/daily-checklist-data');
        }
    );
});

// Route: View Daily Checklist Logs (GET)
app.get('/inventory/daily-checklist-data', attachPostFilter, (req, res) => {
    const { filterBy, filterValue } = req.query; // Get filter criteria from query

    let query = `
        SELECT * FROM daily_checklist_data
        LEFT JOIN consumables ON daily_checklist_data.item_id = consumables.consumable_id
        LEFT JOIN equipment ON daily_checklist_data.item_id = equipment.equipment_id
        LEFT JOIN medications ON daily_checklist_data.item_id = medications.medication_id
    `;
    const params = [];

    // Apply filter if provided
    if (filterBy && filterValue) {
        query += ` WHERE ${filterBy} LIKE ?`;
        params.push(`%${filterValue}%`);
    }

    // Execute query
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Error fetching DAILY CHECKLIST DATA:", err);
            return res.status(500).send("Error fetching checklist data");
        }

        // Render the template with data
        res.render('inventory/daily-checklist-data', { logs: rows, filterBy, filterValue });
    });
});



// Route: Add Inventory Item (GET)
app.get('/inventory/add-inventory-item', attachPostFilter, (req, res) => {
    
    const userPost = res.locals.post || ''; // Fetch from session or DB
    res.render('inventory/add-inventory-item', { userPost });
});

// Route: Add Inventory Item (POST)
app.post('/inventory/add-inventory-item', attachPostFilter, (req, res) => {
    const { 
        name, 
        category, 
        unit, 
        reorder_level, 
        expiry_date, 
        status, 
        service_date, 
        initial_stock 
    } = req.body;

    // Map the category string to the corresponding category ID
    const categoryMap = {
        "Medication": 1,
        "Consumable": 2,
        "Equipment": 3
    };
    const category_id = categoryMap[category];

    db.run(`
        INSERT INTO inventory_items (item_name, category_id, unit, reorder_level, expiry_date, equipment_status, service_date, stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category_id, unit, reorder_level, expiry_date || null, status || null, service_date || null, initial_stock],
        function (err) {
            if (err) {
                console.error("Error adding inventory item:", err);
                return res.status(500).send("Failed to add inventory item.");
            }
            req.flash('success_msg', 'Inventory item added successfully!');
            res.redirect('/inventory'); // Redirect to the main inventory dashboard
        }
    );
});

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

// Route: Monthly Summary Page (GET)
// app.get('/inventory/monthly-summary', (req, res) => {
//     res.render('inventory/monthly-summary'); // Monthly Summary form/page
// });
// app.get('/inventory/monthly-summary', (req, res) => {
//     const currentMonth = new Date().toISOString().slice(0, 7); // Format YYYY-MM

//     const query = `
//         SELECT 
//             SUM(stock_used) AS total_stock_used,
//             SUM(stock_added) AS total_stock_added,
//             COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE('now', '+30 days') THEN 1 END) AS items_near_expiry,
//             COUNT(CASE WHEN stock_end <= reorder_level THEN 1 END) AS low_stock_alerts
//         FROM inventory_daily_logs
//         LEFT JOIN inventory_items ON inventory_daily_logs.item_id = inventory_items.id
//         WHERE strftime('%Y-%m', log_date) = ?`;

//     db.get(query, [currentMonth], (err, summary) => {
//         if (err) {
//             console.error("Error fetching monthly summary:", err.message);
//             req.flash('error_msg', 'Error fetching monthly summary.');
//             return res.redirect('/errors/error');
//         }

//         res.render('inventory/monthly-summary', {
//             summary: summary || { total_stock_used: 0, total_stock_added: 0, items_near_expiry: 0, low_stock_alerts: 0 },
//         });
//     });
// });

//EXPERIMENTAL BELOW
app.get('/inventory/monthly-summary', (req, res) => {
    const summaryQuery = `
        SELECT 
            SUM(stock_used) AS total_stock_used,
            SUM(stock_added) AS new_stock_added,
            COUNT(CASE WHEN expiry_date <= DATE('now', '+30 days') THEN 1 END) AS near_expiry_count,
            COUNT(CASE WHEN stock_end <= reorder_level THEN 1 END) AS low_stock_alert_count
        FROM (
            SELECT item_id, stock_used, stock_added, stock_end, NULL AS expiry_date, reorder_level
            FROM inventory_daily_logs
            JOIN consumables ON inventory_daily_logs.item_id = consumables.consumable_id
            UNION ALL
            SELECT item_id, stock_used, stock_added, stock_end, NULL AS expiry_date, reorder_level
            FROM inventory_daily_logs
            JOIN equipment ON inventory_daily_logs.item_id = equipment.equipment_id
            UNION ALL
            SELECT item_id, stock_used, stock_added, stock_end, expiry_date, reorder_level
            FROM inventory_daily_logs
            JOIN medications ON inventory_daily_logs.item_id = medications.medication_id
        )
    `;

    db.get(summaryQuery, (err, result) => {
        if (err) {
            console.error('Error fetching monthly summary:', err.message);
            req.flash('error_msg', 'Error fetching monthly summary.');
            return res.redirect('/errors/error');
        }

        res.render('inventory/monthly-summary', {
            totalStockUsed: result.total_stock_used || 0,
            newStockAdded: result.new_stock_added || 0,
            nearExpiryCount: result.near_expiry_count || 0,
            lowStockAlertCount: result.low_stock_alert_count || 0,
        });
    });
});




// GET Route for All Inventory Items with Search/Filter
app.get('/inventory/inventory-items-all', (req, res) => {
    const { filterBy, filterValue } = req.query;

    let baseQuery = `
        SELECT * FROM (
            SELECT consumable_location AS post_location, consumable_id AS item_id, consumable_name AS name, category, unit, reorder_level, expiry_date, NULL AS service_date, 
                   manufacturer, description, created_at 
            FROM consumables
            UNION ALL
            SELECT equipment_location AS post_location, equipment_id AS item_id, equipment_name AS name, category, unit, reorder_level, NULL AS expiry_date, service_date, 
                   manufacturer, description, created_at 
            FROM equipment
            UNION ALL
            SELECT medication_location AS post_location, medication_id AS item_id, medication_name AS name, category, unit, reorder_level, expiry_date, NULL AS service_date, 
                   manufacturer, description, created_at 
            FROM medications
        ) AS inventory`;

    const params = [];

    // Add filtering based on filterBy and filterValue
    if (filterBy && filterValue) {
        baseQuery += ` WHERE ${filterBy} LIKE ?`;
        params.push(`%${filterValue}%`);
    }

    db.all(baseQuery, params, (err, rows) => {
        if (err) {
            console.error('Error fetching Inventory Items:', err.message);
            req.flash('error_msg', 'Error fetching Inventory Items.');
            return res.redirect('/errors/error');
        }

        
        // Pass the rows and filter criteria to the EJS template
        res.render('inventory/inventory-items-all', {
            inventoryItems: rows,
            filterBy,
            filterValue,
        });
    });
});
// END Inventory Items All Route


// GET Route for Viewing All User Inventory Activity Logs
// GET Route for Viewing All User Activity Logs
app.get('/inventory/user-activity-logs', (req, res) => {
    db.all('SELECT * FROM user_activity_logs', [], (err, rows) => {
        if (err) {
            console.error('Error fetching user activity logs:', err.message);
            req.flash('error_msg', 'Error fetching user activity logs.');
            return res.redirect('../errors/error');
        }
        res.render('inventory/user-activity-logs', { logs: rows });
    });
});


/***********************  ITEMS REGISTER PAGE AND MODAL SLIDESHOW FOR ITEM DETAILS **********************/

// Route for Items Register
// app.get('/inventory/items-register', attachPostFilter, (req, res) => {
//     const query = `SELECT * FROM items_register`;
//     db.all(query, [], (err, rows) => {
//       if (err) {
//         console.error('Error fetching items:', err.message);
//         req.flash('error_msg', 'Error fetching items.');
//         return res.redirect('/inventory');
//       }
//       res.render('inventory/items-register', { items: rows });
//     });
//   });
app.get('/inventory/items-register', attachPostFilter, (req, res) => {
    const query = req.user.role === 'Superuser'
        ? `SELECT * FROM items_register ORDER BY name ASC`
        : `SELECT * FROM items_register WHERE post_location = ? COLLATE NOCASE ORDER BY name ASC`;

    const params = req.user.role === 'Superuser' ? [] : [req.postLocation];

    db.all(query, params, (err, items) => {
        if (err) {
            console.error('Error retrieving items:', err.message);
            req.flash('error_msg', 'Unable to retrieve items.');
            return res.redirect('/inventory');
        }
        res.render('inventory/items-register', { items });
    });
});



//   Route for Item Details
// app.get('/inventory/item/:id', (req, res) => {
//     const { id } = req.params;
//     const itemQuery = `SELECT * FROM items_register WHERE item_id = ?`;
//     const activityQuery = `SELECT * FROM user_activity_logs WHERE record_id = ?`;
  
//     db.get(itemQuery, [id], (err, item) => {
//       if (err || !item) {
//         console.error('Error fetching item:', err ? err.message : 'Item not found.');
//         req.flash('error_msg', 'Item not found.');
//         return res.redirect('/inventory/items-register');
//       }
  
//       db.all(activityQuery, [id], (err, activities) => {
//         if (err) {
//           console.error('Error fetching activities:', err.message);
//           activities = [];
//         }
//         res.render('inventory/item-details', { item, activities });
//       });
//     });
//   });
//   OLD FLAT RENDER
app.get('/inventory/item/:id', attachPostFilter, (req, res) => {
  const { id } = req.params;

  // Query to fetch current item
  const itemQuery = `SELECT * FROM items_register WHERE item_id = ?`;

  // Query to fetch previous and next item IDs
  const navigationQuery = `
    SELECT
      (SELECT item_id FROM items_register WHERE rowid < (SELECT rowid FROM items_register WHERE item_id = ?) ORDER BY rowid DESC LIMIT 1) AS prevItemId,
      (SELECT item_id FROM items_register WHERE rowid > (SELECT rowid FROM items_register WHERE item_id = ?) ORDER BY rowid ASC LIMIT 1) AS nextItemId
  `;

  // Query to fetch activity logs for the item
  const activityQuery = `SELECT * FROM user_activity_logs WHERE record_id = ?`;

  db.get(itemQuery, [id], (err, item) => {
    if (err || !item) {
      console.error('Error fetching item:', err ? err.message : 'Item not found.');
      req.flash('error_msg', 'Item not found.');
      return res.redirect('/inventory/items-register');
    }

    db.get(navigationQuery, [id, id], (err, navData) => {
      if (err) {
        console.error('Error fetching navigation data:', err.message);
        navData = { prevItemId: null, nextItemId: null };
      }

      db.all(activityQuery, [id], (err, activities) => {
        if (err) {
          console.error('Error fetching activities:', err.message);
          activities = [];
        }
        res.render('inventory/item-details', {
          item,
          activities,
          prevItemId: navData.prevItemId,
          nextItemId: navData.nextItemId,
        });
      });
    });
  });
});

// Get Form to Add item to items_register
app.get('/inventory/add-new-item', attachPostFilter, (req, res) => {
    const locationsQuery = 'SELECT name FROM post_locations';
    db.all(locationsQuery, [], (err, locations) => {
        if (err) {
            console.error('Error fetching locations:', err.message);
            req.flash('error_msg', 'Error loading FAP locations.');
            return res.redirect('/inventory');
        }
        
        const userPost = res.locals.post || ''; // Fetch from session or DB
        res.render('inventory/add-new-item', {
            locations,
            categories: ['medication', 'consumable', 'equipment'], // Example for dropdown
         userPost });
    });
});

//Post route for adding item
app.post('/inventory/add-new-item', attachPostFilter, (req, res) => {
    const {
        post_location,
        category, // e.g., Medication, Consumable, Equipment
        name,
        description,
        initial_stock,
        reorder_level,
        available_stock,
        manufacturer,
        expiry_date,
        device_status,
        service_date
    } = req.body;

    const userId = req.user?.id || 'unknown'; // Replace with actual user ID from session/auth
    const username = req.user?.username || 'Unknown User';

    // Determine the prefix based on the category
    let itemIdPrefix = '';
    if (category === 'Equipment') {
        itemIdPrefix = 'equip-';
    } else if (category === 'Medication') {
        itemIdPrefix = 'med-';
    } else if (category === 'Consumable') {
        itemIdPrefix = 'cons-';
    } else {
        itemIdPrefix = 'item-'; // Default prefix
    }

    const itemIdQuery = `SELECT '${itemIdPrefix}' || IFNULL(MAX(rowid) + 1, 0) AS new_id FROM items_register`;

    db.get(itemIdQuery, [], (err, row) => {
        if (err) {
            console.error('Error generating item ID:', err.message);
            req.flash('error_msg', 'Error adding item. Please try again.');
            return res.redirect('/inventory/add-new-item');
        }

        const newItemId = row.new_id;

        const insertQuery = `
            INSERT INTO items_register (
                post_location,
                item_id,
                category,
                name,
                description,
                initial_stock,
                reorder_level,
                available_stock,
                manufacturer,
                expiry_date,
                device_status,
                service_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
            insertQuery,
            [
                post_location,
                newItemId,
                category,
                name,
                description,
                initial_stock || null,
                reorder_level || null,
                available_stock || null,
                manufacturer,
                expiry_date || null,
                device_status,
                service_date || null
            ],
            function (insertErr) {
                if (insertErr) {
                    console.error('Error inserting new item:', insertErr.message);
                    req.flash('error_msg', 'Error adding item. Please try again.');
                    return res.redirect('/inventory/add-new-item');
                }

                
            // Log user activity
            const logActivityQuery = `
                INSERT INTO user_activity_logs (user_id, action, table_name, record_id, logged_by)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(
                logActivityQuery,
                [userId, 'Add', 'equipment', this.lastID, username],
                    (logErr) => {
                        if (logErr) {
                            console.error('Error logging activity:', logErr.message);
                            req.flash('error_msg', 'Item added but activity log failed.');
                            return res.redirect('/inventory/items-register');
                        }

                        // Flashed message using dynamic category and name
                        req.flash(
                            'success_msg',
                            `${name} (${category}) added successfully.`
                        );
                        res.redirect('/inventory/items-register');
                    }
                );
            }
        );
    });
});

// Edit item in register
app.post('/inventory/edit/:id', attachPostFilter, (req, res) => {
    const itemId = req.params.id;
    const {
        name,
        description,
        manufacturer,
        post_location,
        available_stock,
        reorder_level,
        expiry_date,
        service_date,
    } = req.body;

    const query = `
        UPDATE items_register 
        SET name = ?, description = ?, manufacturer = ?, post_location = ?, 
            available_stock = ?, reorder_level = ?, expiry_date = ?, service_date = ?
        WHERE id = ?
    `;

    const params = [
        name, description, manufacturer, post_location,
        available_stock, reorder_level, expiry_date, service_date, itemId
    ];

    db.run(query, params, (err) => {
        if (err) {
            console.error('Error updating item:', err.message); // Log the error
            req.flash('error_msg', 'Error updating item.');
            return res.redirect(`/inventory/details/${itemId}`);
        }

        // Log user activity
        const logActivityQuery = `
            INSERT INTO user_activity_logs (user_id, action, table_name, record_id, logged_by)
            VALUES (?, ?, ?, ?, ?)
        `;

        // Assuming `req.user` contains user info
        db.run(
            logActivityQuery,
            [req.user.id, 'Edit', 'items_register', itemId, req.user.username],
            (logErr) => {
                if (logErr) {
                    console.error('Error logging activity:', logErr.message);
                    req.flash('error_msg', 'Item updated but activity log failed.');
                } else {
                    req.flash('success_msg', `${name} updated successfully.`);
                }
                res.redirect('/inventory/items-register');
            }
        );
    });
});

// Delete register item
app.post('/inventory/delete/:id', ensureAdmin, attachPostFilter, (req, res) => {
    const itemId = req.params.id;

    // Fetch the existing item before deleting (for logging or verification)
    db.get('SELECT * FROM items_register WHERE id = ?', [itemId], (error, item) => {
        if (error || !item) {
            req.flash('error_msg', 'Error loading item for deletion.');
            return res.redirect('/inventory/items-register');
        }

        // Save the item in a history table for audit purposes
        const historySql = `
            INSERT INTO items_register_history (
                id, post_location, item_id, category, name, image_url, description,
                initial_stock, reorder_level, available_stock, manufacturer,
                expiry_date, device_status, service_date, created_at, deleted_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(historySql, [
            item.id, item.post_location, item.item_id, item.category, item.name,
            item.image_url, item.description, item.initial_stock, item.reorder_level,
            item.available_stock, item.manufacturer, item.expiry_date, item.device_status,
            item.service_date, item.created_at, new Date().toISOString() // Record deletion time
        ], function (historyError) {
            if (historyError) {
                console.error('Error saving item history:', historyError.message); // Debug log
                req.flash('error_msg', 'Error saving item history.');
                return res.redirect('/inventory/items-register');
            }

            // Now delete the item from the items_register table
            const deleteSql = 'DELETE FROM items_register WHERE id = ?';
            db.run(deleteSql, [itemId], function (deleteError) {
                if (deleteError) {
                    console.error('Error deleting item:', deleteError.message); // Debug log
                    req.flash('error_msg', 'Error deleting item.');
                    return res.redirect('/inventory/items-register');
                }

                // Log user activity
                const logActivityQuery = `
                    INSERT INTO user_activity_logs (user_id, action, table_name, record_id, logged_by)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.run(
                    logActivityQuery,
                    [req.user.id, 'Delete', 'items_register', itemId, req.user.username],
                    (logErr) => {
                        if (logErr) {
                            console.error('Error logging activity:', logErr.message);
                            req.flash('error_msg', 'Item deleted but activity log failed.');
                        } else {
                            req.flash('success_msg', `Item ${item.name} deleted successfully.`);
                        }
                        res.redirect('/inventory/items-register');
                    }
                );
            });
        });
    });
});


/***********************************************************************************************/








/* DATABASE MANAGEMENT */
// Route: Database Mgt Page (GET)
app.get('/database', (req, res) => {
    res.render('admin/db-management'); // landing-page.ejs
});




// ERRORS
// Error handling routes (for 404, 500 errors)
app.use((req, res, next) => {
    res.status(404).render('error/404');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error/500');
});



// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
