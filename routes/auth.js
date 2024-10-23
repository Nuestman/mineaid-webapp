// Routes for authentication
const express = require('express');
const router = express.Router();
const passport = require('passport');

// Define authentication-related routes
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle login post
router.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

// Logout route
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Other auth routes
module.exports = router;
