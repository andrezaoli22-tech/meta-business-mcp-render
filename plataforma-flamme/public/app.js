// Plataforma Flamme — front-end (sem frameworks, roda direto no navegador).
// Regras: textos com textContent / h(), nunca innerHTML com dado do usuário.

// ---------------- utilidades ----------------
const $app = document.getElementById('app');
// replaceChildren/append ignoram null e false (permite "condição ? el : null" direto)
for (const nome of ['replaceChildren', 'append']) {
  const original = Element.prototype[nome];
  Element.prototype[nome] = function (...filhos) {
    return original.apply(this, filhos.flat(Infinity).filter((f) => f != null && f !== false));
  };
}
const SVG_TAGS = new Set(['svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'g', 'text']);

function h(tag, props = {}, ...filhos) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

const ICONES = {
  sino: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  fechar: 'M18 6 6 18M6 6l12 12',
  mais: 'M12 5v14M5 12h14',
  quadro: 'M3 3h7v18H3zM14 3h7v11h-7z',
  calendario: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  perfil: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM20 21a8 8 0 0 0-16 0',
  casa: 'M3 10.5 12 3l9 7.5V21H3z',
  carrossel: 'M8 3h13v13H8zM3 8v13h13',
  video: 'M8 5v14l11-7z',
  voltar: 'M15 18l-6-6 6-6',
  visao: 'M3 12h4l3-8 4 16 3-8h4',
  check: 'M20 6 9 17l-5-5',
  ia: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  grafico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  pagina: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  cliente: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  menu: 'M4 6h16M4 12h16M4 18h16',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
};
const icone = (nome, tam = 20) =>
  h('svg', { viewBox: '0 0 24 24', width: tam, height: tam, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, h('path', { d: ICONES[nome] }));

async function api(caminho, opcoes = {}) {
  const init = { credentials: 'same-origin', ...opcoes, headers: { ...(opcoes.headers || {}) } };
  if (opcoes.json !== undefined) {
    init.body = JSON.stringify(opcoes.json);
    init.headers['content-type'] = 'application/json';
    init.method = init.method || 'POST';
  }
  const r = await fetch(caminho, init);
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && !caminho.startsWith('/api/entrar') && !caminho.startsWith('/api/publico')) {
    estado.eu = null;
    navegar('/entrar');
    throw new Error(dados.erro || 'Sessão expirada.');
  }
  if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
  return dados;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('ver'), 3400);
}
const tentar = (fn) => async (...a) => {
  try {
    return await fn(...a);
  } catch (e) {
    toast(e.message);
  }
};
// botão que mostra "carregando" enquanto a ação roda
function botaoAcao(texto, fn, cls = '') {
  const b = h('button', { class: `btn ${cls}` }, texto);
  b.addEventListener('click', async () => {
    if (b.disabled) return;
    const orig = [...b.childNodes];
    b.disabled = true;
    b.replaceChildren(h('span', { class: 'gira' }), typeof texto === 'string' ? texto : '');
    try {
      await fn();
    } catch (e) {
      toast(e.message);
    } finally {
      b.disabled = false;
      b.replaceChildren(...orig);
    }
  });
  return b;
}

const iniciais = (nome = '?') => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
const dataBR = (iso, comHora = false) => {
  if (!iso) return '';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleString('pt-BR', comHora ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' });
};
const hojeISO = () => new Date().toLocaleDateString('en-CA');
const mesAtual = () => hojeISO().slice(0, 7);
const nomeMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const urlMidia = (chave) => `/m/${chave.split('/').map(encodeURIComponent).join('/')}`;
const ehVideo = (mime) => (mime || '').startsWith('video/');
const numero = (n) => (n == null ? '—' : n >= 10000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : Number(n).toLocaleString('pt-BR'));

function midiaEl(chave, mime, extra = {}) {
  if (!chave) return null;
  if (ehVideo(mime)) return h('video', { src: urlMidia(chave) + '#t=0.1', muted: true, playsinline: true, preload: 'metadata', ...extra });
  if ((mime || '').startsWith('image/')) return h('img', { src: urlMidia(chave), loading: 'lazy', alt: '', ...extra });
  return null;
}

function avatarCliente(c, tam = '') {
  const el = h('span', { class: `avatar-cliente ${tam}`, style: { '--cor': c.cor || '#922f11' } });
  if (c.logo_chave) el.append(h('img', { src: urlMidia(c.logo_chave), alt: '' }));
  else if (c.foto) el.append(h('img', { src: c.foto, alt: '', referrerpolicy: 'no-referrer', onerror: () => (el.textContent = iniciais(c.nome)) }));
  else el.textContent = iniciais(c.nome);
  return el;
}

// Markdown simples (respostas da IA) → elementos, sem innerHTML.
function inlineMd(texto) {
  const partes = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g;
  let i = 0;
  let m;
  while ((m = re.exec(texto))) {
    if (m.index > i) partes.push(texto.slice(i, m.index));
    if (m[1]) partes.push(h('b', {}, m[1]));
    else if (m[2]) partes.push(h('a', { href: m[3], target: '_blank', rel: 'noopener' }, m[2]));
    else partes.push(h('a', { href: m[4], target: '_blank', rel: 'noopener' }, m[4]));
    i = re.lastIndex;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return partes;
}
function md(texto) {
  const raiz = h('div', { class: 'md' });
  let lista = null;
  let para = [];
  const fecharPara = () => {
    if (para.length) raiz.append(h('p', {}, inlineMd(para.join('\n'))));
    para = [];
  };
  for (const linha of String(texto || '').split('\n')) {
    const l = linha.trimEnd();
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      fecharPara();
      lista = null;
      raiz.append(h(m[1].length <= 2 ? 'h2' : m[1].length === 3 ? 'h3' : 'h4', {}, inlineMd(m[2])));
    } else if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) {
      fecharPara();
      if (!lista || lista.tagName !== 'UL') raiz.append((lista = h('ul')));
      lista.append(h('li', {}, inlineMd(m[1])));
    } else if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) {
      fecharPara();
      if (!lista || lista.tagName !== 'OL') raiz.append((lista = h('ol')));
      lista.append(h('li', {}, inlineMd(m[1])));
    } else if (/^\s*(---|\*\*\*)\s*$/.test(l)) {
      fecharPara();
      lista = null;
      raiz.append(h('hr'));
    } else if (!l.trim()) {
      fecharPara();
      lista = null;
    } else {
      lista = null;
      para.push(l);
    }
  }
  fecharPara();
  return raiz;
}

// ---------------- estado e rotas ----------------
const NOMES_TIPO = { post: 'Post', carrossel: 'Carrossel', reels: 'Reels', story: 'Story', video: 'Vídeo', outro: 'Outro' };
const ABAS = [
  ['visao', 'Visão geral', 'visao'],
  ['demandas', 'Demandas', 'quadro'],
  ['calendario', 'Calendário', 'calendario'],
  ['aprovacao', 'Aprovação', 'check'],
  ['ia', 'Estúdio IA', 'ia'],
  ['painel', 'Painel', 'grafico'],
  ['organizacao', 'Organização', 'pagina'],
  ['cliente', 'Cliente', 'cliente'],
];
const ABAS_BAIXO = ['visao', 'demandas', 'calendario', 'ia'];

const estado = {
  eu: null,
  meta: null,
  usuarios: [],
  clientes: [],
  cliente: null, // cliente aberto (completo)
  aba: 'visao',
  demandas: [],
  ig: null,
  visao: localStorage.getItem('visao') || 'quadro',
  busca: '',
  filtroResp: '',
  mesCal: null,
  notif: { itens: [], nao_lidas: 0 },
  abertaId: null,
};

function navegar(caminho, substituir = false) {
  if (substituir) history.replaceState(null, '', caminho);
  else history.pushState(null, '', caminho);
  rota();
}
window.addEventListener('popstate', () => rota());

async function iniciar() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const partes = location.pathname.split('/').filter(Boolean);
  if (partes[0] === 'aprovar') return telaAprovacaoPublica(partes[1] || '');
  const e = await api('/api/estado');
  estado.configurado = e.configurado;
  estado.eu = e.usuario;
  rota();
  setInterval(atualizarSilencioso, 45000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && atualizarSilencioso());
}

async function carregarBase(forcar = false) {
  if (estado.meta && !forcar) return;
  const [meta, usuarios, clientes] = await Promise.all([api('/api/meta'), api('/api/usuarios'), api('/api/clientes')]);
  estado.meta = meta;
  estado.usuarios = usuarios;
  estado.clientes = clientes;
}

async function rota() {
  const url = new URL(location.href);
  const partes = url.pathname.split('/').filter(Boolean);
  const primeiro = partes[0] || '';
  fecharTudo();
  if (primeiro === 'aprovar') return telaAprovacaoPublica(partes[1] || '');
  if (!estado.eu) return telaLogin();
  await carregarBase();
  if (estado.eu.trocar_senha) return telaTrocarSenha();
  carregarNotificacoes();
  if (primeiro === 'c' && partes[1]) {
    const c = estado.clientes.find((x) => x.slug === partes[1]);
    if (!c) {
      await carregarBase(true);
      if (!estado.clientes.find((x) => x.slug === partes[1])) return navegar('/', true);
    }
    const id = estado.clientes.find((x) => x.slug === partes[1]).id;
    const mudou = estado.cliente?.id !== id;
    estado.aba = url.searchParams.get('aba') || 'visao';
    if (mudou) {
      estado.demandas = [];
      estado.ig = null;
      estado.cliente = await api(`/api/clientes/${id}`);
    }
    await telaCliente();
    const msgIg = url.searchParams.get('ig');
    if (msgIg) {
      toast(msgIg.replace(/^ok:/, ''));
      url.searchParams.delete('ig');
      history.replaceState(null, '', url.pathname + (url.search || ''));
    }
    const d = url.searchParams.get('d');
    if (d) abrirDemanda(Number(d));
    return;
  }
  estado.cliente = null;
  if (primeiro === 'config') return telaConfig();
  if (primeiro === 'organizacao') return telaOrganizacaoAgencia();
  return telaInicio();
}

// ---------------- login ----------------
function telaLogin() {
  const erro = h('div', { class: 'erro' });
  const setup = !estado.configurado;
  const nome = h('input', { class: 'entrada', placeholder: 'Seu nome', autocomplete: 'name' });
  const email = h('input', { class: 'entrada', type: 'email', placeholder: 'E-mail', autocomplete: 'email' });
  const senha = h('input', { class: 'entrada', type: 'password', placeholder: setup ? 'Crie uma senha (mín. 8)' : 'Senha', autocomplete: setup ? 'new-password' : 'current-password' });
  const botao = h('button', { class: 'btn primario', type: 'submit' }, setup ? 'Criar meu acesso' : 'Entrar');
  const form = h(
    'form',
    {
      class: 'cartao-login',
      onsubmit: async (ev) => {
        ev.preventDefault();
        erro.textContent = '';
        botao.disabled = true;
        try {
          if (setup) await api('/api/setup', { json: { nome: nome.value, email: email.value, senha: senha.value } });
          else await api('/api/entrar', { json: { email: email.value, senha: senha.value } });
          const e = await api('/api/estado');
          estado.eu = e.usuario;
          estado.configurado = true;
          const destino = location.pathname === '/entrar' ? '/' : location.pathname + location.search;
          navegar(destino, true);
        } catch (e) {
          erro.textContent = e.message;
        } finally {
          botao.disabled = false;
        }
      },
    },
    h('img', { class: 'logo-login', src: '/marca/flamme-logo-terracota.png', alt: 'Flamme' }),
    h('h1', { class: 'titulo' }, setup ? 'Primeiro acesso' : 'Bem-vinda de volta'),
    h('p', { class: 'sub' }, setup ? 'Você será a administradora e poderá convidar a equipe depois.' : 'Clientes, conteúdo, aprovações e resultados da Flamme.'),
    setup ? nome : null,
    email,
    senha,
    erro,
    botao
  );
  $app.replaceChildren(h('div', { class: 'tela-login' }, form, h('div', { class: 'rodape-login' }, 'flamme · social media')));
  (setup ? nome : email).focus();
}

function telaTrocarSenha() {
  const erro = h('div', { class: 'erro' });
  const atual = h('input', { class: 'entrada', type: 'password', placeholder: 'Senha que você recebeu', autocomplete: 'current-password' });
  const nova = h('input', { class: 'entrada', type: 'password', placeholder: 'Nova senha (mín. 8)', autocomplete: 'new-password' });
  $app.replaceChildren(
    h(
      'div',
      { class: 'tela-login' },
      h(
        'form',
        {
          class: 'cartao-login',
          onsubmit: async (ev) => {
            ev.preventDefault();
            try {
              await api('/api/eu/senha', { json: { atual: atual.value, nova: nova.value } });
              estado.eu.trocar_senha = false;
              toast('Senha alterada.');
              rota();
            } catch (e) {
              erro.textContent = e.message;
            }
          },
        },
        h('img', { class: 'logo-login', src: '/marca/flamme-logo-terracota.png', alt: 'Flamme' }),
        h('h1', { class: 'titulo' }, `Olá, ${estado.eu.nome.split(' ')[0]}!`),
        h('p', { class: 'sub' }, 'Crie sua senha pessoal para continuar.'),
        atual,
        nova,
        erro,
        h('button', { class: 'btn primario' }, 'Salvar senha')
      )
    )
  );
}

// ---------------- início (agência) ----------------
function saudacao() {
  const hora = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

async function telaInicio() {
  document.title = 'Flamme';
  const resumo = h('p', { class: 'resumo' }, ' ');
  const hoje = h('div', { class: 'painel-hoje' }, h('h2', { class: 'titulo' }, 'Hoje na agência'), h('p', { class: 'muted', style: { margin: 0 } }, 'Carregando…'));
  const grade = h('div', { class: 'grade-clientes' });
  $app.replaceChildren(
    h(
      'section',
      { class: 'inicio-hero' },
      h(
        'div',
        { class: 'faixa' },
        h('img', { src: '/marca/flamme-wordmark-branco.png', alt: 'Flamme' }),
        h(
          'div',
          { class: 'acoes' },
          h('button', { class: 'btn icone', title: 'Organização da agência', onclick: () => navegar('/organizacao') }, icone('pagina')),
          botaoSino(),
          h('button', { class: 'btn icone', title: 'Equipe e configurações', onclick: () => navegar('/config') }, icone('config'))
        )
      ),
      h(
        'div',
        { class: 'conteudo' },
        h('div', { class: 'data' }, new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })),
        h('h1', { class: 'titulo' }, `${saudacao()}, ${estado.eu.nome.split(' ')[0]}.`),
        resumo
      )
    ),
    h(
      'div',
      { class: 'inicio-corpo' },
      hoje,
      avisoNotificacoes() || '',
      h(
        'div',
        { class: 'secao-titulo' },
        h('h2', { class: 'titulo' }, 'Clientes'),
        estado.eu.papel === 'admin' ? h('button', { class: 'btn primario mini', onclick: novoCliente }, icone('mais', 16), 'Novo cliente') : null
      ),
      grade
    )
  );

  let r;
  try {
    r = await api('/api/resumo');
  } catch (e) {
    return toast(e.message);
  }
  const soma = (st, ids) => ids.reduce((n, s) => n + (st[s] || 0), 0);
  const abertas = r.clientes.reduce((n, c) => n + soma(c.status, ['briefing', 'producao', 'aprovacao', 'ajustes', 'aprovado']), 0);
  const aprov = r.clientes.reduce((n, c) => n + (c.status.aprovacao || 0), 0);
  resumo.textContent = r.clientes.length
    ? `${r.clientes.length} cliente${r.clientes.length === 1 ? '' : 's'} · ${abertas} demanda${abertas === 1 ? '' : 's'} em andamento${aprov ? ` · ${aprov} aguardando aprovação` : ''}.`
    : 'Comece adicionando o primeiro cliente.';

  // hoje
  const hojeStr = r.hoje;
  const itens = r.urgentes.map((d) => {
    let quando;
    if (d.status === 'agendado') quando = `Publica ${dataBR(d.agendado_para, true)}`;
    else if (d.status === 'aprovacao') quando = 'Aguardando aprovação';
    else quando = d.prazo < hojeStr ? `Atrasada · ${dataBR(d.prazo)}` : 'Vence hoje';
    return h(
      'a',
      { class: 'item-hoje', href: `/c/${d.slug}?d=${d.id}`, onclick: (e) => (e.preventDefault(), navegar(`/c/${d.slug}?aba=demandas&d=${d.id}`)) },
      h('span', { class: 'cor', style: { background: d.cor } }),
      h('span', { class: 't' }, d.titulo, h('small', {}, `${d.cliente} · ${NOMES_TIPO[d.tipo] || d.tipo}`)),
      h('span', { class: `chip ${d.status !== 'agendado' && d.status !== 'aprovacao' && d.prazo < hojeStr ? 'atrasado' : ''}` }, quando)
    );
  });
  hoje.replaceChildren(h('h2', { class: 'titulo' }, 'Hoje na agência'), itens.length ? h('div', { class: 'itens' }, itens) : h('p', { class: 'muted', style: { margin: 0 } }, 'Nada atrasado, nada vencendo hoje. 🎉'));

  // clientes
  const mes = mesAtual();
  grade.replaceChildren(
    ...r.clientes.map((c) => {
      const abertasC = soma(c.status, ['briefing', 'producao', 'ajustes', 'aprovado']);
      return h(
        'a',
        { class: 'card-cliente', style: { '--cor': c.cor }, href: `/c/${c.slug}`, onclick: (e) => (e.preventDefault(), navegar(`/c/${c.slug}`)) },
        h('div', { class: 'cab' }, avatarCliente(c), h('div', { style: { minWidth: 0 } }, h('b', {}, c.nome), h('span', {}, c.ig_username ? `@${c.ig_username}` : c.instagram ? `@${c.instagram}` : c.segmento || 'Sem @ cadastrado'))),
        c.foco && c.estrategia_mes === mes ? h('div', { class: 'foco' }, '🎯 ', c.foco) : h('div', { class: 'foco vazio' }, `Sem estratégia de ${nomeMes(mes).split(' ')[0].toLowerCase()} ainda`),
        h(
          'div',
          { class: 'numeros' },
          h('div', {}, h('b', {}, abertasC), h('span', {}, 'abertas')),
          h('div', {}, h('b', {}, c.status.aprovacao || 0), h('span', {}, 'aprovação')),
          h('div', {}, h('b', {}, c.status.agendado || 0), h('span', {}, 'agendadas')),
          h('div', {}, h('b', {}, numero(c.seguidores)), h('span', {}, 'seguidores'))
        )
      );
    }),
    estado.eu.papel === 'admin' ? h('button', { class: 'card-novo', onclick: novoCliente }, icone('mais', 26), h('b', {}, 'Adicionar cliente'), h('small', {}, 'Cada cliente ganha página, IA e organização próprias')) : null
  );
}

function novoCliente() {
  const nome = h('input', { class: 'entrada', placeholder: 'Ex.: Flamme' });
  const segmento = h('input', { class: 'entrada', placeholder: 'Ex.: Agência de marketing, clínica, restaurante…' });
  const instagram = h('input', { class: 'entrada', placeholder: '@perfil' });
  const tiktok = h('input', { class: 'entrada', placeholder: '@perfil' });
  const linkedin = h('input', { class: 'entrada', placeholder: 'Link do perfil ou página' });
  const cor = h('input', { class: 'entrada', type: 'color', value: '#922f11', style: { height: '46px', padding: '4px' } });
  const f = dialogo([
    h('h3', { class: 'titulo' }, 'Novo cliente'),
    h('label', { class: 'campo' }, 'Nome', nome),
    h('label', { class: 'campo' }, 'Segmento', segmento),
    h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Instagram', instagram), h('label', { class: 'campo' }, 'TikTok', tiktok)),
    h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'LinkedIn', linkedin), h('label', { class: 'campo' }, 'Cor do cliente', cor)),
    h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Depois você preenche o cérebro da IA (estilos de copy, Reels, carrossel…) e a estratégia do mês.'),
    h(
      'div',
      { class: 'botoes' },
      h('button', { class: 'btn', onclick: () => f.remove() }, 'Cancelar'),
      botaoAcao(
        'Criar cliente',
        async () => {
          if (!nome.value.trim()) return nome.focus();
          const r = await api('/api/clientes', { json: { nome: nome.value, segmento: segmento.value, instagram: instagram.value, tiktok: tiktok.value, linkedin: linkedin.value, cor: cor.value } });
          f.remove();
          await carregarBase(true);
          toast('Cliente criado ✅');
          navegar(`/c/${r.slug}?aba=cliente`);
        },
        'primario'
      )
    ),
  ]);
  nome.focus();
}

// ---------------- notificações ----------------
let $sinos = [];
function botaoSino() {
  const b = h('button', { class: 'btn icone fantasma sino', title: 'Notificações', onclick: (e) => (e.stopPropagation(), abrirNotificacoes()) }, icone('sino'));
  $sinos.push(b);
  pintarSino(b);
  return b;
}
function pintarSino(b) {
  b.querySelector('.bolinha')?.remove();
  if (estado.notif.nao_lidas) b.append(h('span', { class: 'bolinha' }, estado.notif.nao_lidas > 99 ? '99+' : estado.notif.nao_lidas));
}
async function carregarNotificacoes() {
  try {
    estado.notif = await api('/api/notificacoes');
    $sinos = $sinos.filter((b) => b.isConnected);
    $sinos.forEach(pintarSino);
    if (navigator.setAppBadge) estado.notif.nao_lidas ? navigator.setAppBadge(estado.notif.nao_lidas).catch(() => {}) : navigator.clearAppBadge().catch(() => {});
  } catch {}
}
function abrirNotificacoes() {
  if (document.querySelector('.lista-notif')) return fecharTudo();
  const painel = h(
    'div',
    { class: 'lista-notif', onclick: (e) => e.stopPropagation() },
    h(
      'div',
      { class: 'cab' },
      h('b', {}, 'Notificações'),
      h(
        'button',
        {
          class: 'btn mini fantasma',
          onclick: tentar(async () => {
            await api('/api/notificacoes/lidas', { method: 'POST' });
            await carregarNotificacoes();
            fecharTudo();
          }),
        },
        'Marcar como lidas'
      )
    ),
    estado.notif.itens.length
      ? estado.notif.itens.map((n) =>
          h(
            'div',
            {
              class: `n ${n.lida ? '' : 'nova'}`,
              onclick: () => {
                fecharTudo();
                navegar(n.url || '/');
              },
            },
            h('b', {}, n.titulo),
            h('span', {}, n.corpo),
            h('small', {}, dataBR(n.criado_em, true))
          )
        )
      : h('div', { class: 'n muted' }, 'Nada por aqui ainda.')
  );
  document.body.append(painel);
  setTimeout(() => document.addEventListener('click', fecharTudo, { once: true }), 0);
}
function fecharTudo() {
  document.querySelectorAll('.lista-notif, .menu-flutuante, .folha, .veu').forEach((e) => e.remove());
}

// menu flutuante ancorado num elemento
function menuEm(ancora, itens) {
  fecharTudo();
  const r = ancora.getBoundingClientRect();
  const menu = h(
    'div',
    { class: 'menu-flutuante', onclick: (e) => e.stopPropagation() },
    itens.map((it) => (it === '-' ? h('div', { class: 'sep' }) : h('button', { onclick: () => (fecharTudo(), it.acao()) }, it.icone || null, it.texto)))
  );
  document.body.append(menu);
  const larg = menu.offsetWidth;
  menu.style.top = `${Math.min(r.bottom + 6, innerHeight - menu.offsetHeight - 8)}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - larg - 8))}px`;
  setTimeout(() => document.addEventListener('click', fecharTudo, { once: true }), 0);
}

// Ativar notificações push neste aparelho
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function avisoNotificacoes() {
  if (localStorage.getItem('aviso-push-fechado') === '1') return null;
  if (pushSuportado() && Notification.permission === 'granted') return null;
  const fechar = (el) => (localStorage.setItem('aviso-push-fechado', '1'), el.remove());
  let el;
  if (ehIOS() && !instalado()) {
    el = h(
      'div',
      { class: 'aviso' },
      h('div', { class: 'texto' }, h('b', {}, 'Receba os avisos no iPhone: '), 'toque em ', h('b', {}, 'Compartilhar'), ' → ', h('b', {}, 'Adicionar à Tela de Início'), '. Depois abra pelo ícone e ative as notificações.'),
      h('button', { class: 'btn mini fantasma', onclick: () => fechar(el) }, 'Agora não')
    );
    return el;
  }
  if (!pushSuportado() || Notification.permission === 'denied') return null;
  el = h(
    'div',
    { class: 'aviso' },
    h('div', { class: 'texto' }, h('b', {}, 'Ative as notificações neste aparelho'), h('div', { class: 'muted pequeno' }, 'Aviso de demanda nova, aprovação do cliente, publicação e prazos.')),
    h('button', { class: 'btn primario mini', onclick: tentar(async () => (await ativarPush()) && el.remove()) }, 'Ativar'),
    h('button', { class: 'btn mini fantasma', onclick: () => fechar(el) }, 'Agora não')
  );
  return el;
}

function chaveParaBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function nomeAparelho() {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/mac/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows';
  return 'Navegador';
}
async function ativarPush() {
  if (!pushSuportado()) throw new Error('Este navegador não aceita notificações.');
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    toast('Permissão negada. Você pode liberar depois nas configurações do navegador.');
    return false;
  }
  const reg = await navigator.serviceWorker.ready;
  const { chave } = await api('/api/push/chave');
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const atual = sub.options?.applicationServerKey;
    if (atual && btoa(String.fromCharCode(...new Uint8Array(atual))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== chave) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) });
  await api('/api/push/inscrever', { json: { inscricao: sub.toJSON(), nome: nomeAparelho() } });
  await api('/api/push/teste', { method: 'POST' });
  toast('Notificações ativadas neste aparelho ✅');
  return true;
}

// ---------------- diálogos ----------------
function dialogo(conteudo, cls = '') {
  const fundo = h('div', { class: 'dialogo-fundo', onclick: (e) => e.target === fundo && fundo.remove() }, h('div', { class: `dialogo ${cls}` }, conteudo));
  document.body.append(fundo);
  return fundo;
}
function dialogoTexto(titulo, rotulo, placeholder = '', obrigatorio = true) {
  return new Promise((resolver) => {
    const t = h('textarea', { class: 'entrada', placeholder });
    const f = dialogo([
      h('h3', { class: 'titulo' }, titulo),
      h('label', { class: 'campo' }, rotulo, t),
      h(
        'div',
        { class: 'botoes' },
        h('button', { class: 'btn', onclick: () => (f.remove(), resolver(null)) }, 'Cancelar'),
        h(
          'button',
          {
            class: 'btn primario',
            onclick: () => {
              if (obrigatorio && !t.value.trim()) return t.focus();
              f.remove();
              resolver(t.value.trim());
            },
          },
          'Enviar'
        )
      ),
    ]);
    t.focus();
  });
}
function confirmar(titulo, texto, botao = 'Confirmar', perigo = false) {
  return new Promise((resolver) => {
    const f = dialogo([
      h('h3', { class: 'titulo' }, titulo),
      h('p', { class: 'muted', style: { margin: 0 } }, texto),
      h('div', { class: 'botoes' }, h('button', { class: 'btn', onclick: () => (f.remove(), resolver(false)) }, 'Cancelar'), h('button', { class: `btn ${perigo ? 'perigo' : 'primario'}`, onclick: () => (f.remove(), resolver(true)) }, botao)),
    ]);
  });
}
function copiar(texto, msg = 'Copiado.') {
  if (navigator.clipboard) navigator.clipboard.writeText(texto).then(() => toast(msg), () => toast('Não consegui copiar. Selecione e copie manualmente.'));
}

// ---------------- página do cliente ----------------
async function telaCliente() {
  const c = estado.cliente;
  document.title = `${c.nome} · Flamme`;
  const botaoAba = (id, nome, ic) => h('button', { 'data-aba': id, class: estado.aba === id ? 'ativa' : '', onclick: () => trocarAba(id) }, ic ? icone(ic, 22) : null, nome);
  const seletor = h(
    'button',
    { class: 'seletor-cliente', title: 'Trocar de cliente', onclick: (e) => (e.stopPropagation(), menuClientes(seletor)) },
    avatarCliente(c, 'p'),
    h('b', {}, c.nome),
    h('span', { class: 'seta' }, '▾')
  );
  const main = h('main', { class: 'pagina' });
  const maisBaixo = h('button', { 'data-aba': 'mais', onclick: () => folhaAbas() }, icone('menu', 22), 'Mais');
  $app.replaceChildren(
    h(
      'header',
      { class: 'topo' },
      h(
        'div',
        { class: 'faixa' },
        h('a', { class: 'marca', href: '/', title: 'Início da agência', onclick: (e) => (e.preventDefault(), navegar('/')) }, h('img', { src: '/marca/flamme-simbolo-terracota.png', alt: 'Flamme' })),
        seletor,
        h('nav', { class: 'abas' }, ABAS.map(([id, nome]) => botaoAba(id, nome))),
        h('div', { class: 'acoes' }, botaoSino(), h('button', { class: 'btn icone fantasma', title: 'Equipe e configurações', onclick: () => navegar('/config') }, icone('config')))
      )
    ),
    main,
    h('nav', { class: 'abas-baixo' }, ABAS.filter(([id]) => ABAS_BAIXO.includes(id)).map(([id, nome, ic]) => botaoAba(id, nome.replace('Visão geral', 'Visão').replace('Estúdio IA', 'IA'), ic)), maisBaixo)
  );
  estado.$main = main;
  marcarAbas();
  await desenharAba();
}

function marcarAbas() {
  document.querySelectorAll('.abas button, .abas-baixo button').forEach((b) => {
    const id = b.dataset.aba;
    b.classList.toggle('ativa', id === estado.aba || (id === 'mais' && !ABAS_BAIXO.includes(estado.aba)));
  });
}

function menuClientes(ancora) {
  menuEm(ancora, [
    ...estado.clientes.filter((x) => x.ativo).map((x) => ({ texto: x.nome, icone: avatarCliente(x, 'p'), acao: () => navegar(`/c/${x.slug}?aba=${estado.aba}`) })),
    '-',
    { texto: 'Início da agência', icone: icone('casa', 18), acao: () => navegar('/') },
    ...(estado.eu.papel === 'admin' ? [{ texto: 'Novo cliente', icone: icone('mais', 18), acao: novoCliente }] : []),
  ]);
}

function folhaAbas() {
  fecharTudo();
  const veu = h('div', { class: 'veu', onclick: fecharTudo });
  const folha = h(
    'div',
    { class: 'folha' },
    ABAS.map(([id, nome, ic]) => h('button', { class: estado.aba === id ? 'ativa' : '', onclick: () => (fecharTudo(), trocarAba(id)) }, icone(ic, 22), nome))
  );
  document.body.append(veu, folha);
}

function trocarAba(id) {
  estado.aba = id;
  const url = new URL(location.href);
  url.searchParams.set('aba', id);
  url.searchParams.delete('d');
  history.replaceState(null, '', url.pathname + url.search);
  marcarAbas();
  window.scrollTo(0, 0);
  desenharAba();
}

async function desenharAba() {
  const main = estado.$main;
  if (!main) return;
  main.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
  try {
    switch (estado.aba) {
      case 'painel':
        return await abaPainel(main);
      case 'organizacao':
        return await abaOrganizacao(main, estado.cliente.id);
      case 'cliente':
        return await abaCliente(main);
      case 'ia':
        return await abaIa(main);
    }
    if (!estado.demandas.length) await carregarDemandas();
    if (estado.aba === 'calendario') return abaCalendario(main);
    if (estado.aba === 'demandas') return abaDemandas(main);
    if (estado.aba === 'aprovacao') return await abaAprovacao(main);
    return await abaVisao(main);
  } catch (e) {
    main.replaceChildren(h('p', { class: 'erro' }, e.message));
  }
}

async function carregarDemandas() {
  estado.demandas = await api(`/api/demandas?cliente=${estado.cliente.id}`);
}
async function recarregarCliente() {
  estado.cliente = await api(`/api/clientes/${estado.cliente.id}`);
}

async function atualizarSilencioso() {
  if (!estado.eu || document.visibilityState !== 'visible') return;
  carregarNotificacoes();
  if (estado.cliente && ['demandas', 'calendario', 'aprovacao'].includes(estado.aba) && !document.querySelector('.fundo, .dialogo-fundo')) {
    try {
      const antes = JSON.stringify(estado.demandas);
      await carregarDemandas();
      if (JSON.stringify(estado.demandas) !== antes) desenharAba();
    } catch {}
  }
}

const corStatus = (id) => `var(--st-${id})`;
const nomeStatus = (id) => estado.meta.status.find((s) => s.id === id)?.nome || id;

// ---------------- visão geral ----------------
function cartaoEstrategia(e) {
  const c = estado.cliente;
  const mes = mesAtual();
  if (!e) {
    return h(
      'section',
      { class: 'estrategia vazia' },
      h('b', { class: 'titulo', style: { fontSize: '20px' } }, `Estratégia de ${nomeMes(mes)}`),
      h('span', { class: 'muted' }, 'Ainda não tem estratégia deste mês. Cole o texto ou anexe o PDF: a IA resume aqui no topo e passa a usar em tudo que gerar para este cliente.'),
      h('button', { class: 'btn primario', onclick: () => editarEstrategia(mes) }, icone('mais', 16), 'Adicionar estratégia do mês')
    );
  }
  const antiga = e.mes !== mes;
  return h(
    'section',
    { class: 'estrategia' },
    h(
      'div',
      { class: 'faixa-e' },
      h('div', { style: { minWidth: 0, flex: '1 1 300px' } }, h('div', { class: 'rot' }, `Estratégia · ${nomeMes(e.mes)}${antiga ? ' (mês anterior)' : ''}`), h('h2', { class: 'titulo' }, e.foco || 'Foco do mês ainda não definido')),
      h(
        'div',
        { class: 'acoes' },
        antiga ? h('button', { class: 'btn mini', onclick: () => editarEstrategia(mes) }, `Criar ${nomeMes(mes).split(' ')[0].toLowerCase()}`) : null,
        h('button', { class: 'btn mini', onclick: () => editarEstrategia(e.mes) }, 'Editar'),
        h('button', { class: 'btn mini', onclick: historicoEstrategias }, 'Meses anteriores')
      )
    ),
    h(
      'div',
      { class: 'corpo-e' },
      h('div', {}, h('h4', {}, 'Objetivos'), e.objetivos.length ? h('ul', {}, e.objetivos.map((o) => h('li', {}, h('span', {}, o)))) : h('span', { class: 'muted pequeno' }, '—')),
      h('div', {}, h('h4', {}, 'O que vamos fazer'), e.resumo.length ? h('ul', { class: 'acoes-mes' }, e.resumo.map((o) => h('li', {}, h('span', {}, o)))) : h('span', { class: 'muted pequeno' }, 'Use “Editar → Resumir com IA” para gerar o resumo.'))
    ),
    h(
      'div',
      { class: 'rodape-e' },
      e.anexo_chave ? h('a', { class: 'btn mini suave', href: urlMidia(e.anexo_chave), target: '_blank', rel: 'noopener' }, '📎 ', e.anexo_nome || 'Estratégia completa') : null,
      e.texto ? h('button', { class: 'btn mini fantasma', onclick: () => dialogo([h('h3', { class: 'titulo' }, `Estratégia · ${nomeMes(e.mes)}`), md(e.texto), h('div', { class: 'botoes' }, h('button', { class: 'btn', onclick: (ev) => ev.target.closest('.dialogo-fundo').remove() }, 'Fechar'))], 'largo') }, 'Ler texto completo') : null,
      h('span', { style: { marginLeft: 'auto' } }, `Atualizada ${dataBR(e.atualizado_em, true)}`)
    )
  );
}

async function editarEstrategia(mesInicial) {
  const c = estado.cliente;
  const lista = await api(`/api/clientes/${c.id}/estrategias`);
  const mes = h('input', { class: 'entrada', type: 'month', value: mesInicial });
  const foco = h('input', { class: 'entrada', placeholder: 'Ex.: Lançar a coleção de verão e dobrar o alcance dos Reels' });
  const objetivos = h('textarea', { class: 'entrada', placeholder: 'Um por linha. Ex.: +500 seguidores\n20 leads pelo direct' });
  const resumo = h('textarea', { class: 'entrada', placeholder: 'Ações principais, uma por linha' });
  const texto = h('textarea', { class: 'entrada', style: { minHeight: '180px' }, placeholder: 'Cole aqui a estratégia completa do mês (ou anexe o PDF abaixo)' });
  const anexoInfo = h('span', { class: 'muted pequeno' });
  const arquivo = h('input', { type: 'file', accept: 'application/pdf,image/*,.doc,.docx', class: 'oculto' });
  const preencher = () => {
    const e = lista.find((x) => x.mes === mes.value);
    foco.value = e?.foco || '';
    objetivos.value = (e?.objetivos || []).join('\n');
    resumo.value = (e?.resumo || []).join('\n');
    texto.value = e?.texto || '';
    anexoInfo.textContent = e?.anexo_nome ? `Anexo: ${e.anexo_nome}` : 'Nenhum arquivo anexado.';
  };
  mes.addEventListener('change', preencher);
  preencher();
  const salvar = async () => {
    if (!mes.value) throw new Error('Escolha o mês.');
    await api(`/api/clientes/${c.id}/estrategias/${mes.value}`, { method: 'PUT', json: { foco: foco.value, objetivos: objetivos.value, resumo: resumo.value, texto: texto.value } });
  };
  arquivo.addEventListener(
    'change',
    tentar(async () => {
      const f = arquivo.files[0];
      if (!f) return;
      await salvar();
      anexoInfo.textContent = 'Enviando…';
      await subirArquivo(`/api/clientes/${c.id}/estrategias/${mes.value}/anexo`, f, () => {});
      anexoInfo.textContent = `Anexo: ${f.name}`;
      const e = lista.find((x) => x.mes === mes.value);
      if (e) e.anexo_nome = f.name;
      else lista.push({ mes: mes.value, anexo_nome: f.name, objetivos: [], resumo: [] });
      toast('Arquivo anexado.');
    })
  );
  const f = dialogo(
    [
      h('h3', { class: 'titulo' }, `Estratégia · ${c.nome}`),
      h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Mês', mes), h('label', { class: 'campo' }, 'Foco do mês', foco)),
      h('label', { class: 'campo' }, 'Estratégia completa', texto),
      h('div', { class: 'linha' }, h('button', { class: 'btn mini', onclick: () => arquivo.click() }, '📎 Anexar PDF'), anexoInfo, arquivo),
      h(
        'div',
        { class: 'aviso destaque', style: { margin: 0 } },
        h('div', { class: 'texto' }, h('b', {}, 'Resumo automático: '), 'a IA lê o texto e/ou o PDF e preenche o foco, os objetivos e as ações do mês.'),
        botaoAcao(
          '✨ Resumir com IA',
          async () => {
            await salvar();
            const r = await api(`/api/clientes/${c.id}/estrategias/${mes.value}/resumir`, { method: 'POST' });
            foco.value = r.foco;
            objetivos.value = r.objetivos.join('\n');
            resumo.value = r.resumo.join('\n');
            toast('Resumo pronto. Revise e salve.');
          },
          'primario mini'
        )
      ),
      h('label', { class: 'campo' }, 'Objetivos', objetivos),
      h('label', { class: 'campo' }, 'O que vamos fazer (aparece no topo da página)', resumo),
      h(
        'div',
        { class: 'botoes' },
        h('button', { class: 'btn', onclick: () => f.remove() }, 'Cancelar'),
        botaoAcao(
          'Salvar estratégia',
          async () => {
            await salvar();
            f.remove();
            await recarregarCliente();
            toast('Estratégia salva ✅');
            desenharAba();
          },
          'primario'
        )
      ),
    ],
    'largo'
  );
}

async function historicoEstrategias() {
  const lista = await api(`/api/clientes/${estado.cliente.id}/estrategias`);
  const f = dialogo(
    [
      h('h3', { class: 'titulo' }, 'Estratégias anteriores'),
      lista.length
        ? lista.map((e) =>
            h(
              'div',
              { class: 'bloco', style: { padding: '14px' } },
              h('h3', {}, nomeMes(e.mes), h('button', { class: 'btn mini acao', onclick: () => (f.remove(), editarEstrategia(e.mes)) }, 'Abrir')),
              e.foco ? h('b', {}, e.foco) : null,
              e.resumo.length ? h('ul', { style: { margin: 0, paddingLeft: '20px' } }, e.resumo.map((x) => h('li', {}, x))) : null,
              e.anexo_chave ? h('a', { href: urlMidia(e.anexo_chave), target: '_blank', rel: 'noopener', class: 'pequeno' }, '📎 ', e.anexo_nome) : null
            )
          )
        : h('p', { class: 'muted' }, 'Nenhuma estratégia ainda.'),
      h('div', { class: 'botoes' }, h('button', { class: 'btn', onclick: () => f.remove() }, 'Fechar')),
    ],
    'largo'
  );
}

function contarMes(lista) {
  // quantos de cada formato estão publicados e planejados (agendado/aprovado/em produção com prazo) no mês
  const mes = mesAtual();
  const r = {};
  for (const d of lista) {
    const data = d.status === 'publicado' ? d.publicado_em : d.status === 'agendado' ? d.agendado_para : d.prazo;
    if (!data) continue;
    const dMes = (data.length === 10 ? data : new Date(data).toLocaleDateString('en-CA')).slice(0, 7);
    if (dMes !== mes) continue;
    const t = d.tipo === 'video' ? 'reels' : d.tipo;
    r[t] ||= { pub: 0, plan: 0 };
    if (d.status === 'publicado') r[t].pub++;
    else r[t].plan++;
  }
  return r;
}

async function abaVisao(main) {
  const c = estado.cliente;
  const kpis = h('div', { class: 'kpis' });
  const redes = h('div', { class: 'redes' });
  const lista = estado.demandas;
  const hoje = hojeISO();
  const em7 = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA');
  const aguardando = lista.filter((d) => d.status === 'aprovacao' || d.status === 'ajustes');
  const proximos = lista
    .filter((d) => (d.status === 'agendado' && d.agendado_para && d.agendado_para.slice(0, 10) <= em7) || (!['agendado', 'publicado', 'aprovado'].includes(d.status) && d.prazo && d.prazo <= em7))
    .sort((a, b) => (a.agendado_para || a.prazo).localeCompare(b.agendado_para || b.prazo));
  const conta = contarMes(lista);
  const metas = c.metas || {};
  const linhasMeta = [
    ['post', 'Posts', metas.posts],
    ['carrossel', 'Carrosséis', metas.carrosseis],
    ['reels', 'Reels', metas.reels],
    ['story', 'Stories', metas.stories],
  ];
  const itemLista = (d, extra) =>
    h('div', { class: 'it', onclick: () => abrirDemanda(d.id) }, h('span', { class: 'ponto', style: { background: corStatus(d.status) } }), h('span', { class: 't' }, d.titulo), h('small', {}, extra));

  main.replaceChildren(
    h(
      'div',
      { class: 'visao' },
      avisoNotificacoes() || '',
      cartaoEstrategia(c.estrategia),
      kpis,
      h(
        'div',
        { class: 'colunas-3' },
        h(
          'div',
          { class: 'bloco' },
          h('h3', {}, 'Aguardando aprovação', aguardando.length ? h('button', { class: 'btn mini acao', onclick: () => trocarAba('aprovacao') }, 'Enviar ao cliente') : null),
          aguardando.length ? h('div', { class: 'mini-lista' }, aguardando.map((d) => itemLista(d, nomeStatus(d.status)))) : h('span', { class: 'vazio' }, 'Nada esperando aprovação.')
        ),
        h(
          'div',
          { class: 'bloco' },
          h('h3', {}, 'Próximos 7 dias'),
          proximos.length
            ? h('div', { class: 'mini-lista' }, proximos.slice(0, 10).map((d) => itemLista(d, d.status === 'agendado' ? `⏱ ${dataBR(d.agendado_para, true)}` : d.prazo < hoje ? `Atrasada · ${dataBR(d.prazo)}` : `Prazo ${dataBR(d.prazo)}`)))
            : h('span', { class: 'vazio' }, 'Nada agendado ou vencendo nesta semana.')
        ),
        h(
          'div',
          { class: 'bloco' },
          h('h3', {}, `Produção de ${nomeMes(mesAtual()).split(' ')[0].toLowerCase()}`, h('button', { class: 'btn mini fantasma acao', onclick: () => trocarAba('cliente') }, 'Metas')),
          h(
            'div',
            { class: 'metas' },
            linhasMeta.map(([tipo, nome, meta]) => {
              const v = conta[tipo] || { pub: 0, plan: 0 };
              const total = Math.max(meta || 0, v.pub + v.plan, 1);
              return h(
                'div',
                { class: 'meta' },
                h('div', { class: 'topo-m' }, h('span', {}, nome), h('span', { class: 'muted' }, `${v.pub} publicados · ${v.plan} planejados${meta ? ` · meta ${meta}` : ''}`)),
                h('div', { class: 'barra', title: `${v.pub} publicados, ${v.plan} planejados${meta ? `, meta ${meta}` : ''}` }, v.pub ? h('span', { class: 'pub', style: { width: `${(v.pub / total) * 100}%` } }) : null, v.plan ? h('span', { class: 'plan', style: { width: `${(v.plan / total) * 100}%` } }) : null)
              );
            }),
            h('div', { class: 'legenda-metas' }, h('span', {}, h('i', { style: { background: 'var(--accent)' } }), 'Publicado'), h('span', {}, h('i', { style: { background: 'color-mix(in srgb, var(--accent) 35%, var(--surface-3))' } }), 'Planejado'))
          )
        )
      ),
      h('div', { class: 'bloco' }, h('h3', {}, 'Redes e integrações', h('button', { class: 'btn mini fantasma acao', onclick: () => trocarAba('cliente') }, 'Configurar')), redes)
    )
  );

  // redes
  const linhaRede = (cls, sigla, nome, valor, selo) => h('div', { class: 'rede' }, h('span', { class: `ico ${cls}` }, sigla), h('div', {}, h('b', {}, nome), h('div', { class: 'muted pequeno' }, valor || 'Não cadastrado')), selo);
  const igOk = c.ig?.conectado;
  redes.replaceChildren(
    linhaRede('ig', 'IG', 'Instagram', c.ig?.username ? `@${c.ig.username}` : c.instagram ? `@${c.instagram}` : '', igOk ? h('span', { class: 'selo ok' }, 'Conectado') : h('button', { class: 'btn mini', onclick: () => trocarAba('cliente') }, 'Conectar')),
    linhaRede('tt', 'TT', 'TikTok', c.tiktok ? `@${c.tiktok}` : '', h('span', { class: 'selo fase' }, 'Fase 3')),
    linhaRede('li', 'in', 'LinkedIn', c.linkedin, h('span', { class: 'selo fase' }, 'Fase 3')),
    linhaRede('go', 'G', 'Avaliações do Google', c.google, h('span', { class: 'selo fase' }, 'Fase 3')),
    linhaRede('dr', 'Dr', 'Pasta no Drive', c.drive, h('span', { class: 'selo fase' }, 'Fase 2'))
  );

  // KPIs (Instagram)
  const kpi = (rot, valor, delta, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'rot' }, rot), h('span', { class: 'valor' }, valor), delta ? h('span', { class: `delta ${cls}` }, delta) : null);
  const publicadosMes = Object.values(conta).reduce((n, v) => n + v.pub, 0);
  const metaTotal = (metas.posts || 0) + (metas.carrosseis || 0) + (metas.reels || 0);
  if (!igOk) {
    kpis.replaceChildren(kpi('Publicados no mês', publicadosMes, metaTotal ? `meta ${metaTotal} no feed` : null), kpi('Em andamento', lista.filter((d) => !['publicado', 'agendado'].includes(d.status)).length), kpi('Agendados', lista.filter((d) => d.status === 'agendado').length), kpi('Instagram', '—', 'Conecte para ver os números'));
    return;
  }
  kpis.replaceChildren(kpi('Seguidores', '…'), kpi('Alcance · 30 dias', '…'), kpi('Interações · 30 dias', '…'), kpi('Publicados no mês', publicadosMes, metaTotal ? `meta ${metaTotal} no feed` : null));
  try {
    const p = await api(`/api/instagram/${c.id}/painel`);
    const hist = p.seguidores_por_dia || [];
    const atual = hist.at(-1)?.seguidores;
    const base = hist.find((x) => x.dia >= new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA'))?.seguidores;
    const delta = atual != null && base != null && hist.length > 1 ? atual - base : null;
    const t = p.totais || {};
    kpis.replaceChildren(
      kpi('Seguidores', numero(atual), delta == null ? 'histórico começa hoje' : `${delta >= 0 ? '+' : ''}${numero(delta)} em 30 dias`, delta > 0 ? 'sobe' : delta < 0 ? 'desce' : ''),
      kpi('Alcance · 30 dias', numero(t.reach)),
      kpi('Interações · 30 dias', numero(t.total_interactions)),
      kpi('Publicados no mês', publicadosMes, metaTotal ? `meta ${metaTotal} no feed` : null)
    );
  } catch {
    kpis.firstChild?.querySelector('.valor') && (kpis.firstChild.querySelector('.valor').textContent = '—');
  }
}

// ---------------- demandas ----------------
function filtrar(lista) {
  const b = estado.busca.trim().toLowerCase();
  return lista.filter(
    (d) =>
      (!b || d.titulo.toLowerCase().includes(b) || (d.descricao || '').toLowerCase().includes(b) || (d.legenda || '').toLowerCase().includes(b)) &&
      (!estado.filtroResp || String(d.responsavel_id || '') === estado.filtroResp)
  );
}

function chipPrazo(d) {
  if (!d.prazo || ['publicado', 'agendado', 'aprovado'].includes(d.status)) return null;
  const hoje = hojeISO();
  const cls = d.prazo < hoje ? 'atrasado' : d.prazo === hoje ? 'hoje' : '';
  return h('span', { class: `chip ${cls}` }, d.prazo < hoje ? 'Atrasada · ' : d.prazo === hoje ? 'Hoje · ' : 'Prazo ', dataBR(d.prazo));
}

function cartaoDemanda(d) {
  const capa = midiaEl(d.capa, d.capa_mime);
  const el = h(
    'div',
    { class: 'cartao', draggable: 'true', onclick: () => abrirDemanda(d.id) },
    capa ? h('div', { class: 'capa' }, capa) : null,
    h('div', { class: 'nome' }, d.titulo),
    h(
      'div',
      { class: 'meta' },
      h('span', { class: 'chip' }, NOMES_TIPO[d.tipo] || d.tipo),
      d.pilar ? h('span', { class: 'chip pilar' }, d.pilar) : null,
      chipPrazo(d),
      d.status === 'agendado' && d.agendado_para ? h('span', { class: 'chip' }, (d.publicar_auto ? '⏱ ' : '⏰ ') + dataBR(d.agendado_para, true)) : null,
      d.erro_publicacao ? h('span', { class: 'chip atrasado' }, 'Falhou ao publicar') : null,
      d.n_comentarios ? h('span', {}, `💬 ${d.n_comentarios}`) : null,
      d.n_anexos > 1 ? h('span', {}, `📎 ${d.n_anexos}`) : null,
      d.responsavel_nome ? h('span', { class: 'avatar', title: d.responsavel_nome, style: { marginLeft: 'auto' } }, iniciais(d.responsavel_nome)) : null
    )
  );
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(d.id));
    el.classList.add('arrastando');
  });
  el.addEventListener('dragend', () => el.classList.remove('arrastando'));
  return el;
}

function abaDemandas(main) {
  const busca = h('input', {
    class: 'entrada busca',
    placeholder: 'Buscar demanda…',
    value: estado.busca,
    oninput: (e) => {
      estado.busca = e.target.value;
      desenharConteudo();
    },
  });
  const resp = h(
    'select',
    {
      class: 'entrada',
      style: { width: 'auto' },
      onchange: (e) => {
        estado.filtroResp = e.target.value;
        desenharConteudo();
      },
    },
    h('option', { value: '' }, 'Todos os responsáveis'),
    estado.usuarios.filter((u) => u.ativo).map((u) => h('option', { value: String(u.id), selected: estado.filtroResp === String(u.id) }, u.nome))
  );
  const alternar = h(
    'div',
    { class: 'alternar' },
    ['quadro', 'lista'].map((v) =>
      h(
        'button',
        {
          class: estado.visao === v ? 'ativa' : '',
          onclick: () => {
            estado.visao = v;
            localStorage.setItem('visao', v);
            abaDemandas(main);
          },
        },
        v === 'quadro' ? 'Quadro' : 'Lista'
      )
    )
  );
  const conteudo = h('div');
  function desenharConteudo() {
    const lista = filtrar(estado.demandas);
    if (estado.visao === 'lista') {
      conteudo.replaceChildren(
        lista.length
          ? h(
              'div',
              { class: 'lista' },
              lista.map((d) =>
                h(
                  'div',
                  { class: 'item', onclick: () => abrirDemanda(d.id) },
                  h('div', { class: 'mini' }, midiaEl(d.capa, d.capa_mime)),
                  h('div', {}, h('div', { style: { fontWeight: 600 } }, d.titulo), h('div', { class: 'linha pequeno muted', style: { gap: '6px', marginTop: '4px' } }, h('span', { class: 'chip' }, NOMES_TIPO[d.tipo]), chipPrazo(d), d.responsavel_nome || '')),
                  h('span', { class: 'chip' }, h('span', { class: 'ponto', style: { background: corStatus(d.status) } }), nomeStatus(d.status))
                )
              )
            )
          : h('p', { class: 'muted' }, 'Nenhuma demanda encontrada.')
      );
      return;
    }
    conteudo.replaceChildren(
      h(
        'div',
        { class: 'quadro' },
        estado.meta.status.map((s) => {
          const itens = lista.filter((d) => d.status === s.id);
          const col = h(
            'div',
            { class: 'coluna' },
            h('h3', {}, h('span', { class: 'ponto', style: { background: corStatus(s.id) } }), s.nome, h('span', { class: 'n' }, itens.length)),
            itens.map(cartaoDemanda),
            s.id === 'briefing' ? h('button', { class: 'btn fantasma mini', style: { width: '100%' }, onclick: () => novaDemanda() }, icone('mais', 16), 'Adicionar') : null
          );
          col.addEventListener('dragover', (e) => (e.preventDefault(), col.classList.add('alvo')));
          col.addEventListener('dragleave', () => col.classList.remove('alvo'));
          col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('alvo');
            const id = Number(e.dataTransfer.getData('text/plain'));
            const d = estado.demandas.find((x) => x.id === id);
            if (d && d.status !== s.id) mudarStatus(d, s.id);
          });
          return col;
        })
      )
    );
  }
  main.replaceChildren(
    avisoNotificacoes() || '',
    h('div', { class: 'ferramentas' }, h('h2', { class: 'titulo' }, 'Demandas'), busca, resp, alternar, h('button', { class: 'btn primario', onclick: () => novaDemanda() }, icone('mais', 18), 'Nova demanda')),
    conteudo
  );
  desenharConteudo();
}

async function mudarStatus(d, status, comentario) {
  if (status === 'agendado') return dialogoAgendar(d);
  if (status === 'ajustes' && comentario === undefined) {
    const c = await dialogoTexto('Pedir ajuste', 'O que precisa mudar?', 'Ex.: trocar a foto do slide 2, ajustar o preço…');
    if (c === null) return;
    comentario = c;
  }
  try {
    await api(`/api/demandas/${d.id}/status`, { json: { status, comentario } });
    toast(`Movida para “${nomeStatus(status)}”`);
    await carregarDemandas();
    desenharAba();
    if (estado.abertaId === d.id) abrirDemanda(d.id);
  } catch (e) {
    toast(e.message);
  }
}


function novaDemanda(prazo, inicial = {}) {
  const titulo = h('input', { class: 'entrada', placeholder: 'Ex.: Carrossel lançamento coleção verão', value: inicial.titulo || '' });
  const tipo = h('select', { class: 'entrada' }, estado.meta.tipos.map((t) => h('option', { value: t, selected: t === inicial.tipo }, NOMES_TIPO[t])));
  const resp = h('select', { class: 'entrada' }, h('option', { value: '' }, 'Sem responsável'), estado.usuarios.filter((u) => u.ativo).map((u) => h('option', { value: u.id }, u.nome)));
  const dataPrazo = h('input', { class: 'entrada', type: 'date', value: prazo || '' });
  const desc = h('textarea', { class: 'entrada', placeholder: 'Briefing: objetivo, referências, texto da arte…' }, inicial.descricao || '');
  const pilar = campoPilar(inicial.pilar || '');
  const f = dialogo([
    h('h3', { class: 'titulo' }, `Nova demanda · ${estado.cliente.nome}`),
    h('label', { class: 'campo' }, 'Título', titulo),
    h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Formato', tipo), h('label', { class: 'campo' }, 'Prazo', dataPrazo)),
    h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Responsável', resp), h('label', { class: 'campo' }, 'Pilar', pilar)),
    h('label', { class: 'campo' }, 'Briefing', desc),
    h(
      'div',
      { class: 'botoes' },
      h('button', { class: 'btn', onclick: () => f.remove() }, 'Cancelar'),
      h(
        'button',
        {
          class: 'btn primario',
          onclick: tentar(async () => {
            if (!titulo.value.trim()) return titulo.focus();
            const r = await api('/api/demandas', {
              json: { cliente_id: estado.cliente.id, pilar: pilar.value, titulo: titulo.value, tipo: tipo.value, responsavel_id: resp.value ? Number(resp.value) : null, prazo: dataPrazo.value || null, descricao: desc.value },
            });
            f.remove();
            toast('Demanda criada. A equipe foi avisada.');
            await carregarDemandas();
            desenharAba();
            abrirDemanda(r.id);
          }),
        },
        'Criar'
      )
    ),
  ]);
  titulo.focus();
}

function dialogoAgendar(d) {
  const padrao = d.agendado_para ? new Date(d.agendado_para) : new Date(Date.now() + 3600000);
  padrao.setMinutes(Math.ceil(padrao.getMinutes() / 5) * 5, 0, 0);
  const local = new Date(padrao.getTime() - padrao.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const quando = h('input', { class: 'entrada', type: 'datetime-local', value: local });
  const igOk = estado.ig?.conectado ?? true;
  const auto = h('input', { type: 'checkbox', checked: igOk });
  const f = dialogo([
    h('h3', { class: 'titulo' }, 'Agendar publicação'),
    h('label', { class: 'campo' }, 'Dia e hora', quando),
    h('label', { class: 'linha', style: { gap: '10px', alignItems: 'flex-start' } }, auto, h('span', {}, h('b', {}, 'Publicar sozinho no Instagram'), h('div', { class: 'muted pequeno' }, 'Desmarque se o post precisa de música, enquete ou algo que só o app faz: você recebe um lembrete na hora.'))),
    h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'A publicação sai em até 5 minutos depois do horário escolhido.'),
    h(
      'div',
      { class: 'botoes' },
      h('button', { class: 'btn', onclick: () => f.remove() }, 'Cancelar'),
      h(
        'button',
        {
          class: 'btn primario',
          onclick: tentar(async () => {
            if (!quando.value) return quando.focus();
            await api(`/api/demandas/${d.id}/agendar`, { json: { agendado_para: new Date(quando.value).toISOString(), publicar_auto: auto.checked } });
            f.remove();
            toast('Agendado ✅');
            await carregarDemandas();
            desenharAba();
            if (estado.abertaId === d.id) abrirDemanda(d.id);
          }),
        },
        'Agendar'
      )
    ),
  ]);
}

// ---------------- painel da demanda ----------------
function iconeLink(url) {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  const tabela = [
    [/drive\.google|docs\.google/, 'Drive', '#1a73e8'],
    [/canva/, 'Canva', '#7d2ae8'],
    [/instagram/, 'IG', '#d62976'],
    [/youtu/, 'YT', '#ff0000'],
    [/figma/, 'Fig', '#0acf83'],
    [/tiktok/, 'TT', '#111111'],
    [/dropbox/, 'Box', '#0061ff'],
    [/wetransfer/, 'WT', '#409fff'],
    [/notion/, 'N', '#111111'],
  ];
  const t = tabela.find(([re]) => re.test(host));
  return { host, rotulo: t ? t[1] : host.slice(0, 2).toUpperCase(), cor: t ? t[2] : '#777' };
}

async function abrirDemanda(id) {
  let d;
  try {
    d = await api(`/api/demandas/${id}`);
  } catch (e) {
    return toast(e.message);
  }
  estado.abertaId = id;
  const url = new URL(location.href);
  if (url.searchParams.get('d') !== String(id)) {
    url.searchParams.set('d', id);
    history.replaceState(null, '', url.pathname + url.search);
  }
  document.querySelectorAll('.fundo').forEach((e) => e.remove());
  const eu = estado.eu;
  const podeAprovar = eu.papel === 'admin' || eu.papel === 'aprovador';
  let pendente = {};
  let timer;
  const salvar = (campo, valor) => {
    pendente[campo] = valor;
    clearTimeout(timer);
    timer = setTimeout(salvarAgora, 700);
  };
  const salvarAgora = async () => {
    clearTimeout(timer);
    if (!Object.keys(pendente).length) return;
    const dados = pendente;
    pendente = {};
    try {
      await api(`/api/demandas/${id}`, { method: 'PATCH', json: dados });
      Object.assign(d, dados);
      const item = estado.demandas.find((x) => x.id === id);
      if (item) Object.assign(item, dados);
    } catch (e) {
      toast(e.message);
    }
  };
  const fechar = async () => {
    await salvarAgora();
    fundo.remove();
    estado.abertaId = null;
    const u = new URL(location.href);
    u.searchParams.delete('d');
    history.replaceState(null, '', u.pathname + u.search);
    await carregarDemandas();
    desenharAba();
  };

  // ações conforme o status
  const acoes = [];
  const b = (txt, fn, cls = '') => h('button', { class: `btn mini ${cls}`, onclick: tentar(fn) }, txt);
  if (['briefing', 'producao', 'ajustes'].includes(d.status)) acoes.push(b('Enviar para aprovação', () => mudarStatus(d, 'aprovacao'), 'primario'));
  if (d.status === 'briefing') acoes.push(b('Iniciar produção', () => mudarStatus(d, 'producao')));
  if (d.status === 'aprovacao') {
    if (podeAprovar) acoes.push(b('Aprovar ✓', () => mudarStatus(d, 'aprovado'), 'primario'));
    acoes.push(b('Pedir ajuste', () => mudarStatus(d, 'ajustes')));
    acoes.push(b('🔗 Link para o cliente', () => dialogoLinkAprovacao([d.id])));
  }
  if (d.status === 'aprovado') {
    acoes.push(b('Agendar', () => dialogoAgendar(d), 'primario'));
    acoes.push(b('Publicar agora', () => publicarAgora(d)));
    acoes.push(b('Já publiquei', () => mudarStatus(d, 'publicado')));
  }
  if (d.status === 'agendado') {
    acoes.push(b('Mudar horário', () => dialogoAgendar(d)));
    acoes.push(b('Publicar agora', () => publicarAgora(d)));
    acoes.push(
      b('Cancelar agendamento', async () => {
        await api(`/api/demandas/${id}/cancelar-agendamento`, { method: 'POST' });
        toast('Agendamento cancelado.');
        abrirDemanda(id);
      })
    );
    if (!d.publicar_auto) acoes.push(b('Já publiquei', () => mudarStatus(d, 'publicado')));
  }
  if (d.status === 'publicado' && d.permalink) acoes.push(h('a', { class: 'btn mini primario', href: d.permalink, target: '_blank', rel: 'noopener' }, 'Ver no Instagram'));

  const seletorStatus = h(
    'select',
    { class: 'entrada', style: { width: 'auto', padding: '6px 10px' }, title: 'Mover para', onchange: (e) => mudarStatus(d, e.target.value) },
    estado.meta.status.map((s) => h('option', { value: s.id, selected: s.id === d.status, disabled: s.id === 'aprovado' && !podeAprovar && d.status !== 'aprovado' }, s.nome))
  );

  let detalheStatus = '';
  if (d.status === 'agendado') detalheStatus = `${d.publicar_auto ? 'Publica sozinho' : 'Lembrete'} em ${dataBR(d.agendado_para, true)}${d.ig_container ? ' · processando vídeo…' : ''}`;
  else if (d.status === 'publicado' && d.publicado_em) detalheStatus = `Publicado em ${dataBR(d.publicado_em, true)}`;
  else if (d.aprovado_em && d.status === 'aprovado') detalheStatus = `Aprovado${d.aprovado_cliente ? ` por ${d.aprovado_cliente}` : ''} em ${dataBR(d.aprovado_em, true)}`;

  // campos
  const titulo = h('input', { class: 'entrada-titulo', value: d.titulo, oninput: (e) => salvar('titulo', e.target.value) });
  const tipo = h('select', { class: 'entrada', onchange: (e) => salvar('tipo', e.target.value) }, estado.meta.tipos.map((t) => h('option', { value: t, selected: t === d.tipo }, NOMES_TIPO[t])));
  const resp = h(
    'select',
    { class: 'entrada', onchange: (e) => salvar('responsavel_id', e.target.value ? Number(e.target.value) : null) },
    h('option', { value: '' }, 'Sem responsável'),
    estado.usuarios.filter((u) => u.ativo || u.id === d.responsavel_id).map((u) => h('option', { value: u.id, selected: u.id === d.responsavel_id }, u.nome))
  );
  const prazo = h('input', { class: 'entrada', type: 'date', value: d.prazo || '', onchange: (e) => salvar('prazo', e.target.value || null) });
  const pilar = campoPilar(d.pilar || '');
  pilar.addEventListener('input', (e) => salvar('pilar', e.target.value));
  const desc = h('textarea', { class: 'entrada', placeholder: 'Briefing, referências, observações…', oninput: (e) => salvar('descricao', e.target.value) }, d.descricao || '');
  const contador = h('div', { class: 'contador-car' });
  const contarLegenda = (txt) => {
    const hashtags = (txt.match(/#[^\s#]+/g) || []).length;
    contador.textContent = `${txt.length}/2200 caracteres · ${hashtags}/30 hashtags`;
    contador.classList.toggle('estourou', txt.length > 2200 || hashtags > 30);
  };
  const legenda = h('textarea', {
    class: 'entrada',
    style: { minHeight: '140px' },
    placeholder: 'Legenda que vai para o Instagram…',
    oninput: (e) => {
      contarLegenda(e.target.value);
      salvar('legenda', e.target.value);
      atualizarPrevia();
    },
  }, d.legenda || '');
  contarLegenda(d.legenda || '');

  // links
  const listaLinks = h('div', { class: 'links' });
  const desenharLinks = () => {
    listaLinks.replaceChildren(
      ...d.links.map((l, i) => {
        const ic = iconeLink(l.url);
        return h(
          'div',
          { class: 'link' },
          h('span', { class: 'ico', style: { background: ic.cor } }, ic.rotulo),
          h('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.titulo || ic.host, h('small', {}, l.url)),
          h(
            'button',
            {
              class: 'btn icone fantasma mini',
              title: 'Remover',
              onclick: () => {
                d.links.splice(i, 1);
                salvar('links', d.links);
                desenharLinks();
              },
            },
            icone('fechar', 16)
          )
        );
      })
    );
  };
  desenharLinks();
  const novoLink = h('input', { class: 'entrada', placeholder: 'Cole um link (Drive, Canva, YouTube, post…)' });
  const novoTitulo = h('input', { class: 'entrada', placeholder: 'Nome (opcional)', style: { maxWidth: '200px' } });
  const addLink = () => {
    let u = novoLink.value.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    d.links.push({ url: u, titulo: novoTitulo.value.trim() });
    novoLink.value = novoTitulo.value = '';
    salvar('links', d.links);
    desenharLinks();
  };
  novoLink.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), addLink()));

  // anexos
  const gradeAnexos = h('div', { class: 'anexos' });
  const barra = h('div', { class: 'progresso oculto' }, h('div'));
  const arquivo = h('input', { type: 'file', multiple: true, accept: 'image/*,video/*,application/pdf', class: 'oculto', onchange: (e) => enviarArquivos([...e.target.files]) });
  const desenharAnexos = () => {
    const zona = h('div', { class: 'soltar', onclick: () => arquivo.click() }, h('div', {}, icone('mais', 26), h('div', {}, 'Adicionar arquivos'), h('small', {}, 'ou arraste aqui')));
    ['dragover', 'dragenter'].forEach((ev) => zona.addEventListener(ev, (e) => (e.preventDefault(), zona.classList.add('ativo'))));
    zona.addEventListener('dragleave', () => zona.classList.remove('ativo'));
    zona.addEventListener('drop', (e) => {
      e.preventDefault();
      zona.classList.remove('ativo');
      enviarArquivos([...e.dataTransfer.files]);
    });
    gradeAnexos.replaceChildren(
      ...d.anexos.map((a, i) =>
        h(
          'div',
          { class: 'anexo' },
          midiaEl(a.chave, a.mime, ehVideo(a.mime) ? { controls: true } : {}) || h('a', { class: 'arquivo', href: urlMidia(a.chave), target: '_blank' }, a.nome),
          d.anexos.length > 1 ? h('span', { class: 'num' }, i + 1) : null,
          h(
            'div',
            { class: 'controles' },
            h('button', { title: 'Mover para a esquerda', onclick: () => moverAnexo(i, -1), disabled: i === 0 }, '‹'),
            h('button', { title: 'Abrir', onclick: () => window.open(urlMidia(a.chave), '_blank') }, '↗'),
            h('button', { title: 'Remover', onclick: tentar(() => removerAnexo(a)) }, '×'),
            h('button', { title: 'Mover para a direita', onclick: () => moverAnexo(i, 1), disabled: i === d.anexos.length - 1 }, '›')
          )
        )
      ),
      zona
    );
  };
  const moverAnexo = tentar(async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= d.anexos.length) return;
    [d.anexos[i], d.anexos[j]] = [d.anexos[j], d.anexos[i]];
    desenharAnexos();
    atualizarPrevia();
    await api(`/api/demandas/${id}/anexos/ordem`, { json: { ids: d.anexos.map((a) => a.id) } });
  });
  const removerAnexo = async (a) => {
    if (!(await confirmar('Remover arquivo', `Remover “${a.nome}”?`, 'Remover', true))) return;
    await api(`/api/anexos/${a.id}`, { method: 'DELETE' });
    d.anexos = d.anexos.filter((x) => x.id !== a.id);
    desenharAnexos();
    atualizarPrevia();
  };
  async function enviarArquivos(arquivos) {
    for (const f of arquivos) {
      try {
        barra.classList.remove('oculto');
        const preparado = await prepararImagem(f);
        const r = await subirArquivo(`/api/demandas/${id}/anexos`, preparado, (p) => (barra.firstChild.style.width = `${Math.round(p * 100)}%`));
        d.anexos.push({ id: r.id, chave: r.chave, nome: preparado.name, mime: preparado.type, ordem: d.anexos.length });
        desenharAnexos();
        atualizarPrevia();
      } catch (e) {
        toast(`${f.name}: ${e.message}`);
      }
    }
    barra.classList.add('oculto');
    barra.firstChild.style.width = '0';
  }
  desenharAnexos();

  // prévia do post
  const previa = h('div');
  const atualizarPrevia = () => {
    const midias = d.anexos.filter((a) => a.mime.startsWith('image/') || ehVideo(a.mime));
    const perfil = estado.ig?.perfil;
    previa.replaceChildren(
      midias.length
        ? h(
            'div',
            { class: 'previa-post' },
            h('div', { class: 'ph' }, perfil?.profile_picture_url ? h('img', { src: perfil.profile_picture_url, alt: '' }) : h('span', { class: 'avatar' }, iniciais(estado.cliente.nome)), perfil?.username || estado.cliente.instagram || estado.cliente.nome.toLowerCase().replace(/\s/g, '')),
            h('div', { class: 'midias' }, midias.map((a) => midiaEl(a.chave, a.mime, ehVideo(a.mime) ? { controls: true } : {}))),
            h('div', { class: 'pt' }, h('b', {}, (perfil?.username || '') + ' '), legenda.value.slice(0, 300), legenda.value.length > 300 ? '… mais' : '')
          )
        : h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Anexe a arte para ver como o post fica no feed.')
    );
  };
  atualizarPrevia();
  if (!estado.ig) api(`/api/instagram/${estado.cliente.id}`).then((r) => ((estado.ig = r), atualizarPrevia())).catch(() => {});

  // comentários
  const listaCom = h(
    'div',
    { class: 'comentarios' },
    d.comentarios.length
      ? d.comentarios.map((c) =>
          h('div', { class: `comentario ${c.externo ? 'externo' : ''}` }, h('span', { class: 'avatar', style: { width: '28px', height: '28px' } }, iniciais(c.autor || 'Claude')), h('div', {}, h('div', { class: 'quem' }, `${c.autor || 'Claude'}${c.externo ? ' (cliente)' : ''} · ${dataBR(c.criado_em, true)}`), h('div', { class: 'bolha' }, c.texto)))
        )
      : h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Sem comentários ainda.')
  );
  const novoCom = h('textarea', { class: 'entrada', placeholder: 'Escreva um comentário… (a equipe é avisada)', style: { minHeight: '60px' } });
  const enviarCom = tentar(async () => {
    if (!novoCom.value.trim()) return;
    await api(`/api/demandas/${id}/comentarios`, { json: { texto: novoCom.value } });
    abrirDemanda(id);
  });

  const NOMES_ACAO = { criou: 'criou a demanda', status: 'mudou o status', anexou: 'anexou', 'removeu anexo': 'removeu o anexo', legenda: 'editou a legenda', prazo: 'mudou o prazo', responsavel: 'definiu o responsável', agendou: 'agendou para', 'cancelou agendamento': 'cancelou o agendamento', 'publicar agora': 'mandou publicar agora', 'publicou no Instagram': 'publicou no Instagram', 'falha ao publicar': 'falha ao publicar', arquivou: 'arquivou', 'cliente aprovou': 'aprovou pelo link ✅', 'cliente pediu ajuste': 'pediu ajuste pelo link', 'enviou ao cliente': 'enviou para o cliente aprovar' };
  const historico = h(
    'details',
    {},
    h('summary', { class: 'muted pequeno', style: { cursor: 'pointer' } }, `Histórico (${d.historico.length})`),
    h(
      'div',
      { class: 'historico', style: { marginTop: '8px' } },
      d.historico.map((x) =>
        h('div', {}, `${dataBR(x.criado_em, true)} · ${x.autor || 'Sistema'} ${NOMES_ACAO[x.acao] || x.acao}${x.acao === 'status' ? `: ${nomeStatus(x.de)} → ${nomeStatus(x.para)}` : x.acao === 'agendou' ? ` ${dataBR(x.para, true)}` : x.para && !['criou', 'cliente aprovou', 'cliente pediu ajuste'].includes(x.acao) ? ` ${x.para}` : x.de && x.acao === 'removeu anexo' ? ` ${x.de}` : ''}`)
      )
    )
  );

  const fundo = h(
    'div',
    { class: 'fundo', onclick: (e) => e.target === fundo && fechar() },
    h(
      'div',
      { class: 'painel' },
      h('div', { class: 'cab' }, h('button', { class: 'btn icone fantasma', title: 'Fechar', onclick: fechar }, icone('voltar')), titulo),
      h(
        'div',
        { class: 'corpo' },
        d.erro_publicacao ? h('div', { class: 'aviso erro-pub' }, h('div', { class: 'texto' }, h('b', {}, 'A última tentativa de publicar falhou: '), d.erro_publicacao)) : null,
        h(
          'div',
          { class: 'status-atual' },
          h('span', { class: 'rotulo' }, h('span', { class: 'ponto', style: { background: corStatus(d.status) } }), nomeStatus(d.status), detalheStatus ? h('span', { class: 'muted pequeno', style: { fontWeight: 400 } }, '· ' + detalheStatus) : null),
          acoes,
          seletorStatus
        ),
        h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Formato', tipo), h('label', { class: 'campo' }, 'Prazo', prazo)),
        h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Responsável', resp), h('label', { class: 'campo' }, 'Pilar', pilar)),
        h('div', { class: 'secao' }, h('h4', {}, 'Briefing'), desc),
        caixaIaDemanda(d, { legenda, desc, salvar, contarLegenda, atualizarPrevia }),
        h('div', { class: 'secao' }, h('h4', {}, 'Arquivos', h('span', { class: 'muted', style: { textTransform: 'none', letterSpacing: 0, fontWeight: 400 } }, 'A ordem aqui é a ordem do carrossel')), gradeAnexos, barra, arquivo),
        h('div', { class: 'secao' }, h('h4', {}, 'Links'), listaLinks, h('div', { class: 'linha' }, novoLink, novoTitulo, h('button', { class: 'btn mini', onclick: addLink }, 'Adicionar'))),
        h('div', { class: 'secao' }, h('h4', {}, 'Legenda'), legenda, contador),
        h('div', { class: 'secao' }, h('h4', {}, 'Como fica no feed'), previa),
        h('div', { class: 'secao' }, h('h4', {}, 'Comentários'), listaCom, novoCom, h('div', { class: 'linha', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn mini primario', onclick: enviarCom }, 'Comentar'))),
        historico,
        h(
          'div',
          { class: 'linha', style: { justifyContent: 'flex-end' } },
          h(
            'button',
            {
              class: 'btn mini perigo',
              onclick: tentar(async () => {
                if (!(await confirmar('Excluir demanda', `Excluir “${d.titulo}”? Ela sai do quadro.`, 'Excluir', true))) return;
                await api(`/api/demandas/${id}`, { method: 'DELETE' });
                toast('Demanda excluída.');
                fechar();
              }),
            },
            'Excluir demanda'
          )
        )
      )
    )
  );
  document.body.append(fundo);
}

async function publicarAgora(d) {
  if (!(await confirmar('Publicar agora', `Publicar “${d.titulo}” no Instagram agora?`, 'Publicar'))) return;
  const r = await api(`/api/demandas/${d.id}/publicar-agora`, { method: 'POST' });
  toast(r.mensagem || 'Enviando…');
  setTimeout(() => abrirDemanda(d.id), 1500);
}

// Converte imagens para JPG (o Instagram só aceita JPG) e limita o tamanho.
async function prepararImagem(f) {
  if (!f.type.startsWith('image/') || f.type === 'image/gif') return f;
  const precisa = f.type !== 'image/jpeg' || f.size > 8 * 1024 * 1024;
  let bmp;
  try {
    bmp = await createImageBitmap(f);
  } catch {
    return f;
  }
  const max = 2160;
  if (!precisa && Math.max(bmp.width, bmp.height) <= max) return f;
  const esc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * esc);
  c.height = Math.round(bmp.height * esc);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

function subirArquivo(destino, f, progresso) {
  return new Promise((resolver, rejeitar) => {
    const x = new XMLHttpRequest();
    x.open('POST', destino);
    x.setRequestHeader('content-type', f.type || 'application/octet-stream');
    x.setRequestHeader('x-nome', encodeURIComponent(f.name));
    x.upload.onprogress = (e) => e.lengthComputable && progresso(e.loaded / e.total);
    x.onload = () => {
      let dados = {};
      try {
        dados = JSON.parse(x.responseText);
      } catch {}
      x.status < 300 ? resolver(dados) : rejeitar(new Error(dados.erro || `Erro ${x.status}`));
    };
    x.onerror = () => rejeitar(new Error('Falha de conexão.'));
    x.send(f);
  });
}

// ---------------- calendário ----------------
function abaCalendario(main) {
  const hoje = new Date();
  if (!estado.mesCal) estado.mesCal = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mes = estado.mesCal;
  const inicio = new Date(mes);
  inicio.setDate(1 - inicio.getDay());
  const eventos = {};
  const add = (dia, d, tipoEv) => (eventos[dia] = eventos[dia] || []).push({ d, tipoEv });
  for (const d of filtrar(estado.demandas)) {
    if (d.status === 'publicado' && d.publicado_em) add(new Date(d.publicado_em).toLocaleDateString('en-CA'), d, 'publicado');
    else if (d.status === 'agendado' && d.agendado_para) add(new Date(d.agendado_para).toLocaleDateString('en-CA'), d, 'agendado');
    else if (d.prazo) add(d.prazo, d, 'prazo');
  }
  const dias = [];
  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    const iso = dia.toLocaleDateString('en-CA');
    const evs = eventos[iso] || [];
    dias.push(
      h(
        'div',
        { class: `dia ${dia.getMonth() !== mes.getMonth() ? 'fora' : ''} ${iso === hojeISO() ? 'hoje' : ''}`, ondblclick: () => novaDemanda(iso) },
        h('span', { class: 'numero' }, dia.getDate()),
        evs.map(({ d, tipoEv }) =>
          h(
            'div',
            { class: 'ev', style: { borderLeftColor: corStatus(d.status), background: tipoEv === 'prazo' ? '' : `color-mix(in srgb, ${corStatus(d.status)} 22%, transparent)` }, title: `${d.titulo} · ${nomeStatus(d.status)}`, onclick: () => abrirDemanda(d.id) },
            (tipoEv === 'agendado' ? new Date(d.agendado_para).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' : '') + d.titulo
          )
        )
      )
    );
    if (i >= 34 && dia.getMonth() !== mes.getMonth() && dia.getDay() === 6) break;
  }
  const mover = (n) => {
    estado.mesCal = new Date(mes.getFullYear(), mes.getMonth() + n, 1);
    abaCalendario(main);
  };
  main.replaceChildren(
    h(
      'div',
      { class: 'ferramentas' },
      h('h2', { class: 'titulo' }, mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })),
      h('button', { class: 'btn mini', onclick: () => mover(-1) }, '‹'),
      h('button', { class: 'btn mini', onclick: () => ((estado.mesCal = null), abaCalendario(main)) }, 'Hoje'),
      h('button', { class: 'btn mini', onclick: () => mover(1) }, '›'),
      h('button', { class: 'btn primario mini', onclick: () => novaDemanda() }, icone('mais', 16), 'Nova')
    ),
    h('div', { class: 'legenda-cal' }, 'Mostra a data de publicação (agendados e publicados) ou o prazo (demais). Toque duas vezes num dia para criar uma demanda nele.'),
    h('div', { class: 'calendario' }, ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((s) => h('div', { class: 'dia-sem' }, s)), dias)
  );
}

// pilares vêm do cérebro do cliente (um por linha)
function pilaresDoCliente() {
  return String(estado.cliente?.cerebro?.pilares || '')
    .split('\n')
    .map((l) => l.replace(/^[-•*\d.)\s]+/, '').split(/[:·–—(]/)[0].trim())
    .filter(Boolean)
    .slice(0, 12);
}
function campoPilar(valor) {
  document.getElementById('lista-pilares')?.remove();
  document.body.append(h('datalist', { id: 'lista-pilares' }, pilaresDoCliente().map((p) => h('option', { value: p }))));
  return h('input', { class: 'entrada', list: 'lista-pilares', placeholder: 'Ex.: Autoridade', value: valor });
}

// ---------------- IA dentro da demanda ----------------
const MODO_POR_TIPO = { reels: 'roteiro', video: 'roteiro', carrossel: 'carrossel', story: 'stories', post: 'post', outro: 'post' };
const NOME_MODO_TIPO = { roteiro: 'Roteiro de Reels', carrossel: 'Copy do carrossel', stories: 'Sequência de stories', post: 'Texto da arte' };

function caixaIaDemanda(d, { legenda, desc, salvar, contarLegenda, atualizarPrevia }) {
  const saida = h('div');
  const modoConteudo = MODO_POR_TIPO[d.tipo] || 'post';
  const rodar = (modo) => async () => {
    if (!estado.meta.ia_configurada) throw new Error('A IA ainda não está configurada (falta a chave ANTHROPIC_API_KEY no Cloudflare).');
    saida.replaceChildren(h('div', { class: 'pensando' }, h('span', { class: 'gira' }), 'A IA está escrevendo no estilo do cliente…'));
    let r;
    try {
      r = await api('/api/ia', { json: { cliente_id: estado.cliente.id, modo, demanda_id: d.id, pedido: pedido.value } });
    } catch (e) {
      saida.replaceChildren();
      throw e;
    }
    const usarLegenda = () => {
      const texto = modo === 'hashtags' ? `${legenda.value.trim()}\n\n${(r.texto.match(/Para colar:\s*(.+)$/im)?.[1] || r.texto).trim()}` : r.texto;
      legenda.value = texto.trim();
      contarLegenda(legenda.value);
      salvar('legenda', legenda.value);
      atualizarPrevia();
      toast('Legenda atualizada.');
    };
    const usarBriefing = () => {
      desc.value = `${desc.value.trim() ? desc.value.trim() + '\n\n' : ''}${r.texto}`;
      salvar('descricao', desc.value);
      toast('Adicionado ao briefing.');
    };
    saida.replaceChildren(
      h(
        'div',
        { class: 'resultado-ia', style: { padding: '14px' } },
        md(r.texto),
        h(
          'div',
          { class: 'acoes-r' },
          modo === 'legenda' || modo === 'hashtags' ? h('button', { class: 'btn mini primario', onclick: usarLegenda }, modo === 'legenda' ? 'Usar como legenda' : 'Juntar à legenda') : h('button', { class: 'btn mini primario', onclick: usarBriefing }, 'Colocar no briefing'),
          h('button', { class: 'btn mini', onclick: () => copiar(r.texto) }, 'Copiar'),
          h('button', { class: 'btn mini fantasma', onclick: () => saida.replaceChildren() }, 'Descartar')
        )
      )
    );
  };
  const pedido = h('input', { class: 'entrada', placeholder: 'Opcional: orientação extra para a IA (ex.: mais curto, falar da promoção de sexta)' });
  return h(
    'div',
    { class: 'ia-caixa' },
    h('div', { class: 'linha', style: { justifyContent: 'space-between' } }, h('b', {}, '✨ IA da Flamme'), h('span', { class: 'muted pequeno' }, 'usa o cérebro do cliente e a estratégia do mês')),
    pedido,
    h('div', { class: 'botoes-ia' }, botaoAcao(NOME_MODO_TIPO[modoConteudo], rodar(modoConteudo), 'mini'), botaoAcao('Legenda', rodar('legenda'), 'mini'), botaoAcao('Hashtags', rodar('hashtags'), 'mini')),
    saida
  );
}

// ---------------- aprovação ----------------
async function abaAprovacao(main) {
  const c = estado.cliente;
  const links = await api(`/api/aprovacoes?cliente=${c.id}`);
  const pendentes = estado.demandas.filter((d) => ['aprovacao', 'ajustes', 'producao'].includes(d.status));
  const marcados = new Set(estado.demandas.filter((d) => d.status === 'aprovacao').map((d) => d.id));
  const contador = h('span', { class: 'muted pequeno' });
  const atualizarContador = () => (contador.textContent = `${marcados.size} selecionado(s)`);
  atualizarContador();
  const linhaDemanda = (d) =>
    h(
      'label',
      {},
      h('input', { type: 'checkbox', checked: marcados.has(d.id), onchange: (e) => (e.target.checked ? marcados.add(d.id) : marcados.delete(d.id), atualizarContador()) }),
      h('span', { class: 'mini' }, midiaEl(d.capa, d.capa_mime)),
      h('span', {}, h('b', {}, d.titulo), h('div', { class: 'muted pequeno' }, `${NOMES_TIPO[d.tipo]}${d.agendado_para ? ` · ${dataBR(d.agendado_para, true)}` : d.prazo ? ` · prazo ${dataBR(d.prazo)}` : ''}${d.n_anexos ? '' : ' · sem arquivo'}`)),
      h('span', { class: 'chip' }, h('span', { class: 'ponto', style: { background: corStatus(d.status) } }), nomeStatus(d.status))
    );
  const estadoLink = (a) => {
    if (!a.ativo) return h('span', { class: 'selo' }, 'Desativado');
    if (a.expira_em < Date.now()) return h('span', { class: 'selo' }, 'Expirado');
    if (a.respondido_em) return h('span', { class: 'selo ok' }, `Respondido ${dataBR(a.respondido_em, true)}`);
    if (a.visto_em) return h('span', { class: 'selo fase' }, `Visto ${dataBR(a.visto_em, true)}`);
    return h('span', { class: 'selo' }, 'Ainda não aberto');
  };
  main.replaceChildren(
    h('div', { class: 'ferramentas' }, h('h2', { class: 'titulo' }, 'Aprovação')),
    h(
      'div',
      { class: 'colunas' },
      h(
        'div',
        { class: 'bloco' },
        h('h3', {}, 'Mandar para o cliente aprovar'),
        h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Escolha os posts e gere um link. O cliente abre no celular, sem login, vê as artes e a legenda e aprova ou pede ajuste em cada um. Você recebe o aviso na hora.'),
        pendentes.length ? h('div', { class: 'selecao' }, pendentes.map(linhaDemanda)) : h('span', { class: 'vazio' }, 'Nenhuma demanda em produção ou aprovação.'),
        h('div', { class: 'linha' }, contador, h('button', { class: 'btn primario', style: { marginLeft: 'auto' }, onclick: () => (marcados.size ? dialogoLinkAprovacao([...marcados]) : toast('Selecione pelo menos um post.')) }, icone('link', 16), 'Gerar link de aprovação'))
      ),
      h(
        'div',
        { class: 'bloco' },
        h('h3', {}, 'Links enviados'),
        links.length
          ? h(
              'table',
              { class: 'tabela' },
              links.map((a) =>
                h(
                  'tr',
                  {},
                  h('td', {}, h('b', {}, a.titulo), h('div', { class: 'muted pequeno' }, `${a.demanda_ids.length} post(s) · criado ${dataBR(a.criado_em, true)}`)),
                  h('td', {}, estadoLink(a)),
                  h(
                    'td',
                    { style: { textAlign: 'right' } },
                    a.ativo && a.expira_em > Date.now()
                      ? h(
                          'button',
                          {
                            class: 'btn mini fantasma',
                            onclick: tentar(async () => {
                              if (!(await confirmar('Desativar link', 'O cliente não vai mais conseguir abrir este link.', 'Desativar', true))) return;
                              await api(`/api/aprovacoes/${a.id}`, { method: 'DELETE' });
                              desenharAba();
                            }),
                          },
                          'Desativar'
                        )
                      : null
                  )
                )
              )
            )
          : h('span', { class: 'vazio' }, 'Nenhum link criado ainda.'),
        h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Por segurança o link completo só aparece na hora em que é criado. Se perder, gere outro.')
      )
    )
  );
}

function dialogoLinkAprovacao(ids) {
  const c = estado.cliente;
  const titulo = h('input', { class: 'entrada', value: `Conteúdos · ${c.nome}` });
  const mensagem = h('textarea', { class: 'entrada', style: { minHeight: '70px' }, placeholder: 'Opcional: recado para o cliente (aparece no topo da página)' });
  const dias = h('select', { class: 'entrada' }, [3, 7, 15, 30].map((n) => h('option', { value: n, selected: n === 7 }, `${n} dias`)));
  const f = dialogo([
    h('h3', { class: 'titulo' }, 'Link de aprovação'),
    h('p', { class: 'muted pequeno', style: { margin: 0 } }, `${ids.length} post(s). Os que ainda estão em produção vão para “Em aprovação”.`),
    h('label', { class: 'campo' }, 'Título', titulo),
    h('label', { class: 'campo' }, 'Recado', mensagem),
    h('label', { class: 'campo' }, 'Validade', dias),
    h(
      'div',
      { class: 'botoes' },
      h('button', { class: 'btn', onclick: () => f.remove() }, 'Cancelar'),
      botaoAcao(
        'Gerar link',
        async () => {
          const r = await api('/api/aprovacoes', { json: { cliente_id: c.id, demanda_ids: ids, titulo: titulo.value, mensagem: mensagem.value, dias: Number(dias.value) } });
          const texto = `Oi! Os conteúdos estão prontos para a sua aprovação 👇\n${r.url}`;
          f.querySelector('.dialogo').replaceChildren(
            h('h3', { class: 'titulo' }, 'Link pronto ✅'),
            h('div', { class: 'link-gerado' }, h('div', { class: 'url' }, r.url), h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Envie para o cliente. Guarde: este link completo só aparece agora.')),
            h(
              'div',
              { class: 'botoes' },
              h('a', { class: 'btn', href: `https://wa.me/?text=${encodeURIComponent(texto)}`, target: '_blank', rel: 'noopener' }, 'Enviar no WhatsApp'),
              h('button', { class: 'btn', onclick: () => copiar(r.url, 'Link copiado.') }, 'Copiar link'),
              h('button', { class: 'btn primario', onclick: async () => (f.remove(), await carregarDemandas(), desenharAba()) }, 'Pronto')
            )
          );
        },
        'primario'
      )
    ),
  ]);
}

// ---------------- página pública de aprovação (cliente, sem login) ----------------
async function telaAprovacaoPublica(token) {
  document.title = 'Aprovação de conteúdo · Flamme';
  $app.replaceChildren(h('div', { class: 'carregando' }, 'Carregando…'));
  let dados;
  try {
    dados = await api(`/api/publico/aprovacao/${encodeURIComponent(token)}`);
  } catch (e) {
    return $app.replaceChildren(h('div', { class: 'aprovar' }, h('img', { src: '/marca/flamme-logo-terracota.png', alt: 'Flamme', style: { width: '130px', margin: '30px auto 10px' } }), h('p', { style: { textAlign: 'center' } }, e.message)));
  }
  const cl = dados.cliente;
  document.documentElement.style.setProperty('--accent', cl.cor || '#922f11');
  let nomeSalvo = '';
  try {
    nomeSalvo = localStorage.getItem('aprovador-nome') || '';
  } catch {}
  const nome = h('input', { class: 'entrada', placeholder: 'Seu nome (aparece para a equipe)', value: nomeSalvo, oninput: (e) => { try { localStorage.setItem('aprovador-nome', e.target.value); } catch {} } });
  const pendentes = () => dados.itens.filter((d) => ['aprovacao', 'ajustes', 'producao', 'briefing'].includes(d.status)).length;
  const resumoTopo = h('div', { class: 'muted pequeno' });
  const atualizarResumo = () => {
    const n = pendentes();
    resumoTopo.textContent = n ? `${n} de ${dados.itens.length} esperando sua resposta` : 'Tudo respondido. Obrigado! 🧡';
  };

  const cartao = (d) => {
    const el = h('article', { class: 'post-aprov' });
    const desenhar = () => {
      const midias = d.anexos.filter((a) => a.mime.startsWith('image/') || ehVideo(a.mime));
      const outros = d.anexos.filter((a) => !(a.mime.startsWith('image/') || ehVideo(a.mime)));
      const quando = d.agendado_para ? `Publicação ${dataBR(d.agendado_para, true)}` : d.prazo ? `Previsto ${dataBR(d.prazo)}` : '';
      let rodape;
      if (d.status === 'aprovado' || d.status === 'agendado' || d.status === 'publicado') rodape = h('div', { class: 'feito ok' }, '✓ Aprovado', d.aprovado_cliente ? ` por ${d.aprovado_cliente}` : '');
      else if (d.status === 'ajustes' && d._respondido) rodape = h('div', { class: 'feito aj' }, '✎ Ajuste pedido. A equipe já foi avisada.');
      else {
        const coment = h('textarea', { class: 'entrada', style: { minHeight: '64px' }, placeholder: 'Comentário (obrigatório para pedir ajuste)' });
        const responder = (acao) => async () => {
          if (acao === 'ajustes' && !coment.value.trim()) {
            coment.focus();
            throw new Error('Conte o que precisa mudar.');
          }
          const r = await api(`/api/publico/aprovacao/${encodeURIComponent(token)}/${d.id}`, { json: { acao, comentario: coment.value, nome: nome.value } });
          d.status = r.status;
          d._respondido = true;
          if (acao === 'aprovar') d.aprovado_cliente = nome.value.trim() || null;
          desenhar();
          atualizarResumo();
        };
        rodape = h('div', { class: 'resp' }, coment, h('div', { class: 'botoes' }, botaoAcao('Pedir ajuste', responder('ajustes')), botaoAcao('Aprovar ✓', responder('aprovar'), 'primario')));
      }
      const caixaMidias = h('div', { class: 'midias' }, midias.map((a) => midiaEl(a.chave, a.mime, ehVideo(a.mime) ? { controls: true, preload: 'metadata' } : {})));
      el.replaceChildren(
        h('div', { class: 'topo-p' }, h('b', {}, d.titulo), h('span', { class: 'chip' }, NOMES_TIPO[d.tipo] || d.tipo), quando ? h('span', { class: 'muted pequeno' }, quando) : null),
        midias.length ? caixaMidias : h('div', { class: 'leg muted' }, 'Arte ainda não anexada.'),
        midias.length > 1 ? h('div', { class: 'contagem' }, `${midias.length} itens · deslize para o lado →`) : null,
        outros.length ? h('div', { class: 'leg' }, outros.map((a) => h('a', { href: urlMidia(a.chave), target: '_blank', rel: 'noopener', style: { display: 'block' } }, '📎 ', a.nome))) : null,
        d.legenda ? h('div', { class: 'leg' }, h('b', {}, cl.instagram ? `${cl.instagram} ` : ''), d.legenda) : null,
        rodape
      );
    };
    desenhar();
    return el;
  };

  atualizarResumo();
  $app.replaceChildren(
    h(
      'div',
      { class: 'aprovar' },
      h('div', { class: 'cab-a' }, avatarCliente({ nome: cl.nome, cor: cl.cor, logo_chave: cl.logo_chave, foto: cl.foto }, 'g'), h('div', {}, h('small', {}, `${cl.nome} · aprovação de conteúdo`), h('h1', { class: 'titulo' }, dados.titulo), resumoTopo)),
      dados.mensagem ? h('div', { class: 'aviso destaque', style: { margin: 0 } }, h('div', { class: 'texto', style: { whiteSpace: 'pre-wrap' } }, dados.mensagem)) : null,
      h('label', { class: 'campo' }, 'Quem está aprovando?', nome),
      dados.itens.length ? dados.itens.map(cartao) : h('p', { class: 'muted' }, 'Nenhum post neste link.'),
      h('div', { class: 'rodape-aprov' }, h('span', {}, `Link válido até ${new Date(dados.expira_em).toLocaleDateString('pt-BR')}`), h('img', { src: '/marca/flamme-logo-terracota.png', alt: 'Flamme' }))
    )
  );
}

// ---------------- estúdio IA ----------------
const MODOS_ESTUDIO = [
  ['temas', '🔎 Temas em alta', 'Pesquisa na web o que está em alta no nicho, usando as fontes do cliente, e traz pautas prontas.', 'Ex.: foco em datas comemorativas de dezembro'],
  ['roteiro', '🎬 Roteiro de Reels', 'Gancho, cenas, texto na tela, edição e legenda no formato do cliente.', 'Ex.: Reels sobre os 3 erros mais comuns ao contratar uma agência'],
  ['carrossel', '🗂️ Carrossel', 'Copy slide a slide no estilo de carrossel do cliente, com legenda.', 'Ex.: carrossel com a notícia X explicada para o público do cliente'],
  ['legenda', '✍️ Legenda', 'Legenda pronta para colar, com CTA e hashtags.', 'Ex.: post de bastidores da gravação de ontem'],
  ['post', '🖼️ Post estático', 'Texto da arte, sugestão visual e legenda.', 'Ex.: anúncio da promoção de Black Friday'],
  ['stories', '📱 Stories', 'Sequência de 3 a 7 stories com interações.', 'Ex.: sequência de enquete para aquecer o lançamento'],
  ['hashtags', '#️⃣ Hashtags', 'Seleção por grupo (amplas, nicho, locais, marca).', 'Ex.: post sobre marketing para restaurantes'],
  ['insights', '📈 Insights', 'Lê os números do Instagram e a estratégia e diz o que fazer nas próximas 2 semanas.', 'Opcional: alguma pergunta específica sobre os números'],
  ['livre', '💬 Pedido livre', 'Qualquer outro pedido, já com o contexto do cliente.', 'Ex.: 10 ideias de bio para o perfil'],
];

async function abaIa(main) {
  const c = estado.cliente;
  if (!estado.modoIa) estado.modoIa = 'temas';
  const historico = await api(`/api/ia?cliente=${c.id}`).catch(() => []);
  const cerebro = c.cerebro || {};
  const preenchidos = estado.meta.cerebro.filter((x) => String(cerebro[x.id] || '').trim()).length;
  const totalCampos = estado.meta.cerebro.length;
  const pedido = h('textarea', { class: 'entrada', style: { minHeight: '96px' } });
  const descModo = h('p', { class: 'muted pequeno', style: { margin: 0 } });
  const saida = h('div');
  const listaHist = h('div', { class: 'historico-ia' });
  const botoesModo = h('div', { class: 'modos' });

  const desenharModos = () => {
    const m = MODOS_ESTUDIO.find((x) => x[0] === estado.modoIa);
    descModo.textContent = m[2];
    pedido.placeholder = m[3];
    botoesModo.replaceChildren(...MODOS_ESTUDIO.map(([id, nome]) => h('button', { class: `modo ${estado.modoIa === id ? 'ativo' : ''}`, onclick: () => ((estado.modoIa = id), desenharModos()) }, nome)));
  };

  const mostrar = (g) => {
    const temas = g.modo === 'temas' && Array.isArray(g.dados) ? g.dados : null;
    const tipoSugerido = { roteiro: 'reels', carrossel: 'carrossel', post: 'post', stories: 'story', legenda: 'post' }[g.modo];
    saida.replaceChildren(
      h(
        'div',
        { class: 'resultado-ia' },
        h('div', { class: 'linha', style: { justifyContent: 'space-between' } }, h('b', {}, MODOS_ESTUDIO.find((x) => x[0] === g.modo)?.[1] || g.modo), h('span', { class: 'muted pequeno' }, dataBR(g.criado_em || new Date().toISOString(), true))),
        g.pedido ? h('div', { class: 'muted pequeno' }, '“', g.pedido, '”') : null,
        temas
          ? h(
              'div',
              { class: 'temas' },
              temas.map((t) =>
                h(
                  'div',
                  { class: 'tema' },
                  h('span', { class: 'chip pilar', style: { justifySelf: 'start' } }, NOMES_TIPO[t.formato] || t.formato || 'Conteúdo'),
                  h('b', {}, t.titulo),
                  t.gancho ? h('span', { class: 'gancho' }, '“', t.gancho, '”') : null,
                  h('span', { class: 'pequeno' }, t.resumo),
                  t.por_que_agora ? h('small', {}, '⏱ ', t.por_que_agora) : null,
                  /^https?:\/\//.test(t.fonte || '') ? h('a', { class: 'pequeno', href: t.fonte, target: '_blank', rel: 'noopener', style: { color: 'var(--accent)', overflowWrap: 'anywhere' } }, 'Fonte ↗') : null,
                  h(
                    'button',
                    {
                      class: 'btn mini suave',
                      onclick: async () => {
                        if (!estado.demandas.length) await carregarDemandas().catch(() => {});
                        novaDemanda('', {
                          titulo: t.titulo,
                          tipo: ['reels', 'carrossel', 'post', 'story'].includes(t.formato) ? t.formato : 'post',
                          descricao: [t.gancho && `Gancho: ${t.gancho}`, t.resumo, t.por_que_agora && `Por que agora: ${t.por_que_agora}`, t.fonte && `Fonte: ${t.fonte}`].filter(Boolean).join('\n\n'),
                        });
                      },
                    },
                    icone('mais', 14),
                    'Virar demanda'
                  )
                )
              )
            )
          : md(g.resposta),
        h(
          'div',
          { class: 'acoes-r' },
          h('button', { class: 'btn mini', onclick: () => copiar(g.resposta) }, 'Copiar'),
          tipoSugerido
            ? h(
                'button',
                {
                  class: 'btn mini primario',
                  onclick: async () => {
                    if (!estado.demandas.length) await carregarDemandas().catch(() => {});
                    novaDemanda('', { titulo: (g.pedido || MODOS_ESTUDIO.find((x) => x[0] === g.modo)[1].replace(/^\S+\s/, '')).slice(0, 120), tipo: tipoSugerido, descricao: g.resposta });
                  },
                },
                icone('mais', 14),
                'Criar demanda com isto'
              )
            : null
        )
      )
    );
  };

  const desenharHistorico = () =>
    listaHist.replaceChildren(
      ...(historico.length
        ? historico.map((g) =>
            h(
              'button',
              { onclick: (e) => (listaHist.querySelectorAll('button').forEach((b) => b.classList.remove('ativo')), e.currentTarget.classList.add('ativo'), mostrar(g)) },
              h('span', {}, MODOS_ESTUDIO.find((x) => x[0] === g.modo)?.[1] || (g.modo === 'estrategia' ? '🎯 Resumo da estratégia' : g.modo)),
              h('small', {}, `${dataBR(g.criado_em, true)}${g.pedido ? ` · ${g.pedido.slice(0, 60)}` : ''}`)
            )
          )
        : [h('span', { class: 'vazio pequeno' }, 'O que a IA gerar fica guardado aqui.')])
    );

  const gerar = async () => {
    if (!estado.meta.ia_configurada) throw new Error('A IA ainda não está configurada (falta a chave ANTHROPIC_API_KEY no Cloudflare).');
    saida.replaceChildren(h('div', { class: 'resultado-ia' }, h('div', { class: 'pensando' }, h('span', { class: 'gira' }), estado.modoIa === 'temas' ? 'Pesquisando na web o que está em alta… (pode levar 1 a 2 minutos)' : 'Escrevendo no estilo do cliente…')));
    try {
      const r = await api('/api/ia', { json: { cliente_id: c.id, modo: estado.modoIa, pedido: pedido.value } });
      const g = { id: r.id, modo: estado.modoIa, pedido: pedido.value, resposta: r.texto, dados: r.dados, criado_em: new Date().toISOString() };
      historico.unshift(g);
      desenharHistorico();
      mostrar(g);
    } catch (e) {
      saida.replaceChildren();
      throw e;
    }
  };

  desenharModos();
  desenharHistorico();
  main.replaceChildren(
    h('div', { class: 'ferramentas' }, h('h2', { class: 'titulo' }, 'Estúdio IA')),
    !estado.meta.ia_configurada
      ? h('div', { class: 'aviso erro-pub' }, h('div', { class: 'texto' }, h('b', {}, 'A IA ainda não está ligada. '), 'Coloque a chave da API do Claude como segredo ', h('span', { class: 'codigo' }, 'ANTHROPIC_API_KEY'), ' no Worker do Cloudflare (veja o README).'))
      : null,
    h(
      'div',
      { class: 'estudio' },
      h(
        'div',
        { style: { display: 'grid', gap: '14px', minWidth: 0 } },
        h('div', { class: 'bloco' }, botoesModo, descModo, pedido, h('div', { class: 'linha' }, h('span', { class: 'muted pequeno' }, c.estrategia ? `Usando a estratégia de ${nomeMes(c.estrategia.mes)}` : 'Sem estratégia cadastrada'), h('span', { style: { marginLeft: 'auto' } }, botaoAcao('✨ Gerar', gerar, 'primario')))),
        saida
      ),
      h(
        'div',
        { style: { display: 'grid', gap: '14px' } },
        h(
          'div',
          { class: 'bloco' },
          h('h3', {}, 'Cérebro do cliente'),
          h('div', { class: 'medidor' }, h('span', { style: { width: `${(preenchidos / totalCampos) * 100}%` } })),
          h('span', { class: 'muted pequeno' }, `${preenchidos} de ${totalCampos} campos preenchidos. Quanto mais completo, mais a IA escreve igual à Flamme escreveria para ${c.nome}.`),
          h('button', { class: 'btn mini', onclick: () => trocarAba('cliente') }, 'Alimentar o cérebro')
        ),
        h('div', { class: 'bloco' }, h('h3', {}, 'Histórico'), listaHist)
      )
    )
  );
}

// ---------------- gráficos (SVG simples, uma série, com dica ao passar o dedo/mouse) ----------------
function graficoSerie(pontos, { tipo = 'linha', formato = numero, rotulo = '' } = {}) {
  const L = 640;
  const A = 220;
  const m = { t: 12, r: 12, b: 26, l: 46 };
  const w = L - m.l - m.r;
  const hh = A - m.t - m.b;
  const valores = pontos.map((p) => p.valor ?? 0);
  let min = tipo === 'barra' ? 0 : Math.min(...valores);
  let max = Math.max(...valores, 1);
  if (tipo === 'linha') {
    const folga = Math.max((max - min) * 0.15, 1);
    min = Math.max(0, min - folga);
    max = max + folga;
  }
  const y = (v) => m.t + hh - ((v - min) / (max - min || 1)) * hh;
  const passo = pontos.length > 1 ? w / (pontos.length - 1) : 0;
  const larguraBarra = Math.max(2, w / pontos.length - 2);
  const x = (i) => (tipo === 'barra' ? m.l + (w / pontos.length) * i + (w / pontos.length - larguraBarra) / 2 : m.l + passo * i);
  const svg = h('svg', { viewBox: `0 0 ${L} ${A}`, role: 'img', 'aria-label': rotulo });
  // grade e eixo y (3 linhas)
  for (let k = 0; k <= 2; k++) {
    const v = min + ((max - min) * k) / 2;
    svg.append(h('line', { class: 'grade-g', x1: m.l, x2: L - m.r, y1: y(v), y2: y(v) }), h('text', { class: 'eixo', x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, formato(Math.round(v))));
  }
  // eixo x: início, meio e fim
  [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1].filter((i, j, arr) => i >= 0 && arr.indexOf(i) === j).forEach((i) => {
    svg.append(h('text', { class: 'eixo', x: x(i) + (tipo === 'barra' ? larguraBarra / 2 : 0), y: A - 6, 'text-anchor': i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle' }, dataBR(pontos[i].dia)));
  });
  if (tipo === 'barra') {
    pontos.forEach((p, i) => {
      const alt = Math.max(0, m.t + hh - y(p.valor ?? 0));
      const r = Math.min(4, larguraBarra / 2, alt);
      const x0 = x(i);
      const y0 = m.t + hh - alt;
      // barra com topo arredondado (4px) e base reta
      svg.append(h('path', { class: 'barra-s', d: `M${x0},${m.t + hh}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + larguraBarra - r}Q${x0 + larguraBarra},${y0} ${x0 + larguraBarra},${y0 + r}V${m.t + hh}Z` }));
    });
  } else {
    const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.valor ?? 0)}`).join('');
    svg.append(h('path', { class: 'area-s', d: `${d}L${x(pontos.length - 1)},${m.t + hh}L${x(0)},${m.t + hh}Z` }), h('path', { class: 'linha-s', d }));
  }
  // camada de hover
  const cruz = h('line', { class: 'cruz', y1: m.t, y2: m.t + hh, style: { display: 'none' } });
  const marca = h('circle', { class: 'ponto-h', r: 5, style: { display: 'none' } });
  svg.append(cruz, marca);
  const caixa = h('div', { class: 'grafico' }, svg);
  const dica = h('div', { class: 'dica-g', style: { display: 'none' } });
  caixa.append(dica);
  const alvo = h('rect', { class: 'alvo-h', x: m.l, y: m.t, width: w, height: hh });
  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * L;
    const i = Math.max(0, Math.min(pontos.length - 1, tipo === 'barra' ? Math.floor((px - m.l) / (w / pontos.length)) : Math.round((px - m.l) / (passo || 1))));
    const p = pontos[i];
    const cx = x(i) + (tipo === 'barra' ? larguraBarra / 2 : 0);
    cruz.setAttribute('x1', cx);
    cruz.setAttribute('x2', cx);
    cruz.style.display = '';
    if (tipo === 'linha') {
      marca.setAttribute('cx', cx);
      marca.setAttribute('cy', y(p.valor ?? 0));
      marca.style.display = '';
    }
    dica.replaceChildren(h('b', {}, formato(p.valor)), ` · ${dataBR(p.dia)}`);
    dica.style.display = '';
    dica.style.left = `${(cx / L) * r.width}px`;
    dica.style.top = `${(y(p.valor ?? 0) / A) * r.height}px`;
  };
  const sair = () => {
    cruz.style.display = marca.style.display = dica.style.display = 'none';
  };
  alvo.addEventListener('pointermove', mover);
  alvo.addEventListener('pointerdown', mover);
  alvo.addEventListener('pointerleave', sair);
  svg.append(alvo);
  return caixa;
}

function barrasHorizontais(itens, formato = numero) {
  const max = Math.max(...itens.map((i) => i.valor || 0), 1);
  return h(
    'div',
    { class: 'barras-h' },
    itens.map((i) => h('div', { class: 'lin', title: `${i.nome}: ${formato(i.valor)} (${i.n} posts)` }, h('span', {}, i.nome), h('div', { class: 'trilho' }, h('span', { style: { width: `${((i.valor || 0) / max) * 100}%` } })), h('b', {}, formato(i.valor))))
  );
}

// ---------------- painel (Instagram) ----------------
async function abaPainel(main) {
  const c = estado.cliente;
  const [p, ig] = await Promise.all([api(`/api/instagram/${c.id}/painel`), estado.ig ? estado.ig : api(`/api/instagram/${c.id}`)]);
  estado.ig = ig;
  if (!p.conectado) {
    return main.replaceChildren(
      h('div', { class: 'ferramentas' }, h('h2', { class: 'titulo' }, 'Painel')),
      h('div', { class: 'bloco' }, h('h3', {}, 'Conecte o Instagram de ' + c.nome), h('p', { class: 'muted', style: { margin: 0 } }, 'O painel mostra seguidores, alcance, interações, os melhores posts e o que funciona melhor em cada formato. Também libera o agendamento automático.'), h('button', { class: 'btn primario', style: { justifySelf: 'start' }, onclick: () => trocarAba('cliente') }, 'Conectar agora')),
      blocoOutrasRedes()
    );
  }
  if (!estado.demandas.length) await carregarDemandas().catch(() => {});
  const t = p.totais || {};
  const hist = (p.seguidores_por_dia || []).map((x) => ({ dia: x.dia, valor: x.seguidores }));
  const atual = hist.at(-1)?.valor ?? ig.perfil?.followers_count;
  const base30 = hist.find((x) => x.dia >= new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA'));
  const delta = hist.length > 1 && base30 ? atual - base30.valor : null;
  const engaj = atual && t.accounts_engaged != null ? (t.accounts_engaged / atual) * 100 : null;
  const kpi = (rot, valor, sub, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'rot' }, rot), h('span', { class: 'valor' }, valor), sub ? h('span', { class: `delta ${cls}` }, sub) : null);

  // formatos
  const porTipo = {};
  for (const post of p.posts || []) {
    if (post.alcance == null) continue;
    const k = post.tipo === 'video' ? 'reels' : post.tipo;
    (porTipo[k] ||= { soma: 0, n: 0, salvos: 0 }).soma += post.alcance;
    porTipo[k].n++;
    porTipo[k].salvos += post.salvos || 0;
  }
  const formatos = Object.entries(porTipo)
    .map(([k, v]) => ({ nome: NOMES_TIPO[k] || k, valor: Math.round(v.soma / v.n), n: v.n }))
    .sort((a, b) => b.valor - a.valor);

  // tabela de posts (ordenável)
  let ordem = 'alcance';
  const colunas = [
    ['alcance', 'Alcance'],
    ['interacoes', 'Interações'],
    ['curtidas', 'Curtidas'],
    ['comentarios', 'Coment.'],
    ['salvos', 'Salvos'],
    ['compartilhamentos', 'Compart.'],
  ];
  const tabela = h('table', { class: 'tabela-posts' });
  const thumbs = Object.fromEntries((ig.midias || []).map((m) => [m.id, m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url || m.children?.data?.[0]?.media_url]));
  const desenharTabela = () => {
    const linhas = [...(p.posts || [])].sort((a, b) => (b[ordem] ?? -1) - (a[ordem] ?? -1));
    tabela.replaceChildren(
      h('tr', {}, h('th', {}, 'Post'), colunas.map(([k, n]) => h('th', { class: ordem === k ? 'ativa' : '', onclick: () => ((ordem = k), desenharTabela()) }, n, ordem === k ? ' ↓' : ''))),
      ...linhas.map((post) =>
        h(
          'tr',
          {},
          h('td', {}, h('a', { class: 'post', href: post.permalink, target: '_blank', rel: 'noopener' }, h('img', { src: thumbs[post.id] || '', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }), h('span', {}, h('b', {}, `${NOMES_TIPO[post.tipo] || post.tipo} · ${dataBR(post.timestamp)} `), post.legenda || ''))),
          colunas.map(([k]) => h('td', {}, numero(post[k])))
        )
      )
    );
  };
  desenharTabela();

  const saidaIa = h('div');
  const atualizado = p.gerado_em ? new Date(p.gerado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  main.replaceChildren(
    h(
      'div',
      { class: 'ferramentas' },
      h('h2', { class: 'titulo' }, 'Painel · Instagram'),
      h('span', { class: 'muted pequeno' }, `@${ig.username} · últimos 30 dias · atualizado ${atualizado}`),
      botaoAcao('Atualizar números', async () => {
        await api(`/api/instagram/${c.id}/painel?atualizar=1`);
        await api(`/api/instagram/${c.id}/sincronizar`, { method: 'POST' }).catch(() => {});
        estado.ig = null;
        toast('Números atualizados.');
        desenharAba();
      }, 'mini'),
      botaoAcao('✨ Insights com IA', async () => {
        saidaIa.replaceChildren(h('div', { class: 'resultado-ia' }, h('div', { class: 'pensando' }, h('span', { class: 'gira' }), 'Analisando os números…')));
        try {
          const r = await api('/api/ia', { json: { cliente_id: c.id, modo: 'insights' } });
          saidaIa.replaceChildren(h('div', { class: 'resultado-ia' }, h('b', {}, '📈 Insights da IA'), md(r.texto), h('div', { class: 'acoes-r' }, h('button', { class: 'btn mini', onclick: () => copiar(r.texto) }, 'Copiar'))));
          saidaIa.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          saidaIa.replaceChildren();
          throw e;
        }
      }, 'mini primario')
    ),
    ig.erro ? h('div', { class: 'aviso erro-pub' }, h('div', { class: 'texto' }, 'Última atualização falhou: ', ig.erro)) : null,
    h(
      'div',
      { class: 'visao' },
      saidaIa,
      h(
        'div',
        { class: 'kpis' },
        kpi('Seguidores', numero(atual), delta == null ? 'histórico começa hoje' : `${delta >= 0 ? '+' : ''}${numero(delta)} em 30 dias`, delta > 0 ? 'sobe' : delta < 0 ? 'desce' : ''),
        kpi('Alcance', numero(t.reach), 'contas alcançadas'),
        kpi('Visualizações', numero(t.views)),
        kpi('Interações', numero(t.total_interactions)),
        kpi('Contas engajadas', numero(t.accounts_engaged), engaj == null ? null : `${engaj.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos seguidores`),
        kpi('Novos seguidores', numero(t.novos_seguidores), t.deixaram_de_seguir != null ? `${numero(t.deixaram_de_seguir)} deixaram de seguir` : null),
        kpi('Cliques no link', numero(t.profile_links_taps))
      ),
      h(
        'div',
        { class: 'colunas' },
        h('div', { class: 'bloco' }, h('h3', {}, 'Seguidores'), hist.length > 1 ? graficoSerie(hist, { tipo: 'linha', rotulo: 'Seguidores por dia' }) : h('span', { class: 'vazio' }, 'O histórico de seguidores começa a contar a partir de hoje: a plataforma guarda o número todo dia.')),
        h('div', { class: 'bloco' }, h('h3', {}, 'Alcance por dia'), (p.alcance_diario || []).length ? graficoSerie(p.alcance_diario, { tipo: 'barra', rotulo: 'Alcance por dia' }) : h('span', { class: 'vazio' }, 'O Instagram ainda não devolveu o alcance diário desta conta.'))
      ),
      h(
        'div',
        { class: 'colunas' },
        h('div', { class: 'bloco' }, h('h3', {}, 'Alcance médio por formato'), formatos.length ? barrasHorizontais(formatos) : h('span', { class: 'vazio' }, 'Sem dados de alcance dos posts ainda.'), h('span', { class: 'muted pequeno' }, 'Considera os 12 posts mais recentes.')),
        h('div', { class: 'bloco' }, h('h3', {}, 'Feed + planejados'), gradeFeed(ig))
      ),
      h('div', { class: 'bloco' }, h('h3', {}, 'Posts recentes'), h('div', { class: 'rolagem-x' }, tabela)),
      blocoOutrasRedes()
    )
  );
}

function gradeFeed(ig) {
  const planejados = estado.demandas
    .filter((d) => ['aprovacao', 'aprovado', 'agendado'].includes(d.status) && d.capa && d.tipo !== 'story')
    .sort((a, b) => (b.agendado_para || b.prazo || '').localeCompare(a.agendado_para || a.prazo || ''));
  const tipoIcone = (m) => (m.media_type === 'CAROUSEL_ALBUM' ? icone('carrossel', 18) : m.media_type === 'VIDEO' ? icone('video', 18) : null);
  return h(
    'div',
    { class: 'ig-grade' },
    planejados.map((d) =>
      h('div', { class: 'celula planejado', onclick: () => abrirDemanda(d.id), title: d.titulo }, midiaEl(d.capa, d.capa_mime), d.n_anexos > 1 ? h('span', { class: 'tipo' }, icone('carrossel', 18)) : null, h('span', { class: 'selo-p' }, d.status === 'agendado' ? `Agendado · ${dataBR(d.agendado_para, true)}` : nomeStatus(d.status)))
    ),
    (ig.midias || []).slice(0, 18).map((m) =>
      h(
        'a',
        { class: 'celula', href: m.permalink, target: '_blank', rel: 'noopener', title: (m.caption || '').slice(0, 120) },
        h('img', { src: m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url || m.children?.data?.[0]?.media_url, loading: 'lazy', alt: '', referrerpolicy: 'no-referrer' }),
        tipoIcone(m) ? h('span', { class: 'tipo' }, tipoIcone(m)) : null
      )
    )
  );
}

function blocoOutrasRedes() {
  const item = (cls, sigla, nome, txt) => h('div', { class: 'rede' }, h('span', { class: `ico ${cls}` }, sigla), h('div', {}, h('b', {}, nome), h('div', { class: 'muted pequeno' }, txt)), h('span', { class: 'selo fase' }, 'Fase 3'));
  return h(
    'div',
    { class: 'bloco' },
    h('h3', {}, 'Próximos painéis'),
    h(
      'div',
      { class: 'redes' },
      item('tt', 'TT', 'TikTok', 'Seguidores, visualizações e publicação.'),
      item('li', 'in', 'LinkedIn', 'Publicação no perfil pessoal.'),
      item('go', 'G', 'Avaliações do Google', 'Nota, avaliações recentes e sugestão de campanha todo mês.'),
      h('div', { class: 'rede' }, h('span', { class: 'ico', style: { background: '#1877f2' } }, 'Ads'), h('div', {}, h('b', {}, 'Tráfego pago (Meta Ads)'), h('div', { class: 'muted pequeno' }, 'Investimento, retorno, leads e conversas por campanha.')), h('span', { class: 'selo fase' }, 'Fase 3'))
    )
  );
}

// ---------------- organização (estilo Notion) ----------------
const TIPOS_BLOCO = [
  ['p', 'Texto', '¶'],
  ['h1', 'Título 1', 'H1'],
  ['h2', 'Título 2', 'H2'],
  ['h3', 'Título 3', 'H3'],
  ['lista', 'Lista', '•'],
  ['numerada', 'Lista numerada', '1.'],
  ['tarefa', 'Tarefa', '☐'],
  ['citacao', 'Citação', '❝'],
  ['destaque', 'Destaque', '💡'],
  ['codigo', 'Código', '</>'],
  ['divisor', 'Divisor', '—'],
];
const ATALHOS = [
  [/^# $/, 'h1'],
  [/^## $/, 'h2'],
  [/^### $/, 'h3'],
  [/^[-*] $/, 'lista'],
  [/^1[.)] $/, 'numerada'],
  [/^\[\] $/, 'tarefa'],
  [/^\[ \] $/, 'tarefa'],
  [/^> $/, 'citacao'],
  [/^---$/, 'divisor'],
];
const MODELOS_PAGINA = [
  { titulo: 'Página em branco', icone: '📄', blocos: [['p', '']] },
  { titulo: 'Pauta do mês', icone: '🗓️', blocos: [['h2', 'Semana 1'], ['tarefa', ''], ['h2', 'Semana 2'], ['tarefa', ''], ['h2', 'Semana 3'], ['tarefa', ''], ['h2', 'Semana 4'], ['tarefa', '']] },
  { titulo: 'Ata de reunião', icone: '🤝', blocos: [['destaque', 'Data, participantes e objetivo da reunião'], ['h2', 'Pauta'], ['lista', ''], ['h2', 'Decisões'], ['lista', ''], ['h2', 'Próximos passos'], ['tarefa', '']] },
  { titulo: 'Briefing de campanha', icone: '🚀', blocos: [['h2', 'Objetivo'], ['p', ''], ['h2', 'Público'], ['p', ''], ['h2', 'Mensagem principal'], ['p', ''], ['h2', 'Peças'], ['tarefa', 'Reels'], ['tarefa', 'Carrossel'], ['tarefa', 'Stories'], ['h2', 'Datas'], ['p', '']] },
  { titulo: 'Checklist de onboarding', icone: '✅', blocos: [['tarefa', 'Contrato assinado'], ['tarefa', 'Acesso ao Instagram (conta profissional)'], ['tarefa', 'Logo e manual da marca'], ['tarefa', 'Cérebro da IA preenchido'], ['tarefa', 'Estratégia do primeiro mês'], ['tarefa', 'Pasta no Drive criada'], ['tarefa', 'Grupo de aprovação no WhatsApp']] },
];
const novoBloco = (tipo = 'p', texto = '') => ({ id: Math.random().toString(36).slice(2, 10), tipo, texto, feito: false });

async function abaOrganizacao(main, alvo) {
  // alvo = id do cliente ou 'agencia'
  const raiz = h('div', { class: 'org' });
  const lateral = h('div', { class: 'lateral' });
  const editor = h('div', { class: 'editor' });
  raiz.append(lateral, editor);
  main.replaceChildren(raiz);
  let paginas = await api(`/api/paginas?cliente=${alvo}`);
  let abertaId = Number(new URL(location.href).searchParams.get('pg')) || null;
  if (!paginas.some((p) => p.id === abertaId)) abertaId = innerWidth > 760 ? paginas.find((p) => !p.pai_id)?.id || null : null;

  const lembrarPg = (id) => {
    const u = new URL(location.href);
    if (id) u.searchParams.set('pg', id);
    else u.searchParams.delete('pg');
    history.replaceState(null, '', u.pathname + u.search);
  };

  const criar = async (pai_id = null, modelo = MODELOS_PAGINA[0]) => {
    const blocos = modelo.blocos.map(([t, x]) => novoBloco(t, x));
    const r = await api('/api/paginas', { json: { cliente_id: alvo === 'agencia' ? null : alvo, pai_id, titulo: modelo.titulo === 'Página em branco' ? 'Sem título' : modelo.titulo, icone: modelo.icone, blocos } });
    paginas = await api(`/api/paginas?cliente=${alvo}`);
    abrir(r.id);
  };
  const escolherModelo = (ancora, pai_id = null) =>
    menuEm(
      ancora,
      MODELOS_PAGINA.map((m) => ({ texto: m.titulo, icone: h('span', {}, m.icone), acao: tentar(() => criar(pai_id, m)) }))
    );

  const desenharLateral = () => {
    const filhos = (pai) => paginas.filter((p) => (p.pai_id || null) === pai);
    const item = (p, nivel) => {
      const mais = h('button', { class: 'mais', title: 'Opções', onclick: (e) => (e.stopPropagation(), opcoesPagina(e.currentTarget, p)) }, '⋯');
      return [
        h('div', { class: `pg ${p.id === abertaId ? 'ativa' : ''}`, style: { paddingLeft: `${8 + nivel * 16}px` }, onclick: () => abrir(p.id) }, h('span', {}, p.icone || '📄'), h('span', { class: 'nm' }, p.titulo || 'Sem título'), mais),
        ...filhos(p.id).flatMap((f) => item(f, nivel + 1)),
      ];
    };
    const novo = h('button', { class: 'btn mini fantasma', title: 'Nova página', onclick: (e) => (e.stopPropagation(), escolherModelo(e.currentTarget)) }, icone('mais', 16));
    lateral.replaceChildren(
      h('div', { class: 'cab-l' }, h('span', {}, alvo === 'agencia' ? 'Agência' : 'Páginas'), novo),
      ...filhos(null).flatMap((p) => item(p, 0)),
      paginas.length ? null : h('div', { class: 'muted pequeno', style: { padding: '8px' } }, 'Nenhuma página ainda. Toque em + para criar.')
    );
  };

  const opcoesPagina = (ancora, p) =>
    menuEm(ancora, [
      { texto: 'Nova subpágina', icone: icone('mais', 16), acao: () => escolherModelo(ancora, p.id) },
      {
        texto: 'Excluir página',
        icone: icone('fechar', 16),
        acao: tentar(async () => {
          if (!(await confirmar('Excluir página', `Excluir “${p.titulo}” e as subpáginas dela?`, 'Excluir', true))) return;
          await api(`/api/paginas/${p.id}`, { method: 'DELETE' });
          paginas = await api(`/api/paginas?cliente=${alvo}`);
          if (abertaId === p.id || !paginas.some((x) => x.id === abertaId)) abertaId = null;
          lembrarPg(abertaId);
          desenharLateral();
          abertaId ? abrir(abertaId) : (editor.replaceChildren(), raiz.classList.remove('com-pagina'));
        }),
      },
    ]);

  async function abrir(id) {
    abertaId = id;
    lembrarPg(id);
    raiz.classList.add('com-pagina');
    desenharLateral();
    editor.replaceChildren(h('p', { class: 'muted' }, 'Abrindo…'));
    const pg = await api(`/api/paginas/${id}`);
    if (!pg.blocos.length) pg.blocos.push(novoBloco());
    editarPagina(pg);
  }

  function editarPagina(pg) {
    let timer;
    let pendente = {};
    const status = h('span', {});
    const salvar = (campos) => {
      Object.assign(pendente, campos);
      status.textContent = 'Salvando…';
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const dados = pendente;
        pendente = {};
        try {
          await api(`/api/paginas/${pg.id}`, { method: 'PATCH', json: dados });
          status.textContent = 'Salvo';
          const item = paginas.find((p) => p.id === pg.id);
          if (item && ('titulo' in dados || 'icone' in dados)) {
            Object.assign(item, dados);
            desenharLateral();
          }
        } catch (e) {
          status.textContent = 'Erro ao salvar';
          toast(e.message);
        }
      }, 600);
    };
    const salvarBlocos = () => salvar({ blocos: pg.blocos });

    const titulo = h('input', { class: 'titulo-pg', value: pg.titulo === 'Sem título' ? '' : pg.titulo, placeholder: 'Sem título', oninput: (e) => salvar({ titulo: e.target.value || 'Sem título' }) });
    const ICONES_PG = ['📄', '📌', '💡', '🗓️', '🤝', '🚀', '✅', '🎯', '📊', '🎬', '🗂️', '✍️', '🔥', '⭐', '📣', '🧠'];
    const btnIcone = h('button', {
      class: 'icone-pg',
      title: 'Trocar ícone',
      onclick: (e) =>
        menuEm(
          e.currentTarget,
          ICONES_PG.map((ic) => ({
            texto: ic,
            acao: () => {
              btnIcone.textContent = ic;
              salvar({ icone: ic });
            },
          }))
        ),
    }, pg.icone || '📄');
    const lista = h('div', { class: 'blocos' });
    const voltar = h('button', { class: 'btn mini fantasma', onclick: () => (raiz.classList.remove('com-pagina'), lembrarPg(null)) }, icone('voltar', 16), 'Páginas');

    // foco imediato (sem esperar o próximo quadro) para não perder o que já está sendo digitado
    const focar = (i, fim = true) => {
      const el = lista.children[i]?.querySelector('.txt');
      if (!el) return;
      el.focus();
      const sel = getSelection();
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(!fim);
      sel.removeAllRanges();
      sel.addRange(r);
    };

    const menuTipos = (ancora, i) =>
      menuEm(ancora, [
        ...TIPOS_BLOCO.map(([t, nome, sig]) => ({
          texto: nome,
          icone: h('span', { style: { width: '24px', textAlign: 'center', color: 'var(--muted)' } }, sig),
          acao: () => {
            pg.blocos[i].tipo = t;
            if (t === 'divisor') {
              pg.blocos[i].texto = '';
              pg.blocos.splice(i + 1, 0, novoBloco());
            }
            salvarBlocos();
            desenhar();
            focar(t === 'divisor' ? i + 1 : i);
          },
        })),
        '-',
        { texto: 'Mover para cima', acao: () => mover(i, -1) },
        { texto: 'Mover para baixo', acao: () => mover(i, 1) },
        { texto: 'Duplicar', acao: () => (pg.blocos.splice(i + 1, 0, { ...pg.blocos[i], id: novoBloco().id }), salvarBlocos(), desenhar()) },
        {
          texto: 'Excluir bloco',
          acao: () => {
            pg.blocos.splice(i, 1);
            if (!pg.blocos.length) pg.blocos.push(novoBloco());
            salvarBlocos();
            desenhar();
          },
        },
      ]);
    const mover = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= pg.blocos.length) return;
      [pg.blocos[i], pg.blocos[j]] = [pg.blocos[j], pg.blocos[i]];
      salvarBlocos();
      desenhar();
      focar(j);
    };

    function desenhar() {
      let num = 0;
      lista.replaceChildren(
        ...pg.blocos.map((b, i) => {
          num = b.tipo === 'numerada' ? num + 1 : 0;
          const alca = h('button', { class: 'alca', title: 'Tipo do bloco e opções', onclick: (e) => menuTipos(e.currentTarget, i) }, '⋮⋮');
          if (b.tipo === 'divisor') return h('div', { class: 'bloco-n divisor' }, alca, h('div', { class: 'conteudo' }, h('hr')));
          const txt = h('div', { class: 'txt', contenteditable: 'true', spellcheck: 'true', 'data-ph': { h1: 'Título 1', h2: 'Título 2', h3: 'Título 3', lista: 'Item', numerada: 'Item', tarefa: 'Tarefa', citacao: 'Citação', destaque: 'Destaque', codigo: 'Código' }[b.tipo] || '' });
          txt.textContent = b.texto;
          try {
            txt.contentEditable = 'plaintext-only';
          } catch {}
          txt.addEventListener('input', () => {
            b.texto = txt.innerText.replace(/\u00a0/g, ' ').replace(/\n$/, '');
            // atalhos estilo markdown no começo do bloco
            if (['p', 'lista', 'numerada', 'tarefa'].includes(b.tipo)) {
              for (const [re, tipo] of ATALHOS) {
                if (re.test(b.texto)) {
                  b.tipo = tipo;
                  b.texto = '';
                  if (tipo === 'divisor') pg.blocos.splice(i + 1, 0, novoBloco());
                  salvarBlocos();
                  desenhar();
                  focar(tipo === 'divisor' ? i + 1 : i);
                  return;
                }
              }
            }
            if (b.texto === '/') {
              b.texto = '';
              txt.textContent = '';
              menuTipos(txt, i);
              return;
            }
            salvarBlocos();
          });
          txt.addEventListener('paste', (e) => {
            // cola como texto puro; várias linhas viram vários blocos
            e.preventDefault();
            const t = (e.clipboardData || window.clipboardData).getData('text/plain');
            const linhas = t.replace(/\r/g, '').split('\n');
            if (linhas.length === 1) return document.execCommand('insertText', false, t);
            const sel = getSelection();
            const pos = sel.rangeCount ? sel.getRangeAt(0).startOffset : b.texto.length;
            const antes = b.texto.slice(0, pos);
            const depois = b.texto.slice(pos);
            b.texto = antes + linhas[0];
            const novos = linhas.slice(1).map((l) => {
              const m = l.match(/^\s*[-*•]\s+(.*)$/);
              return novoBloco(m ? 'lista' : b.tipo === 'lista' || b.tipo === 'tarefa' ? b.tipo : 'p', m ? m[1] : l);
            });
            novos[novos.length - 1].texto += depois;
            pg.blocos.splice(i + 1, 0, ...novos);
            salvarBlocos();
            desenhar();
            focar(i + novos.length);
          });
          txt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'codigo') {
              e.preventDefault();
              const sel = getSelection();
              const pos = sel.rangeCount ? Math.min(sel.getRangeAt(0).startOffset, b.texto.length) : b.texto.length;
              // Enter num item vazio de lista sai da lista
              if (!b.texto && ['lista', 'numerada', 'tarefa', 'citacao'].includes(b.tipo)) {
                b.tipo = 'p';
                salvarBlocos();
                desenhar();
                return focar(i);
              }
              const resto = txt.textContent.length === b.texto.length ? b.texto.slice(pos) : '';
              if (resto) b.texto = b.texto.slice(0, pos);
              const tipo = ['lista', 'numerada', 'tarefa'].includes(b.tipo) ? b.tipo : 'p';
              pg.blocos.splice(i + 1, 0, novoBloco(tipo, resto));
              salvarBlocos();
              desenhar();
              focar(i + 1, false);
            } else if (e.key === 'Backspace' && !b.texto && getSelection().isCollapsed) {
              e.preventDefault();
              if (b.tipo !== 'p') {
                b.tipo = 'p';
                salvarBlocos();
                desenhar();
                return focar(i);
              }
              if (pg.blocos.length > 1) {
                pg.blocos.splice(i, 1);
                salvarBlocos();
                desenhar();
                focar(Math.max(0, i - 1));
              }
            } else if (e.key === 'ArrowUp' && i > 0 && caretNoInicio(txt)) {
              e.preventDefault();
              focar(i - 1);
            } else if (e.key === 'ArrowDown' && i < pg.blocos.length - 1 && caretNoFim(txt)) {
              e.preventDefault();
              focar(i + 1, false);
            }
          });
          const conteudo = h('div', { class: 'conteudo' });
          if (b.tipo === 'lista') conteudo.append(h('span', { class: 'marcador' }, '•'));
          if (b.tipo === 'numerada') conteudo.append(h('span', { class: 'marcador' }, `${num}.`));
          if (b.tipo === 'tarefa')
            conteudo.append(
              h('input', {
                type: 'checkbox',
                checked: b.feito,
                onchange: (e) => {
                  b.feito = e.target.checked;
                  e.target.closest('.bloco-n').classList.toggle('feito', b.feito);
                  salvarBlocos();
                },
              })
            );
          conteudo.append(txt);
          return h('div', { class: `bloco-n ${b.tipo} ${b.feito ? 'feito' : ''}` }, alca, conteudo);
        })
      );
    }
    desenhar();
    editor.replaceChildren(
      innerWidth <= 760 ? voltar : null,
      btnIcone,
      titulo,
      h('div', { class: 'info-pg' }, h('span', {}, `Editada ${dataBR(pg.atualizado_em, true)}`), status, h('span', {}, 'Digite / para tipos de bloco · # título · - lista · [] tarefa')),
      lista,
      h('button', { class: 'adicionar-bloco', onclick: () => (pg.blocos.push(novoBloco()), salvarBlocos(), desenhar(), focar(pg.blocos.length - 1)) }, '+ Adicionar bloco')
    );
    if (pg.titulo === 'Sem título') titulo.focus();
  }

  desenharLateral();
  if (abertaId) abrir(abertaId);
  else if (innerWidth > 760) editor.replaceChildren(h('p', { class: 'muted' }, 'Crie a primeira página no + ao lado.'));
}

function caretNoInicio(el) {
  const s = getSelection();
  if (!s.rangeCount) return false;
  const r = s.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setEnd(s.getRangeAt(0).startContainer, s.getRangeAt(0).startOffset);
  return r.toString().length === 0;
}
function caretNoFim(el) {
  const s = getSelection();
  if (!s.rangeCount) return false;
  const r = s.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setStart(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset);
  return r.toString().length === 0;
}

async function telaOrganizacaoAgencia() {
  document.title = 'Organização · Flamme';
  const main = h('main', { class: 'pagina' });
  $app.replaceChildren(
    h(
      'header',
      { class: 'topo' },
      h(
        'div',
        { class: 'faixa' },
        h('a', { class: 'marca', href: '/', onclick: (e) => (e.preventDefault(), navegar('/')) }, h('img', { src: '/marca/flamme-simbolo-terracota.png', alt: 'Flamme' })),
        h('b', { class: 'titulo-topo' }, 'Organização da agência'),
        h('div', { class: 'acoes' }, botaoSino(), h('button', { class: 'btn icone fantasma', title: 'Equipe e configurações', onclick: () => navegar('/config') }, icone('config')))
      )
    ),
    main
  );
  await abaOrganizacao(main, 'agencia');
}

// ---------------- aba Cliente (dados, redes, metas, cérebro da IA) ----------------
async function abaCliente(main) {
  await recarregarCliente();
  const c = estado.cliente;
  const admin = estado.eu.papel === 'admin';
  let timer;
  let pend = {};
  const salvoEm = h('span', { class: 'salvo' });
  const salvar = (campos) => {
    for (const [k, v] of Object.entries(campos)) {
      if (k === 'cerebro' || k === 'metas') pend[k] = { ...(pend[k] || {}), ...v };
      else pend[k] = v;
    }
    salvoEm.textContent = 'Salvando…';
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const dados = pend;
      pend = {};
      try {
        await api(`/api/clientes/${c.id}`, { method: 'PATCH', json: dados });
        salvoEm.textContent = 'Salvo ✓';
        if (dados.cerebro) c.cerebro = { ...c.cerebro, ...dados.cerebro };
        if (dados.metas) c.metas = { ...c.metas, ...dados.metas };
        if (['nome', 'cor', 'instagram', 'tiktok', 'linkedin'].some((k) => k in dados)) {
          Object.assign(c, dados);
          estado.clientes = await api('/api/clientes');
          const sel = document.querySelector('.seletor-cliente b');
          if (sel) sel.textContent = c.nome;
        }
      } catch (e) {
        salvoEm.textContent = '';
        toast(e.message);
      }
    }, 700);
  };
  const campo = (rot, chave, ph = '', tipo = 'text') => h('label', { class: 'campo' }, rot, h('input', { class: 'entrada', type: tipo, value: c[chave] || '', placeholder: ph, oninput: (e) => salvar({ [chave]: e.target.value }) }));

  // logo
  const logoInput = h('input', { type: 'file', accept: 'image/*', class: 'oculto' });
  const logoBox = h('span', {}, avatarCliente(c, 'g'));
  logoInput.addEventListener(
    'change',
    tentar(async () => {
      const f = logoInput.files[0];
      if (!f) return;
      const r = await subirArquivo(`/api/clientes/${c.id}/logo`, await prepararImagem(f), () => {});
      c.logo_chave = r.chave;
      logoBox.replaceChildren(avatarCliente(c, 'g'));
      estado.clientes = await api('/api/clientes');
      toast('Logo atualizada.');
    })
  );

  // instagram
  const blocoIg = h('div', { class: 'bloco' }, h('h3', {}, 'Instagram'));
  const desenharIg = async () => {
    const ig = await api(`/api/instagram/${c.id}`);
    estado.ig = ig;
    if (ig.conectado) {
      const dias = ig.token_expira_em ? Math.round((ig.token_expira_em - Date.now()) / 86400000) : null;
      blocoIg.replaceChildren(
        h('h3', {}, 'Instagram', h('span', { class: 'selo ok' }, 'Conectado')),
        h('div', { class: 'rede' }, h('span', { class: 'ico ig' }, 'IG'), h('div', {}, h('b', {}, `@${ig.username}`), h('div', { class: 'muted pequeno' }, `${numero(ig.perfil?.followers_count)} seguidores · ${dias == null ? 'acesso permanente' : `acesso renova sozinho (expira em ${dias} dias se não renovar)`}`)), admin ? h('button', { class: 'btn mini perigo', onclick: tentar(async () => (await confirmar('Desconectar', `Desconectar @${ig.username}?`, 'Desconectar', true)) && (await api(`/api/instagram/${c.id}`, { method: 'DELETE' }), recarregarCliente().then(desenharIg))) }, 'Desconectar') : null),
        ig.erro ? h('div', { class: 'aviso erro-pub', style: { margin: 0 } }, h('div', { class: 'texto' }, 'Última atualização falhou: ', ig.erro)) : null
      );
      return;
    }
    const token = h('input', { class: 'entrada', placeholder: 'Token de acesso (começa com IG… ou EAA…)', autocomplete: 'off' });
    const idConta = h('input', { class: 'entrada', placeholder: 'ID da conta do Instagram (só para token EAA…)', inputmode: 'numeric', autocomplete: 'off' });
    blocoIg.replaceChildren(
      h('h3', {}, 'Instagram', h('span', { class: 'selo' }, 'Não conectado')),
      h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'A conta precisa ser profissional (Criador ou Empresa): no app, Configurações → Tipo de conta e ferramentas → Mudar para conta profissional.'),
      !admin
        ? h('div', { class: 'aviso' }, 'Peça para uma administradora conectar.')
        : h(
            'div',
            { class: 'conectar' },
            estado.meta.loginInstagram ? h('a', { class: 'btn primario', style: { justifySelf: 'start' }, href: `/api/instagram/${c.id}/conectar` }, 'Entrar com Instagram') : h('div', { class: 'aviso', style: { margin: 0 } }, 'O login direto aparece aqui depois que o app da Meta for configurado (IG_APP_ID e IG_APP_SECRET). Enquanto isso, cole um token:'),
            h('details', {}, h('summary', { class: 'pequeno', style: { cursor: 'pointer' } }, 'Ou conectar colando um token'), h('div', { style: { display: 'grid', gap: '10px', marginTop: '10px' } }, h('ol', { class: 'pequeno muted' }, h('li', {}, 'developers.facebook.com → seu app → Instagram → Configuração da API com login do Instagram.'), h('li', {}, 'Em “Gerar tokens de acesso”, toque em Gerar token na conta do cliente e copie.')), token, idConta, botaoAcao('Conectar', async () => {
              const r = await api(`/api/instagram/${c.id}/token`, { json: { token: token.value, ig_user_id: idConta.value } });
              toast(`@${r.username} conectado ✅`);
              await recarregarCliente();
              desenharIg();
            }, 'primario')))
          )
    );
  };

  const metas = c.metas || {};
  const campoMeta = (rot, chave) => h('label', { class: 'campo' }, rot, h('input', { class: 'entrada', type: 'number', min: 0, value: metas[chave] ?? '', placeholder: '0', oninput: (e) => salvar({ metas: { [chave]: e.target.value } }) }));

  const cerebro = c.cerebro || {};
  const blocoCerebro = h(
    'div',
    { class: 'bloco' },
    h('h3', {}, '🧠 Cérebro da IA', salvoEm),
    h('p', { class: 'muted pequeno', style: { margin: 0 } }, `Tudo o que a IA precisa saber para escrever como a Flamme escreve para ${c.nome}. Salva sozinho. Pode colar textos longos, exemplos e links.`),
    h(
      'div',
      { class: 'cerebro' },
      estado.meta.cerebro.map((f) =>
        h(
          'label',
          { class: 'campo' },
          h('span', {}, f.nome, ' ', h('small', { class: 'muted' }, `· ${f.dica}`)),
          h('textarea', { class: 'entrada', placeholder: f.dica, oninput: (e) => salvar({ cerebro: { [f.id]: e.target.value } }) }, cerebro[f.id] || '')
        )
      )
    )
  );

  main.replaceChildren(
    h('div', { class: 'ferramentas' }, h('h2', { class: 'titulo' }, c.nome)),
    h(
      'div',
      { class: 'visao' },
      h(
        'div',
        { class: 'colunas' },
        h(
          'div',
          { class: 'bloco' },
          h('h3', {}, 'Dados do cliente'),
          h('div', { class: 'linha' }, logoBox, h('button', { class: 'btn mini', onclick: () => logoInput.click() }, 'Trocar logo'), logoInput, h('label', { class: 'linha pequeno muted', style: { gap: '6px', marginLeft: 'auto' } }, 'Cor', h('input', { type: 'color', value: c.cor || '#922f11', oninput: (e) => salvar({ cor: e.target.value }) }))),
          campo('Nome', 'nome'),
          campo('Segmento', 'segmento', 'Ex.: Clínica de estética em Curitiba'),
          h('div', { class: 'grade-2' }, campo('Instagram', 'instagram', '@perfil'), campo('TikTok', 'tiktok', '@perfil')),
          campo('LinkedIn', 'linkedin', 'Link do perfil ou página'),
          campo('Site', 'site', 'https://'),
          campo('Perfil no Google (avaliações)', 'google', 'Link do Google Meu Negócio'),
          campo('Pasta do Drive (vídeos e artes)', 'drive', 'Link da pasta')
        ),
        h(
          'div',
          { style: { display: 'grid', gap: '16px' } },
          blocoIg,
          h('div', { class: 'bloco' }, h('h3', {}, 'Metas do mês'), h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Aparecem na Visão geral como progresso de produção.'), h('div', { class: 'grade-2' }, campoMeta('Posts', 'posts'), campoMeta('Carrosséis', 'carrosseis'), campoMeta('Reels', 'reels'), campoMeta('Stories', 'stories'))),
          admin
            ? h(
                'div',
                { class: 'bloco' },
                h('h3', {}, 'Arquivar cliente'),
                h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Some da lista, mas os dados ficam guardados.'),
                h('button', {
                  class: 'btn perigo mini',
                  style: { justifySelf: 'start' },
                  onclick: tentar(async () => {
                    if (!(await confirmar('Arquivar cliente', `Arquivar ${c.nome}?`, 'Arquivar', true))) return;
                    await api(`/api/clientes/${c.id}`, { method: 'PATCH', json: { ativo: false } });
                    await carregarBase(true);
                    navegar('/');
                  }),
                }, 'Arquivar')
              )
            : null
        )
      ),
      blocoCerebro
    )
  );
  desenharIg();
}

// ---------------- equipe e configurações ----------------
async function telaConfig() {
  document.title = 'Configurações · Flamme';
  const eu = estado.eu;
  const admin = eu.papel === 'admin';
  const main = h('main', { class: 'pagina' });
  $app.replaceChildren(
    h(
      'header',
      { class: 'topo' },
      h(
        'div',
        { class: 'faixa' },
        h('a', { class: 'marca', href: '/', onclick: (e) => (e.preventDefault(), navegar('/')) }, h('img', { src: '/marca/flamme-simbolo-terracota.png', alt: 'Flamme' })),
        h('b', { class: 'titulo-topo' }, 'Equipe e configurações'),
        h('div', { class: 'acoes' }, botaoSino())
      )
    ),
    main
  );

  const blocoAparelhos = h('div', { class: 'bloco' }, h('h3', {}, 'Notificações neste aparelho'));
  const desenharAparelhos = async () => {
    const lista = await api('/api/push/aparelhos').catch(() => []);
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const sub = reg && 'pushManager' in reg ? await reg.pushManager.getSubscription() : null;
    const atual = sub && lista.find((a) => a.endpoint === sub.endpoint);
    blocoAparelhos.replaceChildren(
      h('h3', {}, 'Notificações neste aparelho'),
      ehIOS() && !instalado() ? h('div', { class: 'aviso' }, 'No iPhone: toque em Compartilhar → Adicionar à Tela de Início, abra pelo ícone e volte aqui para ativar.') : null,
      h(
        'div',
        { class: 'linha' },
        h('button', { class: 'btn primario', onclick: tentar(async () => (await ativarPush(), desenharAparelhos())) }, atual ? 'Testar de novo' : 'Ativar notificações'),
        atual
          ? h('button', {
              class: 'btn',
              onclick: tentar(async () => {
                await api('/api/push/cancelar', { json: { endpoint: sub.endpoint } });
                await sub.unsubscribe();
                toast('Notificações desativadas neste aparelho.');
                desenharAparelhos();
              }),
            }, 'Desativar aqui')
          : null
      ),
      lista.length ? h('p', { class: 'muted pequeno', style: { margin: 0 } }, `Aparelhos conectados na sua conta: ${lista.map((a) => a.nome || 'Navegador').join(', ')}`) : null
    );
  };

  const blocoEquipe = h('div', { class: 'bloco' });
  const nomesPapel = { admin: 'Administrador(a)', equipe: 'Equipe', aprovador: 'Aprovador(a)' };
  const desenharEquipe = async () => {
    estado.usuarios = await api('/api/usuarios');
    const nome = h('input', { class: 'entrada', placeholder: 'Nome' });
    const email = h('input', { class: 'entrada', type: 'email', placeholder: 'E-mail' });
    const papel = h('select', { class: 'entrada', style: { width: 'auto' } }, estado.meta.papeis.map((p) => h('option', { value: p, selected: p === 'admin' }, nomesPapel[p])));
    blocoEquipe.replaceChildren(
      h('h3', {}, 'Equipe'),
      h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Administrador(a): tudo, inclusive clientes, equipe e conexões. Equipe: cria e move demandas. Aprovador(a): também aprova. Clientes não entram aqui: eles aprovam pelo link.'),
      h(
        'table',
        { class: 'tabela' },
        estado.usuarios.map((u) =>
          h(
            'tr',
            { style: { opacity: u.ativo ? 1 : 0.5 } },
            h('td', {}, h('span', { class: 'avatar' }, iniciais(u.nome))),
            h('td', {}, h('b', {}, u.nome), h('div', { class: 'muted pequeno' }, u.email)),
            h('td', {}, admin && u.id !== eu.id ? h('select', { class: 'entrada', style: { width: 'auto', padding: '6px' }, onchange: tentar(async (e) => (await api(`/api/usuarios/${u.id}`, { method: 'PATCH', json: { papel: e.target.value } }), toast('Papel atualizado.'))) }, estado.meta.papeis.map((p) => h('option', { value: p, selected: p === u.papel }, nomesPapel[p]))) : nomesPapel[u.papel]),
            h(
              'td',
              { style: { textAlign: 'right' } },
              admin && u.id !== eu.id
                ? [
                    h('button', { class: 'btn mini fantasma', onclick: tentar(async () => mostrarSenha(u.nome, u.email, (await api(`/api/usuarios/${u.id}`, { method: 'PATCH', json: { redefinir_senha: true } })).senha_nova)) }, 'Nova senha'),
                    h('button', { class: 'btn mini fantasma', onclick: tentar(async () => (await api(`/api/usuarios/${u.id}`, { method: 'PATCH', json: { ativo: !u.ativo } }), desenharEquipe())) }, u.ativo ? 'Desativar' : 'Reativar'),
                  ]
                : null
            )
          )
        )
      ),
      admin
        ? h(
            'form',
            {
              class: 'linha',
              onsubmit: tentar(async (e) => {
                e.preventDefault();
                const r = await api('/api/usuarios', { json: { nome: nome.value, email: email.value, papel: papel.value } });
                mostrarSenha(nome.value, email.value, r.senha_inicial);
                desenharEquipe();
              }),
            },
            nome,
            email,
            papel,
            h('button', { class: 'btn primario' }, 'Convidar')
          )
        : null
    );
  };

  const blocoIntegracoes = h('div', { class: 'bloco' }, h('h3', {}, 'Integrações'));
  const linhaInt = (nome, ok, txt) => h('tr', {}, h('td', {}, h('b', {}, nome)), h('td', { class: 'muted pequeno' }, txt), h('td', { style: { textAlign: 'right' } }, ok === null ? h('span', { class: 'selo fase' }, 'Em breve') : ok ? h('span', { class: 'selo ok' }, 'Ativo') : h('span', { class: 'selo' }, 'Falta configurar')));
  blocoIntegracoes.append(
    h(
      'table',
      { class: 'tabela' },
      linhaInt('IA (Claude)', estado.meta.ia_configurada, 'Segredo ANTHROPIC_API_KEY no Worker'),
      linhaInt('Login do Instagram', estado.meta.loginInstagram, 'IG_APP_ID e IG_APP_SECRET no Worker'),
      linhaInt('Google Drive', null, 'Fase 2: puxar vídeos e artes da pasta do cliente'),
      linhaInt('Gerador de carrossel', null, 'Fase 2: notícia → copy → design no formato do cliente'),
      linhaInt('TikTok e LinkedIn', null, 'Fase 3'),
      linhaInt('Google (avaliações)', null, 'Fase 3'),
      linhaInt('Meta Ads (tráfego pago)', null, 'Fase 3')
    )
  );

  const blocoClientes = h('div', { class: 'bloco' }, h('h3', {}, 'Clientes arquivados'));
  const arquivados = estado.clientes.filter((x) => !x.ativo);
  blocoClientes.append(
    arquivados.length
      ? h('table', { class: 'tabela' }, arquivados.map((x) => h('tr', {}, h('td', {}, x.nome), h('td', { style: { textAlign: 'right' } }, admin ? h('button', { class: 'btn mini', onclick: tentar(async () => (await api(`/api/clientes/${x.id}`, { method: 'PATCH', json: { ativo: true } }), await carregarBase(true), telaConfig())) }, 'Reativar') : null))))
      : h('span', { class: 'vazio' }, 'Nenhum.')
  );

  const atual = h('input', { class: 'entrada', type: 'password', placeholder: 'Senha atual', autocomplete: 'current-password' });
  const nova = h('input', { class: 'entrada', type: 'password', placeholder: 'Nova senha (mín. 8)', autocomplete: 'new-password' });
  const blocoConta = h(
    'div',
    { class: 'bloco' },
    h('h3', {}, 'Minha conta'),
    h('div', {}, h('b', {}, eu.nome), ' · ', eu.email),
    h(
      'form',
      {
        class: 'linha',
        onsubmit: tentar(async (e) => {
          e.preventDefault();
          await api('/api/eu/senha', { json: { atual: atual.value, nova: nova.value } });
          atual.value = nova.value = '';
          toast('Senha alterada.');
        }),
      },
      atual,
      nova,
      h('button', { class: 'btn' }, 'Trocar senha')
    ),
    h('button', {
      class: 'btn perigo',
      style: { justifySelf: 'start' },
      onclick: tentar(async () => {
        await api('/api/sair', { method: 'POST' });
        estado.eu = null;
        estado.meta = null;
        navegar('/entrar');
      }),
    }, 'Sair')
  );

  main.replaceChildren(h('div', { class: 'config' }, blocoAparelhos, blocoEquipe, blocoIntegracoes, blocoClientes, blocoConta));
  desenharAparelhos();
  desenharEquipe();
}

function mostrarSenha(nome, email, senha) {
  const texto = `Acesso à plataforma da Flamme\n${location.origin}\nE-mail: ${email}\nSenha provisória: ${senha}\n(No primeiro acesso você cria a sua senha.)`;
  const f = dialogo([
    h('h3', { class: 'titulo' }, `Acesso de ${nome}`),
    h('p', { class: 'muted', style: { margin: 0 } }, 'Envie estes dados para a pessoa. A senha só aparece agora.'),
    h('pre', { class: 'codigo', style: { whiteSpace: 'pre-wrap', padding: '12px' } }, texto),
    h('div', { class: 'botoes' }, h('button', { class: 'btn', onclick: () => copiar(texto) }, 'Copiar'), h('button', { class: 'btn primario', onclick: () => f.remove() }, 'Pronto')),
  ]);
}

iniciar().catch((e) => {
  $app.replaceChildren(h('div', { class: 'carregando' }, 'Não foi possível carregar: ', e.message));
});
