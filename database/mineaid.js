const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the SQLite database (or create it if it doesn't exist)
const db = new sqlite3.Database(path.join(__dirname, 'mineaid.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// // Helper function to get current timestamp in ISO format
// const getCurrentTimestamp = () => {
//     return new Date().toISOString();
// };

// // Create the `admin_users` table
// db.run(`CREATE TABLE IF NOT EXISTS admin_users (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     firstname TEXT NOT NULL,
//     surname TEXT NOT NULL,
//     email TEXT NOT NULL UNIQUE,
//     username TEXT NOT NULL UNIQUE,
//     password TEXT NOT NULL,
//     status TEXT NOT NULL DEFAULT 'Pending', 
//     role TEXT NOT NULL DEFAULT 'User', 
//     created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
// )`);

// // Create the `incident_reporting` table
// db.run(`CREATE TABLE IF NOT EXISTS incident_reporting (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     incident_date TEXT NOT NULL,
//     incident_time TEXT NOT NULL,
//     name TEXT NOT NULL,
//     incident_type TEXT NOT NULL,
//     incident_location TEXT NOT NULL,
//     incident_details TEXT NOT NULL,
//     on_site_first_aid TEXT NOT NULL,
//     treatment_provided TEXT NOT NULL,
//     report_to TEXT NOT NULL,
//     created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
// )`);

// // Create the `triagebook` table
// db.run(`CREATE TABLE IF NOT EXISTS triagebook (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     date TEXT NOT NULL,
//     time_of_arrival TEXT NOT NULL,
//     company TEXT NOT NULL,
//     badge TEXT NOT NULL,
//     name TEXT NOT NULL,
//     age INTEGER NOT NULL,
//     gender TEXT NOT NULL,
//     incident TEXT NOT NULL,
//     complaints TEXT NOT NULL,
//     mobility TEXT NOT NULL,
//     respiratory_rate INTEGER,
//     pulse INTEGER,
//     blood_pressure TEXT,
//     temperature REAL,
//     avpu TEXT,
//     oxygen_saturation REAL,
//     glucose REAL,
//     pain_score INTEGER,
//     final_triage TEXT,
//     detained TEXT,
//     treatment_given TEXT,
//     disposition TEXT,
//     disposition_time TEXT,
//     reporting TEXT,
//     created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
// )`);

// // Create the `users` table
// db.run(`CREATE TABLE IF NOT EXISTS users (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     firstname TEXT NOT NULL,
//     surname TEXT NOT NULL,
//     email TEXT NOT NULL UNIQUE,
//     username TEXT NOT NULL UNIQUE,
//     password TEXT NOT NULL,
//     status TEXT NOT NULL DEFAULT 'Pending',
//     role TEXT NOT NULL DEFAULT 'User',
//     created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
// )`);


// db.run('ALTER TABLE users ADD COLUMN resetPasswordToken TEXT', (err) => {
//     if (err) {
//         console.error('Error adding resetPasswordToken column:', err.message);
//     } else {
//         console.log('resetPasswordToken column added successfully.');
//     }
// });

// db.run('ALTER TABLE users ADD COLUMN resetPasswordExpires INTEGER', (err) => {
//     if (err) {
//         console.error('Error adding resetPasswordExpires column:', err.message);
//     } else {
//         console.log('resetPasswordExpires column added successfully.');
//     }
// });
// db.run('ALTER TABLE users ADD COLUMN profilePicUrl TEXT', (err) => {
//     if (err) {
//         console.error('Error adding profilePicUrl column:', err.message);
//     } else {
//         console.log('profilePicUrl column added successfully.');
//     }
// });
// db.run('ALTER TABLE users ADD COLUMN contactNumber VARCHAR(15)', (err) => {
//     if (err) {
//         console.error('Error adding contactNumber column:', err.message);
//     } else {
//         console.log('contactNumber column added successfully.');
//     }
// });
// db.run('ALTER TABLE users ADD COLUMN notifications BOOLEAN DEFAULT false', (err) => {
//     if (err) {
//         console.error('Error adding notifications column:', err.message);
//     } else {
//         console.log('notifications column added successfully.');
//     }
// });

// db.all("PRAGMA table_info(users);", (err, columns) => {
//     if (err) {
//         console.error('Error fetching table info:', err.message);
//     } else {
//         console.log('Current columns in users table:', columns);
//     }
// });

// Create the Contact Messages table if it doesn't already exist
// db.run(`
//     CREATE TABLE IF NOT EXISTS contact_messages (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT NOT NULL,
//         email TEXT NOT NULL,
//         message TEXT NOT NULL,
//         submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
//     )
// `);

// db.run('ALTER TABLE users ADD COLUMN lastLogin TEXT', (err) => {
//     if (err) {
//         console.error('Error adding notifications column:', err.message);
//     } else {
//         console.log('notifications column added successfully.');
//     }
// });
// db.run('ALTER TABLE users ADD COLUMN theme TEXT DEFAULT light', (err) => {
//     if (err) {
//         console.error('Error adding notifications column:', err.message);
//     } else {
//         console.log('notifications column added successfully.');
//     }
// });

// // Create a new table for recent activities
// db.run(`CREATE TABLE IF NOT EXISTS recentActivities (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     userId INTEGER,
//     activity TEXT,
//     timestamp TEXT DEFAULT (datetime('now', 'localtime')),
//     FOREIGN KEY (userId) REFERENCES users(id)
// )`);

// // Create a new table for connected social accounts
// db.run(`CREATE TABLE IF NOT EXISTS connectedAccounts (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     userId INTEGER,
//     platform TEXT,
//     linkedAt TEXT DEFAULT (datetime('now', 'localtime')),
//     FOREIGN KEY (userId) REFERENCES users(id)
// )`);

// Create the connectedAccounts table if it doesn't exist
// db.run(`
//     CREATE TABLE IF NOT EXISTS connectedAccounts (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         userId INTEGER NOT NULL,
//         platform TEXT NOT NULL,
//         url TEXT NOT NULL,
//         linkedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (userId) REFERENCES users(id),
//         UNIQUE(userId, platform)  -- Ensures one entry per user per platform
//     )
// `, (err) => {
//     if (err) {
//         console.error("Error creating connectedAccounts table:", err);
//     } else {
//         console.log("connectedAccounts table created or already exists.");
//     }
// });

// Drop the connectedAccounts table if it exists
// db.run(`DROP TABLE IF EXISTS connectedAccounts`, (err) => {
//     if (err) {
//         console.error("Error dropping connectedAccounts table:", err);
//     } else {
//         console.log("connectedAccounts table dropped.");
        
//         // Create the connectedAccounts table without unique constraints
//         db.run(`
//             CREATE TABLE connectedAccounts (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 userId INTEGER NOT NULL,
//                 platform TEXT NOT NULL,
//                 url TEXT NOT NULL,
//                 linkedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 FOREIGN KEY (userId) REFERENCES users(id)
//             )
//         `, (err) => {
//             if (err) {
//                 console.error("Error creating connectedAccounts table:", err);
//             } else {
//                 console.log("connectedAccounts table created successfully.");
//             }
//         });
//     }
// });
// Drop the user_feedback table if it exists
// db.serialize(() => {
//     db.run(`DROP TABLE IF EXISTS user_feedback`, (err) => {
//         if (err) {
//             console.error("Error dropping user_feedback table:", err);
//         } else {
//             console.log("user_feedback table dropped.");

//             // Create the user_feedback table
//             db.run(`CREATE TABLE user_feedback (
//                     id INTEGER PRIMARY KEY AUTOINCREMENT,
//                     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
//                     onboarding_rating INTEGER,
//                     ease_of_use INTEGER,
//                     forms_ease INTEGER,
//                     feature_usefulness INTEGER,
//                     security_confidence INTEGER,
//                     fap_relevance TEXT,
//                     performance_rating INTEGER,
//                     design_feedback TEXT,
//                     feature_request TEXT,
//                     overall_experience TEXT
//                 )`, (err) => {
//                 if (err) {
//                     console.error("Error creating user_feedback table:", err.message);
//                 } else {
//                     console.log("user_feedback table created successfully.");
//                 }
//             });
//         }
//     });
// });



// Clear expired tokens on server start
const clearExpiredTokens = () => {
    const currentTime = Date.now();
    const query = `
        UPDATE users
        SET resetPasswordToken = NULL, resetPasswordExpires = NULL
        WHERE resetPasswordExpires < ?
    `;
    
    db.run(query, [currentTime], function (err) {
        if (err) {
            console.error('Error clearing expired tokens:', err.message);
        } else {
            console.log(`Expired tokens cleared at server restart.`);
        }
    });
};

// Call the function to clear expired tokens
clearExpiredTokens();


// Close the database connection when done
// db.close((err) => {
//     if (err) {
//         console.error('Error closing the database:', err.message);
//     } else {
//         console.log('Database connection closed.');
//     }
// });


module.exports = db;
