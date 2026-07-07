const header = document.getElementById("header");
const menuButton = document.getElementById("menu-button");
const navMenu = document.getElementById("nav-menu");
const backToTop = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
  backToTop.classList.toggle("active", window.scrollY > 500);
});

menuButton.addEventListener("click", () => {
  navMenu.classList.toggle("active");
  menuButton.classList.toggle("active");
});

document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("active");
    menuButton.classList.remove("active");
  });
});

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

const revealElements = document.querySelectorAll(
  ".section-title, .problem-card, .solution-card, .timeline-item, .case-card, .why-card, .stack-column, .faq details, .final-cta-box"
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
    }
  });
}, {
  threshold: 0.12
});

revealElements.forEach((element) => {
  element.classList.add("reveal");
  observer.observe(element);
});

document.querySelectorAll(".solution-card, .case-card, .why-card, .stack-column").forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    const rect = card.getBoundingClientRect();

    card.style.setProperty("--x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--y", `${event.clientY - rect.top}px`);
  });
});