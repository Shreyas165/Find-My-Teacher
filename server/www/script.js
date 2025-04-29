// Defer background image loading
document.addEventListener('DOMContentLoaded', () => {
    // Load background image after page content
    const bgImage = new Image();
    bgImage.src = 'p2.png';
    bgImage.onload = () => document.body.classList.add('bg-loaded');
});

// Cache DOM elements
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

                // Highlight the matching text
                const teacherName = teacher.name;
                const searchQuery = elements.teacherSearch.value.toLowerCase();
                const index = teacherName.toLowerCase().indexOf(searchQuery);

                let highlightedName = teacherName;
                if (index !== -1) {
                    const before = teacherName.substring(0, index);
                    const match = teacherName.substring(index, index + searchQuery.length);
                    const after = teacherName.substring(index + searchQuery.length);
                    highlightedName = `${before}<strong>${match}</strong>${after}`;
                }

                
                const branchDisplay = teacher.branch ? teacher.branch : '';
                const floorDisplay = teacher.floor ? `Floor ${teacher.floor}` : '';

                div.innerHTML = `
                    <div class="teacher-name">${highlightedName}</div>
                    <div class="teacher-details">
                        <span class="branch">${teacher.branch}</span>
                        <span class="floor">Floor ${teacher.floor}</span>
                    </div>
                `;
                

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

    // Optimized event handlers with debouncing
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
            const response = await fetch(`${API.directions}${encodeURIComponent(state.selectedTeacher.name)}`);
            const data = await response.json();

            if (data.error) {
                elements.directionsDisplay.innerHTML = `<p>${data.error}</p>`;
            } else {
                elements.branchText.textContent = data.branch;
                elements.floorText.textContent = data.floor;
                elements.directionsText.textContent = data.directions;

                if (data.imageUrl) {
                    const img = new Image();
                    img.src = data.imageUrl;
                    img.alt = state.selectedTeacher.name;
                    img.style = "max-width: 200px; height: auto; margin-top: 10px;";
                    img.loading = "lazy";
                    document.getElementById("directions-image-container").appendChild(img);
                }
            }

            elements.directionsDisplay.style.display = "block";
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

