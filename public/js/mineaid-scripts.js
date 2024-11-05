// Pre-populate Date with Today's Date
window.onload = function() {
    getDate();
    getTime();
};

function getDate() {
    var today = new Date();
    document.getElementById("date").valueAsDate = today;
}

function getTime() {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById("time_of_arrival").value = `${hours}:${minutes}`;
}
// A more robust Alternate date/time populator
// function getDate() {
//     var dateElement = document.getElementById("date");
//     if (dateElement) {
//         var today = new Date();
//         dateElement.valueAsDate = today;
//     } else {
//         console.error("Element with ID 'date' not found.");
//     }
// }

// function getTime() {
//     var timeElement = document.getElementById("time_of_arrival");
//     if (timeElement) {
//         var now = new Date();
//         var hours = now.getHours().toString().padStart(2, '0');
//         var minutes = now.getMinutes().toString().padStart(2, '0');
//         timeElement.value = `${hours}:${minutes}`;
//     } else {
//         console.error("Element with ID 'time_of_arrival' not found.");
//     }
// }



// Close the flash message when the close button is clicked
// function closeFlashMessage() {
//     const flashMessage = document.getElementById('flashMessage');
//     flashMessage.style.opacity = '0';  // Fade out
//     setTimeout(() => {
//         flashMessage.style.display = 'none';  // Hide completely after fading
//     }, 500);  // Matches the CSS transition time
// }

// Auto-hide the flash message after 5 seconds
// setTimeout(() => {
//     closeFlashMessage();
// }, 5000);  // 5000ms = 5 seconds

// Function to fade out alerts after a delay
function fadeOutAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0'; // Fade out
            setTimeout(() => {
                alert.style.display = 'none'; // Remove from display
            }, 500); // Wait for fade-out duration
        }, 3000); // Delay before starting fade-out (3 seconds)
    });
}

// Call the fadeOutAlerts function after the page loads
document.addEventListener('DOMContentLoaded', fadeOutAlerts);

document.querySelectorAll('.btn-approve').forEach(button => {
    button.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        fetch('/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        }).then(response => {
            if (response.ok) {
                // Handle successful approval (e.g., update UI)
                alert('User approved!');
            } else {
                alert('Failed to approve user');
            }
        });
    });
});


// COMING SOON
// Example: Fade-in effect for the coming-soon message
document.addEventListener("DOMContentLoaded", function () {
    const comingSoonContainer = document.querySelector('.coming-soon-container');
    if (comingSoonContainer) {
        comingSoonContainer.style.opacity = 0;
        setTimeout(() => comingSoonContainer.style.opacity = 1, 200);
    }
});


/* FRONTEND IDLE WARNING PROMPT */
// Example: Display a warning prompt when the user is idle for a certain period
let idleTime = 0;

const resetIdleTimer = () => { idleTime = 0; };

// Increment idle time every minute
setInterval(() => {
    idleTime++;
    if (idleTime > 25) { // Show warning at 25 minutes
        if (confirm("You will be logged out soon due to inactivity. Continue session?")) {
            fetch('/keep-session-alive'); // Optional endpoint to keep session alive
            resetIdleTimer();
        }
    }
}, 60000); // 1-minute intervals

// Reset idle time on activity
window.onload = resetIdleTimer;
window.onmousemove = resetIdleTimer;

/* USING MODALS */
// let idleTime = 0;
// let idleWarningTime = 25 * 60 * 1000; // 25 minutes
// let logoutTime = 30 * 60 * 1000; // 30 minutes
// let idleModal = document.getElementById("idleModal");

// // Show the idle modal after warning time
// const showIdleModal = () => {
//     idleModal.style.display = "flex";
// };

// // Hide the modal and reset idle timer
// const resetIdleTimer = () => {
//     idleTime = 0;
//     idleModal.style.display = "none";
// };

// // Log out and refresh the page
// const logoutUser = () => {
//     window.location.href = "/logout"; // Adjust this to your logout route
//     location.reload(); // Clears the session and any sensitive data from the page
// };

// // Reset idle time on user activity
// const resetUserActivity = () => {
//     resetIdleTimer();
//     fetch('/keep-session-alive'); // Optional: Endpoint to refresh session on backend
// };

// // Event listeners to detect user activity
// ['mousemove', 'keydown', 'click'].forEach(event => {
//     window.addEventListener(event, resetUserActivity);
// });

// // Check for idle state every second
// setInterval(() => {
//     idleTime += 1000;

//     if (idleTime >= idleWarningTime && idleModal.style.display === "none") {
//         showIdleModal(); // Show warning modal after 25 minutes
//     }

//     if (idleTime >= logoutTime) {
//         logoutUser(); // Log out after 30 minutes
//     }
// }, 1000);

// // Continue session button
// document.getElementById("continueSessionBtn").addEventListener("click", () => {
//     resetUserActivity();
//     resetIdleTimer();
// });



/* Floating Feedback Button*/
// Show the feedback button after a 10-second delay
setTimeout(() => {
    document.getElementById('feedback-float').style.display = 'block';
}, 10000); // Adjust delay as needed

// Detect exit intent (mouse moves towards the top of the page)
document.addEventListener('mouseout', (e) => {
    if (e.clientY < 10) { // Mouse is near the top edge
        document.getElementById('feedback-float').style.display = 'block';
    }
});

// Optional: Hide button after submitting feedback
if (window.location.pathname === '/feedback/submit') {
    document.getElementById('feedback-float').style.display = 'none';
}


/* NAV MENU TOGGLER */
// document.addEventListener("DOMContentLoaded", function() {
//     const menuToggle = document.getElementById("menu-toggle");
//     const navbar = document.getElementById("navbar");

//     menuToggle.addEventListener("click", () => {
//         navbar.classList.toggle("show-menu");
//     });
// });
