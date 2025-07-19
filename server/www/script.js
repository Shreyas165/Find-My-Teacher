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
const API_BASE = "https://find-my-teacher.onrender.com";
const API = {
    search: `${API_BASE}/api/search`,
    directions: `${API_BASE}/api/directions/`,
    addTeacher: `${API_BASE}/api/add-teacher`,
    imageBase: `${API_BASE}/api/images/`,
    setPassword: `${API_BASE}/api/set-password`,
    verifyPassword: `${API_BASE}/api/verify-password`,
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

// Add a loading spinner element to the DOM
const searchBox = document.getElementById('teacher-search');
let searchSpinner = document.getElementById('search-loading-spinner');
if (!searchSpinner && searchBox) {
    searchSpinner = document.createElement('span');
    searchSpinner.id = 'search-loading-spinner';
    searchSpinner.style.display = 'none';
    searchSpinner.style.position = 'absolute';
    searchSpinner.style.right = '18px';
    searchSpinner.style.top = '50%';
    searchSpinner.style.transform = 'translateY(-50%)';
    searchSpinner.innerHTML = `<svg width="22" height="22" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#007BFF" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg>`;
    searchBox.parentNode.style.position = 'relative';
    searchBox.parentNode.appendChild(searchSpinner);
}

if (elements.teacherSearch && elements.searchResults) {
    async function searchTeachers(query) {
        try {
            if (query.length < 2) {
                elements.searchResults.style.display = 'none';
                if (searchSpinner) searchSpinner.style.display = 'none';
                return;
            }
            if (searchSpinner) searchSpinner.style.display = 'inline-block';
            if (state.cachedResults.has(query)) {
                displaySearchResults(state.cachedResults.get(query));
                if (searchSpinner) searchSpinner.style.display = 'none';
                return;
            }
            const response = await fetch(`${API.search}?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const filteredTeachers = data.teachers.filter(teacher =>
                teacher.name.toLowerCase().includes(query.toLowerCase())
            );
            state.cachedResults.set(query, filteredTeachers);
            displaySearchResults(filteredTeachers);
        } catch (error) {
            console.error("Error searching teachers:", error);
            elements.searchResults.innerHTML = '<div class="search-result-item">Failed to load teachers. Please check your connection or try again later.</div>';
            elements.searchResults.style.display = 'block';
        } finally {
            if (searchSpinner) searchSpinner.style.display = 'none';
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

// Move these functions to top-level scope
async function fetchAndDisplayDirections() {
    if (!state.selectedTeacher) return;
    try {
        elements.directionsDisplay.innerHTML = '';
        const response = await fetch(`${API.directions}${encodeURIComponent(state.selectedTeacher.name)}`);
        const data = await response.json();
        const directionsContent = document.createElement('div');
        directionsContent.id = 'directions-content';
        directionsContent.className = 'teacher-card';
        directionsContent.innerHTML = `
            <div class="teacher-info">
                <div class="info-item"><strong>👤 Name:</strong> <span>${state.selectedTeacher.name || 'Unknown'}</span></div>
                <div class="info-item"><strong>🏢 Branch:</strong> <span>${data.branch || 'N/A'}</span></div>
                <div class="info-item"><strong>🏬 Floor:</strong> <span>${data.floor || 'N/A'}</span></div>
            </div>
            <div class="info-item"><strong>🧭 Directions:</strong><br><span id="directions-text-content">${data.directions || 'N/A'}</span></div>
            <div id="directions-image-container" style="display:none"></div>
        `;
        elements.directionsDisplay.appendChild(directionsContent);
        const imageContainer = document.getElementById("directions-image-container");
        if (!data.error && data.imageUrl) {
            imageContainer.innerHTML = '';
            let imageUrl = data.imageUrl.replace('http://', 'https://');
            imageUrl += `?t=${Date.now()}`;
            const img = new Image();
            img.src = imageUrl;
            img.alt = state.selectedTeacher.name;
            img.className = 'teacher-image';
            img.onload = () => {
                imageContainer.style.display = 'block';
            };
            img.onerror = () => {
                imageContainer.innerHTML = '<p>Image unavailable</p>';
                imageContainer.style.display = 'block';
            };
            imageContainer.appendChild(img);
        } else if (data.error) {
            imageContainer.innerHTML = `<p style='color:red;'>${data.error}</p>`;
            imageContainer.style.display = 'block';
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
        elements.directionsDisplay.innerHTML = '';
        sessionStorage.setItem('selectedTeacher', JSON.stringify(state.selectedTeacher));
        window.location.reload();
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to process request. Please try again.");
    }
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
        showPasswordModal();
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

// Keep this inside the if block
if (elements.getDirectionsButton && elements.directionsDisplay) {
    elements.getDirectionsButton.addEventListener('click', getDirections);
}

// Bug Report button handler
const bugReportBtn = document.getElementById('bug-report-btn');
if (bugReportBtn) {
    bugReportBtn.addEventListener('click', () => {
        window.open('https://forms.gle/eZ4DYbPMtEuXT2Qo6', '_blank');
    });
}

// Modal functionality
function showPasswordModal() {
    const modal = document.getElementById('password-modal');
    modal.style.display = 'block';
}

function hidePasswordModal() {
    const modal = document.getElementById('password-modal');
    modal.style.display = 'none';
    // Clear form
    document.getElementById('password-form').reset();
}

function showForgotPasswordModal() {
    const passwordModal = document.getElementById('password-modal');
    const forgotModal = document.getElementById('forgot-password-modal');
    passwordModal.style.display = 'none';
    forgotModal.style.display = 'block';
}

function hideForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    modal.style.display = 'none';
    // Clear form
    document.getElementById('forgot-password-form').reset();
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            hidePasswordModal();
            hideForgotPasswordModal();
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const passwordModal = document.getElementById('password-modal');
        const forgotModal = document.getElementById('forgot-password-modal');

        if (event.target === passwordModal) {
            hidePasswordModal();
        }
        if (event.target === forgotModal) {
            hideForgotPasswordModal();
        }
    });

    // Password form submission
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetch(API.verifyPassword, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                hidePasswordModal();
                window.location.href = "add-teacher.html";
            } else {
                alert("Incorrect username or password. Access denied.");
            }
        } catch (error) {
            console.error("Error verifying password:", error);
            alert("Error verifying credentials. Please try again.");
        }
    });

    // Forgot password button
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    forgotPasswordBtn.addEventListener('click', showForgotPasswordModal);

    // Forgot password form submission
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    let forgotMessage = document.getElementById('forgot-message');
    if (!forgotMessage) {
        forgotMessage = document.createElement('div');
        forgotMessage.id = 'forgot-message';
        forgotPasswordModal.querySelector('.modal-content').appendChild(forgotMessage);
    }
    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        forgotMessage.innerHTML = '';
        const username = document.getElementById('change-username').value.trim();
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (!username || !oldPassword || !newPassword || !confirmPassword) {
            forgotMessage.innerHTML = '<div class="message error">Please fill in all fields.</div>';
            return;
        }
        if (newPassword !== confirmPassword) {
            forgotMessage.innerHTML = '<div class="message error">Passwords do not match.</div>';
            return;
        }
        forgotMessage.innerHTML = '<div class="message">Processing...</div>';
        forgotPasswordForm.querySelector('button[type="submit"]').disabled = true;
        try {
            const response = await fetch(API_BASE + "/api/change-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, oldPassword, newPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                forgotMessage.innerHTML = '<div class="message success">' + data.message + '</div>';
                setTimeout(() => {
                    hideForgotPasswordModal();
                    showPasswordModal();
                }, 1200);
            } else {
                forgotMessage.innerHTML = '<div class="message error">' + (data.error || 'Failed to change password.') + '</div>';
            }
        } catch (error) {
            console.error("Error changing password:", error);
            forgotMessage.innerHTML = '<div class="message error">An error occurred while changing the password.</div>';
        } finally {
            forgotPasswordForm.querySelector('button[type="submit"]').disabled = false;
        }
    });
});
