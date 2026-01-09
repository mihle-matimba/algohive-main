import { supabase } from "./supabase.js";

const preloader = document.getElementById("page-preloader");
const form = document.getElementById("waitlist-form");
const emailInput = document.getElementById("email");
const status = document.querySelector("[data-status]");
const button = document.getElementById("waitlist-button");
const mobileMenuButton = document.getElementById("ah-mobile-menu-btn");
const overlay = document.getElementById("ah-overlay");
const sidebar = document.getElementById("ah-sidebar");
const collapseButton = document.getElementById("ah-collapse");
const layout = document.getElementById("layout");

function openMenu() {
  sidebar?.classList.add("is-open");
  overlay?.classList.remove("hidden");
}

function closeMenu() {
  sidebar?.classList.remove("is-open");
  overlay?.classList.add("hidden");
}

function bindMenuInteractions() {
  mobileMenuButton?.addEventListener("click", openMenu);
  overlay?.addEventListener("click", closeMenu);
  sidebar?.querySelectorAll("nav a, nav details a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  if (!collapseButton || !layout || !sidebar) return;

  const saved = localStorage.getItem("ah_collapsed") === "true";
  if (saved) {
    sidebar.setAttribute("data-collapsed", "true");
    layout.classList.add("is-collapsed");
  }

  collapseButton.addEventListener("click", () => {
    const isCollapsed = sidebar.getAttribute("data-collapsed") === "true";
    if (!isCollapsed) {
      sidebar.querySelectorAll("details[open]").forEach((detail) => detail.removeAttribute("open"));
    }
    sidebar.setAttribute("data-collapsed", String(!isCollapsed));
    layout.classList.toggle("is-collapsed", !isCollapsed);
    localStorage.setItem("ah_collapsed", String(!isCollapsed));
    layout.offsetHeight;
    window.dispatchEvent(new Event("resize"));
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  const email = emailInput.value.trim();

  if (!email) {
    status.textContent = "Please enter a valid email.";
    status.classList.add("error");
    return;
  }

  button.disabled = true;
  button.textContent = "Joining...";
  status.textContent = "";
  status.classList.remove("error");

  const { error } = await supabase.from("Waitinglist").insert([{ email }]);

  if (error) {
    status.textContent = "Something went wrong. Please try again.";
    status.classList.add("error");
  } else {
    status.textContent = "You're on the list! We'll be in touch soon.";
    form.reset();
  }

  button.disabled = false;
  button.textContent = "Join the waitlist";
}

window.addEventListener("load", () => {
  preloader?.classList.add("is-hidden");
});

form?.addEventListener("submit", handleSubmit);

bindMenuInteractions();
