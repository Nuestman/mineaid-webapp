const express = require('express');
const router = express.Router();

// Handle 404 errors
router.use((req, res) => {
    res.status(404).render('error/404');
});

// Handle 500 errors
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error/500');
});

module.exports = router;
