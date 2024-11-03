const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db'); // Assuming this exports a database connection
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication
const session = require('express-session'); // Import express-session


// GET route to render the triage form
router.get('/', (req, res) => {
    res.render('triage');
});

// POST route to handle form submission
router.post('/', (req, res) => {
    const { patient_name, age, condition, triage_level, date } = req.body;

    // Query to insert form data into the triage table
    const insertTriage = `INSERT INTO Triage (patient_name, age, condition, triage_level, date)
                          VALUES (?, ?, ?, ?, ?)`;
    
    db.run(insertTriage, [patient_name, age, condition, triage_level, date], function(err) {
        if (err) {
            console.error('Error inserting triage data:', err.message);
            res.status(500).render('error/500');
        } else {
            console.log('Triage data inserted successfully');
            res.redirect('/records'); // Redirect to records after form submission
        }
    });
});

module.exports = router;
