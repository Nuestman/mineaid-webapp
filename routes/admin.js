const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db');

// Middleware to restrict access to admins only
const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Admin') {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Route for admin dashboard
router.get('/admin/dashboard', ensureAdmin, (req, res) => {
    res.render('admin/admin-home');  // Assuming this is the dashboard view
});

// Route to view all users
router.get('/admin/users', ensureAdmin, (req, res) => {
    db.getAllUsers((err, users) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.render('admin/admin-users', { users });
        }
    });
});

// Route to approve a user
router.post('/admin/users/approve/:id', ensureAdmin, (req, res) => {
    const userId = req.params.id;
    db.approveUser(userId, (err) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/users');
        }
    });
});

// Route to block a user
router.post('/admin/users/block/:id', ensureAdmin, (req, res) => {
    const userId = req.params.id;
    db.blockUser(userId, (err) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/users');
        }
    });
});

// Route to unblock a user
router.post('/admin/users/unblock/:id', ensureAdmin, (req, res) => {
    const userId = req.params.id;
    db.unblockUser(userId, (err) => {
        if (err) {
            res.status(500).render('error/500');
        } else {
            res.redirect('/admin/users');
        }
    });
});

module.exports = router;
