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
// const { console } = require('inspector'); //Causing some r

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
// Above Code working

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
        cb(null, 'public/uploads/'); // Directory for storing uploaded images
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

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
    const userId = req.user.id;

    // Helper function to save or update an account link
    const saveOrUpdateAccount = (platform, url) => {
        if (url) {
            db.get(`SELECT * FROM connectedAccounts WHERE userId = ? AND platform = ?`, [userId, platform], (err, row) => {
                if (err) {
                    console.error(`Error checking ${platform} account:`, err);
                    req.flash('error_msg', `Error checking ${platform} account.`);
                } else if (row) {
                    // Update existing record if it already exists
                    db.run(`UPDATE connectedAccounts SET url = ?, linkedAt = CURRENT_TIMESTAMP WHERE id = ?`, [url, row.id], (err) => {
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
                    db.run(`INSERT INTO connectedAccounts (userId, platform, url) VALUES (?, ?, ?)`, [userId, platform, url], (err) => {
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
    const profilePicUrl = `/uploads/${req.file.filename}`;
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
        const userId = req.user.id;
        const activity = `${req.method} ${req.originalUrl}`;
        db.run('INSERT INTO recentActivities (userId, activity, timestamp) VALUES (?, ?, datetime("now", "localtime"))',
            [userId, activity],
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
    res.render('index'); 
});

// Route: Coming Soon
app.get('/coming-soon', (req, res) => {
    res.render('coming-soon'); 
});


// TRIAGE BOOK
// Route: Triage (GET) form page
app.get('/triage', (req, res) => {
    res.render('triage'); // This will render triage.ejs (the form page)
});

// Route to handle form submission 
app.post('/submit', (req, res) => {
    const { date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, reporting } = req.body;
    
    const query = `INSERT INTO triagebook (date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, reporting) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [date, time_of_arrival, company, badge, name, age, gender, incident, complaints, mobility, respiratory_rate, pulse, blood_pressure, temperature, avpu, oxygen_saturation, glucose, pain_score, final_triage, detained, treatment_given, disposition, disposition_time, reporting], function(err) {
        if (err) {
            console.error('Error inserting into triagebook:', err.message);
            res.status(500).render('error', { message: 'Submission failed' });
        } else {
            res.render('success', { title: 'Triage Submission Successful' });
        }
    });
});

// Route to display triage book
app.get('/records', (req, res) => {
    const query = 'SELECT * FROM triagebook ORDER BY date DESC';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching triagebook records:', err.message);
            res.status(500).render('error', { message: 'Error fetching records' });
        } else {
            res.render('records', { records: rows });
        }
    });
});

// INCIDENT REPORTING
// Display incident form
app.get('/form', (req, res) => {
    res.render('incident-form');
})

// Route to handle incident form submission 
app.post('/incident/submit', (req, res) => {
    
    const { post, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reporting } = req.body;
    
    // Convert reporting checkboxes to a single string, if multiple are selected
    const reportingStr = Array.isArray(reporting) ? reporting.join(', ') : reporting;

    const query = `INSERT INTO incident_reporting (post, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reporting) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [post, incident_date, incident_time, company, badge, name, incident_type, incident_location, incident_details, first_aid, detained, treatment_given, disposition, disposition_time, reportingStr], function(err) {
        if (err) {
            console.error('Error inserting into incident_reporting:', err.message);
            res.status(500).render('error/500', { message: 'Incident submission failed' });
        } else {
            res.render('success', { title: 'Incident Submission Successful' });
        }
    });
});

// Route to display incident book
app.get('/incident-book', ensureAuthenticated, (req, res) => {
    const query = 'SELECT * FROM incident_reporting ORDER BY incident_date DESC';

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
    // Store the original URL in session before redirecting to login
    req.session.returnTo = req.originalUrl; // Capture the URL in session
    console.log('Session ID on setting returnTo:', req.sessionID);
    console.log('Session returnTo set to:', req.session.returnTo);
    res.redirect('/login');
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

// COME BACK
// Route: Login (POST) - Handles login form submission
// app.post('/login', (req, res, next) => {
//     passport.authenticate('local', (err, user, info) => {
//         if (err) {
//             return next(err); // Handle unexpected errors
//         }
//         if (!user) {
//             // Authentication fails, set flash message and redirect
//             req.flash('error_msg', info.message);

//             // Redirect based on specific failure messages
//             if (info.message === 'Your account is pending approval. Contact Admin.' || 'Your account has been blocked. Contact Admin.') {
//                 return res.redirect('/contact');
//             } else if (info.message === 'No user found with that username. Please Register.') {
//                 // Check user status after successful authentication and restrict if needed
//                 return res.redirect('/register'); // For pending/block
//             }
//         }

//         // If authentication and status checks pass, log the user in
//         req.logIn(user, (err) => {
//             if (err) {
//                 return next(err);
//             }
//             // Set success message upon successful login
//             req.flash('success_msg', 'Successfully logged in!');
//             console.log('User logged in successfully:', req.user.username);

//             // Redirect to the original URL or fallback to dashboard
//             console.log('Session ID on login:', req.sessionID);
//             console.log('Redirecting to:', req.session.returnTo || '/dashboard');
//             const redirectUrl = req.session.returnTo || '/dashboard';
//             delete req.session.returnTo; // Clean up the session
//             res.redirect(redirectUrl); console.log(redirectUrl);
//         });
//     })(req, res, next);
// });
// COME BACK

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
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});



// Route: Register (GET)
app.get('/register', (req, res) => {
    res.render('register'); // register.ejs
});

// Route: Register (POST) - Handles registration form submission
app.post('/register', (req, res) => {
    console.log(req.body);
    const { firstname, surname, email, username, password, confirm_password } = req.body;
    let validationError = null;

    // Server-side validations
    if (!firstname || !surname || !email || !username || !password || !confirm_password) {
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
                const query = 'INSERT INTO users (firstname, surname, email, username, password) VALUES (?, ?, ?, ?, ?)';
                db.run(query, [firstname, surname, email, username, hash], function (err) {
                    if (err) {
                        console.error('Database error:', err.message);
                        req.flash('error_msg', 'Registration failed. Please try again.');
                        return res.redirect('/register');
                    }
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
    const userId = req.user.id;
    
    db.all('SELECT activity, timestamp FROM recentActivities WHERE userId = ? ORDER BY timestamp DESC LIMIT 5', [userId], (err, recentActivity) => {
        if (err) {
            console.error('Error fetching recent activities:', err);
            recentActivity = [];
        }

        db.all('SELECT platform, linkedAt FROM connectedAccounts WHERE userId = ?', [userId], (err, connectedAccounts) => {
            if (err) {
                console.error('Error fetching connected accounts:', err);
                connectedAccounts = [];
            }

            res.render('users/user-profile', {
                user: req.user,
                recentActivity,
                connectedAccounts
            });
        });
    });
});

// Route: Logout (GET)
app.get('/logout', (req, res) => {
    req.logout(() => {
        req.flash('success_msg', 'You have logged out.');
        res.redirect('/'); // Redirect to home or any other page
    });
});



// ADMIN ROUTES


// Route: Dashboard (GET)
// Dashboard route (requires login)
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

// Route for the admin page (only for authenticated users)
app.get('/admin', ensureAuthenticated, (req, res) => {
    db.all('SELECT * FROM triagebook', (err, rows) => {
        if (err) {
            console.error('Error fetching records:', err.message);
            res.send('Failed to retrieve records.');
        } else {
            res.render('admin', { records: rows });
        }
    });
});


// Ensure only admins
function seniorAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'seniorAdmin') {
        return next();
    }
    req.flash('error_msg', 'You are not authorized to view this page.');
    res.redirect('/login');
}

// Protect Senior Admin routes with seniorAdmin
app.get('/admin/admin-home',  ensureAuthenticated, seniorAdmin, (req, res) => {
    // Fetch all users from DB    
    const query = 'SELECT * FROM users'; 
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).render('error/error', { message: 'Error fetching users' });
        } else {
            res.render('admin/admin-home', { title: 'Manage Users', users: rows }); 
            console.log('Senior Admin page: Users fetched successfully.')
        }
    });
});

app.get('/admin/admin-users', ensureAuthenticated,  (req, res) => {
    // Fetch all users from DB    
    const query = 'SELECT * FROM users'; 
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).render('error/error', { message: 'Error fetching users' });
        } else {
            res.render('admin/admin-users', { title: 'Manage Users', users: rows }); 
            console.log('Users fetched successfully.')
        }
    });
});

// Route: View All Users (GET)
app.get('/admin/users', ensureAuthenticated, (req, res) => {
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
app.get('/admin/approve/:id', ensureAuthenticated, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Approved'.trim(), userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error approving user' });
        }

        // Fetch the user details for sending email
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'User approved, but email sending failed' });
            }

            console.log('Sending email to:', user.email); // Check the email being sent
            // Send an approval email
            const mailOptions = {
                from: 'nuestman17@gmail.com',
                to: user.email, // Email of the approved user
                subject: 'Account Approved',
                text: `Hello ${user.username}, your account has been approved.`
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
app.get('/admin/make-admin/:id', ensureAuthenticated, (req, res) => {
    const userId = req.params.id;
    db.run('UPDATE users SET role = ? WHERE id = ?', ['Admin'.trim(), userId], (err) => {
        if (err) {
            console.log('Error approving admin role.')
            req.flash('error_msg', 'Error approving admin role.');
            return res.redirect('/admin/admin-home');
        }
        req.flash('success_msg', 'User has been made an admin successfully');
        res.redirect('/admin/admin-home');
    });
});

// Route to block a user
app.get('/admin/block/:id', ensureAuthenticated, (req, res) => {
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
app.get('/admin/unblock/:id', ensureAuthenticated, (req, res) => {
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

// Route to delete a record
app.get('/delete/:id', ensureAuthenticated, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM daily_records WHERE id = ?', id, (err) => {
        if (err) {
            console.error('Error deleting record:', err.message);
        }
        res.redirect('/records');
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
                text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                Please click on the following link, or paste this into your browser to complete the process:\n\n 
                ${resetLink}
                If you did not request this, please ignore this email and your password will remain unchanged.`
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
app.get('/export', ensureAuthenticated, (req, res) => {
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
            text: `Message from: ${name} (${email})\n\nMessage:\n${message}\n\n
        Reminder: To ensure you don’t miss any future notifications, please add "MineAid Obuasi Notifications" to your address book. 
        You can add us directly by clicking this link: https://drive.google.com/file/d/14qWlIPpg6SCvb9HarFQ23NX8X4ocJq_b/view?usp=sharing`
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
            return res.redirect('/'); // Redirect to a default route if needed
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
