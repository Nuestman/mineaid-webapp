
### 1. Project Title
**MineAid - A Portal for Managing the First Aid Posts**

A web application for managing client data entry, user approvals, and administrative tasks for first aid posts.

---

### 2. Description
This project is designed to manage data entry and administrative functions for multiple first aid posts. It allows users to input client information, incident logging, store records, and manage user access levels (pending, approved, blocked). Users in addition can access Inventory Management
Training & Resources after logging in. Admins can approve users, block or unblock users, and filter users based on status. And also access more management functions such as Dashboard, Incident Reports, FAP Operations Analytics & Reports, Compliance Tracking, Settings etc.

---

### 3. Features
- **Client Data Entry**: Users can input client data related to first aid cases.
- **User Management**: Admins can approve, block, and unblock users.
- **Data Filtering**: Admins can filter users by status (Pending, Approved, Blocked).
- **User Authentication**: Login and logout functionality.
- **Admin Dashboard**: Separate interface for administrative tasks.
  
---

### 4. Prerequisites
Before running the application, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **SQLite3**

---

### 5. Installation and Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/your-username/mineaid-webapp.git
    ```

2. Navigate to the project directory:
    ```bash
    cd mineaid-webapp
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

4. Create and initialize the SQLite database:
    ```bash
    npm run init-db
    ```

5. Start the server:
    ```bash
    npm start
    ```

6. Access the app via browser:
    ```
    http://localhost:3000
    ```

---

### 6. Project Structure

```bash
├── database/          # Contains SQLite database file and initialization logic
├── public/            # Static files (CSS, images)
├── routes/            # All route handlers (admin.js, users.js, auth.js, etc.)
├── views/             # EJS templates for rendering pages
├── mineaid-app.js             # Main entry point for the app
└── README.md          # Project documentation
```

---

### 7. Environment Variables
Create a `.env` file in the root directory and configure the following:
```
PORT=3000
DATABASE_URL=./database/maineaid.db
```

---

### 8. Usage

- **Login**: Users log in to input client data or access admin features.
- **Admin Functions**: Admins can view, approve, block, and filter users.
- **Data Entry**: Users can submit forms with client data and also add incident reports.
  
---

### 9. Known Issues / Limitations
- SQLite is used as the database; if the user base grows, consider switching to PostgreSQL or MySQL.
- Limited concurrent write performance due to SQLite.

---

### 10. Future Enhancements
- Add functionality for record deletion.
- Improve error handling.
- Implement data export features (e.g., CSV, Excel).
  
---

### 11. Contributors
- **Numan Usman**: Developer

---
