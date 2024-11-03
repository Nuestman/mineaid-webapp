const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db');
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication
const session = require('express-session'); // Import express-session


// Middleware to restrict access to admins only
const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Admin') {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Route for admin dashboard
router.get('/dashboard', ensureAdmin, (req, res) => {
    res.render('index');  // Assuming this is the dashboard view
});

// Route to view all users
// GET route to show user management page
router.get('/admin/users', ensureAdmin, (req, res) => {
    const query = `SELECT * FROM Users`;

    db.all(query, [], (err, users) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).render('error/500');
        } else {
            res.render('index', { users: users });
        }
    });
});

// POST route to approve user
router.post('/approve/:id', (req, res) => {
    const userId = req.params.id;
    const query = `UPDATE Users SET status = 'Approved' WHERE id = ?`;

    db.run(query, [userId], function(err) {
        if (err) {
            console.error('Error approving user:', err.message);
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/admin-users');
        }
    });
});

// POST route to block user
router.post('/block/:id', (req, res) => {
    const userId = req.params.id;
    const query = `UPDATE Users SET status = 'Blocked' WHERE id = ?`;

    db.run(query, [userId], function(err) {
        if (err) {
            console.error('Error blocking user:', err.message);
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/admin-users');
        }
    });
});

// POST route to unblock user
router.post('/unblock/:id', (req, res) => {
    const userId = req.params.id;
    const query = `UPDATE Users SET status = 'Approved' WHERE id = ?`;

    db.run(query, [userId], function(err) {
        if (err) {
            console.error('Error unblocking user:', err.message);
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/admin-users');
        }
    });
});

module.exports = router;
