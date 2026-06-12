/**
 * dashboard.js
 * Entry script for the pipeline dashboard page.
 * Handles: application listing, filtering, search, CRUD modal, metrics display.
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
let allApplications = []; // full list from server
let activeStatus = "all"; // current filter tab
let searchQuery = ""; // current search string
let editingId = null; // null = create mode, string = edit mode

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

// Load & Render Applications
const loadApplications = async () => {
  show($("table-loading"));
  hide($("table-empty"));

  try {
    allApplications = await getApplications(userId);
    renderTable();
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

// Render Table
const renderTable = () => {
  const tbody = $("app-table-body");
  const empty = $("table-empty");

  // Filter by status tab
  let filtered =
    activeStatus === "all"
      ? allApplications
      : allApplications.filter((a) => a.status === activeStatus);

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    show(empty);
    return;
  }

  hide(empty);

  // Build rows using client-side rendering.
  tbody.innerHTML = filtered.map((app) => buildRow(app)).join("");

  // Attach row action listeners
  filtered.forEach((app) => {
    const editBtn = document.querySelector(`[data-edit="${app._id}"]`);
    const deleteBtn = document.querySelector(`[data-delete="${app._id}"]`);

    editBtn?.addEventListener("click", () => openEditModal(app));
    deleteBtn?.addEventListener("click", () =>
      handleDelete(app._id, app.company)
    );
  });
};

const buildRow = (app) => {
  let jobLinkHtml = "—";
  if (app.jobLink) {
    const href = /^https?:\/\//i.test(app.jobLink)
      ? app.jobLink
      : `https://${app.jobLink}`;
    jobLinkHtml = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="Open job posting">↗</a>`;
  }

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
  renderTable();
});

// Search
$("search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderTable();
});

// Add Button
$("add-app-btn").addEventListener("click", () => openCreateModal());

// Bootstrap Modal instance — initialized in init() once Bootstrap is ready
let bsModal;

// Focus company field after modal animation completes
$("app-modal").addEventListener("shown.bs.modal", () => {
  $("field-company").focus();
});

// Reset editing state when modal is fully hidden
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

  // Populate form fields
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

const closeModal = () => {
  bsModal.hide();
};

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
    await Promise.all([loadApplications(), loadMetrics()]);
  } catch (err) {
    showToast("Failed to delete: " + err.message, "error");
  }
};

// Kick off
init();
