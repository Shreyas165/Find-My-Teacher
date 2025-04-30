document.addEventListener('DOMContentLoaded', () => {

    const bgImage = new Image();
    bgImage.src = 'p2.png';
    bgImage.onload = () => document.body.classList.add('bg-loaded');
});


const elements = {
    teacherSearch: document.getElementById("teacher-search"),
    searchResults: document.getElementById("search-results"),
    getDirectionsButton: document.getElementById("get-directions"),
    directionsDisplay: document.getElementById("directions-display"),
    addTeacherBtn: document.getElementById("add-teacher-btn"),
    submitTeacherButton: document.getElementById("submit-teacher"),
    addTeacherForm: document.getElementById("add-teacher-form"),
    branchText: document.getElementById("branch-text"),
    floorText: document.getElementById("floor-text"),
    directionsText: document.getElementById("directions-text-content"),
    aboutBtn: document.getElementById("about-btn"),
    aboutDisplay: document.getElementById("about-display")
};

// API endpoints
const API = {
    search: "https://find-my-teacher.onrender.com/api/people",
    directions: "https://find-my-teacher.onrender.com/api/directions/",
    addTeacher: "https://find-my-teacher.onrender.com/api/add-teacher"
};

// State management
let state = {
    selectedTeacher: null,
    searchTimeout: null,
    cachedResults: new Map()
};

// Debounce function
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Search functionality
if (elements.teacherSearch && elements.searchResults) {
    async function searchTeachers(query) {
        try {
            // Only search if query is at least 2 characters
            if (query.length < 2) {
                elements.searchResults.style.display = 'none';
                return;
            }

            // Check cache first
            if (state.cachedResults.has(query)) {
                displaySearchResults(state.cachedResults.get(query));
                return;
            }

            const response = await fetch(`${API.search}?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            // Filter teachers based on the query
            const filteredTeachers = data.teachers.filter(teacher =>
                teacher.name.toLowerCase().includes(query.toLowerCase())
            );

            // Cache the filtered results
            state.cachedResults.set(query, filteredTeachers);
            displaySearchResults(filteredTeachers);
        } catch (error) {
            console.error("Error searching teachers:", error);
            elements.searchResults.innerHTML = '<div class="search-result-item">Error searching teachers</div>';
            elements.searchResults.style.display = 'block';
        }
    }

    function displaySearchResults(teachers) {
        elements.searchResults.innerHTML = '';

        if (!teachers.length) {
            elements.searchResults.innerHTML = '<div class="search-result-item">No matching teachers found</div>';
        } else {
            const fragment = document.createDocumentFragment();
            teachers.forEach(teacher => {
                const div = document.createElement('div');
                div.className = 'search-result-item';

                // Create teacher info display
                const teacherInfo = document.createElement('div');
                teacherInfo.className = 'teacher-info';

                // Add name
                const nameDiv = document.createElement('div');
                nameDiv.className = 'teacher-name';
                nameDiv.textContent = teacher.name;
                teacherInfo.appendChild(nameDiv);

                // Add branch if available
                if (teacher.branch) {
                    const branchDiv = document.createElement('div');
                    branchDiv.className = 'teacher-branch';
                    branchDiv.textContent = `Branch: ${teacher.branch}`;
                    teacherInfo.appendChild(branchDiv);
                }

                // Add floor if available
                if (teacher.floor) {
                    const floorDiv = document.createElement('div');
                    floorDiv.className = 'teacher-floor';
                    floorDiv.textContent = `Floor: ${teacher.floor}`;
                    teacherInfo.appendChild(floorDiv);
                }

                div.appendChild(teacherInfo);
                div.addEventListener('click', () => {
                    state.selectedTeacher = teacher;
                    elements.teacherSearch.value = teacher.name;
                    elements.searchResults.style.display = 'none';
                });
                fragment.appendChild(div);
            });
            elements.searchResults.appendChild(fragment);
        }

        elements.searchResults.style.display = 'block';
    }

    // Add debounced search
    elements.teacherSearch.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            elements.searchResults.style.display = 'none';
            state.selectedTeacher = null;
            return;
        }
        searchTeachers(query);
    }, 300));

    elements.teacherSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.selectedTeacher) {
            getDirections();
        }
    });

    // Use event delegation for document click
    document.addEventListener('click', (e) => {
        if (!elements.teacherSearch.contains(e.target) && !elements.searchResults.contains(e.target)) {
            elements.searchResults.style.display = 'none';
        }
    });
}

// Get directions functionality
if (elements.getDirectionsButton && elements.directionsDisplay) {
    async function getDirections() {
        if (!state.selectedTeacher) {
            alert("Please select a teacher from the search results.");
            return;
        }

        try {
            // Clear previous content
            const directionsDisplay = document.getElementById("directions-display");
            directionsDisplay.innerHTML = ''; // Clear all previous content

            const response = await fetch(`${API.directions}${encodeURIComponent(state.selectedTeacher.name)}`);
            const data = await response.json();

            if (data.error) {
                directionsDisplay.innerHTML = `<p>${data.error}</p>`;
            } else {
                // Create the main container
                const mainContainer = document.createElement('div');
                mainContainer.className = 'message-box';

                // Create the content container
                const contentContainer = document.createElement('div');
                contentContainer.className = 'teacher-info-container';

                // Add name information
                const nameInfo = document.createElement('div');
                nameInfo.className = 'info-item';
                nameInfo.innerHTML = `<strong>Name:</strong> ${state.selectedTeacher.name}`;
                contentContainer.appendChild(nameInfo);

                // Add branch information
                const branchInfo = document.createElement('div');
                branchInfo.className = 'info-item';
                branchInfo.innerHTML = `<strong>Branch:</strong> ${data.branch}`;
                contentContainer.appendChild(branchInfo);

                // Add floor information
                const floorInfo = document.createElement('div');
                floorInfo.className = 'info-item';
                floorInfo.innerHTML = `<strong>Floor:</strong> ${data.floor}`;
                contentContainer.appendChild(floorInfo);

                // Add directions information
                const directionsInfo = document.createElement('div');
                directionsInfo.className = 'info-item';
                directionsInfo.innerHTML = `<strong>Directions:</strong> ${data.directions}`;
                contentContainer.appendChild(directionsInfo);

                // Add the content container to the main container
                mainContainer.appendChild(contentContainer);

                // Handle image if available
                if (data.imageUrl) {
                    const imageContainer = document.createElement('div');
                    imageContainer.id = 'directions-image-container';
                    const img = new Image();
                    img.src = data.imageUrl;
                    img.alt = state.selectedTeacher.name;
                    img.className = 'teacher-image';
                    imageContainer.appendChild(img);
                    mainContainer.appendChild(imageContainer);
                }

                // Add the main container to the display
                directionsDisplay.appendChild(mainContainer);
            }

            directionsDisplay.style.display = "block";
        } catch (error) {
            console.error("Error fetching directions:", error);
            alert("Failed to fetch directions. Please try again.");
        }
    }

    elements.getDirectionsButton.addEventListener('click', getDirections);
}

// Add teacher functionality
if (elements.addTeacherBtn) {
    elements.addTeacherBtn.addEventListener("click", () => {
        const password = prompt("Please enter the admin password:");
        if (password === "admin123") {
            window.location.href = "add-teacher.html";
        } else {
            alert("Incorrect password. Please try again.");
        }
    });
}

if (elements.submitTeacherButton && elements.addTeacherForm) {
    // Create loading indicator
    const createLoadingIndicator = () => {
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.innerHTML = 'Adding teacher...';
        return loader;
    };

    // Optimize image before upload
    const optimizeImage = async (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set maximum dimensions
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 600;

                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress image
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(resolve, 'image/jpeg', 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    elements.submitTeacherButton.addEventListener("click", async (event) => {
        event.preventDefault();

        // Disable submit button and show loading
        elements.submitTeacherButton.disabled = true;
        const loadingIndicator = createLoadingIndicator();
        elements.addTeacherForm.appendChild(loadingIndicator);

        try {
            const formData = new FormData();
            let hasError = false;

            // Gather form data
            ['name', 'floor', 'branch', 'directions'].forEach(field => {
                const value = document.getElementById(`teacher-${field}`).value.trim();
                if (!value) {
                    hasError = true;
                    document.getElementById(`teacher-${field}`).classList.add('error');
                }
                formData.append(field, value);
            });

            const imageFile = document.getElementById("teacher-image").files[0];
            if (!imageFile) {
                hasError = true;
                document.getElementById("teacher-image").classList.add('error');
            }

            if (hasError) {
                throw new Error("Please fill in all required fields");
            }

            // Optimize image before upload
            const optimizedImage = await optimizeImage(imageFile);
            formData.append("image", optimizedImage, imageFile.name);

            const response = await fetch(API.addTeacher, {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                alert("Teacher added successfully!");
                window.location.href = "index.html";
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add teacher');
            }
        } catch (error) {
            console.error("Error adding teacher:", error);
            alert(error.message);
        } finally {
            // Remove loading indicator and re-enable submit button
            elements.addTeacherForm.removeChild(loadingIndicator);
            elements.submitTeacherButton.disabled = false;
        }
    });

    // Clear error styling on input
    ['name', 'floor', 'branch', 'directions', 'image'].forEach(field => {
        const element = document.getElementById(`teacher-${field}`);
        if (element) {
            element.addEventListener('input', () => {
                element.classList.remove('error');
            });
        }
    });
    // About button functionality
    if (elements.aboutBtn && elements.aboutDisplay) {
        elements.aboutBtn.addEventListener("click", () => {
            // Hide other displays
            elements.directionsDisplay.style.display = "none";
            elements.addTeacherForm.style.display = "none";

            // Toggle about display
            if (elements.aboutDisplay.style.display === "block") {
                elements.aboutDisplay.style.display = "none";
            } else {
                elements.aboutDisplay.style.display = "block";
            }
        });
    }

}

