Version 3 @ 1300Hrs 26-10-24
1. Registration working. issue was with password input names (password2/confirm_password) 
2. admin pages open.
3. approve, block, unblock buttons. work
4. Email after approval solved with App password from Gmail


Problems

6. Styling issues
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
1. Fix profile page   -   Done
2. Fix admin routes with ensureAdmin   -     Done
4. Session not working well: opened admin route pages are left open after user is automatically logged out and is accessible via "back and forward" browser buttons. should default back to login on forward/back.     -    Done. Acceptable
5. flash messages are not disappearing after being displayed on redirect. only disappear after redirected page reloads again.     -    Normal behavior to show on redirected page.     Disappearing issues Done with frontend JS
6. Token not clearing from DB solved with work around in DB file      -     Done
7. Upload profile pic done with Multer
8. More appealing table view.


3. tokens are not clearing from db. reduce expiry time to 30mins. add functionality to clear db of tokens automatically after expiry even when email link was not accessed.
2. Fix incident book page

Future functions
1. Ticketing for user problems with status check
2. Customize contact form/Email message
3. Email service for the MineAid   -   Farfetched
4. SMTP for Email setup   -   done
5. Relational/Interrelational DB
6. Make nav more ux friendly by limiting number of links