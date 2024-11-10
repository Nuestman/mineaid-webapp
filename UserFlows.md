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





AJAX vrs Flash
Both AJAX and flash messages have their strengths and are suited to different user feedback scenarios. Here's a closer look at each to help you decide which is more suitable for specific situations.

### AJAX Feedback

**Pros**:
1. **Real-time Interaction**: AJAX allows for instant updates without a full page reload. This is ideal for dynamic user interactions, such as form submissions or updating parts of a page.
2. **Better User Experience**: With AJAX, you can handle and display errors, success messages, and other feedback on the same page, reducing the wait time associated with a full reload.
3. **Granular Control**: AJAX lets you handle success and error states more specifically and enables you to update only the necessary parts of the interface, which can streamline feedback display.
4. **Improved Efficiency**: By avoiding full-page reloads, AJAX can save bandwidth and reduce server load.

**Cons**:
1. **Increased Complexity**: AJAX requires more JavaScript code on the frontend, making the codebase more complex and sometimes harder to maintain, especially if mixed with server-side rendering.
2. **SEO Limitations**: AJAX-rendered content might not be visible to search engines, which can impact SEO if the content is essential for visibility.
3. **Potential for Inconsistency**: Relying solely on JavaScript could mean that some users (who may have JavaScript disabled) miss important feedback.

**Use Case for AJAX**: Interactive pages where user actions require instant feedback without disrupting the current page state, such as form validations, "like" or "follow" buttons, or content that loads progressively.

---

### Flash Messages

**Pros**:
1. **Server-Side Simplicity**: Flash messages are stored temporarily in the session, making it easy to implement with server-side rendering frameworks like Express with minimal frontend logic.
2. **Page-Consistent Feedback**: Flash messages are displayed on the next page load or redirect, ensuring that the message is visible without needing additional JavaScript.
3. **Accessibility**: Flash messages are generally accessible across different devices and browsers, even for users without JavaScript enabled.
4. **Straightforward User Flow**: This approach fits well when actions need to end in a redirect or new page view, such as after login, form submission, or critical actions that require visual confirmation.

**Cons**:
1. **Requires a Page Reload**: Flash messages appear only after a redirect, making them unsuitable for cases where immediate feedback on the same page is required.
2. **Limited to Redirect-Based Workflow**: If you need feedback within the same page without changing views, flash messages may not be ideal.

**Use Case for Flash Messages**: Login/logout flows, redirecting after form submissions, and feedback for actions that naturally lead to a new page, such as profile updates or settings changes.

---

### Which is Better?

The choice depends on the use case and desired user experience:

- **AJAX** is better for interactive applications that require immediate feedback on the same page. For example, if you’re updating a user’s profile information without navigating away, AJAX provides a smoother experience.
  
- **Flash messages** are better for simpler applications or feedback after actions that naturally lead to a new page. This method is particularly helpful in traditional multi-page applications where the action requires a redirect.

In many modern applications, **a hybrid approach** is often used. Flash messages handle redirects and critical actions, while AJAX provides immediate feedback for actions that benefit from it, enhancing both usability and performance.