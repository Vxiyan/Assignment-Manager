// Canvas API Configuration
let canvasConfig = {
    domain: localStorage.getItem('canvasDomain') || '',
    token: localStorage.getItem('canvasToken') || '',
    // CORS proxy is needed because Canvas API doesn't allow browser requests from different origins.
    // You can use a public proxy or host your own. Set to empty string to disable.
    corsProxy: localStorage.getItem('corsProxy') || 'https://corsproxy.io/?'
};

// DOM Elements
const elements = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    elements.canvasDomain = document.getElementById('canvas-domain');
    elements.accessToken = document.getElementById('access-token');
    elements.corsProxy = document.getElementById('cors-proxy');
    elements.saveConfigBtn = document.getElementById('save-config-btn');
    elements.loadCoursesBtn = document.getElementById('load-courses-btn');
    elements.coursesContainer = document.getElementById('courses-container');
    elements.coursesSection = document.getElementById('courses-section');
    elements.assignmentsSection = document.getElementById('assignments-section');
    elements.assignmentsBody = document.getElementById('assignments-body');
    elements.selectedCourseName = document.getElementById('selected-course-name');
    elements.backToCoursesBtn = document.getElementById('back-to-courses-btn');
    elements.loading = document.getElementById('loading');
    elements.error = document.getElementById('error');

    // Load saved config into inputs
    elements.canvasDomain.value = canvasConfig.domain;
    elements.accessToken.value = canvasConfig.token;
    elements.corsProxy.value = canvasConfig.corsProxy;

    // Event listeners
    elements.saveConfigBtn.addEventListener('click', saveConfiguration);
    elements.loadCoursesBtn.addEventListener('click', loadCourses);
    elements.backToCoursesBtn.addEventListener('click', showCoursesSection);
});

// Save Canvas configuration to localStorage
function saveConfiguration() {
    canvasConfig.domain = elements.canvasDomain.value.trim();
    canvasConfig.token = elements.accessToken.value.trim();
    canvasConfig.corsProxy = elements.corsProxy.value.trim();

    // Remove protocol if user included it
    canvasConfig.domain = canvasConfig.domain.replace(/^https?:\/\//, '');

    localStorage.setItem('canvasDomain', canvasConfig.domain);
    localStorage.setItem('canvasToken', canvasConfig.token);
    localStorage.setItem('corsProxy', canvasConfig.corsProxy);

    showMessage('Configuration saved!', 'success');
}

// Make authenticated API request to Canvas (via CORS proxy)
async function canvasApiRequest(endpoint) {
    if (!canvasConfig.domain || !canvasConfig.token) {
        throw new Error('Please configure your Canvas domain and access token first.');
    }

    const canvasUrl = `https://${canvasConfig.domain}/api/v1${endpoint}`;
    
    // Use CORS proxy if configured
    const url = canvasConfig.corsProxy 
        ? `${canvasConfig.corsProxy}${encodeURIComponent(canvasUrl)}`
        : canvasUrl;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${canvasConfig.token}`,
            'x-requested-with': 'XMLHttpRequest'  // Some proxies require this
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid access token. Please check your token and try again.');
        }
        if (response.status === 403) {
            throw new Error('Access forbidden. The CORS proxy may be blocking the request, or your token lacks permissions.');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

// Load and display courses
async function loadCourses() {
    showLoading(true);
    hideError();
    elements.coursesContainer.innerHTML = '';

    try {
        // Get active courses only
        const courses = await canvasApiRequest('/courses?enrollment_state=active&per_page=100');
        
        if (courses.length === 0) {
            elements.coursesContainer.innerHTML = '<p>No active courses found.</p>';
            return;
        }

        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <h4>${escapeHtml(course.name)}</h4>
                <p>${course.course_code || ''}</p>
            `;
            courseCard.addEventListener('click', () => loadAssignments(course.id, course.name));
            elements.coursesContainer.appendChild(courseCard);
        });
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Load assignments for a specific course
async function loadAssignments(courseId, courseName) {
    showLoading(true);
    hideError();
    elements.assignmentsBody.innerHTML = '';
    elements.selectedCourseName.textContent = courseName;

    try {
        // Include rubric data in the request
        const assignments = await canvasApiRequest(
            `/courses/${courseId}/assignments?per_page=100&include[]=rubric`
        );

        if (assignments.length === 0) {
            elements.assignmentsBody.innerHTML = '<tr><td colspan="5">No assignments found.</td></tr>';
        } else {
            assignments.forEach(assignment => {
                const row = createAssignmentRow(assignment);
                elements.assignmentsBody.appendChild(row);
            });
        }

        // Show assignments section, hide courses section
        elements.coursesSection.style.display = 'none';
        elements.assignmentsSection.style.display = 'block';
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Create a table row for an assignment
function createAssignmentRow(assignment) {
    const row = document.createElement('tr');
    
    // Format due date
    const dueDate = assignment.due_at 
        ? new Date(assignment.due_at).toLocaleString() 
        : 'No due date';
    
    // Format points
    const points = assignment.points_possible !== null 
        ? assignment.points_possible 
        : 'N/A';
    
    // Format rubric
    const rubricHtml = formatRubric(assignment.rubric);
    
    // Format instructions (description)
    const instructions = assignment.description 
        ? truncateHtml(assignment.description, 200) 
        : 'No instructions';

    row.innerHTML = `
        <td><a href="${assignment.html_url}" target="_blank">${escapeHtml(assignment.name)}</a></td>
        <td>${dueDate}</td>
        <td>${points}</td>
        <td>${rubricHtml}</td>
        <td class="instructions-cell">${instructions}</td>
    `;

    return row;
}

// Format rubric data for display
function formatRubric(rubric) {
    if (!rubric || rubric.length === 0) {
        return 'No rubric';
    }

    const rubricItems = rubric.map(criterion => {
        const ratings = criterion.ratings 
            ? criterion.ratings.map(r => `${r.description} (${r.points}pts)`).join(', ')
            : '';
        return `<li><strong>${escapeHtml(criterion.description)}</strong> (${criterion.points}pts)${ratings ? `<br><small>${escapeHtml(ratings)}</small>` : ''}</li>`;
    }).join('');

    return `<ul class="rubric-list">${rubricItems}</ul>`;
}

// Go back to courses view
function showCoursesSection() {
    elements.assignmentsSection.style.display = 'none';
    elements.coursesSection.style.display = 'block';
}

// Utility functions
function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
}

function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.remove('hidden');
}

function hideError() {
    elements.error.classList.add('hidden');
}

function showMessage(message, type) {
    // Simple alert for now; could be improved with a toast notification
    alert(message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateHtml(html, maxLength) {
    // Create a temporary div to strip HTML tags for length check
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText;
    
    if (text.length <= maxLength) {
        return html;
    }
    
    return `<details><summary>${escapeHtml(text.substring(0, maxLength))}...</summary><div class="full-instructions">${html}</div></details>`;
}
