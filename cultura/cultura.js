// Área de Cultura — login por código (SMS/WhatsApp), cursos, quizzes e certificados.
// Fala com o Supabase; sem configuração, roda em modo demonstração com dados locais.
(() => {
  const cfg = window.CULTURA_CONFIG || {};
  const DEMO = !cfg.supabaseUrl || !cfg.supabaseAnonKey;
  const sb = DEMO ? null : window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = (s) => document.querySelector(s);
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dataBR = (d) => new Date(d).toLocaleDateString('pt-BR');
  // Só volta para páginas da própria área (evita redirecionar para sites externos)
  const destinoSeguro = () => { const v = qs('voltar') || ''; return /^(painel|curso|quiz)\.html(\?[\w=%&.-]*)?$/.test(v) ? v : 'painel.html'; };

  // Celular brasileiro → só números com 55 (ex.: 5511999998888)
  const normalizarCelular = (v) => {
    let n = String(v).replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    return n;
  };

  // ---------------- Modo demonstração ----------------
  const DEMO_CURSO = {
    id: 'demo-curso', titulo: 'Conscientização em Segurança da Informação', carga_horaria_min: 40, nota_minima: 70,
    descricao: 'Os golpes mais comuns, como reconhecê-los e o que fazer no dia a dia para proteger você e a empresa.',
  };
  const DEMO_MODULOS = [
    { id: 'm1', ordem: 1, tipo: 'texto', titulo: 'Por que a segurança depende de você', conteudo: '<p>A maior parte dos incidentes começa com uma ação humana: um clique em um link falso, uma senha repetida ou um pagamento feito a um golpista. Ferramentas ajudam, mas a sua atenção é a primeira linha de defesa.</p>' },
    { id: 'm2', ordem: 2, tipo: 'texto', titulo: 'Phishing: como reconhecer', conteudo: '<ul><li><strong>Urgência ou ameaça:</strong> "sua conta será bloqueada hoje".</li><li><strong>Remetente estranho:</strong> domínio parecido, mas diferente.</li><li><strong>Links e anexos inesperados:</strong> passe o mouse sobre o link antes de clicar.</li><li><strong>Pedido de senha ou código:</strong> nenhuma empresa séria pede por mensagem.</li></ul>' },
    { id: 'm3', ordem: 3, tipo: 'texto', titulo: 'Senhas e autenticação em dois fatores', conteudo: '<p>Use senhas longas e diferentes para cada serviço, guardadas em um gerenciador de senhas. Ative a autenticação em dois fatores e nunca compartilhe códigos recebidos por SMS ou WhatsApp.</p>' },
    { id: 'm4', ordem: 4, tipo: 'texto', titulo: 'Engenharia social e fraude do falso fornecedor', conteudo: '<p>Toda mudança de dados bancários ou pedido urgente de pagamento deve ser confirmada por telefone, com um contato já conhecido.</p>' },
  ];
  const DEMO_PERGUNTAS = [
    ['Você recebe um e-mail dizendo que sua conta será bloqueada em 1 hora se não clicar no link. O que fazer?', ['Clicar rápido para não perder o acesso', 'Responder o e-mail pedindo mais prazo', 'Não clicar e confirmar pelo canal oficial', 'Encaminhar para os colegas'], 2],
    ['Qual destas é a melhor prática para senhas?', ['Usar a mesma senha forte em todos os serviços', 'Usar senhas longas e diferentes, com gerenciador de senhas', 'Anotar as senhas em um post-it no monitor', 'Trocar só o último número a cada mês'], 1],
    ['Alguém liga dizendo ser do suporte e pede o código que chegou no seu celular. Você deve:', ['Informar o código, pois é do suporte', 'Nunca informar o código e avisar a segurança', 'Informar só os três primeiros números', 'Pedir para ligar mais tarde'], 1],
    ['Um fornecedor pede por e-mail para trocar a conta bancária dos próximos pagamentos. O correto é:', ['Trocar imediatamente para não atrasar', 'Confirmar por telefone com um contato já conhecido', 'Responder o mesmo e-mail pedindo confirmação', 'Ignorar o pedido'], 1],
    ['O que a autenticação em dois fatores faz?', ['Deixa o login mais lento sem benefício', 'Exige uma segunda prova de identidade além da senha', 'Substitui a necessidade de senha', 'Só serve para bancos'], 1],
  ];
  const demo = {
    ler: () => { try { return JSON.parse(localStorage.getItem('cultura-demo') || '{}'); } catch { return {}; } },
    salvar: (d) => { try { localStorage.setItem('cultura-demo', JSON.stringify(d)); } catch { /* sem armazenamento */ } },
  };

  // ---------------- Camada de dados ----------------
  const api = {
    async enviarCodigo(celular, canal) {
      if (DEMO) return;
      const { error } = await sb.auth.signInWithOtp({ phone: '+' + celular, options: { channel: canal } });
      if (error) throw error;
    },
    async confirmarCodigo(celular, codigo) {
      if (DEMO) {
        if (codigo !== '123456') throw new Error('Código inválido. No modo demonstração, use 123456.');
        const d = demo.ler(); d.logado = true; d.celular = celular; demo.salvar(d); return;
      }
      const { error } = await sb.auth.verifyOtp({ phone: '+' + celular, token: codigo, type: 'sms' });
      if (error) throw error;
    },
    async sessao() {
      if (DEMO) return demo.ler().logado ? { demo: true } : null;
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    async sair() {
      if (DEMO) { const d = demo.ler(); d.logado = false; demo.salvar(d); return; }
      await sb.auth.signOut();
    },
    async perfil() {
      if (DEMO) return { nome: 'Visitante (demonstração)', empresa: 'Empresa de exemplo' };
      const { data, error } = await sb.from('perfis').select('nome, empresas(nome)').single();
      if (error) throw error;
      return { nome: data.nome, empresa: data.empresas?.nome || '' };
    },
    async cursos() {
      if (DEMO) {
        const d = demo.ler();
        return [{ ...DEMO_CURSO, total: DEMO_MODULOS.length, feitos: (d.progresso || []).length, certificado: d.certificado || null }];
      }
      const [{ data: cursos, error }, { data: mods }, { data: prog }, { data: certs }] = await Promise.all([
        sb.from('cursos').select('id, titulo, descricao, carga_horaria_min, nota_minima').order('ordem'),
        sb.from('modulos').select('id, curso_id'),
        sb.from('progresso').select('modulo_id'),
        sb.from('certificados').select('curso_id, codigo'),
      ]);
      if (error) throw error;
      const feitos = new Set((prog || []).map((p) => p.modulo_id));
      return cursos.map((c) => {
        const ms = (mods || []).filter((m) => m.curso_id === c.id);
        return { ...c, total: ms.length, feitos: ms.filter((m) => feitos.has(m.id)).length, certificado: (certs || []).find((x) => x.curso_id === c.id)?.codigo || null };
      });
    },
    async curso(id) {
      if (DEMO) {
        const feitos = new Set(demo.ler().progresso || []);
        return { ...DEMO_CURSO, modulos: DEMO_MODULOS.map((m) => ({ ...m, feito: feitos.has(m.id) })) };
      }
      const [{ data: c, error }, { data: mods }, { data: prog }] = await Promise.all([
        sb.from('cursos').select('id, titulo, descricao, carga_horaria_min, nota_minima').eq('id', id).single(),
        sb.from('modulos').select('id, ordem, titulo, tipo, conteudo, video_url, arquivo_path').eq('curso_id', id).order('ordem'),
        sb.from('progresso').select('modulo_id'),
      ]);
      if (error) throw error;
      const feitos = new Set((prog || []).map((p) => p.modulo_id));
      return { ...c, modulos: (mods || []).map((m) => ({ ...m, feito: feitos.has(m.id) })) };
    },
    async linkArquivo(caminho) {
      if (DEMO) return null;
      const { data, error } = await sb.storage.from('cultura').createSignedUrl(caminho, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    async concluirModulo(id) {
      if (DEMO) { const d = demo.ler(); d.progresso = [...new Set([...(d.progresso || []), id])]; demo.salvar(d); return; }
      const { error } = await sb.from('progresso').upsert({ modulo_id: id }, { onConflict: 'usuario_id,modulo_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    async perguntas(cursoId) {
      if (DEMO) return DEMO_PERGUNTAS.map(([enunciado, alternativas], i) => ({ id: 'p' + i, enunciado, alternativas }));
      const { data, error } = await sb.from('perguntas').select('id, ordem, enunciado, alternativas').eq('curso_id', cursoId).order('ordem').order('id');
      if (error) throw error;
      return data;
    },
    async responderQuiz(cursoId, respostas) {
      if (DEMO) {
        const acertos = DEMO_PERGUNTAS.filter((p, i) => respostas[i] === p[2]).length;
        const nota = Math.round((100 * acertos) / DEMO_PERGUNTAS.length);
        const aprovado = nota >= DEMO_CURSO.nota_minima;
        const d = demo.ler();
        if (aprovado && !d.certificado) { d.certificado = 'DEMO' + Math.random().toString(16).slice(2, 8).toUpperCase(); d.certData = new Date().toISOString(); d.certNota = nota; demo.salvar(d); }
        return { nota, acertos, total: DEMO_PERGUNTAS.length, minima: DEMO_CURSO.nota_minima, aprovado, codigo: aprovado ? demo.ler().certificado : null };
      }
      const { data, error } = await sb.rpc('responder_quiz', { p_curso: cursoId, p_respostas: respostas });
      if (error) throw error;
      return data;
    },
    async verificarCertificado(codigo) {
      if (DEMO) {
        const d = demo.ler();
        if (!d.certificado || d.certificado !== codigo.toUpperCase()) return null;
        return { nome_aluno: 'Visitante (demonstração)', empresa_nome: 'Empresa de exemplo', curso_titulo: DEMO_CURSO.titulo, carga_horaria_min: DEMO_CURSO.carga_horaria_min, nota: d.certNota, emitido_em: d.certData };
      }
      const { data, error } = await sb.rpc('verificar_certificado', { p_codigo: codigo });
      if (error) throw error;
      return data[0] || null;
    },
  };

  // ---------------- Interface ----------------
  const aviso = (el, msg, tipo = 'erro') => { el.textContent = msg; el.className = 'msg ' + tipo; el.hidden = !msg; };
  const traduzErro = (e) => {
    const m = (e && e.message) || String(e);
    if (/not.*(allowed|cadastrado)|signups not allowed|403/i.test(m)) return 'Este celular não está cadastrado. Fale com o responsável da sua empresa.';
    if (/expired|invalid|token/i.test(m)) return 'Código inválido ou expirado. Peça um novo código.';
    if (/rate|too many|seconds/i.test(m)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
    return m;
  };

  async function exigirLogin() {
    const s = await api.sessao();
    if (!s) { location.replace('./?voltar=' + encodeURIComponent(location.pathname.split('/').pop() + location.search)); return false; }
    const p = await api.perfil().catch(() => null);
    const quem = $('#quem');
    if (quem && p) quem.textContent = p.nome + (p.empresa ? ' · ' + p.empresa : '');
    return true;
  }

  const paginas = {
    async login() {
      if (await api.sessao()) { location.replace(destinoSeguro()); return; }
      if (DEMO) $('#dica-demo').hidden = false;
      const passo1 = $('#passo-celular'), passo2 = $('#passo-codigo'), msg = $('#msg');
      let celular = '', canal = 'sms';
      $('#celular').addEventListener('input', (e) => {
        const n = e.target.value.replace(/\D/g, '').slice(0, 11);
        e.target.value = n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}` : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n;
      });
      passo1.addEventListener('submit', async (e) => {
        e.preventDefault();
        celular = normalizarCelular($('#celular').value);
        canal = new FormData(passo1).get('canal');
        if (!/^55\d{10,11}$/.test(celular)) return aviso(msg, 'Informe o celular com DDD.');
        const btn = passo1.querySelector('button'); btn.disabled = true; aviso(msg, '');
        try {
          await api.enviarCodigo(celular, canal);
          passo1.hidden = true; passo2.hidden = false;
          $('#destino').textContent = `${canal === 'whatsapp' ? 'WhatsApp' : 'SMS'} para o final ${celular.slice(-4)}`;
          $('#codigo').focus();
        } catch (err) { aviso(msg, traduzErro(err)); } finally { btn.disabled = false; }
      });
      passo2.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = passo2.querySelector('button[type=submit]'); btn.disabled = true; aviso(msg, '');
        try { await api.confirmarCodigo(celular, $('#codigo').value.trim()); location.replace(destinoSeguro()); }
        catch (err) { aviso(msg, traduzErro(err)); btn.disabled = false; }
      });
      $('#voltar-celular').addEventListener('click', () => { passo2.hidden = true; passo1.hidden = false; aviso(msg, ''); });
    },

    async painel() {
      if (!(await exigirLogin())) return;
      const lista = $('#cursos');
      try {
        const cursos = await api.cursos();
        if (!cursos.length) { lista.innerHTML = '<p class="vazio">Nenhum curso liberado para você ainda.</p>'; return; }
        lista.innerHTML = cursos.map((c) => {
          const pct = c.total ? Math.round((100 * c.feitos) / c.total) : 0;
          return `<article class="curso-card">
            <span class="selo">${c.certificado ? 'Concluído' : pct ? 'Em andamento' : 'Novo'}</span>
            <h2>${esc(c.titulo)}</h2>
            <p>${esc(c.descricao)}</p>
            <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
            <p class="meta">${c.feitos} de ${c.total} módulos · ${c.carga_horaria_min} min</p>
            <div class="acoes">
              <a class="botao" href="curso.html?id=${encodeURIComponent(c.id)}">${pct ? 'Continuar' : 'Começar'}</a>
              ${c.certificado ? `<a class="botao botao-contorno" href="certificado.html?codigo=${encodeURIComponent(c.certificado)}">Certificado</a>` : ''}
            </div>
          </article>`;
        }).join('');
      } catch (err) { lista.innerHTML = `<p class="msg erro">${esc(traduzErro(err))}</p>`; }
    },

    async curso() {
      if (!(await exigirLogin())) return;
      const id = qs('id');
      try {
        const c = await api.curso(id);
        document.title = c.titulo + ' | Cultura Cybersec360';
        $('#titulo').textContent = c.titulo;
        $('#descricao').textContent = c.descricao || '';
        const render = () => {
          const feitos = c.modulos.filter((m) => m.feito).length;
          $('#progresso').textContent = `${feitos} de ${c.modulos.length} módulos concluídos`;
          $('#ir-quiz').hidden = feitos < c.modulos.length;
          $('#quiz-bloqueado').hidden = feitos >= c.modulos.length;
          $('#modulos').innerHTML = c.modulos.map((m, i) => `
            <details class="modulo${m.feito ? ' feito' : ''}" ${!m.feito && c.modulos.slice(0, i).every((x) => x.feito) ? 'open' : ''}>
              <summary><span class="num">${m.feito ? '✓' : i + 1}</span>${esc(m.titulo)}</summary>
              <div class="modulo-corpo" data-id="${esc(m.id)}">
                ${m.tipo === 'texto' ? m.conteudo || '' : ''}
                ${m.tipo === 'video' && m.video_url ? `<div class="video"><iframe src="${esc(m.video_url)}" title="${esc(m.titulo)}" allow="fullscreen" loading="lazy"></iframe></div>` : ''}
                ${m.tipo === 'video' && !m.video_url && m.arquivo_path ? `<video controls preload="none" data-arquivo="${esc(m.arquivo_path)}"></video>` : ''}
                ${m.tipo === 'material' && m.arquivo_path ? `<p><button class="botao botao-contorno" data-baixar="${esc(m.arquivo_path)}">Baixar material</button></p>` : ''}
                ${m.feito ? '<p class="ok">Módulo concluído.</p>' : `<button class="botao" data-concluir="${esc(m.id)}">Marcar como concluído</button>`}
              </div>
            </details>`).join('');
        };
        render();
        $('#modulos').addEventListener('click', async (e) => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.concluir) {
            b.disabled = true;
            try { await api.concluirModulo(b.dataset.concluir); c.modulos.find((m) => m.id === b.dataset.concluir).feito = true; render(); }
            catch (err) { alert(traduzErro(err)); b.disabled = false; }
          }
          if (b.dataset.baixar) { const url = await api.linkArquivo(b.dataset.baixar).catch(() => null); if (url) location.href = url; else alert('Arquivo indisponível no modo demonstração.'); }
        });
        $('#modulos').addEventListener('toggle', async (e) => {
          const v = e.target.querySelector?.('video[data-arquivo]:not([src])');
          if (v) v.src = await api.linkArquivo(v.dataset.arquivo).catch(() => '');
        }, true);
        $('#ir-quiz').href = 'quiz.html?id=' + encodeURIComponent(c.id);
      } catch (err) { $('#modulos').innerHTML = `<p class="msg erro">${esc(traduzErro(err))}</p>`; }
    },

    async quiz() {
      if (!(await exigirLogin())) return;
      const id = qs('id'), form = $('#quiz'), res = $('#resultado');
      $('#voltar-curso').href = 'curso.html?id=' + encodeURIComponent(id);
      try {
        const perguntas = await api.perguntas(id);
        form.innerHTML = perguntas.map((p, i) => `
          <fieldset class="pergunta"><legend><span class="num">${i + 1}</span>${esc(p.enunciado)}</legend>
            ${p.alternativas.map((a, j) => `<label class="alternativa"><input type="radio" name="p${i}" value="${j}" required> <span>${esc(a)}</span></label>`).join('')}
          </fieldset>`).join('') + '<button class="botao" type="submit">Enviar respostas</button>';
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
          const respostas = perguntas.map((_, i) => Number(new FormData(form).get('p' + i)));
          try {
            const r = await api.responderQuiz(id, respostas);
            form.hidden = true; res.hidden = false;
            res.innerHTML = r.aprovado
              ? `<h2>Parabéns, você foi aprovado!</h2><p class="nota">${r.nota}%</p><p>Você acertou ${r.acertos} de ${r.total} perguntas.</p><p><a class="botao" href="certificado.html?codigo=${encodeURIComponent(r.codigo)}">Ver meu certificado</a> <a class="botao botao-contorno" href="painel.html">Voltar aos cursos</a></p>`
              : `<h2>Quase lá!</h2><p class="nota baixa">${r.nota}%</p><p>Você acertou ${r.acertos} de ${r.total}. A nota mínima é ${r.minima}%. Revise os módulos e tente de novo.</p><p><a class="botao" href="quiz.html?id=${encodeURIComponent(id)}">Tentar de novo</a> <a class="botao botao-contorno" href="curso.html?id=${encodeURIComponent(id)}">Revisar o curso</a></p>`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) { alert(traduzErro(err)); btn.disabled = false; }
        });
      } catch (err) { form.innerHTML = `<p class="msg erro">${esc(traduzErro(err))}</p>`; }
    },

    async certificado() {
      // Página pública: qualquer pessoa com o código pode conferir a autenticidade
      const codigo = (qs('codigo') || '').trim();
      const area = $('#certificado'), form = $('#verificar');
      form.addEventListener('submit', (e) => { e.preventDefault(); location.search = '?codigo=' + encodeURIComponent($('#codigo-cert').value.trim()); });
      if (!codigo) { area.hidden = true; return; }
      $('#codigo-cert').value = codigo;
      try {
        const c = await api.verificarCertificado(codigo);
        if (!c) { area.hidden = false; area.innerHTML = '<p class="msg erro">Certificado não encontrado. Confira o código.</p>'; return; }
        area.hidden = false;
        $('#c-nome').textContent = c.nome_aluno;
        $('#c-empresa').textContent = c.empresa_nome ? `(${c.empresa_nome})` : '';
        $('#c-curso').textContent = c.curso_titulo;
        $('#c-carga').textContent = c.carga_horaria_min >= 60 ? `${Math.round(c.carga_horaria_min / 60)} hora(s)` : `${c.carga_horaria_min} minutos`;
        $('#c-nota').textContent = c.nota + '%';
        $('#c-data').textContent = dataBR(c.emitido_em);
        $('#c-codigo').textContent = codigo.toUpperCase();
        $('#c-link').textContent = location.origin + location.pathname + '?codigo=' + codigo.toUpperCase();
      } catch (err) { area.hidden = false; area.innerHTML = `<p class="msg erro">${esc(traduzErro(err))}</p>`; }
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (DEMO) document.body.insertAdjacentHTML('afterbegin', '<div class="faixa-demo">Modo demonstração: dados de exemplo, nada é salvo no servidor.</div>');
    document.querySelectorAll('[data-sair]').forEach((b) => b.addEventListener('click', async () => { await api.sair(); location.href = './'; }));
    const pagina = document.body.dataset.pagina;
    if (paginas[pagina]) paginas[pagina]();
  });
})();
