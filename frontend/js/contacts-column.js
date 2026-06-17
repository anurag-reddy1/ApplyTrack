/**
 * contacts-column.js
 * Injects a "Contacts" column into the dashboard applications table.
 * Uses MutationObserver so it works regardless of when Anurag's code renders rows.
 */

const NET_API = '/api/networking';
let allContacts = [];
let headerInjected = false;
let modal = null;
let currentAppId = null;
let currentCell = null;

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Link button in table ── */
    .contacts-link-btn {
      background: rgba(139,148,158,0.1);
      border: 1px solid #30363d;
      color: #8b949e;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.22rem 0.65rem;
      border-radius: 9999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
      letter-spacing: 0.02em;
    }
    .contacts-link-btn:hover {
      background: #1c2128;
      color: #e6edf3;
      border-color: #2563eb;
    }
    .contacts-link-btn--has {
      background: rgba(37,99,235,0.15);
      border-color: #2563eb;
      color: #58a6ff;
    }
    .contacts-link-btn--has:hover {
      background: rgba(37,99,235,0.28);
    }

    /* ── Modal overlay ── */
    #clm-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
    }
    #clm-modal.open { display: flex; }
    .clm-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(1, 4, 9, 0.78);
    }
    .clm-box {
      position: relative;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      margin: 1rem;
      box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    }
    .clm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
    }
    .clm-title {
      font-size: 1rem;
      font-weight: 700;
      color: #e6edf3;
      margin: 0;
    }
    .clm-close {
      background: none;
      border: none;
      color: #8b949e;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem 0.4rem;
      border-radius: 6px;
      line-height: 1;
      transition: background 0.15s;
    }
    .clm-close:hover { background: #21262d; color: #e6edf3; }
    .clm-sub {
      font-size: 0.8rem;
      color: #8b949e;
      padding: 0.8rem 1.5rem 0;
      margin: 0;
    }
    .clm-search-wrap {
      padding: 0.75rem 1.5rem;
      flex-shrink: 0;
    }
    .clm-search {
      width: 100%;
      padding: 0.45rem 0.8rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 0.875rem;
    }
    .clm-search:focus { outline: none; border-color: #2563eb; }
    .clm-list {
      overflow-y: auto;
      padding: 0 1rem 0.75rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .clm-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      border: 1px solid #21262d;
      border-radius: 8px;
      cursor: pointer;
      background: #0d1117;
      transition: background 0.15s, border-color 0.15s;
      gap: 0.75rem;
    }
    .clm-item:hover { background: #1c2128; }
    .clm-item--linked {
      border-color: #2563eb;
      background: rgba(37,99,235,0.07);
    }
    .clm-item--linked:hover { background: rgba(37,99,235,0.12); }
    .clm-item-left { display: flex; align-items: center; gap: 0.65rem; }
    .clm-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .clm-item-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #e6edf3;
    }
    .clm-item-meta {
      font-size: 0.75rem;
      color: #8b949e;
      margin-top: 0.1rem;
    }
    .clm-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.22rem 0.65rem;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .clm-badge--linked { background: rgba(37,99,235,0.2); color: #58a6ff; }
    .clm-badge--unlinked { background: #21262d; color: #8b949e; }
    .clm-empty {
      text-align: center;
      color: #8b949e;
      padding: 2.5rem 1rem;
      font-size: 0.875rem;
    }
    .clm-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #21262d;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .clm-done {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 0.5rem 1.4rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .clm-done:hover { background: #1d4ed8; }
    .clm-spinner {
      text-align: center;
      color: #8b949e;
      padding: 1.5rem;
      font-size: 0.8rem;
    }
  `;
  document.head.appendChild(style);
}

// ─── Load contacts ────────────────────────────────────────────────────────────
async function loadContacts() {
  try {
    const res = await fetch(NET_API, { credentials: 'include' });
    if (res.ok) allContacts = await res.json();
  } catch { /* silent */ }
}

// ─── Get application ID from a table row ──────────────────────────────────────
function getAppId(row) {
  if (row.dataset.id) return row.dataset.id;
  if (row.dataset.appId) return row.dataset.appId;
  // Try action buttons (edit/delete usually have data-id)
  const btn = row.querySelector('[data-id]');
  return btn?.dataset.id ?? null;
}

// ─── Get contacts linked to an application ────────────────────────────────────
function getLinked(appId) {
  return allContacts.filter(c => c.applicationId === appId);
}

// ─── Inject column header ─────────────────────────────────────────────────────
function injectHeader() {
  if (headerInjected) return;
  const headerRow = document.querySelector('#app-table thead tr');
  if (!headerRow) return;
  const actionsHeader = headerRow.querySelector('th:last-child');
  if (!actionsHeader) return;
  const th = document.createElement('th');
  th.scope = 'col';
  th.textContent = 'Contacts';
  th.style.cssText = 'white-space:nowrap;';
  headerRow.insertBefore(th, actionsHeader);
  headerInjected = true;
}

// ─── Inject contact cell into a row ──────────────────────────────────────────
function injectCell(row) {
  if (row.dataset.clmDone) return;
  row.dataset.clmDone = '1';

  const appId = getAppId(row);
  if (!appId) return;

  const td = document.createElement('td');
  td.className = 'clm-cell';
  td.dataset.appId = appId;

  refreshCell(td, appId);

  const actionsCell = row.querySelector('td:last-child');
  actionsCell ? row.insertBefore(td, actionsCell) : row.appendChild(td);
}

function refreshCell(td, appId) {
  const count = getLinked(appId).length;
  td.innerHTML = count === 0
    ? `<button class="contacts-link-btn" data-app-id="${appId}">+ Link contact</button>`
    : `<button class="contacts-link-btn contacts-link-btn--has" data-app-id="${appId}">${count} contact${count !== 1 ? 's' : ''}</button>`;

  td.querySelector('.contacts-link-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal(appId, td);
  });
}

// ─── Build modal (once) ───────────────────────────────────────────────────────
function buildModal() {
  if (modal) return;
  modal = document.createElement('div');
  modal.id = 'clm-modal';
  modal.innerHTML = `
    <div class="clm-backdrop" id="clm-backdrop"></div>
    <div class="clm-box">
      <div class="clm-header">
        <h3 class="clm-title">Link Contacts</h3>
        <button class="clm-close" id="clm-close">✕</button>
      </div>
      <p class="clm-sub">Click a contact to link or unlink it from this application.</p>
      <div class="clm-search-wrap">
        <input class="clm-search" id="clm-search" type="search" placeholder="Search contacts…" />
      </div>
      <div class="clm-list" id="clm-list"></div>
      <div class="clm-footer">
        <button class="clm-done" id="clm-done">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('clm-close').addEventListener('click', closeModal);
  document.getElementById('clm-done').addEventListener('click', closeModal);
  document.getElementById('clm-backdrop').addEventListener('click', closeModal);
  document.getElementById('clm-search').addEventListener('input', e => {
    renderList(currentAppId, e.target.value.toLowerCase());
  });
}

function openModal(appId, cell) {
  buildModal();
  currentAppId = appId;
  currentCell = cell;
  document.getElementById('clm-search').value = '';
  renderList(appId, '');
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
  if (currentCell && currentAppId) {
    refreshCell(currentCell, currentAppId);
  }
}

// ─── Render contact list inside modal ─────────────────────────────────────────
function renderList(appId, query) {
  const list = document.getElementById('clm-list');

  const filtered = allContacts.filter(c => {
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.company.toLowerCase().includes(query) ||
      (c.role || '').toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="clm-empty">No contacts found.<br>Add contacts on the Networking page first.</div>`;
    return;
  }

  // Sort: linked to this app first, then rest
  const sorted = [...filtered].sort((a, b) => {
    if (a.applicationId === appId && b.applicationId !== appId) return -1;
    if (b.applicationId === appId && a.applicationId !== appId) return 1;
    return 0;
  });

  list.innerHTML = sorted.map(c => {
    const linked = c.applicationId === appId;
    return `
      <div class="clm-item ${linked ? 'clm-item--linked' : ''}" data-cid="${c._id}">
        <div class="clm-item-left">
          <div class="clm-avatar">${c.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="clm-item-name">${c.name}</div>
            <div class="clm-item-meta">${c.role || 'Contact'} @ ${c.company}</div>
          </div>
        </div>
        <span class="clm-badge ${linked ? 'clm-badge--linked' : 'clm-badge--unlinked'}">
          ${linked ? '✓ Linked' : '+ Link'}
        </span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.clm-item').forEach(item =>
    item.addEventListener('click', () => toggleLink(item.dataset.cid, appId))
  );
}

// ─── Toggle link ──────────────────────────────────────────────────────────────
async function toggleLink(contactId, appId) {
  const contact = allContacts.find(c => String(c._id) === contactId);
  if (!contact) return;

  const newAppId = contact.applicationId === appId ? null : appId;

  try {
    const res = await fetch(`${NET_API}/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...contact, applicationId: newAppId }),
    });
    if (!res.ok) throw new Error();
    const updated = await res.json();
    allContacts = allContacts.map(c => String(c._id) === contactId ? updated : c);
    renderList(appId, document.getElementById('clm-search')?.value?.toLowerCase() || '');
  } catch {
    alert('Could not update contact. Please try again.');
  }
}

// ─── Watch table for new rows ─────────────────────────────────────────────────
function watchTable() {
  const tbody = document.getElementById('app-table-body');
  if (!tbody) return;

  // Inject into existing rows
  tbody.querySelectorAll('tr').forEach(injectCell);

  // Watch for new rows (triggered by Anurag's filter/search/pagination)
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeName === 'TR') injectCell(node);
      }
    }
  }).observe(tbody, { childList: true });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  injectStyles();
  await loadContacts();
  injectHeader();
  watchTable();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
