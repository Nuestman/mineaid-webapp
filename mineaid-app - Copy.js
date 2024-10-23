const express = require('express');
const app = express();

// Import route handlers
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

// Middleware (e.g., body parsing, static files)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Use routes
app.use('/', indexRoutes);      // General pages
app.use('/admin', adminRoutes); // Admin routes
app.use('/users', userRoutes);  // User routes
app.use('/auth', authRoutes);   // Authentication routes

// Error handling and other middleware here
app.use((req, res) => {
    res.status(404).send('Page not found');
});
// Static folder for CSS and images
app.use(express.static(path.join(__dirname, 'public')));

// Set views folder for HTML files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // Using EJS for templating, or use plain HTML if preferred.

// Basic route for the homepage
app.get('/', (req, res) => {
  res.render('index'); // Renders the HTML form
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;



