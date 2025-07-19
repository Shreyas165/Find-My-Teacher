document.addEventListener("DOMContentLoaded", () => {
    const setPasswordForm = document.getElementById("set-password-form");
    const changePasswordForm = document.getElementById("change-password-form");
    const setMessage = document.getElementById("set-message");
    const changeMessage = document.getElementById("change-message");

    // Set password functionality
    setPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("set-username").value.trim();
        const password = document.getElementById("set-password").value;

        if (!username || !password) {
            showMessage(setMessage, "Please fill in all fields.", "error");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/set-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(setMessage, data.message, "success");
                setPasswordForm.reset();
            } else {
                showMessage(setMessage, data.error || "Failed to set password.", "error");
            }
        } catch (error) {
            console.error("Error setting password:", error);
            showMessage(setMessage, "An error occurred while setting the password.", "error");
        }
    });

    // Change password functionality
    changePasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("change-username").value.trim();
        const oldPassword = document.getElementById("old-password").value;
        const newPassword = document.getElementById("new-password").value;

        if (!username || !oldPassword || !newPassword) {
            showMessage(changeMessage, "Please fill in all fields.", "error");
            return;
        }

        if (oldPassword === newPassword) {
            showMessage(changeMessage, "New password must be different from the current password.", "error");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/change-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, oldPassword, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(changeMessage, data.message, "success");
                changePasswordForm.reset();
            } else {
                showMessage(changeMessage, data.error || "Failed to change password.", "error");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            showMessage(changeMessage, "An error occurred while changing the password.", "error");
        }
    });

    function showMessage(element, message, type) {
        element.innerHTML = `<div class="message ${type}">${message}</div>`;

        // Clear message after 5 seconds
        setTimeout(() => {
            element.innerHTML = "";
        }, 5000);
    }
}); 