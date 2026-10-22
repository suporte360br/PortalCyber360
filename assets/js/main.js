// Menu mobile
const botaoMenu = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
if (botaoMenu && menu) {
  botaoMenu.addEventListener('click', () => {
    const aberto = menu.classList.toggle('aberto');
    botaoMenu.setAttribute('aria-expanded', aberto);
  });
  menu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') menu.classList.remove('aberto');
  });
}

// Formulário de contato: monta um e-mail pronto (o site é estático, sem servidor)
const EMAIL_DESTINO = 'contato@cybersec360.com.br';
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

// Fundo do topo: rede de pontos conectados (desenhada no navegador, sem imagem)
const rede = document.getElementById('rede');
if (rede) {
  const ctx = rede.getContext('2d');
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DISTANCIA = 130;
  let pontos = [];
  let visivel = true;

  const ajustarTamanho = () => {
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    rede.width = rede.offsetWidth * escala;
    rede.height = rede.offsetHeight * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    const total = Math.min(110, Math.round(rede.offsetWidth * rede.offsetHeight / 9000));
    pontos = Array.from({ length: total }, () => ({
      x: Math.random() * rede.offsetWidth,
      y: Math.random() * rede.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  };

  const desenhar = () => {
    const w = rede.offsetWidth, h = rede.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < pontos.length; i++) {
      for (let j = i + 1; j < pontos.length; j++) {
        const d = Math.hypot(pontos[i].x - pontos[j].x, pontos[i].y - pontos[j].y);
        if (d < DISTANCIA) {
          ctx.strokeStyle = `rgba(30, 144, 255, ${(1 - d / DISTANCIA) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(pontos[i].x, pontos[i].y);
          ctx.lineTo(pontos[j].x, pontos[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = '#5cc8ff';
    for (const p of pontos) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const animar = () => {
    if (visivel) {
      const w = rede.offsetWidth, h = rede.offsetHeight;
      for (const p of pontos) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      desenhar();
    }
    requestAnimationFrame(animar);
  };

  ajustarTamanho();
  new ResizeObserver(() => { ajustarTamanho(); desenhar(); }).observe(rede);
  if (semAnimacao) {
    desenhar();
  } else {
    // Pausa a animação quando o topo sai da tela, para poupar bateria
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(rede);
    animar();
  }
}

// Menu fixo: quando o topo sai da tela, o menu gruda no alto da página
const nav = document.querySelector('.topo .nav');
if (nav) {
  const topo = nav.closest('.topo');
  const atualizar = () => {
    const fixo = window.scrollY > nav.offsetHeight + 40;
    if (fixo && !nav.classList.contains('fixo')) topo.style.setProperty('--altura-nav', nav.offsetHeight + 'px');
    nav.classList.toggle('fixo', fixo);
    topo.classList.toggle('com-menu-fixo', fixo);
  };
  window.addEventListener('scroll', atualizar, { passive: true });
  atualizar();
}

const ano = document.getElementById('ano');
if (ano) ano.textContent = new Date().getFullYear();
