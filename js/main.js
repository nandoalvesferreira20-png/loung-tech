(() => {
  'use strict';

  // DADOS EDITÁVEIS: troque estes valores aqui se os contatos mudarem.
  const WHATSAPP_COMERCIAL = '5511965973582';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.header');
  const progress = document.getElementById('scrollProgress');
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('navLinks');
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];

  // Cabeçalho, barra de leitura e classe no scroll, com apenas um RAF por quadro.
  let pendingScrollFrame = false;
  function renderScroll() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    header.classList.toggle('is-scrolled', window.scrollY > 16);
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    pendingScrollFrame = false;
  }
  window.addEventListener('scroll', () => {
    if (pendingScrollFrame) return;
    pendingScrollFrame = true;
    requestAnimationFrame(renderScroll);
  }, { passive: true });
  window.addEventListener('resize', renderScroll, { passive: true });
  renderScroll();

  function closeMenu() {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    menuToggle.textContent = '☰';
  }
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menuToggle.textContent = open ? '×' : '☰';
  });
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', event => {
    if (nav.classList.contains('open') && !nav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });

  // Marcação do item ativo, para deixar a navegação mais orientada.
  function setActiveLink(id) {
    navLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  const sections = ['inicio', 'solucoes', 'segmentos', 'projetos', 'sobre', 'contato']
    .map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (visible.length) {
        visible.sort((a,b) => b.intersectionRatio - a.intersectionRatio);
        setActiveLink(visible[0].target.id);
      }
    }, { rootMargin: '-24% 0px -53% 0px', threshold: [0, .1, .25] });
    sections.forEach(section => navObserver.observe(section));
  }

  // Animações progressivas: somente em conteúdos dentro do viewport.
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    [
      '.card-grid > .reveal',
      '.portfolio-grid > .reveal',
      '.segment-grid > .reveal',
      '.steps > .reveal'
    ].forEach(selector => {
      document.querySelectorAll(selector).forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 85}ms`);
      });
    });
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -28px 0px' });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    document.documentElement.classList.add('motion-ready');
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
  }

  // Texto aparece em pequenas linhas, sem trocar o conteúdo do h1.
  // As tags são adicionadas no HTML para preservar a quebra visual em telas menores.
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Formulário simples, sem backend: pré-preenche o WhatsApp no clique.
  const form = document.getElementById('leadForm');
  const status = document.getElementById('feedback');
  if (form && status) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const val = id => document.getElementById(id).value.trim();
      const message = `Olá! Vim pelo site da Loung Tech e gostaria de conversar sobre um projeto.

Nome: ${val('name')}
Empresa/segmento: ${val('company')}
Solução: ${val('service')}
Descrição: ${val('message')}`;
      const url = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(message)}`;
      const popup = window.open(url, '_blank');
      if (popup) {
        try { popup.opener = null; } catch (_) { /* pode ser cross-origin */ }
        status.textContent = 'Mensagem preparada. Confira o WhatsApp para revisar e enviar.';
      } else {
        status.textContent = '';
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'O WhatsApp não abriu. Clique aqui para continuar.';
        status.appendChild(link);
      }
    });
  }

  // Galeria com foco acessível: dialog nativo (fecha também pela tecla Esc).
  const dialog = document.getElementById('previewDialog');
  const image = document.getElementById('previewImage');
  const title = document.getElementById('previewTitle');
  if (dialog && image && title && typeof dialog.showModal === 'function') {
    document.querySelectorAll('.project-preview').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.project');
        const thumbnail = button.querySelector('img');
        title.textContent = card.querySelector('h3').textContent;
        image.src = thumbnail.src;
        image.alt = thumbnail.alt;
        dialog.showModal();
      });
    });
    dialog.querySelector('.preview-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => image.removeAttribute('src'));
  }
})();
