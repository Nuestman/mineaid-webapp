## PASSWORD RESET FLOW
In summary, the process works as follows:

1. user tries to log in but fails
2. he's presented with the option to reset
3. user clicks on reset password button
4. he's taken to forgot-password.ejs (located in views>users)
5. The user submits their email address through the form to the server.
6. The server checks the database for that email address to identify the user.
7. If found, a token is generated, saved in the database, and an email containing the reset link is sent to the user through their submitted email.
8. The user receives the email, clicks the link, and is taken to the reset password (views/users/reset.ejs) form.
9. The user submits their new password through the form to the server.
10. The token is validated when the user accesses the form and again when they submit a new password.
11. Database is updated with the new password.

lets create the code step-by-step to make it functional

This flow effectively allows you to identify the user requesting the password reset based solely on the email they provide. If you need further clarification or help with any part of this process, feel free to ask!


## PASSPORT LOGIN FLOW
Example Flow Combining Flash Messages and Passport Login

Here’s how the whole system ties together for a login request:

    User submits login: passport.authenticate checks credentials.
    Authentication Failure: Passport sends { message: '...' } based on the failure reason (like incorrect password) as a flash message if failureFlash is true.
    Redirect and Display: The user is redirected, and the flash message is displayed on the login page using res.locals.error in the EJS template.