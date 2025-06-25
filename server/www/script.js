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
    directionsText: document.getElementById("directions-text-content")
};

// API endpoints
const API = {
    search: "https://find-my-teacher.onrender.com/api/people",
    directions: "https://find-my-teacher.onrender.com/api/directions/",
    addTeacher: "https://find-my-teacher.onrender.com/api/add-teacher",
    imageBase: "https://find-my-teacher.onrender.com/api/images/"
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
                const teacherName = teacher.name || 'Unknown';
                const searchQuery = elements.teacherSearch.value.toLowerCase();
                const index = teacherName.toLowerCase().indexOf(searchQuery);

                let highlightedName = teacherName;
                if (index !== -1 && teacherName !== 'Unknown') {
                    const before = teacherName.substring(0, index);
                    const match = teacherName.substring(index, index + searchQuery.length);
                    const after = teacherName.substring(index + searchQuery.length);
                    highlightedName = `${before}<strong>${match}</strong>${after}`;
                }

                div.innerHTML = `
                    <div class="teacher-name">${highlightedName}</div>
                    <div class="teacher-details">
                        <span class="branch">${teacher.branch || ''}</span>
                        <span class="floor">Floor ${teacher.floor || ''}</span>
                    </div>
                `;

                div.addEventListener('click', () => {
                    state.selectedTeacher = teacher;
                    elements.teacherSearch.value = teacher.name;
                    elements.searchResults.style.display = 'none';
                    fetchAndDisplayDirections();
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
    async function fetchAndDisplayDirections() {
        if (!state.selectedTeacher) return;

        try {
            // First completely clear the directions display
            elements.directionsDisplay.innerHTML = '';
            
            const response = await fetch(`${API.directions}${encodeURIComponent(state.selectedTeacher.name)}`);
            const data = await response.json();

            // Create fresh container structure
            const directionsContent = document.createElement('div');
            directionsContent.id = 'directions-content';
            directionsContent.innerHTML = `
                <p><strong>Branch:</strong> <span id="branch-text"></span></p>
                <p><strong>Floor:</strong> <span id="floor-text"></span></p>
                <p><strong>Directions:</strong></p>
                <p id="directions-text-content"></p>
                <div id="directions-image-container" style="display:none"></div>
            `;
            
            elements.directionsDisplay.appendChild(directionsContent);

            // Get fresh element references
            const branchText = document.getElementById("branch-text");
            const floorText = document.getElementById("floor-text");
            const directionsText = document.getElementById("directions-text-content");
            const imageContainer = document.getElementById("directions-image-container");

            if (data.error) {
                directionsText.textContent = data.error;
            } else {
                branchText.textContent = data.branch;
                floorText.textContent = data.floor;
                directionsText.textContent = data.directions;

                if (data.imageUrl) {
                    // Completely clear previous images
                    imageContainer.innerHTML = '';
                    
                    // Force HTTPS and cache busting
                    let imageUrl = data.imageUrl.replace('http://', 'https://');
                    imageUrl += `?t=${Date.now()}`;  // More aggressive cache busting
                    
                    const img = new Image();
                    img.src = imageUrl;
                    img.alt = state.selectedTeacher.name;
                    img.style.cssText = `
                        max-width: 200px; 
                        height: auto; 
                        margin-top: 10px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    `;
                    
                    // Only show container after image loads
                    img.onload = () => {
                        img.style.opacity = '1';
                        imageContainer.style.display = 'block';
                    };
                    
                    img.onerror = () => {
                        imageContainer.innerHTML = '<p>Image unavailable</p>';
                        imageContainer.style.display = 'block';
                    };
                    
                    imageContainer.appendChild(img);
                }
            }

            elements.directionsDisplay.style.display = "block";
        } catch (error) {
            console.error("Error fetching directions:", error);
            elements.directionsDisplay.innerHTML = '<p>Failed to fetch directions. Please try again.</p>';
            elements.directionsDisplay.style.display = "block";
        }
    }

    async function getDirections() {
        if (!state.selectedTeacher) {
            alert("Please select a teacher from the search results.");
            return;
        }

        try {
            // Clear all existing content more aggressively
            elements.directionsDisplay.innerHTML = '';
            
            // Store teacher and reload
            sessionStorage.setItem('selectedTeacher', JSON.stringify(state.selectedTeacher));
            window.location.reload();
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to process request. Please try again.");
        }
    }

    elements.getDirectionsButton.addEventListener('click', getDirections);
}

// Handle page reload and auto-display directions
document.addEventListener('DOMContentLoaded', () => {
    // First clear any existing content
    if (elements.directionsDisplay) {
        elements.directionsDisplay.innerHTML = '';
    }
    
    const storedTeacher = sessionStorage.getItem('selectedTeacher');
    if (storedTeacher) {
        try {
            state.selectedTeacher = JSON.parse(storedTeacher);
            sessionStorage.removeItem('selectedTeacher');
            
            if (elements.teacherSearch) {
                elements.teacherSearch.value = state.selectedTeacher.name;
            }
            
            if (elements.getDirectionsButton && elements.directionsDisplay) {
                // Add small delay to ensure complete DOM cleanup
                setTimeout(fetchAndDisplayDirections, 50);
            }
        } catch (error) {
            console.error("Error processing stored teacher:", error);
        }
    }
});

if (elements.addTeacherBtn) {
    elements.addTeacherBtn.addEventListener("click", () => {
        window.location.href = "add-teacher.html";
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
}

const aboutBtn = document.getElementById('about-btn');
const aboutDisplay = document.getElementById('about-display');
if (aboutBtn && aboutDisplay) {
    aboutBtn.addEventListener('click', () => {
        if (aboutDisplay.style.display === 'none' || aboutDisplay.style.display === '') {
            aboutDisplay.style.display = 'block';
        } else {
            aboutDisplay.style.display = 'none';
        }
    });
}
