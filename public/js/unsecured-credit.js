import { supabase } from "/js/supabase.js";
import { getActiveStoredLoan } from "/js/loan-application.js";

const DEFAULT_TARGET = "/money/personal/step1.html";
const DASHBOARD_TARGET = "/money/personal/dashboard.html";
const MIN_SPINNER_MS = 450;
let isNavigating = false;
let loaderReady = false;

function ensureLoader() {
  if (loaderReady) return;
  loaderReady = true;

  const style = document.createElement("style");
  style.textContent = `
    #ah-unsecured-loader {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      z-index: 1000;
    }
    #ah-unsecured-loader .card {
      background: #fff;
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 24px 60px -30px rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      gap: 14px;
      color: #0f172a;
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      font-weight: 600;
    }
    #ah-unsecured-loader .spinner {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 3px solid #e2e8f0;
      border-top-color: #7c3aed;
      animation: ah-spin 0.8s linear infinite;
    }
    @keyframes ah-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "ah-unsecured-loader";
  overlay.innerHTML = `
    <div class="card">
      <span class="spinner" aria-hidden="true"></span>
      <span>Checking your application…</span>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showLoader() {
  ensureLoader();
  const overlay = document.getElementById("ah-unsecured-loader");
  if (overlay) overlay.style.display = "flex";
}

function resolveTarget(link) {
  const raw = link?.getAttribute("href") || "";
  if (!raw || raw === "#") return DEFAULT_TARGET;
  try {
    return new URL(raw, window.location.href).pathname + new URL(raw, window.location.href).search;
  } catch {
    return DEFAULT_TARGET;
  }
}

async function hasAnyLoanApplications() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn("Session lookup failed", sessionError.message || sessionError);
    return null;
  }
  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("loan_application")
    .select("id")
    .eq("user_id", session.user.id)
    .limit(1);
  if (error) {
    console.warn("Loan lookup failed", error.message || error);
    return null;
  }
  return Array.isArray(data) && data.length > 0;
}

async function handleUnsecuredClick(event) {
  event.preventDefault();
  if (isNavigating) return;
  isNavigating = true;
  showLoader();

  const link = event.currentTarget;
  const target = resolveTarget(link);
  const start = Date.now();

  try {
    const activeLoan = await getActiveStoredLoan();
    let hasAny = null;
    if (!activeLoan) {
      hasAny = await hasAnyLoanApplications();
    }
    const elapsed = Date.now() - start;
    if (elapsed < MIN_SPINNER_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS - elapsed));
    }
    if (activeLoan) {
      window.location.assign(DASHBOARD_TARGET);
      return;
    }
    if (hasAny === false) {
      window.location.assign(DEFAULT_TARGET);
      return;
    }
    window.location.assign(DASHBOARD_TARGET);
  } catch (err) {
    console.warn("Unable to check loan application", err);
    window.location.assign(DASHBOARD_TARGET);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const links = Array.from(document.querySelectorAll('a[title="Unsecured Credit"]'));
  if (!links.length) return;
  links.forEach((link) => {
    link.addEventListener("click", handleUnsecuredClick);
  });
});
