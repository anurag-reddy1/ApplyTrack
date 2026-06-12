/**
 * ui.js
 * Reusable UI helper functions — toasts, status chips, formatting, DOM utils.
 */

// Toast

let toastTimer = null;

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'} type
 * @param {number} duration ms before auto-hide
 */
export const showToast = (message, type = "success", duration = 3000) => {
  const toast = document.getElementById("toast");
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.classList.remove("hidden");

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
};

// Status Chip

const STATUS_LABELS = {
  Wishlist: "Wishlist",
  Applied: "Applied",
  "Phone Screen": "Phone Screen",
  "Technical Interview": "Technical",
  "Final Round": "Final Round",
  Offer: "Offer 🎉",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
};

/**
 * Returns an HTML string for a status badge chip.
 */
export const statusChip = (status) => {
  const key = status.replace(/\s/g, "\\.");
  const label = STATUS_LABELS[status] ?? status;
  return `<span class="status-chip status-chip--${key}">${label}</span>`;
};

// Date Formatting

/**
 * Formats an ISO date string to "Jan 15, 2025" style.
 */
export const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats an ISO date to YYYY-MM-DD for <input type="date">.
 */
export const toInputDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
};

// DOM Helpers

/** Shorthand for document.getElementById */
export const $ = (id) => document.getElementById(id);

/** Show an element (removes 'hidden' class) */
export const show = (el) => el?.classList.remove("hidden");

/** Hide an element (adds 'hidden' class) */
export const hide = (el) => el?.classList.add("hidden");

/** Set error message in an error container */
export const setError = (elId, message) => {
  const el = document.getElementById(elId);
  if (el) el.textContent = message;
};

/** Clear error message */
export const clearError = (elId) => {
  const el = document.getElementById(elId);
  if (el) el.textContent = "";
};
