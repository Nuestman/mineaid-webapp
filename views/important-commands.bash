# Step 1: Setting Up the Project Structure

#     Install Node.js (Backend framework) if you don’t have it installed.
#         Go to Node.js official website and download the latest version.
#         Once installed, check if it’s working by running node -v in your terminal.

#     Initialize a Node.js Project:
#         Open your terminal and create a project folder.

#         bash

# mkdir first-aid-portal
# cd first-aid-portal

# Initialize a Node.js project in the folder:

bash

    npm init -y

#     This will create a package.json file, which manages dependencies for the project.

# Install Required Dependencies:

    Install Express (web framework) and SQLite3 (database).

bash

npm install express sqlite3

# Optional (but recommended): Install nodemon to automatically restart the server when files change.

bash

npm install --save-dev nodemon


# Check sqlite version
npm list sqlite3


Step 1: Install ejs

In your project directory, run the following command to install ejs:

bash

npm install ejs

Step 2: Restart the Server

After installing ejs, restart your server using nodemon:

bash

npx nodemon app.js

Then try accessing http://localhost:3000/ again. You should no longer see the error.



# setup  app.js and routes
const express = require('express');
const path = require('path');  // Add this line to import the path module
const app = express();

// Middleware, route setup, etc.
// Middleware to parse incoming requests
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


// Import routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

// Use routes
app.use('/', indexRoutes);  // This ensures that the home page is served at '/'
// Homepage ends
app.use('/', adminRoutes);
// Admin ends
app.use('/', userRoutes);
// User ends
app.use('/', authRoutes);
// Auth ends


// Other route imports and usage can be added here, e.g., admin, users
// Other middleware and route handling here



// General for all
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
