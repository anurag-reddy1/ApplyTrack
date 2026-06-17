import { requireAuth, clearSession } from "./modules/storage.js";

const session = requireAuth();
if (!session) throw new Error("Not authenticated.");
const { username } = session;

const API = "/api/interviews";

// ─── State ───────────────────────────────────────────────────────────────────
let interviews = [];
let editingId = null;
let activeFilter = "";

// ─── DOM refs ────────────────────────────────────────────────────────────────
const tbody = document.getElementById("interviews-tbody");
const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("search-input");
const notesPanel = document.getElementById("notes-panel");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");

const fields = {
  company: document.getElementById("f-company"),
  role: document.getElementById("f-role"),
  round: document.getElementById("f-round"),
  date: document.getElementById("f-date"),
  status: document.getElementById("f-status"),
  result: document.getElementById("f-result"),
  interviewer: document.getElementById("f-interviewer"),
  tech: document.getElementById("f-tech"),
  behavioral: document.getElementById("f-behavioral"),
};

// ─── Nav ──────────────────────────────────────────────────────────────────────
document.getElementById("nav-username").textContent = username;
document.getElementById("sign-out-btn").addEventListener("click", () => {
  clearSession();
  window.location.href = "../index.html";
});

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchAll() {
  const res = await fetch(API, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

async function createOne(data) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Failed to create");
  }
  return res.json();
}

async function updateOne(id, data) {
  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || "Failed to update");
  }
  return res.json();
}

async function deleteOne(id) {
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    Upcoming: "badge--blue",
    Completed: "badge--green",
    Cancelled: "badge--grey",
  };
  return `<span class="badge ${map[status] ?? "badge--grey"}">${status}</span>`;
}

function resultBadge(result) {
  const map = {
    Pass: "badge--green",
    Fail: "badge--red",
    Pending: "badge--yellow",
  };
  return `<span class="badge ${map[result] ?? "badge--yellow"}">${result}</span>`;
}

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderTable() {
  const query = searchInput.value.toLowerCase();

  const filtered = interviews.filter((iv) => {
    if (activeFilter && iv.status !== activeFilter) return false;
    if (query) {
      return (
        iv.company.toLowerCase().includes(query) ||
        iv.role.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No interviews found. Click + Add Interview to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (iv) => `
      <tr class="clickable" data-id="${iv._id}">
        <td><strong>${iv.company}</strong></td>
        <td>${iv.role}</td>
        <td><span class="round-tag">${iv.round}</span></td>
        <td>${statusBadge(iv.status)}</td>
        <td class="date-col">${fmtDate(iv.date)}</td>
        <td>${resultBadge(iv.result)}</td>
        <td>
          <div class="actions-cell">
            <button class="action-icon edit-btn" data-id="${iv._id}" title="Edit">✏️</button>
            <button class="action-icon action-icon--delete delete-btn" data-id="${iv._id}" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  tbody.querySelectorAll("tr.clickable").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".actions-cell")) return;
      openNotesPanel(row.dataset.id);
    });
  });

  tbody.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEdit(btn.dataset.id);
    })
  );

  tbody.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDelete(btn.dataset.id);
    })
  );
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────
function openNotesPanel(id) {
  const iv = interviews.find((x) => String(x._id) === id);
  if (!iv) return;
  panelTitle.textContent = `${iv.company} — ${iv.round}`;
  panelBody.innerHTML = `
    <div class="notes-section">
      <h4>Technical Prep Notes</h4>
      <p class="${iv.techNotes ? "" : "empty"}">${iv.techNotes || "No notes added yet."}</p>
    </div>
    <div class="notes-section">
      <h4>Behavioral Prep Notes</h4>
      <p class="${iv.behavioralNotes ? "" : "empty"}">${iv.behavioralNotes || "No notes added yet."}</p>
    </div>
    ${iv.interviewerName ? `<div class="notes-section"><h4>Interviewer</h4><p>${iv.interviewerName}</p></div>` : ""}
  `;
  notesPanel.hidden = false;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title) {
  modalTitle.textContent = title;
  formError.hidden = true;
  overlay.hidden = false;
}

function closeModal() {
  overlay.hidden = true;
  editingId = null;
  Object.values(fields).forEach((el) => (el.value = ""));
}

function openAdd() {
  editingId = null;
  openModal("Add Interview");
}

function openEdit(id) {
  const iv = interviews.find((x) => String(x._id) === id);
  if (!iv) return;
  editingId = id;
  fields.company.value = iv.company;
  fields.role.value = iv.role;
  fields.round.value = iv.round;
  fields.date.value = iv.date
    ? new Date(iv.date).toISOString().slice(0, 16)
    : "";
  fields.status.value = iv.status;
  fields.result.value = iv.result;
  fields.interviewer.value = iv.interviewerName || "";
  fields.tech.value = iv.techNotes || "";
  fields.behavioral.value = iv.behavioralNotes || "";
  openModal("Edit Interview");
}

function getFormData() {
  return {
    company: fields.company.value.trim(),
    role: fields.role.value.trim(),
    round: fields.round.value,
    date: fields.date.value || null,
    status: fields.status.value,
    result: fields.result.value,
    interviewerName: fields.interviewer.value.trim(),
    techNotes: fields.tech.value.trim(),
    behavioralNotes: fields.behavioral.value.trim(),
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleSave() {
  const data = getFormData();
  if (!data.company || !data.role) {
    formError.textContent = "Company and Role are required.";
    formError.hidden = false;
    return;
  }
  try {
    if (editingId) {
      const updated = await updateOne(editingId, data);
      interviews = interviews.map((iv) =>
        String(iv._id) === editingId ? updated : iv
      );
    } else {
      const created = await createOne(data);
      interviews.unshift(created);
    }
    closeModal();
    renderTable();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

async function handleDelete(id) {
  if (!confirm("Delete this interview record?")) return;
  try {
    await deleteOne(id);
    interviews = interviews.filter((iv) => String(iv._id) !== id);
    renderTable();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    interviews = await fetchAll();
  } catch {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--red)">Could not connect to server.</td></tr>`;
    return;
  }
  renderTable();
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.getElementById("add-btn").addEventListener("click", openAdd);
document.getElementById("save-btn").addEventListener("click", handleSave);
document.getElementById("cancel-btn").addEventListener("click", closeModal);
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("panel-close").addEventListener("click", () => {
  notesPanel.hidden = true;
});
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
searchInput.addEventListener("input", renderTable);

document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-pill")
      .forEach((p) => p.classList.remove("filter-pill--active"));
    pill.classList.add("filter-pill--active");
    activeFilter = pill.dataset.filter;
    renderTable();
  });
});

init();
