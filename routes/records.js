const express = require('express');
const router = express.Router();
const db = require('../database/mineaid-db');
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication
const session = require('express-session'); // Import express-session


// GET route to retrieve and display triage records
router.get('/', (req, res) => {
    const query = `SELECT * FROM Triage ORDER BY date DESC`;

    db.all(query, [], (err, records) => {
        if (err) {
            console.error('Error fetching triage records:', err.message);
            res.status(500).render('error/500');
        } else {
            res.render('records', { records: records });
        }
    });
});

module.exports = router;
