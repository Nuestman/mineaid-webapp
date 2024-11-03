## Setup
Installed git
PS C:\Users\usman ui\MEGA\MEGAsync\2024\Digital tools\mineaid-webapp> git clone https://github.com/nuestman/mineaid-webapp.git
Cloning into 'mineaid-webapp'...
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
Receiving objects: 100% (3/3), done.

## Changed db filename

## Modify db name in json

## Cleared mineaid-app.js
restarted

## Set up app.js
routes setup created in routes .js files and imported into mineaid-app.js, and "used" - app.use @ 5:22

Now that we've stripped down the app and created a simple baseline, we can move forward in structured steps. Here’s a suggested breakdown of the next steps to rebuild the functionality while keeping things manageable:


### **Step-by-Step Plan:**

1. **Test the basic version:**
   - Ensure the basic app (without authentication and database) runs without errors.
   - Access the routes like `/`, `/triage`, `/form`, `/records` to confirm views render properly.

2. **Database schema recreation:**
   - Share the current **database schema** (or create a new one if needed).
   - Set up SQLite database again with the necessary tables (`users`, `daily_records`, etc.).
   - I can help you write SQL scripts to create the tables based on your schema.

3. **Reintegrate database handling:**
   - Rebuild the form submission functionality so that it saves records to the `daily_records` table.
   - Reconnect the `/records` route to fetch data from the database and display it.

4. **Reintegrate user authentication:**
   - Reintroduce the **login** and **registration** functionality.
   - Use **bcrypt** for password hashing and **passport-local** for authentication.

5. **Admin panel setup:**
   - Rebuild admin routes and user management (approving/blocking users).
   - Add role-based restrictions so only admins can access certain routes (like `/admin/users`).

6. **Session handling and user flash messages:**
   - Reintroduce session handling for login/logout, and flash messages for form feedback.

7. **Testing and final tweaks:**
   - Test everything together (authentication, form submissions, admin controls).
   - Debug any issues and make final UI or feature adjustments.

---

### **Immediate Next Step:**
Since we’ve already stripped the app and you’ve tested that version:

- **Step 2: Database Schema Recreation**
   - Please share your database schema, and we can recreate the tables for `daily_records`, `users`, and any other relevant tables.
   
Once the schema is ready, we’ll move to Step 3 and reintegrate the database handling. Does this plan work for you?



1. Authentication Options
Option 1: Passport.js

    Why use Passport.js?
    Passport is a widely used middleware for authentication in Node.js. It supports multiple authentication strategies, including local authentication (username/password), OAuth, and others.

    How to implement?
        Use Local Strategy for simple username/password authentication.
        Set up sessions to maintain logged-in state for users.
        Define protected routes (e.g., /admin, /profile) that only authenticated users can access.

    Pros:
        Highly flexible and extensible (supports social logins like Google, Facebook, etc.).
        Easy to integrate with sessions and cookies for managing user states.

    Cons:
        Might feel complex if you need only simple authentication.

Option 2: Custom Authentication (Session-based)

    Why use custom authentication?
    If you want more control over the login process and a lightweight solution, custom authentication (storing user sessions in your database and managing them manually) might be the way to go.

    How to implement?
        On login, check credentials against your database and store user info in the session.
        Use express-session to handle sessions for authenticated users.
        Protect routes by checking if a user is authenticated before allowing access.

    Pros:
        Full control over the logic.
        Simple and effective for a smaller user base (like yours).

    Cons:
        Requires more manual setup for security (password hashing, session handling, etc.).

2. Displaying User-Friendly Status Messages (Without Full Page Refresh)

For showing messages like "User approved successfully" or "Action completed successfully" without refreshing the whole window, you can use AJAX or Fetch API in combination with server-side updates. This will allow you to update parts of your page asynchronously.
Steps:

    Implement AJAX/Fetch on the frontend:
        When an admin approves a user or performs any action, use an AJAX request or Fetch to send the data to your server without reloading the page.

    Example using Fetch API:

    javascript

function approveUser(userId) {
    fetch(`/admin/approve/${userId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            document.getElementById('statusMessage').innerText = 'User approved successfully!';
        } else {
            // Show error message
            document.getElementById('statusMessage').innerText = 'Error approving user.';
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

Server-side route (e.g., approving a user):

javascript

app.post('/admin/approve/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'UPDATE users SET status = "approved" WHERE id = ?';
    db.run(query, [userId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error approving user' });
        } else {
            res.json({ success: true, message: 'User approved successfully' });
        }
    });
});

Update the DOM with the status message:

    Ensure you have an HTML element (e.g., a div or span) to display the success or error message.

html

    <div id="statusMessage"></div>

3. Sending Messages After Approval (SMS or Email)
Option 1: Send Email Notifications

To send email notifications to users after they are approved, you can use the Nodemailer package.

How to Implement:

    Install Nodemailer:

    bash

npm install nodemailer

Set up the email service in your app:

javascript

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail', // You can use other services like SendGrid, Outlook, etc.
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password',
    },
});

function sendApprovalEmail(userEmail) {
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: userEmail,
        subject: 'Account Approved',
        text: 'Congratulations! Your account has been approved.',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

Call sendApprovalEmail() after approving a user: In the /admin/approve/:id route:

javascript

    app.post('/admin/approve/:id', (req, res) => {
        const userId = req.params.id;
        const query = 'UPDATE users SET status = "approved" WHERE id = ?';

        db.run(query, [userId], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error approving user' });
            } else {
                // Fetch the user's email from the database
                db.get('SELECT email FROM users WHERE id = ?', [userId], (err, row) => {
                    if (!err && row) {
                        sendApprovalEmail(row.email); // Send email notification
                    }
                });
                res.json({ success: true, message: 'User approved successfully' });
            }
        });
    });

Option 2: Send SMS Notifications

For SMS, you can use services like Twilio to send text messages when a user is approved.

    Install Twilio:

    bash

npm install twilio

Set up Twilio in your app:

javascript

    const accountSid = 'your_twilio_account_sid';
    const authToken = 'your_twilio_auth_token';
    const client = require('twilio')(accountSid, authToken);

    function sendApprovalSMS(phoneNumber) {
        client.messages.create({
            body: 'Congratulations! Your account has been approved.',
            from: '+1234567890', // Your Twilio phone number
            to: phoneNumber,
        })
        .then(message => console.log('SMS sent: ' + message.sid))
        .catch(error => console.error('Error sending SMS:', error));
    }

    Call sendApprovalSMS() after approving a user: Same logic as with email, but use the user's phone number instead of the email.

Next Steps:

    Pick an authentication method (Passport.js or custom) and implement user login and session management.
    Integrate AJAX/Fetch API for user-friendly status messages (e.g., for approval actions).
    Set up Nodemailer or Twilio to notify users via email or SMS after they are approved.

Let me know which method you'd prefer for authentication, and I can guide you through the setup!