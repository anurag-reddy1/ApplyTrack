import { requireAuth, clearSession } from "./modules/storage.js";

const session = requireAuth();
if (!session) throw new Error("Not authenticated.");
const { username } = session;

const API = "/api/networking";
const APPS_API = "/api/applications";

// ─── State ───────────────────────────────────────────────────────────────────
let contacts = [];
let applications = [];
let editingId = null;
let activeFilter = "";

// ─── DOM refs ────────────────────────────────────────────────────────────────
const tbody = document.getElementById("contacts-tbody");
const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("search-input");

const fields = {
  name: document.getElementById("f-name"),
  company: document.getElementById("f-company"),
  role: document.getElementById("f-role"),
  email: document.getElementById("f-email"),
  phone: document.getElementById("f-phone"),
  linkedin: document.getElementById("f-linkedin"),
  lastContact: document.getElementById("f-last-contact"),
  followUp: document.getElementById("f-follow-up"),
  notes: document.getElementById("f-notes"),
  application: document.getElementById("f-application"),
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

async function fetchApplications() {
  try {
    const res = await fetch(APPS_API, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
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

// ─── Populate application dropdown ───────────────────────────────────────────
function populateAppDropdown(selectedId = "") {
  const sel = fields.application;
  if (!sel) return;
  sel.innerHTML = '<option value="">None — not linked</option>';
  applications.forEach((app) => {
    const opt = document.createElement("option");
    opt.value = app._id;
    opt.textContent = `${app.company} — ${app.role}`;
    if (String(app._id) === String(selectedId)) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(str) {
  if (!str) return false;
  return new Date(str) < new Date();
}

function thisMonth(str) {
  if (!str) return false;
  const d = new Date(str);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function getAppName(applicationId) {
  if (!applicationId) return null;
  const app = applications.find((a) => String(a._id) === String(applicationId));
  return app ? `${app.company}` : null;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById("stat-total").textContent = contacts.length;
  document.getElementById("stat-followup").textContent = contacts.filter((c) =>
    isOverdue(c.followUpDate)
  ).length;
  document.getElementById("stat-recent").textContent = contacts.filter((c) =>
    thisMonth(c.lastContact)
  ).length;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderTable() {
  const query = searchInput.value.toLowerCase();

  const filtered = contacts.filter((c) => {
    if (activeFilter) {
      if (!(c.role || "").toLowerCase().includes(activeFilter.toLowerCase()))
        return false;
    }
    if (query) {
      return (
        c.name.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query) ||
        (c.role || "").toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No contacts found. Click + Add Contact to start networking!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const overdue = isOverdue(c.followUpDate);
      const appName = getAppName(c.applicationId);
      return `
      <tr class="${overdue ? "overdue" : ""}" data-id="${c._id}">
        <td>
          <div class="name-cell">
            <div class="contact-avatar">${c.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>${c.name}</strong>
              ${appName ? `<div style="font-size:0.72rem;color:#58a6ff;margin-top:0.1rem">🔗 ${appName}</div>` : ""}
            </div>
          </div>
        </td>
        <td>${c.company}</td>
        <td>${c.role || "—"}</td>
        <td>
          ${c.email ? `<a href="mailto:${c.email}" class="contact-link">${c.email}</a>` : "—"}
          ${c.linkedin ? `<br><a href="${c.linkedin}" target="_blank" rel="noopener noreferrer" class="contact-link">LinkedIn ↗</a>` : ""}
        </td>
        <td style="white-space:nowrap;font-size:0.8rem;color:var(--text-muted)">${fmtDate(c.lastContact)}</td>
        <td style="white-space:nowrap;font-size:0.8rem" class="${overdue ? "overdue-label" : ""}">
          ${fmtDate(c.followUpDate)}${overdue ? " ⚠" : ""}
        </td>
        <td>
          <div class="actions-cell">
            <button class="action-icon edit-btn" data-id="${c._id}" title="Edit">✏️</button>
            <button class="action-icon action-icon--delete delete-btn" data-id="${c._id}" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  tbody
    .querySelectorAll(".edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => openEdit(btn.dataset.id))
    );
  tbody
    .querySelectorAll(".delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => handleDelete(btn.dataset.id))
    );
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
  Object.values(fields).forEach((el) => {
    if (el) el.value = "";
  });
}

function openAdd() {
  editingId = null;
  populateAppDropdown("");
  openModal("Add Contact");
}

function openEdit(id) {
  const c = contacts.find((x) => String(x._id) === id);
  if (!c) return;
  editingId = id;
  fields.name.value = c.name;
  fields.company.value = c.company;
  fields.role.value = c.role || "";
  fields.email.value = c.email || "";
  fields.phone.value = c.phone || "";
  fields.linkedin.value = c.linkedin || "";
  fields.lastContact.value = c.lastContact ? c.lastContact.slice(0, 10) : "";
  fields.followUp.value = c.followUpDate ? c.followUpDate.slice(0, 10) : "";
  fields.notes.value = c.notes || "";
  populateAppDropdown(c.applicationId || "");
  openModal("Edit Contact");
}

function getFormData() {
  return {
    name: fields.name.value.trim(),
    company: fields.company.value.trim(),
    role: fields.role.value.trim(),
    email: fields.email.value.trim(),
    phone: fields.phone.value.trim(),
    linkedin: fields.linkedin.value.trim(),
    lastContact: fields.lastContact.value || null,
    followUpDate: fields.followUp.value || null,
    notes: fields.notes.value.trim(),
    applicationId: fields.application?.value || null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleSave() {
  const data = getFormData();
  if (!data.name || !data.company) {
    formError.textContent = "Name and Company are required.";
    formError.hidden = false;
    return;
  }
  try {
    if (editingId) {
      const updated = await updateOne(editingId, data);
      contacts = contacts.map((c) =>
        String(c._id) === editingId ? updated : c
      );
    } else {
      const created = await createOne(data);
      contacts.unshift(created);
    }
    closeModal();
    updateStats();
    renderTable();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

async function handleDelete(id) {
  if (!confirm("Remove this contact?")) return;
  try {
    await deleteOne(id);
    contacts = contacts.filter((c) => String(c._id) !== id);
    updateStats();
    renderTable();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    [contacts, applications] = await Promise.all([
      fetchAll(),
      fetchApplications(),
    ]);
  } catch {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--red)">Could not connect to server.</td></tr>`;
    return;
  }
  updateStats();
  renderTable();
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("add-btn").addEventListener("click", openAdd);
document.getElementById("save-btn").addEventListener("click", handleSave);
document.getElementById("cancel-btn").addEventListener("click", closeModal);
document.getElementById("modal-close").addEventListener("click", closeModal);
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
