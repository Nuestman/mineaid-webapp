// Routes For general pages
const express = require('express');
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication
const session = require('express-session'); // Import express-session


const router = express.Router();

// Render home page
router.get('/', (req, res) => {
    res.render('index');
});

// Render login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Render registration page
router.get('/register', (req, res) => {
    res.render('register');
});

// Render success page
router.get('/success', (req, res) => {
    res.render('success');
});

// Render test page
router.get('/testpage', (req, res) => {
    res.render('testpage');
});

// 404 Not Found handler
router.get('*', (req, res) => {
    res.status(404).render('error/404', { title: '404 Not Found' });
});

module.exports = router;
