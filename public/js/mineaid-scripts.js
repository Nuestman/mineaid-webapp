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