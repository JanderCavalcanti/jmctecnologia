// Menu móvel
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');

toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

menu.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  })
);

// Ano atual no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();
