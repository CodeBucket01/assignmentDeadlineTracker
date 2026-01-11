// App State
const state = {
    assignments: JSON.parse(localStorage.getItem('assignments')) || [],
    submissions: JSON.parse(localStorage.getItem('submissions')) || [],
    currentUser: 'student' // 'student' or 'teacher'
};

// DOM Elements
const views = {
    student: document.getElementById('student-view'),
    teacher: document.getElementById('teacher-view')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderAssignments();
    checkDailyReminders();
    updateDashboardStats();
});

// View Switching
function switchView(viewName) {
    // Hide all
    Object.values(views).forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected
    views[viewName].classList.remove('hidden');

    // Update Nav
    const activeBtn = document.querySelector(`.nav-btn[onclick="switchView('${viewName}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Refresh Data
    if (viewName === 'student') {
        renderAssignments();
    } else {
        renderTeacherDashboard();
    }
}

// Modal Handling
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Assignment Logic
function renderAssignments() {
    const listContainer = document.getElementById('assignment-list');
    listContainer.innerHTML = '';

    if (state.assignments.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No assignments yet! 🎉</p>';
        return;
    }

    state.assignments.forEach(assignment => {
        const daysLeft = calculateDaysLeft(assignment.date);
        const statusClass = getStatusClass(daysLeft);
        const submitted = isSubmitted(assignment.id);

        const card = document.createElement('div');
        card.className = `assignment-card ${statusClass}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="subject-tag">${assignment.subject}</span>
                <span class="days-left">${daysLeft} days left</span>
            </div>
            <h3>${assignment.title}</h3>
            <p>${assignment.desc}</p>
            ${assignment.link ? `<a href="${assignment.link}" target="_blank" class="ref-link">🔗 Reference Material</a>` : ''}
            <div class="card-footer">
                <span class="due-date">Due: ${assignment.date}</span>
                ${!submitted
                ? `<button onclick="submitAssignment(${assignment.id})" class="action-btn">Mark Done</button>`
                : `<span class="badge success">✅ Submitted</span>`
            }
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function calculateDaysLeft(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusClass(days) {
    if (days < 2) return 'status-red';
    if (days <= 5) return 'status-yellow';
    return 'status-green';
}

function isSubmitted(id) {
    return state.submissions.some(s => s.assignmentId === id);
}

function submitAssignment(id) {
    if (confirm('Mark this assignment as complete?')) {
        state.submissions.push({
            assignmentId: id,
            studentName: 'Current Student', // Mock
            date: new Date().toISOString()
        });
        localStorage.setItem('submissions', JSON.stringify(state.submissions));
        renderAssignments();
        updateDashboardStats();
    }
}

// Form Handling
document.getElementById('assignment-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const newAssignment = {
        id: Date.now(),
        title: document.getElementById('a-title').value,
        subject: document.getElementById('a-subject').value,
        desc: document.getElementById('a-desc').value,
        link: document.getElementById('a-link').value,
        date: document.getElementById('a-date').value
    };

    state.assignments.push(newAssignment);
    localStorage.setItem('assignments', JSON.stringify(state.assignments));

    // Reset and Close
    e.target.reset();
    closeModal('add-assignment-modal');

    // Switch to student view to see changes (optional, but good visual feedback)
    // For now stay on teacher view but maybe show a success message?
    // The user asked "no update on webpage", so let's make sure we re-render or notify.
    alert('Assignment Published!');

    // If we are currently in student view (unlikely if using form form teacher view), re-render.
    // If we are in teacher view, maybe we should also render a "Teacher List".
    // For now, let's just re-render everything.
    renderAssignments();
});

function checkDailyReminders() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastReminded = localStorage.getItem('lastReminderDate');

    if (lastReminded !== todayStr) {
        // Collect due soon assignments
        const dueSoon = state.assignments.filter(a => {
            const days = calculateDaysLeft(a.date);
            return days >= 0 && days <= 3 && !isSubmitted(a.id);
        });

        if (dueSoon.length > 0) {
            const list = document.getElementById('reminder-list');
            list.innerHTML = dueSoon.map(a => `
                <div class="reminder-item">
                    <strong>${a.title}</strong> is due in ${calculateDaysLeft(a.date)} days!
                </div>
            `).join('');
            openModal('reminder-modal');
            localStorage.setItem('lastReminderDate', todayStr);
        }
    }
}

function renderTeacherDashboard() {
    const submissionList = document.getElementById('submission-list');
    submissionList.innerHTML = '';

    if (state.submissions.length === 0) {
        submissionList.innerHTML = '<p class="text-muted">No submissions yet.</p>';
    } else {
        // Group by assignment
        const recentSubs = state.submissions.slice().reverse(); // Show newest first
        recentSubs.forEach(sub => {
            const assignment = state.assignments.find(a => a.id === sub.assignmentId);
            const div = document.createElement('div');
            div.className = 'submission-item';
            div.innerHTML = `
                <div class="sub-info">
                    <strong>${assignment ? assignment.title : 'Unknown Assignment'}</strong>
                    <span class="sub-student">${sub.studentName}</span>
                </div>
                <span class="sub-date">${new Date(sub.date).toLocaleDateString()}</span>
            `;
            submissionList.appendChild(div);
        });
    }

    updateDashboardStats();
}

function updateDashboardStats() {
    // Analytics Panel
    const panel = document.querySelector('.analytics-panel');
    const totalAssignments = state.assignments.length;
    const totalSubmissions = state.submissions.length;

    // Calculate simple completion rate
    // Assuming 1 student for this single-user demo
    const completionRate = totalAssignments === 0 ? 0 : Math.round((totalSubmissions / totalAssignments) * 100);

    panel.innerHTML = `
        <div class="stat-card">
            <h3>Total Assignments</h3>
            <p class="stat-value">${totalAssignments}</p>
        </div>
        <div class="stat-card">
            <h3>Completion Rate</h3>
            <p class="stat-value">${completionRate}%</p>
        </div>
        <div class="stat-card">
            <h3>Pending</h3>
            <p class="stat-value">${totalAssignments - totalSubmissions}</p>
        </div>
    `;
}
