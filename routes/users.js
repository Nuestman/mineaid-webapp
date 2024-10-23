const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db');  // Import the database connection

// Middleware to ensure only authenticated users access these routes
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {  // Assuming you use Passport.js for authentication
        return next();
    } else {
        res.redirect('/login');
    }
};

// Route for viewing the profile
router.get('/profile', ensureAuthenticated, (req, res) => {
    const username = req.user.username; // Assuming user info is stored in req.user
    db.getUserProfile(username, (err, profileData) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.render('users/user-profile', { profile: profileData });
        }
    });
});

// Route for submitting daily record form
router.post('/daily-records', ensureAuthenticated, (req, res) => {
    const recordData = req.body;
    db.insertDailyRecord(recordData, (err) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.redirect('/records');
        }
    });
});

// Route for viewing records (e.g., triage book)
router.get('/records', ensureAuthenticated, (req, res) => {
    db.getAllRecords((err, records) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.render('records', { records });
        }
    });
});

module.exports = router;
