const express = require('express');
const path = require('path');  // Add this line to import the path module
const app = express();
const passport = require('passport');  // If you use Passport.js for authentication

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Set the views directory for markup files
app.set('views', path.join(__dirname, 'views'));
// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files - Set the public directory for static files
app.use(express.static(path.join(__dirname, 'public')));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Import routes
const indexRoutes = require('./routes/index');  // Handles index/homepage routes
const adminRoutes = require('./routes/admin');  // Handles admin routes
const userRoutes = require('./routes/users');   // Handles user-specific routes
const authRoutes = require('./routes/auth');    // Handles authentication routes (login, logout, register)

// Use routes
app.use('/', indexRoutes);      // Root route for homepage, dashboard, etc.
app.use('/admin', adminRoutes); // Admin-specific routes like managing users
app.use('/users', userRoutes);  // User-specific routes like profile
app.use('/auth', authRoutes);   // Authentication (login, logout, register) routes

// Additional potential routes (in case they're missing)
const recordsRoutes = require('./routes/records');   // Handles records management routes
const triageRoutes = require('./routes/triage');     // Handles triage/form submission routes
const errorRoutes = require('./routes/error');       // Manages error pages


app.use('/records', recordsRoutes);   // Routes to view/manage records
app.use('/triage', triageRoutes);     // Routes for triage and form handling
app.use('/error', errorRoutes);       // Manages error-specific routes

// Catch all route errors
// Error handling for 404
app.use((req, res, next) => {
    res.status(404).render('./error/404'); // Ensure you have a 404 view
});

// Error handling for other types of errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('./error/500'); // Ensure you have a 500 view
});

// General for all
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

