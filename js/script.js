<<<<<<< HEAD
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
=======
const menuButton = document.getElementById('menu-button');
const navMenu = document.getElementById('nav-menu');
const backToTop = document.getElementById('back-to-top');
const mobile = window.matchMedia('(max-width: 760px)');
function setMenu(open) {
  navMenu.classList.toggle('active', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menuButton.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navMenu.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  setMenu(false);
  const section = document.querySelector(link.hash);
  if (section) { section.setAttribute('tabindex', '-1'); section.focus({preventScroll:true}); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false); menuButton.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.navbar')) setMenu(false);
});
document.addEventListener('focusin', (event) => {
  if (!event.target.closest('.navbar')) setMenu(false);
});
mobile.addEventListener('change', () => { setMenu(false); });
function updateScroll() { backToTop.hidden = window.scrollY < 500; }
window.addEventListener('scroll', updateScroll, {passive:true});
updateScroll();
backToTop.addEventListener('click', () => {
  document.querySelector('.logo').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
>>>>>>> a6313dd (v2 loung tech)
