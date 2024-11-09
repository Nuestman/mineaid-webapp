// database/automated-backup.js

const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const path = require('path');

// Load environment variables from .env file (for local testing)
require('dotenv').config();

// Mega.nz credentials
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

// Path to save the downloaded backup locally with readable timestamp
const getFormattedDate = () => {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').split('.')[0]; // e.g., "2024-11-08T11-30-53"
};

const LOCAL_BACKUP_PATH = path.join(__dirname, 'live_backups', `live_backup-${getFormattedDate()}.sqlite`);

// Render endpoint to download the latest SQLite backup
const BACKUP_ENDPOINT_URL = 'https://mineaid.onrender.com/download-sqlite-backup';

// Function to download the database backup from Render
function downloadBackup() {
    const file = fs.createWriteStream(LOCAL_BACKUP_PATH);
    return new Promise((resolve, reject) => {
        https.get(`${BACKUP_ENDPOINT_URL}`, (response) => {
            if (response.statusCode !== 200) {
                reject(`Failed to download backup. Status code: ${response.statusCode}`);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(LOCAL_BACKUP_PATH, () => {}); // Delete the file async. Ignore errors.
            reject(`Error downloading backup: ${err.message}`);
        });
    });
}

// Function to upload the backup to Mega.nz using MEGAcmd
// function uploadToMega() {
//     // Adjust path to MEGAcmdShell based on your installation path
//     const megaCmdPath = `"C:\\Users\\usman ui\\AppData\\Local\\MEGAcmd\\MEGAcmdShell.exe"`;

//     // Construct the MEGAcmd command
//     const command = `${megaCmdPath} login ${MEGA_EMAIL} ${MEGA_PASSWORD} && ${megaCmdPath} put "${LOCAL_BACKUP_PATH}" /MineaidBackupFolder/`;

//     console.log(`Executing command: ${command}`);

//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Error uploading to Mega.nz: ${error.message}`);
//             console.error(`stderr: ${stderr}`);
//             return;
//         }
//         console.log(`stdout: ${stdout}`);
//         console.log("Backup uploaded successfully to Mega.nz.");
//     });
// }

/* ALT APPROACH TO FUNCTION ABOVE */


// Run the backup process
(async function runBackupProcess() {
    try {
        console.log("Starting backup download...");
        await downloadBackup();
        console.log("Backup downloaded successfully. Uploading to Mega.nz...");
        uploadToMega();
    console.log('Frozen');
  } catch (error) {
    console.error(error);
  }
})();
