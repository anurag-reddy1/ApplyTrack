/**
 * storage.js
 * Module for managing the logged-in user session in sessionStorage.
 */

const SESSION_KEY = "applytrack_session";

/**
 * Saves user session data after successful login.
 */
export const saveSession = (userId, username) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, username }));
};

/**
 * Retrieves the current session object, or null if not logged in.
 */
export const getSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

/**
 * Clears the session (logout).
 */
export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

/**
 * Redirects to login if no session is active.
 * Call at the top of any protected page.
 */
export const requireAuth = () => {
  const session = getSession();
  if (!session) {
    window.location.href = "/";
    return null;
  }
  return session;
};
