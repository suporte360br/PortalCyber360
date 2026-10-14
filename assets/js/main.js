// Menu mobile
const botaoMenu = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
botaoMenu.addEventListener('click', () => {
  const aberto = menu.classList.toggle('aberto');
  botaoMenu.setAttribute('aria-expanded', aberto);
});
menu.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') menu.classList.remove('aberto');
});

// Formulário de contato: monta um e-mail pronto (o site é estático, sem servidor)
const EMAIL_DESTINO = 'contato@cybersec360.com';
const form = document.getElementById('form-contato');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const assunto = `Contato pelo site - ${d.get('nome')}`;
    const corpo = [
      `Nome: ${d.get('nome')}`,
      `Empresa: ${d.get('empresa')}`,
      `Telefone: ${d.get('telefone')}`,
      `E-mail: ${d.get('email')}`,
      '',
      d.get('mensagem'),
    ].join('\n');
    window.location.href = `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  });
}

document.getElementById('ano').textContent = new Date().getFullYear();
