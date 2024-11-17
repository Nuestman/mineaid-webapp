# Session 171124 - Morning to afternoon
1. Fixed routes for inventory meds, equip, cons
2. Fixed tables for them
3. Fixed inventory page overflow on wide-screen due to wide-screen fix required on mobile.
4. Fixed routes to index giving errors
3. Continue later


# Session 161124 Morning
1. Fixed User feedback table overflow issue
2. Mobile Style Issues
User feedback 
Fixed- table overflow hidden
Fixed- Infinite scroll

Admin Dashboard
Fixed- Side bar overflows on mobile
Fixed- Headed, footer looking shorter

Database
Fixed- Upload, import, schedule are full width 
All buttons should be full width
Fixed- Should be space between scheduler button and input

DB mgt
Fixed- Manage db button should be full width 

# Session 151124 Dawn
1. Set up Inventory mgt page with its routes
2. Activated the button in sidebar to open the inv-mtg dashboard
3. Fixed qlinks overflow on mobile
4. Re-routed '/' to landing-page.ejs and '/index' for iAid
5. Style changes
6. Set up db mgt dashboard with initial styles and db-route
7. Added Hub, inventory and DB mgt links to nav

# Session 141124 Morning
1. Fixed landing page for Nursing Portal
2. Added iAid and iSoup with their routes and link
3. Hub link to nav
4. Set up iSoup landing page and Dashboard

# Session 121124 Morning
1. Routes for delete and edit  -   Partially done
3. Created incident_history and triage_history and users_history pages
2. Fixed success page button overflow

# Session 11112024 morning
1. Mobile style adjustments
2. Added post, condition, entry by columns to triage form and table
3. Entry by column not populated     -   Done

# Session 091124 Late night
1. Style adjustments
## Responsive Mobile Issues
2. Triage book h1 fixed
Triage table top margin - Remove on mobile fixed
Download button too big fixed 
3. Incident Form
Padding issues fixed
Remove card padding fixed
Input fields (company and badge) overflowing parents fixed
4. Triage form
Radio buttons aligning with icon
Remove internal padding fixed
5. Contact form
Something overflowing - Looks like a margin to the right
Reduce internal padding - annoying side eye
6. Feedback form
Reduce internal padding 
Annoying side eye
7. Password request
Annoying side eye
8. Admin dashboard /home and dashboard 
Big margin left on main fixed
Remove internal padding fixed
Dashboard at least has done padding or margin on the right fixed-ish
9. Footer - Break all rights reserved fixed

## Pending
2. Function to select final triage based on total tews
3. Delete and modify entry functionality
4. JS object not being handled correctly (non-standard) in the code. [Object: null prototype] Explanation


# Session 091124
1. 403 cleared and db downloaded successfully, but with secret visible in markup after injection with function().
2. Secret dependent auth removed and replaced with route-related auth middleware.
3. Unluckily, db does not persist, but a a few minutes so above not useful for now.
4. Styles fixing
5. Media queries almost done
6. Need to clear redundant code
7. Upload and deploy


# Session 08112024
Failed attempts at getting db download  button and auto back up to work
__________________________________________________________________________________

1. Created backup-to-mega.js to help upload live to MEGA
2. Installed MEGAcmd on the PC and set up an upload of the DB to MEGA using the MEGAcmdclientshell.
3. Set up a secret and tybfat 45324 on render to get the live file. Also modified the .env on render to include MEGA
4. Changed seniorAdmin to superuser in routes and database and assigned db backup file download to superuser
5. Fixed admin dashboard rendering coming-soon pages to 404. Sidebar expanded. Replace with partial later.
6. Added a new route for the download of the DB backup file. 1060
DB button causing 'ERR_HTTP_HEADERS_SENT' error    -    FIXED by returning the auth error


## Setting up db backup to Mega.nz
## Procedures.
1. Set up email and password in env variables (I'm using dotenv so set up in .env file and not hardcode into the server.)
2. Mega is using 2FA so install MegaCLI/megacmd dowload from Mega
3. Follow db_backup_process_to_mega.md file
Using the main MEGA cmd program, use this command (MEGA CMD> login mineaid.notifications@gmail.com }cx@,$mf56KSHfV --auth-code="626646")

Starting with attempts to backup db to Mega - 07/11/24 @ 0800Hrs

___________________________________________________________________________________

Issues
DB dropped on deploy
Duplicated navbar on some pages (User profile)
Annoying prompt issue
Body copy review
Lift shadows unintended effects on old dashboard
Colors - tone down to grays, make it look pro
Migrate to postgreSQL for DB persistence

Version 9. 
Fixed the nev with logical grouping and showing on hover.
Improved feedback survey questionnaire
improved navbar styling and responsiveness
Deployed


Version 8.1 Fixes with a feature
Few minor fixes
BG color to white
Profile page width fixes
Table head fixes
Added a feedback feature with a button, linked to a feedback form, to feedback record in db rendered in user feedback.
Iterating nav links
Added Messages and feedback view page Page created, routes added and added to toggler
04/11/24 @ 1300Hrs



Version 3 @ 1300Hrs 26-10-24
1. Registration working. issue was with password input names (password2/confirm_password) 
2. admin pages open.
3. approve, block, unblock buttons. work
4. Email after approval solved with App password from Gmail


Problems
1. Make it responsive
11. user redirection after link requiring login


Solved
1. Email is sent to users after they're approved with Nodemail
4. Login-logout toggle successfully done
7. Senior admin to able to make others admin button done
12. registration user feedback fixed with regis-error.ejs page.
13. General error page buttons fixed. 
5. Contact form successfully validated and receiving data at backend. stored in contact_messages table and also sent to email.
14. Created and email for MineAid and successfuly implemented SMTP protocols for MineAid
9. Nav-links to be arranged logically and shown on pages to enhance UX   -    done
3. users are able to login even when pending.   -   Done.....Auths working now
4. Created a coming soon page for redundant links
3. Style coming soon page    -     Done
10. Password reset functionality per user flow    -    Done
1. flash messages only show up on the redirected page 
after it loads    -     Done. That is normal behavior. Style well.
8. Add flash messages for other pages    -     Done
3. Error messages persist not clearing with flash as expected, except with frontend js.    -    Done with css (caused by css .alert: display block)
5. flash messages are not disappearing after being displayed on redirect. only disappear after redirected page reloads again.    -    Done   -   Cleared with frontend JS.
2. Fix admin routes with ensureAuthenticated, and Senior Admin with seniorAdmin   -   Done. Working.
1. Fix profile page    -     Done
2. Fix incident book page    -    Done
6. Styling issues   -   Done. Acceptable
3. tokens are not clearing from db. reduce expiry time to 30mins. add functionality to clear db of tokens automatically after expiry even when email link was not accessed.      -       Done with a db function that clears expired tokens at server restart.
4. Session not working well: opened admin route pages are left open after user is automatically logged out and is accessible via "back and forward" browser buttons. should default back to login on forward/back.   -   Acceptable.
7. Upload profile pic done with Multer
8. More appealing table view.


Future functions
1. Ticketing for user problems with status check
2. Customize contact form/Email message
3. Email service for the MineAid   -   Farfetched
4. SMTP for Email setup   -   done
5. Relational/Interrelational DB
6. Make nav more ux friendly by limiting number of links





db.run('ALTER TABLE users ADD COLUMN lastLogin TEXT', (err) => {
    if (err) {
        console.error('Error adding notifications column:', err.message);
    } else {
        console.log('notifications column added successfully.');
    }
});
db.run('ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light' ', (err) => {
    if (err) {
        console.error('Error adding notifications column:', err.message);
    } else {
        console.log('notifications column added successfully.');
    }
});

-- Create a new table for recent activities
db.run(`CREATE TABLE IF NOT EXISTS recentActivities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    activity TEXT,
    timestamp TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (userId) REFERENCES users(id)
)`);

-- Create a new table for connected social accounts
db.run(`CREATE TABLE IF NOT EXISTS connectedAccounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    platform TEXT,
    linkedAt TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (userId) REFERENCES users(id)
)`);