/**
 * dashboard.js
 * Entry script for the pipeline dashboard page.
 * Handles: application listing, filtering, search, sorting, pagination, CRUD modal, metrics display.
 */

/* global bootstrap */

import {
  getApplications,
  getMetrics,
  createApplication,
  updateApplication,
  deleteApplication,
} from "./modules/api.js";
import { requireAuth, clearSession } from "./modules/storage.js";
import {
  $,
  show,
  hide,
  showToast,
  statusChip,
  formatDate,
  toInputDate,
  setError,
  clearError,
} from "./modules/ui.js";

// Auth Guard
const session = requireAuth();
if (!session) throw new Error("Not authenticated.");

const { userId, username } = session;

// State
let allApplications = []; // current page of results from server
let activeStatus = "all";
let searchQuery = "";
let editingId = null;
let sortColumn = "appliedDate";
let sortDirection = "desc";
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;

const PAGE_SIZE = 20;

// Init
const init = async () => {
  bsModal = new bootstrap.Modal($("app-modal"));
  $("nav-username").textContent = username;
  await Promise.all([loadApplications(), loadMetrics()]);
};

// Logout
$("logout-btn").addEventListener("click", () => {
  clearSession();
  window.location.href = "/";
});

// Load applications from server with current state (filter, search, sort, page)
const loadApplications = async () => {
  show($("table-loading"));
  hide($("table-empty"));

  try {
    const result = await getApplications(userId, {
      status: activeStatus,
      search: searchQuery,
      page: currentPage,
      limit: PAGE_SIZE,
      sortBy: sortColumn,
      sortDir: sortDirection,
    });

    allApplications = result.data;
    totalCount = result.total;
    totalPages = result.totalPages;

    renderTable();
    renderPagination();
  } catch (err) {
    showToast("Failed to load applications. " + err.message, "error");
  } finally {
    hide($("table-loading"));
  }
};

const loadMetrics = async () => {
  try {
    const m = await getMetrics(userId);
    $("metric-total").querySelector(".metric-value").textContent = m.total ?? 0;
    $("metric-interviews").querySelector(".metric-value").textContent =
      m.interviews ?? 0;
    $("metric-offers").querySelector(".metric-value").textContent =
      m.offers ?? 0;
    $("metric-rate").querySelector(".metric-value").textContent =
      `${m.responseRate ?? 0}%`;
  } catch {
    // Metrics are non-critical; fail silently
  }
};

// Render Table — server has already filtered/sorted; just render the current page
const renderTable = () => {
  const tbody = $("app-table-body");
  const empty = $("table-empty");

  // Update sort header indicators
  document.querySelectorAll(".sortable").forEach((th) => {
    th.setAttribute("aria-sort", "none");
    th.querySelector(".sort-icon").textContent = "↕";
  });
  const activeHeader = document.querySelector(
    `.sortable[data-col="${sortColumn}"]`
  );
  if (activeHeader) {
    activeHeader.setAttribute(
      "aria-sort",
      sortDirection === "asc" ? "ascending" : "descending"
    );
    activeHeader.querySelector(".sort-icon").textContent =
      sortDirection === "asc" ? "↑" : "↓";
  }

  if (allApplications.length === 0) {
    tbody.innerHTML = "";
    show(empty);
    return;
  }

  hide(empty);
  tbody.innerHTML = allApplications.map((app) => buildRow(app)).join("");

  allApplications.forEach((app) => {
    document
      .querySelector(`[data-edit="${app._id}"]`)
      ?.addEventListener("click", () => openEditModal(app));
    document
      .querySelector(`[data-delete="${app._id}"]`)
      ?.addEventListener("click", () => handleDelete(app._id, app.company));
  });

  document.querySelectorAll(".notes-indicator").forEach((el) => {
    new bootstrap.Tooltip(el);
  });
};

// Render pagination controls
const renderPagination = () => {
  const nav = $("pagination-nav");
  if (!nav) return;

  // Hide pagination when everything fits on one page
  if (totalPages <= 1) {
    nav.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Build page number buttons with ellipsis
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
        loadApplications();
      }
    });
  });
};

// Returns an array of page numbers and "..." for ellipsis
const buildPageRange = (current, total) => {
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
};

const buildRow = (app) => {
  let jobLinkHtml = "—";
  if (app.jobLink) {
    const href = /^https?:\/\//i.test(app.jobLink)
      ? app.jobLink
      : `https://${app.jobLink}`;
    jobLinkHtml = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="Open job posting">↗</a>`;
  }

  const notesHtml = app.notes
    ? `<span class="notes-indicator"
         data-bs-toggle="tooltip"
         data-bs-placement="left"
         data-bs-title="${escapeHtml(app.notes)}"
         aria-label="Notes: ${escapeHtml(app.notes)}">📝</span>`
    : "";

  return `
    <tr>
      <td class="td-company">${escapeHtml(app.company)}</td>
      <td class="td-role" title="${escapeHtml(app.role)}">${escapeHtml(app.role)}</td>
      <td>${statusChip(app.status)}</td>
      <td>${app.salary ? escapeHtml(app.salary) : "—"}</td>
      <td>${formatDate(app.appliedDate)}</td>
      <td class="td-actions">
        <button type="button" class="btn-icon" data-edit="${app._id}" aria-label="Edit ${escapeHtml(app.company)}">✏️</button>
        <button type="button" class="btn-icon delete" data-delete="${app._id}" aria-label="Delete ${escapeHtml(app.company)}">🗑️</button>
        <span class="td-link">${jobLinkHtml}</span>
        ${notesHtml}
      </td>
    </tr>
  `;
};

/** Simple HTML escape to prevent XSS from user data */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Filter Tabs
$("filter-tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;

  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  tab.classList.add("active");
  tab.setAttribute("aria-selected", "true");
  activeStatus = tab.dataset.status;
  currentPage = 1;
  loadApplications();
});

// Column Sorting
document.querySelector("#app-table thead").addEventListener("click", (e) => {
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
  loadApplications();
});

// Search — debounced to avoid a request on every keystroke
let searchTimer = null;
$("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadApplications();
  }, 300);
});

// Add Button
$("add-app-btn").addEventListener("click", () => openCreateModal());

// Bootstrap Modal instance — initialized in init() once Bootstrap is ready
let bsModal;

$("app-modal").addEventListener("shown.bs.modal", () => {
  $("field-company").focus();
});

$("app-modal").addEventListener("hidden.bs.modal", () => {
  editingId = null;
});

// Modal Logic
const openCreateModal = () => {
  editingId = null;
  $("modal-title").textContent = "Add Application";
  $("modal-submit-btn").textContent = "Save Application";
  $("app-form").reset();
  clearError("modal-error");
  bsModal.show();
};

const openEditModal = (app) => {
  editingId = app._id;
  $("modal-title").textContent = "Edit Application";
  $("modal-submit-btn").textContent = "Update Application";
  clearError("modal-error");

  $("app-id").value = app._id;
  $("field-company").value = app.company ?? "";
  $("field-role").value = app.role ?? "";
  $("field-status").value = app.status ?? "Wishlist";
  $("field-salary").value = app.salary ?? "";
  $("field-applied-date").value = toInputDate(app.appliedDate);
  $("field-job-link").value = app.jobLink ?? "";
  $("field-notes").value = app.notes ?? "";

  bsModal.show();
};

const closeModal = () => bsModal.hide();

// Form Submit (Create / Update)
$("app-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError("modal-error");

  const company = $("field-company").value.trim();
  const role = $("field-role").value.trim();

  if (!company || !role) {
    setError("modal-error", "Company and Role are required.");
    return;
  }

  const payload = {
    userId,
    company,
    role,
    status: $("field-status").value,
    salary: $("field-salary").value.trim(),
    jobLink: $("field-job-link").value.trim(),
    notes: $("field-notes").value.trim(),
    appliedDate: $("field-applied-date").value || null,
  };

  const submitBtn = $("modal-submit-btn");
  submitBtn.textContent = "Saving…";
  submitBtn.disabled = true;

  try {
    if (editingId) {
      await updateApplication(editingId, payload);
      showToast(`Updated ${company} successfully.`);
    } else {
      await createApplication(payload);
      showToast(`Added ${company} to your pipeline.`);
    }
    closeModal();
    await Promise.all([loadApplications(), loadMetrics()]);
  } catch (err) {
    setError("modal-error", err.message);
  } finally {
    submitBtn.textContent = editingId
      ? "Update Application"
      : "Save Application";
    submitBtn.disabled = false;
  }
});

// Delete
const handleDelete = async (id, companyName) => {
  const confirmed = window.confirm(
    `Delete application for ${companyName}? This cannot be undone.`
  );
  if (!confirmed) return;

  try {
    await deleteApplication(id);
    showToast(`Deleted ${companyName}.`, "success");
    // If we just deleted the last item on a non-first page, go back one page
    if (allApplications.length === 1 && currentPage > 1) currentPage--;
    await Promise.all([loadApplications(), loadMetrics()]);
  } catch (err) {
    showToast("Failed to delete: " + err.message, "error");
  }
};

// Kick off
init();
