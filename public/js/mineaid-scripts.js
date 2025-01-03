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


/* FRONTEND IDLE WARNING PROMPT WITH COUNTDOWN TIMER */
let idleTime = 0; // Tracks idle time in minutes
const warningTimeout = 25; // Time (in minutes) to display the warning
const logoutTimeout = 30; // Time (in minutes) to auto-logout after the warning
let countdownInterval; // Reference to the countdown interval

const resetIdleTimer = () => {
    idleTime = 0;
    clearInterval(countdownInterval); // Clear the countdown timer if active
};

// Function to format time in mm:ss
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

// Increment idle time every minute
setInterval(() => {
    idleTime++;
    if (idleTime === warningTimeout) { // Show warning at 1 minute (for demo purposes)
        let remainingTime = (logoutTimeout - warningTimeout) * 60; // Convert to seconds (e.g., 5 minutes = 300 seconds)

        // Create and append the overlay dynamically
        const overlayElement = document.createElement("div");
        overlayElement.classList.add("session-overlay");
        document.body.appendChild(overlayElement);

        // Create session alert
        const countdownElement = document.createElement("div");
        countdownElement.classList = "session-alert";
        countdownElement.innerHTML = `
            <p class="warn">Inactivity detected!</p>
            <p>You will be logged out in <span class="countdown" id="countdown-seconds">${formatTime(remainingTime)}</span> to keep your account/session secure.</p>
            <p>You've been inactive for >25mins. Do you want to stay or leave?</p>
            <div class="session-btn">
                <button class="reg-action btn-approve" id="extend-session">Continue Session</button>
                <a class="reg-action btn-block" href="/logout">End Session</a>
            </div>
        `;

        // Show overlay and alert
        document.body.appendChild(countdownElement);

        // Update the countdown every second
        countdownInterval = setInterval(() => {
            remainingTime--;
            document.getElementById("countdown-seconds").textContent = formatTime(remainingTime);

            if (remainingTime <= 0) {
                clearInterval(countdownInterval); // Stop the countdown
                alert("You have been logged out due to inactivity.");
                document.body.removeChild(countdownElement); // Remove the alert
                document.body.removeChild(overlayElement); // Remove the overlay
                window.location.href = "/logout"; // Redirect to logout route
            }
        }, 1000); // Update every second

        // Add event listener for "Continue Session" button
        document.getElementById("extend-session").addEventListener("click", () => {
            fetch("/keep-session-alive"); // Optional endpoint to keep session alive
            resetIdleTimer(); // Reset idle timer
            alert("Your session has been extended!");
            clearInterval(countdownInterval); // Clear the countdown
            document.body.removeChild(countdownElement); // Remove the alert
            document.body.removeChild(overlayElement); // Remove the overlay
        });
    }
}, 60000); // 1-minute intervals

// Reset idle time on activity
window.onload = resetIdleTimer;
window.onmousemove = resetIdleTimer;
window.onkeydown = resetIdleTimer; // Reset on keyboard activity




//Polling with JS
// setInterval(async () => {
//     console.log('Polling /check-session...');
//     const response = await fetch('/check-session');
//     const data = await response.json();
//     console.log('Session active:', data.active);
//     if (!data.active) {
//         alert(data.message || 'You have been logged out due to inactivity.');
//         window.location.href = '/login';
//     }
// }, 20000); // Poll every 1 minute



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



//Add JavaScript for Secure Download
//Use JavaScript to add the secret parameter to the endpoint URL when the button is clicked.

// {/* <script>
//   function downloadBackup() {
//     const secret = '<%= process.env.DOWNLOAD_SECRET %>'; // Securely inject the secret from the environment variable
//     window.location.href = `/download-sqlite-backup?secret=${secret}`;
//   }
// </script> */}
function downloadBackup() {
    window.location.href = `/download-sqlite-backup`;
}


//JavaScript for Triggering Animation
document.addEventListener("DOMContentLoaded", () => {
      // Select the cards
      const iAidCard = document.querySelector(".iAid");
      const iSoupCard = document.querySelector(".iSoup");
      const iEmergeCard = document.querySelector(".iEmerge");
      const iManageCard = document.querySelector(".iManage");
  
      // Add animate class to trigger the slide-in animations
      iAidCard.classList.add("animate");
      iSoupCard.classList.add("animate");
      iEmergeCard.classList.add("animate");
      iManageCard.classList.add("animate");
  });


/* Toggler for Inventory card edit ham-menu */
document.addEventListener('DOMContentLoaded', () => {
    let activeMenu = null; // Keep track of the currently open menu

    // Add event listeners to all menu buttons
    document.querySelectorAll('.card-edit-menu .fas.fa-bars').forEach((menuIcon) => {
        menuIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent this click from propagating to the document

            const menu = menuIcon.nextElementSibling; // The associated menu (ul element)

            // Close the previously active menu if it's not the current one
            if (activeMenu && activeMenu !== menu) {
                activeMenu.classList.add('hidden');
            }

            // Toggle the current menu and update activeMenu
            menu.classList.toggle('hidden');
            activeMenu = menu.classList.contains('hidden') ? null : menu;
        });
    });

    // Close the menu if clicking anywhere outside
    document.addEventListener('click', () => {
        if (activeMenu) {
            activeMenu.classList.add('hidden');
            activeMenu = null;
        }
    });
});



// Detect the correct modal and form dynamically based on the page type
const modal = document.querySelector("[id$='Modal']");
const form = document.querySelector("[id$='Form']");

function openModal(item) {
    modal.style.display = "block";

    // Loop through item properties and populate matching fields in the modal
    for (const key in item) {
        const inputField = document.getElementById(key);
        if (inputField) {
            inputField.value = item[key]; // Assign value to matching input field
        }console.log(`Key: ${key}, Value: ${item[key]}, Field: ${inputField}`);

    }
}

function closeModal() {
    modal.style.display = "none";
}

// Close the modal if clicked outside
window.onclick = function (event) {
    if (event.target === modal) {
        closeModal();
    }
};

/* Easily Switch Between Portals */
// function switchPost(newPost) {
//     fetch('/switch-post', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ newPost }),
//     })
//         .then(response => response.json())
//         .then(data => {
//             if (data.success) {
//                 alert(`Switched to ${data.currentPost} successfully.`);
//                 // Optionally reload the page or update the UI dynamically
//                 location.reload();
//             } else {
//                 alert('Error switching post.');
//             }
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert('Failed to switch post.');
//         });
// }


/* Switch Views */
const switchToTable = document.getElementById('switch-to-table');
const switchToCards = document.getElementById('switch-to-cards');
const nurseTable = document.getElementById('nurse-table');
const nurseCards = document.getElementById('nurse-cards');

switchToTable.addEventListener('click', () => {
    nurseTable.style.display = 'block';
    nurseCards.style.display = 'none';
    switchToTable.style.display = 'none';
    switchToCards.style.display = 'inline-block';
});

switchToCards.addEventListener('click', () => {
    nurseTable.style.display = 'none';
    nurseCards.style.display = 'block';
    switchToCards.style.display = 'none';
    switchToTable.style.display = 'inline-block';
});
