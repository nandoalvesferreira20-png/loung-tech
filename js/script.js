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
