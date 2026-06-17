import { requireAuth, clearSession } from "./modules/storage.js";

const session = requireAuth();
if (!session) throw new Error("Not authenticated.");
const { username } = session;

const API = "/api/interviews";

// ─── State ───────────────────────────────────────────────────────────────────
let interviews = [];
let editingId = null;
let activeFilter = "";
let searchQuery = "";
let sortColumn = "date";
let sortDirection = "desc";
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
const PAGE_SIZE = 20;

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

// ─── Load (server-side pagination/filter/sort) ────────────────────────────────
async function loadInterviews() {
  const loadingRow = document.getElementById("iv-loading");
  const emptyRow = document.getElementById("iv-empty");
  if (loadingRow) loadingRow.hidden = false;
  if (emptyRow) emptyRow.hidden = true;

  const params = new URLSearchParams({
    page: currentPage,
    limit: PAGE_SIZE,
    sortBy: sortColumn,
    sortDir: sortDirection,
  });
  if (activeFilter) params.set("status", activeFilter);
  if (searchQuery) params.set("search", searchQuery);

  try {
    const res = await fetch(`${API}?${params}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load");
    const result = await res.json();
    interviews = result.data;
    totalCount = result.total;
    totalPages = result.totalPages;
    currentPage = result.page;
  } catch {
    if (loadingRow) loadingRow.hidden = true;
    tbody
      .querySelectorAll("tr:not(#iv-loading):not(#iv-empty)")
      .forEach((r) => r.remove());
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:var(--iv-red)">Could not connect to server.</td></tr>`;
    return;
  }

  if (loadingRow) loadingRow.hidden = true;
  renderTable();
  renderPagination();
}

// ─── API helpers ─────────────────────────────────────────────────────────────
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
  const emptyRow = document.getElementById("iv-empty");

  // Update sort header indicators
  document.querySelectorAll("#interviews-table .sortable").forEach((th) => {
    th.setAttribute("aria-sort", "none");
    th.querySelector(".sort-icon").textContent = "↕";
  });
  const activeHeader = document.querySelector(
    `#interviews-table .sortable[data-col="${sortColumn}"]`
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
    .querySelectorAll("tr:not(#iv-loading):not(#iv-empty)")
    .forEach((r) => r.remove());

  if (interviews.length === 0) {
    if (emptyRow) emptyRow.hidden = false;
    return;
  }

  if (emptyRow) emptyRow.hidden = true;

  const fragment = document.createDocumentFragment();
  interviews.forEach((iv) => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.dataset.id = iv._id;
    tr.innerHTML = `
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
    `;
    tr.addEventListener("click", (e) => {
      if (e.target.closest(".actions-cell")) return;
      openNotesPanel(tr.dataset.id);
    });
    tr.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openEdit(tr.dataset.id);
    });
    tr.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      handleDelete(tr.dataset.id);
    });
    fragment.appendChild(tr);
  });

  // Insert before the empty sentinel so sentinel stays at end
  const emptyEl = document.getElementById("iv-empty");
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
  const nav = document.getElementById("iv-pagination");
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
        loadInterviews();
      }
    });
  });
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
      await updateOne(editingId, data);
    } else {
      await createOne(data);
    }
    closeModal();
    await loadInterviews();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

async function handleDelete(id) {
  if (!confirm("Delete this interview record?")) return;
  try {
    await deleteOne(id);
    if (interviews.length === 1 && currentPage > 1) currentPage--;
    await loadInterviews();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadInterviews();
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

// Search — debounced 300 ms
let searchTimer = null;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadInterviews();
  }, 300);
});

// Filter pills
document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-pill")
      .forEach((p) => p.classList.remove("filter-pill--active"));
    pill.classList.add("filter-pill--active");
    activeFilter = pill.dataset.filter;
    currentPage = 1;
    loadInterviews();
  });
});

// Column sorting
document
  .querySelector("#interviews-table thead")
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
    loadInterviews();
  });

init();
