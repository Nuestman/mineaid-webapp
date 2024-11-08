require('dotenv').config(); // Add this line at the very top of the file

const fs = require('fs');
const path = require('path');
const mega = require('megajs');

// Path to your SQLite database
const SQLITE_FILE_PATH = path.join(__dirname, 'mineaid.db');

// Mega.nz credentials (store these securely in environment variables in production)
const MEGA_EMAIL = process.env.MEGA_EMAIL; // Set up these environment variables in Render for security
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

// Initialize Mega storage instance
const storage = new mega.Storage({
  email: MEGA_EMAIL,
  password: MEGA_PASSWORD,
}, err => {
  if (err) {
    console.error("Error logging into Mega:", err);
    return;
  }

  console.log("Logged into Mega successfully.");

  // Upload the SQLite file to Mega.nz
  uploadBackup();
});

// Function to upload the backup file
function uploadBackup() {
  const fileStream = fs.createReadStream(SQLITE_FILE_PATH);
  const upload = storage.upload({
    name: `backup-${Date.now()}.sqlite`
  }, (err, file) => {
    if (err) {
      console.error("Error uploading file to Mega:", err);
      return;
    }
    console.log("Backup uploaded successfully:", file.name);
  });

  // Pipe the file stream to Mega upload
  fileStream.pipe(upload);
}
