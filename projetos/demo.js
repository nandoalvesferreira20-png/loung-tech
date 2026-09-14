/* Shared helpers. Simulations never send data to a server. */
window.Demo = {
  escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  },
  money(value) { return new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value); },
  notify(message) {
    const output = document.getElementById('toast');
    output.textContent = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { output.textContent = ''; }, 5000);
  },
  read(key, fallback, validate) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return validate(data) ? data : structuredClone(fallback);
    } catch { return structuredClone(fallback); }
  },
  save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { this.notify('Armazenamento indisponível. As alterações duram apenas nesta visita.'); }
  }
};
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});
