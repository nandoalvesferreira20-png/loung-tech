// Keep the mobile navigation visible if its existing controller cannot load.
if (typeof setMenu === 'function') {
  document.documentElement.classList.add('home-menu-ready');
}
