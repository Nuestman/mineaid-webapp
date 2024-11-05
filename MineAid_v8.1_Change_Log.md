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