// routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Route to display the Add New Medication form
router.get('/medication-checklist', inventoryController.showAddMedicationForm);

module.exports = router;
