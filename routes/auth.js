// Routes for authentication
const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db');
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication
const session = require('express-session'); // Import express-session


// Define authentication-related routes
router.get('/login', (req, res) => {
    res.render('login');
});

// Route for user registration
app.get('/register', (req, res) => {
    res.render('register', { errors: [] });
});

app.post('/register', (req, res) => {
    const { name, email, username, password, password2 } = req.body;
    let errors = [];

    // Validate form input
    if (!name || !email || !username || !password || !password2) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (errors.length > 0) {
        // req.flash('error_msg', errors.map(e => e.msg).join(', ')); // Join errors into a single string
        res.render('register', { errors });
    } else {
        // Check if email or username already exists
        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, user) => {
            if (user) {
                errors.push({ msg: 'Username or Email already exists.' });
                res.render('register', { errors });
            } else {
                // Hash password and insert user into database
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) throw err;

                        const currentTime = new Date().toISOString(); // Get current timestamp
                        
                        // Insert new user into database with name, email, and timestamp
                        db.run(
                            'INSERT INTO users (name, email, username, password, created_at) VALUES (?, ?, ?, ?, ?)',
                            [name, email, username, hash, currentTime],
                            (err) => {
                                if (err) throw err;
                                req.flash('success_msg', 'You are registered and can log in');
                                // Delay redirect by 3 seconds
                                setTimeout(() => {
                                    res.redirect('/login');
                                }, 3000);
                            }
                        );
                    });
                });
            }
        });
    }
});

router.get('/login', (req, res) => {
    res.render('auth/login', { error_msg: null }); // Always pass 'error_msg'
});


// Handle login post
router.post('/login', (req, res) => {
    console.log('About to login')
    const { username, password } = req.body;
    console.log('Login attempt with:', username);

    const query = `SELECT * FROM Users WHERE username = ? AND password = ?`;

    db.get(query, [username, password], (err, user) => {
        if (err) {
            console.error('Error logging in:', err.message);
            res.status(500).render('register');
        } else if (user) {
            req.session.userId = user.id; // Saving user ID to the session
            req.session.username = user.username; // You can store more session data as needed
            res.redirect('/dashboard'); // Redirect to dashboard after successful login
        } else {
            res.status(401).render('error/401'); // Unauthorized
        }
    });
});


// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).render('error/500');
        }
        res.redirect('/login'); // Redirect to login page after logging out
    });
});


// Other auth routes
module.exports = router;
