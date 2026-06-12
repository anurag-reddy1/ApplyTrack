/**
 * auth.js
 * Entry script for the login/register page (index.html).
 * Handles form switching, submission, and session redirect.
 */

import { login, register } from "./modules/api.js";
import { saveSession, getSession } from "./modules/storage.js";
import { $, setError, clearError } from "./modules/ui.js";

// Redirect if already logged in
if (getSession()) {
  window.location.href = "/pages/dashboard.html";
}

// Section toggling
const loginSection = $("login-section");
const registerSection = $("register-section");

$("show-register").addEventListener("click", () => {
  loginSection.classList.add("hidden");
  registerSection.classList.remove("hidden");
  clearError("register-error");
});

$("show-login").addEventListener("click", () => {
  registerSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  clearError("login-error");
});

// Login Form
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError("login-error");

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) {
    setError("login-error", "Please fill in all fields.");
    return;
  }

  const btn = $("login-btn");
  btn.textContent = "Signing in…";
  btn.classList.add("loading");

  try {
    const { userId, username } = await login(email, password);
    saveSession(userId, username);
    window.location.href = "/pages/dashboard.html";
  } catch (err) {
    setError("login-error", err.message);
  } finally {
    btn.textContent = "Sign In";
    btn.classList.remove("loading");
  }
});

// Register Form
$("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError("register-error");

  const username = $("reg-username").value.trim();
  const email = $("reg-email").value.trim();
  const password = $("reg-password").value;

  if (!username || !email || !password) {
    setError("register-error", "Please fill in all fields.");
    return;
  }

  if (password.length < 4) {
    setError("register-error", "Password must be at least 4 characters.");
    return;
  }

  const btn = $("register-btn");
  btn.textContent = "Creating account…";
  btn.classList.add("loading");

  try {
    const { userId } = await register(username, email, password);
    saveSession(userId, username);
    window.location.href = "/pages/dashboard.html";
  } catch (err) {
    setError("register-error", err.message);
  } finally {
    btn.textContent = "Create Account";
    btn.classList.remove("loading");
  }
});
