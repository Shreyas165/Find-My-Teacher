const teacherSearch = document.getElementById("teacher-search");
const searchResults = document.getElementById("search-results");
const getDirectionsButton = document.getElementById("get-directions");
const directionsDisplay = document.getElementById("directions-display");
const addTeacherBtn = document.getElementById("add-teacher-btn");
const submitTeacherButton = document.getElementById("submit-teacher");
const addTeacherForm = document.getElementById("add-teacher-form");

const searchEndpoint = "https://find-my-teacher.onrender.com/api/people";
const getDirectionsEndpoint = "https://find-my-teacher.onrender.com/api/directions/";
const addTeacherEndpoint = "https://find-my-teacher.onrender.com/api/add-teacher";

let selectedTeacher = null;
let searchTimeout = null;

async function searchTeachers(query) {
    try {
        const response = await fetch(`${searchEndpoint}?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displaySearchResults(data.teachers);
    } catch (error) {
        console.error("Error searching teachers:", error);
        searchResults.innerHTML = '<div class="search-result-item">Error searching teachers</div>';
        searchResults.style.display = 'block';
    }
}

function displaySearchResults(teachers) {
    searchResults.innerHTML = '';

    if (teachers.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No teachers found</div>';
    } else {
        teachers.forEach(teacher => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div class="teacher-name">${teacher.name}</div>
                <div class="teacher-details">
                    <span class="branch">${teacher.branch}</span>
                    <span class="floor">Floor ${teacher.floor}</span>
                </div>
            `;
            div.addEventListener('click', () => {
                selectedTeacher = teacher;
                teacherSearch.value = teacher.name;
                searchResults.style.display = 'none';
            });
            searchResults.appendChild(div);
        });
    }

    searchResults.style.display = 'block';
}

// Handle search input
teacherSearch.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (query.length < 2) {
        searchResults.style.display = 'none';
        selectedTeacher = null;
        return;
    }

    searchTimeout = setTimeout(() => {
        searchTeachers(query);
    }, 300);
});

// Handle keyboard events
teacherSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (selectedTeacher) {
            getDirections();
        }
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!teacherSearch.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
});

async function getDirections() {
    if (!selectedTeacher) {
        alert("Please select a teacher from the search results.");
        return;
    }

    try {
        const response = await fetch(`${getDirectionsEndpoint}${encodeURIComponent(selectedTeacher.name)}`);
        const data = await response.json();

        if (data.error) {
            directionsDisplay.innerHTML = `<p>${data.error}</p>`;
        } else {
            directionsDisplay.innerHTML = `
                <p><strong>Branch:</strong> ${data.branch}</p>
                <p><strong>Floor:</strong> ${data.floor}</p>
                <p><strong>Directions:</strong> ${data.directions}</p>
                ${data.imageUrl
                    ? `<img src="${data.imageUrl}" alt="${selectedTeacher.name}" style="max-width: 200px; height: auto; margin-top: 10px;">`
                    : "<p>No image available</p>"
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
        console.log("Attempting to add teacher...");
        const response = await fetch(addTeacherEndpoint, {
            method: "POST",
            body: formData,
        });

        console.log("Response status:", response.status);
        const responseData = await response.json();
        console.log("Response data:", responseData);

        if (response.ok) {
            alert("Teacher added successfully!");
            window.location.href = "index.html";
        } else {
            console.error("Error response:", responseData);
            alert(`Failed to add teacher: ${responseData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error adding teacher:", error);
        alert(`An error occurred while adding the teacher: ${error.message}`);
    }
});

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    if (getDirectionsButton) {
        getDirectionsButton.addEventListener("click", getDirections);
    }

    if (addTeacherBtn) {
        addTeacherBtn.addEventListener("click", () => {
            window.location.href = "add-teacher.html";
        });
    }
});
