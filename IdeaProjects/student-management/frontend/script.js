const API_URL = "http://localhost:8080/students";

const studentForm = document.getElementById("studentForm");
const studentTableBody = document.getElementById("studentTableBody");
const studentModal = document.getElementById("studentModal");
const emptyState = document.getElementById("emptyState");
const statusMessage = document.getElementById("statusMessage");
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");
const submitButton = document.getElementById("submitButton");
const modalTitle = document.getElementById("modalTitle");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const courseInput = document.getElementById("course");

let students = [];
let editingStudentId = null;

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function setStatus(message = "") {
    statusMessage.textContent = message;
}

function initials(name) {
    return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function renderStudents() {
    const query = searchInput.value.trim().toLowerCase();
    const visibleStudents = students.filter(student => [student.name, student.email, student.course]
        .some(value => value.toLowerCase().includes(query)));

    studentTableBody.innerHTML = visibleStudents.map(student => `
        <tr>
            <td><div class="student-name"><span class="avatar">${escapeHtml(initials(student.name))}</span>${escapeHtml(student.name)}</div></td>
            <td>${escapeHtml(student.email)}</td>
            <td><span class="course-tag">${escapeHtml(student.course)}</span></td>
            <td><span class="student-id">#${escapeHtml(String(student.id).padStart(4, "0"))}</span></td>
            <td><div class="actions"><button class="table-action" data-action="edit" data-id="${student.id}" type="button">Edit</button><button class="table-action delete" data-action="delete" data-id="${student.id}" type="button">Delete</button></div></td>
        </tr>`).join("");

    emptyState.hidden = visibleStudents.length > 0;
    resultCount.textContent = `${visibleStudents.length} ${visibleStudents.length === 1 ? "student" : "students"}`;
    document.getElementById("totalStudents").textContent = students.length;
    document.getElementById("totalCourses").textContent = new Set(students.map(student => student.course.toLowerCase())).size;
    document.getElementById("latestStudent").textContent = students.length ? students[students.length - 1].name.split(" ")[0] : "--";
}

async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
}

async function loadStudents() {
    setStatus("");
    try {
        students = await request(API_URL);
        renderStudents();
    } catch (error) {
        setStatus("Unable to connect to the student service. Make sure the backend is running on port 8080.");
        emptyState.hidden = false;
        studentTableBody.innerHTML = "";
    }
}

function openModal(student = null) {
    editingStudentId = student?.id ?? null;
    modalTitle.textContent = student ? "Edit student" : "Add a student";
    submitButton.textContent = student ? "Save changes" : "Add student";
    nameInput.value = student?.name ?? "";
    emailInput.value = student?.email ?? "";
    courseInput.value = student?.course ?? "";
    studentModal.hidden = false;
    (student ? nameInput : nameInput).focus();
}

function closeModal() {
    studentModal.hidden = true;
    studentForm.reset();
    editingStudentId = null;
}

studentForm.addEventListener("submit", async event => {
    event.preventDefault();
    submitButton.disabled = true;
    const wasEditing = editingStudentId !== null;
    const payload = { name: nameInput.value.trim(), email: emailInput.value.trim(), course: courseInput.value.trim() };
    try {
        await request(editingStudentId ? `${API_URL}/${editingStudentId}` : API_URL, {
            method: editingStudentId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        closeModal();
        await loadStudents();
        setStatus(wasEditing ? "Student updated successfully." : "Student added successfully.");
    } catch (error) {
        setStatus("We couldn't save that student. Please check the details and try again.");
    } finally {
        submitButton.disabled = false;
    }
});

studentTableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const student = students.find(item => String(item.id) === button.dataset.id);
    if (button.dataset.action === "edit") return openModal(student);
    if (!student || !window.confirm(`Delete ${student.name} from the directory?`)) return;
    try {
        await request(`${API_URL}/${student.id}`, { method: "DELETE" });
        await loadStudents();
        setStatus("Student removed from the directory.");
    } catch (error) {
        setStatus("We couldn't delete that student. Please try again.");
    }
});

document.getElementById("newStudentButton").addEventListener("click", () => openModal());
document.getElementById("closeModalButton").addEventListener("click", closeModal);
document.getElementById("cancelButton").addEventListener("click", closeModal);
searchInput.addEventListener("input", renderStudents);
studentModal.addEventListener("click", event => { if (event.target === studentModal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !studentModal.hidden) closeModal(); });

loadStudents();