const teacherSelect = document.getElementById("teacher-select");
const getDirectionsButton = document.getElementById("get-directions");
const directionsDisplay = document.getElementById("directions-display");
const addTeacherBtn = document.getElementById("add-teacher-btn");
const submitTeacherButton = document.getElementById("submit-teacher");
const addTeacherForm = document.getElementById("add-teacher-form");

const getTeachersEndpoint = "http://localhost:3000/api/people";
const getDirectionsEndpoint = "http://localhost:3000/api/directions/";
const addTeacherEndpoint = "http://localhost:3000/api/add-teacher";

async function loadTeachers() {
    try {
        const response = await fetch(getTeachersEndpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Received data:", data);

        if (data.teachers && Array.isArray(data.teachers)) {
            teacherSelect.innerHTML = '<option value="" disabled selected>Select a teacher</option>';
            data.teachers.forEach((teacher) => {
                const option = document.createElement("option");
                option.value = teacher.name;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        } else {
            console.error("Invalid data format received:", data);
            alert("Failed to load teachers. Invalid response from the server.");
        }
    } catch (error) {
        console.error("Error loading teachers:", error);
        alert("Failed to load teachers. Please try again.");
    }
}

async function getDirections() {
    const teacherName = teacherSelect.value;

    if (!teacherName) {
        alert("Please select a teacher.");
        return;
    }

    try {
        const response = await fetch(`${getDirectionsEndpoint}${encodeURIComponent(teacherName)}`);
        const data = await response.json();

        if (data.error) {
            directionsDisplay.innerHTML = `<p>${data.error}</p>`;
        } else {
            directionsDisplay.innerHTML = `
                <p><strong>Branch:</strong> ${data.branch}</p>
                <p><strong>Floor:</strong> ${data.floor}</p>
                <p><strong>Directions:</strong> ${data.directions}</p>
                ${data.imageUrl
                    ? `<img src="${data.imageUrl}" alt="${teacherName}" style="max-width: 20%; height: 20%;">`
                    : ""
                }
            `;
        }

        directionsDisplay.style.display = "block";
    } catch (error) {
        console.error("Error fetching directions:", error);
        alert("Failed to fetch directions. Please try again.");
    }
}

addTeacherBtn.addEventListener("click", () => {
    window.location.href = "add-teacher.html";
});

submitTeacherButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const name = document.getElementById("teacher-name").value;
    const floor = document.getElementById("teacher-floor").value;
    const branch = document.getElementById("teacher-branch").value;
    const directions = document.getElementById("teacher-directions").value;
    const image = document.getElementById("teacher-image").files[0];

    if (!name || !floor || !branch || !directions || !image) {
        alert("Please fill in all the fields and upload an image.");
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("floor", floor);
    formData.append("branch", branch);
    formData.append("directions", directions);
    formData.append("image", image);

    try {
        const response = await fetch(addTeacherEndpoint, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            alert("Teacher added successfully!");
            window.location.href = "index.html";
        } else {
            alert("Failed to add teacher. Please try again.");
        }
    } catch (error) {
        console.error("Error adding teacher:", error);
        alert("An error occurred while adding the teacher.");
    }
});

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    loadTeachers();

    if (getDirectionsButton) {
        getDirectionsButton.addEventListener("click", getDirections);
    }

    if (addTeacherBtn) {
        addTeacherBtn.addEventListener("click", () => {
            window.location.href = "add-teacher.html";
        });
    }
});
