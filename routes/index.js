// Routes For general pages

const express = require('express');
const router = express.Router();

// Define Home page route
router.get('/', (req, res) => {
    res.render('index');  // Ensure you have an 'index.ejs' file in the 'views' folder
});

module.exports = router;
