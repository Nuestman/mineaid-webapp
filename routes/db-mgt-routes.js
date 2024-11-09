const express = require('express');
const path = require('path');
const router = express.Router();
const { checkSuperUser } = require('../middleware/auth'); 

// Import functions for database management
const {
  downloadBackup,
  uploadBackup,
  migrateToPostgres,
  exportToCSV,
  importFromCSV,
  clearOldData,
  optimizeDatabase,
  healthCheck,
  scheduleBackup,
  viewLogs
} = require('../controllers/dbManagementController');

// Access database management page (superuser only)
router.get('/db-management', checkSuperUser, (req, res) => {
  res.render('superuser/db-management'); 
});

// Backup and restore routes
router.get('/download-db', checkSuperUser, downloadBackup);
router.post('/upload-db', checkSuperUser, uploadBackup);

// Migration route
router.post('/migrate-db', checkSuperUser, migrateToPostgres);

// CSV export/import routes
router.post('/export-csv', checkSuperUser, exportToCSV);
router.post('/import-csv', checkSuperUser, importFromCSV);

// Maintenance routes
router.post('/clear-old-data', checkSuperUser, clearOldData);
router.post('/optimize-db', checkSuperUser, optimizeDatabase);

// Health check route
router.get('/db-health', checkSuperUser, healthCheck);

// Schedule backup route
router.post('/schedule-backup', checkSuperUser, scheduleBackup);

// Logs route
router.get('/view-logs', checkSuperUser, viewLogs);

module.exports = router;
