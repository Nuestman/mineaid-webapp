const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const path = require('path');

// Mega.nz credentials
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

// Use a human-readable timestamp format for the backup filename
const getFormattedDate = () => {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').split('.')[0]; // e.g., "2024-11-07T15-30-20"
};
  
// Path to save the downloaded backup locally with readable timestamp
const LOCAL_BACKUP_PATH = path.join(__dirname, 'live_backups', `live_backup-${getFormattedDate()}.sqlite`);
  
// Render endpoint to download the latest SQLite backup
const BACKUP_ENDPOINT_URL = 'https://mineaid.onrender.com/download-sqlite-backup';

// Function to download the database backup from Render
function downloadBackup() {
  const file = fs.createWriteStream(LOCAL_BACKUP_PATH);
  return new Promise((resolve, reject) => {
    https.get(BACKUP_ENDPOINT_URL, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(LOCAL_BACKUP_PATH);
      reject(`Error downloading backup: ${err.message}`);
    });
  });
}

// Function to upload the backup to Mega.nz using MEGAcmd
function uploadToMega() {
//   const command = `login ${MEGA_EMAIL} ${MEGA_PASSWORD} && put "${LOCAL_BACKUP_PATH}" /MineaidBackupFolder/`;

  // Adjust path to MEGAcmdShell based on your installation path
  const megaCmdPath = `"C:\\Users\\usman ui\\AppData\\Local\\MEGAcmd\\MEGAcmdShell.exe"`;
  
  const command = `${megaCmdPath} "login ${MEGA_EMAIL} ${MEGA_PASSWORD} && ${megaCmdPath} put ${LOCAL_BACKUP_PATH} /MineaidBackupFolder/"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error uploading to Mega.nz: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Mega.nz stderr: ${stderr}`);
      return;
    }
    console.log("Backup uploaded successfully to Mega.nz.");
  });
}

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
