import { requireAuth, clearSession } from "./modules/storage.js";

const session = requireAuth();
if (!session) throw new Error("Not authenticated.");
const { username, userId } = session;

const API = "/api/networking";
const APPS_API = "/api/applications";

// ─── State ───────────────────────────────────────────────────────────────────
let contacts = [];
let applications = [];
let editingId = null;
let activeFilter = "";
let searchQuery = "";
let sortColumn = "followUpDate";
let sortDirection = "asc";
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
const PAGE_SIZE = 20;

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

// ─── Load (server-side pagination/filter/sort) ────────────────────────────────
async function loadContacts() {
  const loadingRow = document.getElementById("nw-loading");
  const emptyRow = document.getElementById("nw-empty");
  if (loadingRow) loadingRow.hidden = false;
  if (emptyRow) emptyRow.hidden = true;

  const params = new URLSearchParams({
    page: currentPage,
    limit: PAGE_SIZE,
    sortBy: sortColumn,
    sortDir: sortDirection,
  });
  if (searchQuery) params.set("search", searchQuery);

  try {
    const res = await fetch(`${API}?${params}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load");
    const result = await res.json();
    contacts = result.data;
    totalCount = result.total;
    totalPages = result.totalPages;
    currentPage = result.page;
  } catch {
    if (loadingRow) loadingRow.hidden = true;
    tbody
      .querySelectorAll("tr:not(#nw-loading):not(#nw-empty)")
      .forEach((r) => r.remove());
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--nw-red)">Could not connect to server.</td></tr>`;
    return;
  }

  if (loadingRow) loadingRow.hidden = true;
  updateStats();
  renderTable();
  renderPagination();
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchApplications() {
  try {
    if (!userId) return [];
    const res = await fetch(`${APPS_API}?userId=${userId}&limit=100`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const result = await res.json();
    return result.data || result;
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
  const emptyRow = document.getElementById("nw-empty");

  // Update sort header indicators
  document.querySelectorAll("#contacts-table .sortable").forEach((th) => {
    th.setAttribute("aria-sort", "none");
    th.querySelector(".sort-icon").textContent = "↕";
  });
  const activeHeader = document.querySelector(
    `#contacts-table .sortable[data-col="${sortColumn}"]`
  );
  if (activeHeader) {
    activeHeader.setAttribute(
      "aria-sort",
      sortDirection === "asc" ? "ascending" : "descending"
    );
    activeHeader.querySelector(".sort-icon").textContent =
      sortDirection === "asc" ? "↑" : "↓";
  }

  // Remove old data rows, preserve sentinel rows
  tbody
    .querySelectorAll("tr:not(#nw-loading):not(#nw-empty)")
    .forEach((r) => r.remove());

  // Apply client-side role filter (filter pills are role-based, not sent to server)
  const visible = activeFilter
    ? contacts.filter((c) =>
        (c.role || "").toLowerCase().includes(activeFilter.toLowerCase())
      )
    : contacts;

  if (visible.length === 0) {
    if (emptyRow) emptyRow.hidden = false;
    return;
  }

  if (emptyRow) emptyRow.hidden = true;

  const fragment = document.createDocumentFragment();
  visible.forEach((c) => {
    const overdue = isOverdue(c.followUpDate);
    const appName = getAppName(c.applicationId);
    const tr = document.createElement("tr");
    if (overdue) tr.className = "overdue";
    tr.dataset.id = c._id;
    tr.innerHTML = `
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
    `;
    tr.querySelector(".edit-btn").addEventListener("click", () =>
      openEdit(tr.dataset.id)
    );
    tr.querySelector(".delete-btn").addEventListener("click", () =>
      handleDelete(tr.dataset.id)
    );
    fragment.appendChild(tr);
  });

  const emptyEl = document.getElementById("nw-empty");
  tbody.insertBefore(fragment, emptyEl);
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  const delta = 2;
  const left = current - delta;
  const right = current + delta;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return pages;
}

function renderPagination() {
  const nav = document.getElementById("nw-pagination");
  if (!nav) return;

  if (totalPages <= 1) {
    nav.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);

  const pages = buildPageRange(currentPage, totalPages);
  const pageButtons = pages
    .map((p) =>
      p === "..."
        ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
        : `<li class="page-item ${p === currentPage ? "active" : ""}">
             <button class="page-link" data-page="${p}">${p}</button>
           </li>`
    )
    .join("");

  nav.innerHTML = `
    <div class="pagination-info">Showing ${start}–${end} of ${totalCount}</div>
    <ul class="pagination pagination-sm mb-0">
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <button class="page-link" data-page="${currentPage - 1}">‹ Prev</button>
      </li>
      ${pageButtons}
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <button class="page-link" data-page="${currentPage + 1}">Next ›</button>
      </li>
    </ul>
  `;

  nav.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadContacts();
      }
    });
  });
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
      await updateOne(editingId, data);
    } else {
      await createOne(data);
    }
    closeModal();
    await loadContacts();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

async function handleDelete(id) {
  if (!confirm("Remove this contact?")) return;
  try {
    await deleteOne(id);
    if (contacts.length === 1 && currentPage > 1) currentPage--;
    await loadContacts();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  applications = await fetchApplications();
  await loadContacts();
}

// ─── Events ───────────────────────────────────────────────────────────────────
document.getElementById("add-btn").addEventListener("click", openAdd);
document.getElementById("save-btn").addEventListener("click", handleSave);
document.getElementById("cancel-btn").addEventListener("click", closeModal);
document.getElementById("modal-close").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

// Search — debounced 300 ms
let searchTimer = null;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadContacts();
  }, 300);
});

// Filter pills (role-based, client-side within current page)
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

// Column sorting
document
  .querySelector("#contacts-table thead")
  .addEventListener("click", (e) => {
    const th = e.target.closest(".sortable");
    if (!th) return;
    const col = th.dataset.col;
    if (sortColumn === col) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = col;
      sortDirection = "asc";
    }
    currentPage = 1;
    loadContacts();
  });

init();
