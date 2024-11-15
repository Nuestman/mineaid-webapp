module.exports = {
    proxy: "http://localhost:3000", // Your local server address. Ensure this is consistent with package.json
    files: [
        "views/**/*.ejs", // Watch all .ejs files in views and subdirectories
        "public/**/*.css", // Watch all .css files in public and subdirectories
        "public/**/*.js"   // Watch all .js files in public and subdirectories
    ],
    reloadDelay: 200,
    notify: false, // Disable the "Browsersync connected" notification
    open: false, // Prevent opening a new tab every time you start the server
    injectChanges: true,
    port: 3003, // Set to match package.json
};


