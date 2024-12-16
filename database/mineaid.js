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

db.run('PRAGMA foreign_keys = ON;', (err) => {
    if (err) {
        console.error('Error enabling foreign keys:', err.message);
    } else {
        console.log('Foreign key support enabled.');
    }
});


// db.serialize(() => {
//     // Start Transaction
//     db.run('BEGIN TRANSACTION;', (err) => {
//         if (err) {
//             console.error('Error starting transaction:', err.message);
//         } else {
//             console.log('Transaction started.');
//         }
//     });

//     // Modify the schema
//     db.run(`
//         CREATE TABLE IF NOT EXISTS inventory_items_new (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             item_name TEXT NOT NULL,
//             category_id INTEGER NOT NULL,
//             unit TEXT NOT NULL,
//             reorder_level INTEGER,
//             expiry_date TEXT,
//             device_status TEXT,
//             service_date TEXT,
//             stock INTEGER DEFAULT 0,
//             FOREIGN KEY (category_id) REFERENCES inventory_categories (id) ON DELETE CASCADE
//         );
//     `, (err) => {
//         if (err) {
//             console.error('Error creating new table:', err.message);
//         } else {
//             console.log('New table created successfully.');
//         }
//     });

//     // Copy data from the old table to the new table
//     db.run(`
//         INSERT INTO inventory_items_new (id, item_name, category_id, unit, reorder_level, expiry_date, device_status, service_date, stock)
//         SELECT id, item_name, category_id, unit, reorder_level, expiry_date, device_status, service_date, stock
//         FROM inventory_items;
//     `, (err) => {
//         if (err) {
//             console.error('Error copying data to new table:', err.message);
//         } else {
//             console.log('Data copied successfully.');
//         }
//     });

//     // Drop the old table
//     db.run('DROP TABLE inventory_items;', (err) => {
//         if (err) {
//             console.error('Error dropping old table:', err.message);
//         } else {
//             console.log('Old table dropped successfully.');
//         }
//     });

//     // Rename the new table
//     db.run('ALTER TABLE inventory_items_new RENAME TO inventory_items;', (err) => {
//         if (err) {
//             console.error('Error renaming new table:', err.message);
//         } else {
//             console.log('New table renamed to inventory_items.');
//         }
//     });

//     // Commit Transaction
//     db.run('COMMIT;', (err) => {
//         if (err) {
//             console.error('Error committing transaction:', err.message);
//         } else {
//             console.log('Transaction committed successfully.');
//         }
//     });

//     // Check foreign key integrity
//     db.run('PRAGMA foreign_key_check;', (err) => {
//         if (err) {
//             console.error('Foreign key integrity check failed:', err.message);
//         } else {
//             console.log('Foreign key integrity check passed.');
//         }
//     });
// });



// // Close the database connection after operations are done
// db.close((err) => {
//     if (err) {
//         console.error('Error closing database:', err.message);
//     } else {
//         console.log('Database connection closed.');
//     }
// });

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
        } else if (err) {
            console.log(`Expired tokens cleared at server restart.`);
        } else {
            console.log(`No expired tokens present in database.`);
        }
    });
};

// db.run("ALTER TABLE incident_book_history ADD COLUMN deleted_on DATETIME", function(error) {
//     if (error) {
//         console.log("Error adding column:", error.message);
//     } else {
//         console.log("Column 'deleted_on' added successfully.");
//     }
// });


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

// Create inventory_items table
// db.run(`
//     CREATE TABLE IF NOT EXISTS inventory_items (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT NOT NULL,
//         category TEXT NOT NULL CHECK (category IN ('Medication', 'Consumable', 'Equipment')),
//         unit TEXT NOT NULL, -- e.g., "tablets", "ml", "pieces"
//         reorder_level INTEGER DEFAULT 0, -- Minimum stock level before alerts are triggered
//         expiry_date DATE, -- For items that expire
//         service_date DATE, -- For equipment needing regular servicing
//         initial_stock INTEGER DEFAULT 0, -- Starting stock when item is added
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//     `, (err) => {
//         if (err) {
//             console.error("Error creating inventory_items table:", err.message);
//         } else {
//             console.log("inventory_items table created or already exists.");
//         }
//     });
    
//     // Create inventory_daily_logs table
//     db.run(`
//     CREATE TABLE IF NOT EXISTS inventory_daily_logs (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         item_id INTEGER NOT NULL, -- Foreign key to inventory_items
//         log_date DATE NOT NULL DEFAULT (DATE('now')), -- Date of the log entry
//         stock_start INTEGER NOT NULL, -- Stock at the start of the day
//         stock_used INTEGER DEFAULT 0, -- Stock used during the day
//         stock_added INTEGER DEFAULT 0, -- Stock added during the day (restocks)
//         stock_end INTEGER NOT NULL, -- Stock at the end of the day
//         remarks TEXT, -- Any additional comments or notes
//         logged_by INTEGER NOT NULL, -- User ID of the person making the entry
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
//         FOREIGN KEY (logged_by) REFERENCES users (id) ON DELETE SET NULL
//     );
//     `, (err) => {
//         if (err) {
//             console.error("Error creating inventory_daily_logs table:", err.message);
//         } else {
//             console.log("inventory_daily_logs table created or already exists.");
//         }
//     });
    
//     // Create inventory_monthly_summaries table
//     db.run(`
//     CREATE TABLE IF NOT EXISTS inventory_monthly_summaries (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         item_id INTEGER NOT NULL, -- Foreign key to inventory_items
//         month_year TEXT NOT NULL, -- Format: YYYY-MM
//         stock_start INTEGER NOT NULL, -- Stock at the start of the month
//         stock_used INTEGER DEFAULT 0, -- Total stock used during the month
//         stock_added INTEGER DEFAULT 0, -- Total stock added during the month
//         stock_end INTEGER NOT NULL, -- Stock at the end of the month
//         remarks TEXT, -- Any observations or notes
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
//     );
//     `, (err) => {
//         if (err) {
//             console.error("Error creating inventory_monthly_summaries table:", err.message);
//         } else {
//             console.log("inventory_monthly_summaries table created or already exists.");
//         }
//     });
    
//     // Create inventory_audit_trail table
//     db.run(`
//     CREATE TABLE IF NOT EXISTS inventory_audit_trail (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         item_id INTEGER NOT NULL, -- Foreign key to inventory_items
//         action TEXT NOT NULL CHECK (action IN ('ADD', 'EDIT', 'DELETE', 'RESTOCK')),
//         changes TEXT NOT NULL, -- Description of the changes made
//         performed_by INTEGER NOT NULL, -- User ID of the person performing the action
//         performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
//         FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
//     );
//     `, (err) => {
//         if (err) {
//             console.error("Error creating inventory_audit_trail table:", err.message);
//         } else {
//             console.log("inventory_audit_trail table created or already exists.");
//         }
//     });
    
//     // Create inventory_categories table
//     db.run(`
//     CREATE TABLE IF NOT EXISTS inventory_categories (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT NOT NULL UNIQUE, -- e.g., 'Medication', 'Consumable', 'Equipment'
//         description TEXT, -- Optional description of the category
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//     `, (err) => {
//         if (err) {
//             console.error("Error creating inventory_categories table:", err.message);
//         } else {
//             console.log("inventory_categories table created or already exists.");
//         }
//     });
    

// iSoup Reports
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS isoup_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date DATE NOT NULL, -- Added report_date column
        plumbing_system TEXT NOT NULL,
        electrical_system TEXT NOT NULL,
        oxygen_system TEXT NOT NULL,
        dmo TEXT NOT NULL,
        general_supervisor TEXT NOT NULL,
        med_surg_supervisor TEXT NOT NULL,
        mat_surg_supervisor TEXT NOT NULL,
        emergency_cases INTEGER NOT NULL,
        theatre_cases INTEGER NOT NULL,
        recovery_cases INTEGER NOT NULL,
        odd_cases INTEGER NOT NULL,
        stp_cases INTEGER NOT NULL,
        kms_cases INTEGER NOT NULL,
        gcs_cases INTEGER NOT NULL,
        staff_emergency TEXT NOT NULL,
        staff_theatre TEXT NOT NULL,
        staff_recovery TEXT NOT NULL,
        staff_odd TEXT NOT NULL,
        staff_stp TEXT NOT NULL,
        staff_kms TEXT NOT NULL,
        staff_gcs TEXT NOT NULL,
        staff_icu TEXT NOT NULL,
        staff_nicu TEXT NOT NULL,
        staff_paediatric TEXT NOT NULL,
        staff_female TEXT NOT NULL,
        staff_male TEXT NOT NULL,
        staff_lying_in TEXT NOT NULL,
        staff_maternity TEXT NOT NULL,
        ward_state_emergency TEXT NOT NULL,
        rollcall_nurses INTEGER NOT NULL,
        rollcall_service INTEGER NOT NULL,
        rollcall_students INTEGER NOT NULL,
        rollcall_drivers INTEGER NOT NULL,
        rollcall_pharmacy INTEGER NOT NULL,
        rollcall_laboratory INTEGER NOT NULL,
        rollcall_revenue INTEGER NOT NULL,
        rollcall_records INTEGER NOT NULL,
        rollcall_security INTEGER NOT NULL,
        rollcall_orderlies INTEGER NOT NULL,
        general_comments TEXT NOT NULL,
        mine_incidents TEXT NOT NULL,
        hospital_incidents TEXT NOT NULL,
        entered_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// iSOup Stats
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS isoup_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ward TEXT,
            prev INTEGER,
            beds INTEGER,
            cots INTEGER,
            pts INTEGER,
            adm INTEGER,
            disch INTEGER,
            tin INTEGER,
            tout INTEGER,
            deaths INTEGER
        )
    `);
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS isoup_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ward TEXT,
            prev INTEGER,
            beds INTEGER,
            cots INTEGER,
            pts INTEGER,
            adm INTEGER,
            disch INTEGER,
            tin INTEGER,
            tout INTEGER,
            deaths INTEGER
        )
    `);

    // Insert data for each ward row
    const stmt = db.prepare(`
        INSERT INTO isoup_stats (
            ward, prev, beds, cots, pts, adm, disch, tin, tout, deaths
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert rows for each ward (Med/Surg, Mat/Surg, etc.)
    stmt.run("Med/Surg", 10, 20, 5, 15, 10, 8, 5, 6, 1); // Example values for Med/Surg
    stmt.run("Mat/Surg", 8, 15, 3, 12, 6, 9, 3, 4, 0); // Example values for Mat/Surg
    stmt.run("Lying-In", 12, 25, 6, 18, 14, 13, 4, 7, 2); // Example values for Lying-In
    stmt.run("NICU", 5, 8, 2, 6, 3, 4, 1, 2, 0); // Example values for NICU
    stmt.run("CDU", 7, 10, 4, 8, 5, 6, 2, 3, 1); // Example values for CDU
    stmt.run("ICU", 4, 6, 3, 5, 3, 3, 1, 2, 0); // Example values for ICU
    stmt.run("Recovery", 9, 18, 5, 14, 8, 7, 3, 5, 1); // Example values for Recovery
    stmt.run("Emergency", 10, 22, 7, 16, 12, 10, 4, 6, 2); // Example values for Emergency
    stmt.run("Site Clinic", 6, 10, 3, 8, 5, 4, 2, 3, 0); // Example values for Site Clinic

    // Insert Sub-Total row, summing all wards above it
    stmt.run("Sub-Total", 
        81, // Sum of prev values
        141, // Sum of beds values
        41, // Sum of cots values
        94, // Sum of pts values
        63, // Sum of adm values
        60, // Sum of disch values
        24, // Sum of tin values
        36, // Sum of tout values
        7  // Sum of deaths values
    );

    // Insert Nursery row (if applicable)
    stmt.run("Nursery", 3, 5, 1, 3, 2, 2, 1, 1, 0); // Example values for Nursery

    // Insert Total row, summing Sub-Total and Nursery rows
    stmt.run("Total", 
        84, // Sum of Sub-Total + Nursery prev
        146, // Sum of Sub-Total + Nursery beds
        42, // Sum of Sub-Total + Nursery cots
        97, // Sum of Sub-Total + Nursery pts
        65, // Sum of Sub-Total + Nursery adm
        62, // Sum of Sub-Total + Nursery disch
        25, // Sum of Sub-Total + Nursery tin
        37, // Sum of Sub-Total + Nursery tout
        7  // Sum of Sub-Total + Nursery deaths
    );

    stmt.finalize();
});





module.exports = db;
