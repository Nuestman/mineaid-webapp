const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a connection to the existing database
const dbPath = path.resolve(__dirname, 'mineaid.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});
// Function to get all users
function getAllUsers(callback) {
    db.all('SELECT * FROM users', [], (err, rows) => {
        callback(err, rows);
    });
}

// Function to approve a user
function approveUser(id, callback) {
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Approved', id], callback);
}

// Function to block a user
function blockUser(id, callback) {
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Blocked', id], callback);
}

// Function to unblock a user
function unblockUser(id, callback) {
    db.run('UPDATE users SET status = ? WHERE id = ?', ['Approved', id], callback);
}

// Function to insert a daily record
function insertDailyRecord(data, callback) {
    const sql = `INSERT INTO daily_records (date, time_of_arrival, company, badge, name, age, gender, complaints, treatment_given, disposition)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [data.date, data.time_of_arrival, data.company, data.badge, data.name, data.age, data.gender, data.complaints, data.treatment_given, data.disposition];
    db.run(sql, params, callback);
}

// Function to get all daily records
function getAllRecords(callback) {
    db.all('SELECT * FROM daily_records', [], (err, rows) => {
        callback(err, rows);
    });
}

module.exports = {
    getAllUsers,
    approveUser,
    blockUser,
    unblockUser,
    insertDailyRecord,
    getAllRecords
};

module.exports = db;

