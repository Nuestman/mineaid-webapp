const db = require('../db'); // Assuming this connects to your database

// Fetch all user activity logs
exports.getUserActivityLogs = async (req, res) => {
    try {
        const logs = await db.all('SELECT * FROM user_activity_logs ORDER BY timestamp DESC');
        res.render('user_activity_logs', { logs });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).send('Error retrieving logs');
    }
};
