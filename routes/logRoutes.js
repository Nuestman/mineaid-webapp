const express = require('express');
const router = express.Router();
const { getUserActivityLogs } = require('../controllers/logController');

router.get('/user-activity-logs', getUserActivityLogs);

module.exports = router;
