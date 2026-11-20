// Plataforma RP + Citrino Luz — front-end (sem frameworks, roda direto no navegador).

// ---------------- utilidades ----------------
const $app = document.getElementById('app');

function h(tag, props = {}, ...filhos) {
  const el = document.createElementNS(tag === 'svg' || tag === 'path' || tag === 'rect' || tag === 'circle' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
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
  troca: 'M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4',
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
  if (r.status === 401 && !caminho.startsWith('/api/entrar')) {
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
  toastTimer = setTimeout(() => t.classList.remove('ver'), 3200);
}
const tentar = (fn) => async (...a) => {
  try {
    return await fn(...a);
  } catch (e) {
    toast(e.message);
  }
};

const iniciais = (nome = '?') => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
const dataBR = (iso, comHora = false) => {
  if (!iso) return '';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleString('pt-BR', comHora ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' });
};
const hojeISO = () => new Date().toLocaleDateString('en-CA');
const urlMidia = (chave) => `/m/${chave.split('/').map(encodeURIComponent).join('/')}`;
const ehVideo = (mime) => (mime || '').startsWith('video/');
const numero = (n) => (n == null ? '—' : n >= 10000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : n.toLocaleString('pt-BR'));

function midiaEl(chave, mime, extra = {}) {
  if (!chave) return null;
  if (ehVideo(mime)) return h('video', { src: urlMidia(chave) + '#t=0.1', muted: true, playsinline: true, preload: 'metadata', ...extra });
  if ((mime || '').startsWith('image/')) return h('img', { src: urlMidia(chave), loading: 'lazy', alt: '', ...extra });
  return null;
}

// ---------------- estado e rotas ----------------
const MARCAS = {
  alldres: { id: 'alldres', nome: 'Alldres', logo: '/marca/alldres-logo-branco.png' },
  rp: { id: 'rp', nome: 'RP', logo: '/marca/rp-logo.png' },
  citrino: { id: 'citrino', nome: 'Citrino Luz', logo: '/marca/citrino-logo.png' },
};
const NOMES_TIPO = { post: 'Post', carrossel: 'Carrossel', reels: 'Reels', story: 'Story', video: 'Vídeo', outro: 'Outro' };

const estado = {
  eu: null,
  meta: null,
  usuarios: [],
  marca: null,
  aba: 'demandas',
  demandas: [],
  ig: null,
  visao: localStorage.getItem('visao') || 'quadro',
  busca: '',
  filtroResp: '',
  mesCal: null,
  mostrarPlanejados: true,
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
  const e = await api('/api/estado');
  estado.configurado = e.configurado;
  estado.eu = e.usuario;
  rota();
  setInterval(atualizarSilencioso, 45000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && atualizarSilencioso());
}

async function carregarBase() {
  if (estado.meta) return;
  const [meta, usuarios] = await Promise.all([api('/api/meta'), api('/api/usuarios')]);
  estado.meta = meta;
  estado.usuarios = usuarios;
}

async function rota() {
  const url = new URL(location.href);
  const partes = url.pathname.split('/').filter(Boolean);
  const primeiro = partes[0] || '';
  fecharTudo();
  if (!estado.eu) {
    document.documentElement.setAttribute('data-marca', 'alldres');
    return telaLogin();
  }
  await carregarBase();
  if (estado.eu.trocar_senha) {
    document.documentElement.setAttribute('data-marca', 'alldres');
    return telaTrocarSenha();
  }
  carregarNotificacoes();
  if (MARCAS[primeiro]) {
    document.documentElement.setAttribute('data-marca', primeiro);
    const mudou = estado.marca !== primeiro;
    estado.marca = primeiro;
    estado.aba = url.searchParams.get('aba') || 'demandas';
    if (mudou) {
      estado.demandas = [];
      estado.ig = null;
    }
    await telaMarca();
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
  document.documentElement.setAttribute('data-marca', 'alldres');
  if (primeiro === 'equipe') return telaConfig();
  return telaInicio();
}

// ---------------- login ----------------
const pilulaAlldres = (cls = '') => h('img', { class: `pilula ${cls}`, src: '/marca/alldres-pilula.png', alt: 'Alldres' });

function telaLogin() {
  const erro = h('div', { class: 'erro' });
  const setup = !estado.configurado;
  const nome = h('input', { class: 'entrada', placeholder: 'Seu nome', autocomplete: 'name' });
  const email = h('input', { class: 'entrada', type: 'email', placeholder: 'E-mail', autocomplete: 'email' });
  const senha = h('input', { class: 'entrada', type: 'password', placeholder: setup ? 'Crie uma senha (mín. 8)' : 'Senha', autocomplete: setup ? 'new-password' : 'current-password' });
  const botao = h('button', { class: 'btn primario', type: 'submit' }, setup ? 'Criar acesso de administrador' : 'Entrar');
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
    pilulaAlldres(),
    h('h1', { class: 'titulo' }, setup ? 'Primeiro acesso' : 'Bem-vindo de volta'),
    h('p', { class: 'sub' }, setup ? 'Você será o administrador e poderá convidar a equipe.' : 'Demandas, aprovações e publicações da Alldres, RP e Citrino Luz.'),
    setup ? nome : null,
    email,
    senha,
    erro,
    botao
  );
  $app.replaceChildren(h('div', { class: 'tela-login' }, form, h('div', { class: 'rodape-login' }, 'alldres · plataforma de demandas')));
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
        pilulaAlldres(),
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

// ---------------- início ----------------
function saudacao() {
  const hora = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

async function telaInicio() {
  const numeros = {};
  const resumo = h('p', { class: 'resumo' }, ' ');
  const cartao = (id) => {
    const m = MARCAS[id];
    const n = { abertas: h('b', {}, '–'), aprov: h('b', {}, '–'), agend: h('b', {}, '–') };
    numeros[id] = n;
    return h(
      'a',
      { class: `card-marca ${id}`, href: `/${id}`, onclick: (e) => (e.preventDefault(), navegar(`/${id}`)) },
      h('div', { class: 'topo-card' }, h('img', { class: 'logo-card', src: m.logoCard || m.logo, alt: m.nome }), h('span', { class: 'seta' }, '→')),
      h(
        'div',
        { class: 'numeros-card' },
        h('div', {}, n.abertas, h('span', {}, 'em aberto')),
        h('div', {}, n.aprov, h('span', {}, 'aprovação')),
        h('div', {}, n.agend, h('span', {}, 'agendadas'))
      )
    );
  };
  $app.replaceChildren(
    h(
      'div',
      { class: 'inicio' },
      h(
        'header',
        { class: 'inicio-topo' },
        pilulaAlldres('pequena'),
        h('div', { class: 'acoes' }, botaoSino(), h('button', { class: 'btn icone fantasma', title: 'Equipe e configurações', onclick: () => navegar('/equipe') }, icone('config')))
      ),
      h(
        'section',
        { class: 'inicio-hero' },
        h('div', { class: 'data' }, new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })),
        h('h1', { class: 'titulo' }, `${saudacao()}, ${estado.eu.nome.split(' ')[0]}.`),
        resumo
      ),
      avisoNotificacoes() || '',
      h('section', { class: 'grade-marcas' }, Object.keys(MARCAS).map(cartao))
    )
  );
  let total = 0;
  let totalAprov = 0;
  await Promise.all(
    Object.keys(MARCAS).map((id) =>
      api(`/api/demandas?empresa=${id}`)
        .then((lista) => {
          const abertas = lista.filter((d) => !['publicado', 'agendado'].includes(d.status)).length;
          const aprov = lista.filter((d) => d.status === 'aprovacao').length;
          const agend = lista.filter((d) => d.status === 'agendado').length;
          numeros[id].abertas.textContent = abertas;
          numeros[id].aprov.textContent = aprov;
          numeros[id].agend.textContent = agend;
          total += abertas;
          totalAprov += aprov;
        })
        .catch(() => {})
    )
  );
  resumo.textContent = total
    ? `${total} demanda${total === 1 ? '' : 's'} em andamento${totalAprov ? ` · ${totalAprov} aguardando aprovação` : ''}.`
    : 'Nenhuma demanda em andamento. Que tal começar uma nova?';
}

// ---------------- notificações ----------------
let $sinos = [];
function botaoSino() {
  const b = h('button', { class: 'btn icone sino', title: 'Notificações', onclick: (e) => (e.stopPropagation(), abrirNotificacoes()) }, icone('sino'));
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
                navegar(`/${n.empresa || ''}${n.demanda_id ? `?d=${n.demanda_id}` : ''}`);
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
  document.querySelectorAll('.lista-notif').forEach((e) => e.remove());
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
  if (!pushSuportado()) return null;
  if (Notification.permission === 'denied') {
    return h('div', { class: 'aviso' }, h('div', { class: 'texto' }, 'As notificações estão bloqueadas neste navegador. Libere nas configurações do site para receber os avisos.'));
  }
  el = h(
    'div',
    { class: 'aviso' },
    h('div', { class: 'texto' }, h('b', {}, 'Ative as notificações neste aparelho'), h('div', { class: 'muted pequeno' }, 'Você recebe um aviso quando uma demanda for criada, mudar de status ou for publicada.')),
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
async function ativarPush(empresas = Object.keys(MARCAS)) {
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
  await api('/api/push/inscrever', { json: { inscricao: sub.toJSON(), empresas, nome: nomeAparelho() } });
  await api('/api/push/teste', { method: 'POST' });
  toast('Notificações ativadas neste aparelho ✅');
  return true;
}

// ---------------- página da marca ----------------
async function telaMarca() {
  const m = MARCAS[estado.marca];
  const aba = (id, nome, ic) => h('button', { class: estado.aba === id ? 'ativa' : '', onclick: () => trocarAba(id) }, ic ? icone(ic, 22) : null, nome);
  const abas = [
    ['demandas', 'Demandas', 'quadro'],
    ['calendario', 'Calendário', 'calendario'],
    ['perfil', 'Perfil', 'perfil'],
  ];
  const main = h('main', { class: 'pagina' });
  $app.replaceChildren(
    h(
      'header',
      { class: 'topo' },
      h(
        'div',
        { class: 'faixa' },
        h('a', { class: 'logo', href: '/', title: 'Início', onclick: (e) => (e.preventDefault(), navegar('/')) }, h('img', { src: m.logo, alt: m.nome })),
        h('nav', { class: 'abas' }, abas.map(([id, nome]) => aba(id, nome))),
        h(
          'div',
          { class: 'acoes' },
          estado.marca !== 'alldres' ? h('button', { class: 'selo-alldres', title: 'Início · Alldres', onclick: () => navegar('/') }, h('img', { src: '/marca/alldres-pilula.png', alt: 'Alldres' })) : h('button', { class: 'btn icone fantasma', title: 'Início', onclick: () => navegar('/') }, icone('casa')),
          botaoSino(),
          h('button', { class: 'btn icone fantasma', title: 'Equipe e configurações', onclick: () => navegar('/equipe') }, icone('config'))
        )
      )
    ),
    main,
    h('nav', { class: 'abas-baixo' }, abas.map(([id, nome, ic]) => aba(id, nome, ic)))
  );
  estado.$main = main;
  await desenharAba();
}

function trocarAba(id) {
  estado.aba = id;
  const url = new URL(location.href);
  url.searchParams.set('aba', id);
  url.searchParams.delete('d');
  history.replaceState(null, '', url.pathname + url.search);
  document.querySelectorAll('.abas button, .abas-baixo button').forEach((b, i) => b.classList.toggle('ativa', ['demandas', 'calendario', 'perfil'][i % 3] === id));
  desenharAba();
}

async function desenharAba() {
  const main = estado.$main;
  if (!main) return;
  if (estado.aba === 'perfil') return abaPerfil(main);
  if (!estado.demandas.length) await carregarDemandas();
  if (estado.aba === 'calendario') return abaCalendario(main);
  return abaDemandas(main);
}

async function carregarDemandas() {
  estado.demandas = await api(`/api/demandas?empresa=${estado.marca}`);
}

async function atualizarSilencioso() {
  if (!estado.eu || document.visibilityState !== 'visible') return;
  carregarNotificacoes();
  if (estado.marca && document.documentElement.dataset.marca === estado.marca && estado.aba !== 'perfil' && !document.querySelector('.fundo, .dialogo-fundo')) {
    try {
      const antes = JSON.stringify(estado.demandas);
      await carregarDemandas();
      if (JSON.stringify(estado.demandas) !== antes) desenharAba();
    } catch {}
  }
}

const corStatus = (id) => `var(--st-${id})`;
const nomeStatus = (id) => estado.meta.status.find((s) => s.id === id)?.nome || id;

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

// ---------------- diálogos ----------------
function dialogo(conteudo) {
  const fundo = h('div', { class: 'dialogo-fundo', onclick: (e) => e.target === fundo && fundo.remove() }, h('div', { class: 'dialogo' }, conteudo));
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

function novaDemanda(prazo) {
  const titulo = h('input', { class: 'entrada', placeholder: 'Ex.: Carrossel lançamento coleção verão' });
  const tipo = h('select', { class: 'entrada' }, estado.meta.tipos.map((t) => h('option', { value: t }, NOMES_TIPO[t])));
  const resp = h('select', { class: 'entrada' }, h('option', { value: '' }, 'Sem responsável'), estado.usuarios.filter((u) => u.ativo).map((u) => h('option', { value: u.id }, u.nome)));
  const dataPrazo = h('input', { class: 'entrada', type: 'date', value: prazo || '' });
  const desc = h('textarea', { class: 'entrada', placeholder: 'Briefing: objetivo, referências, texto da arte…' });
  const f = dialogo([
    h('h3', { class: 'titulo' }, `Nova demanda · ${MARCAS[estado.marca].nome}`),
    h('label', { class: 'campo' }, 'Título', titulo),
    h('div', { class: 'grade-2' }, h('label', { class: 'campo' }, 'Formato', tipo), h('label', { class: 'campo' }, 'Prazo', dataPrazo)),
    h('label', { class: 'campo' }, 'Responsável', resp),
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
              json: { empresa: estado.marca, titulo: titulo.value, tipo: tipo.value, responsavel_id: resp.value ? Number(resp.value) : null, prazo: dataPrazo.value || null, descricao: desc.value },
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
    h('label', { class: 'linha', style: { gap: '10px', alignItems: 'flex-start' } }, auto, h('span', {}, h('b', {}, 'Publicar sozinho no Instagram'), h('div', { class: 'muted pequeno' }, 'Desmarque se o post precisa de música, enquete ou algo que só o app faz: a equipe recebe um lembrete na hora.'))),
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
  else if (d.aprovado_em && d.status === 'aprovado') detalheStatus = `Aprovado em ${dataBR(d.aprovado_em, true)}`;

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
        const r = await subirArquivo(id, preparado, (p) => (barra.firstChild.style.width = `${Math.round(p * 100)}%`));
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
            h('div', { class: 'ph' }, perfil?.profile_picture_url ? h('img', { src: perfil.profile_picture_url, alt: '' }) : h('span', { class: 'avatar' }, iniciais(MARCAS[estado.marca].nome)), perfil?.username || MARCAS[estado.marca].nome.toLowerCase().replace(/\s/g, '')),
            h('div', { class: 'midias' }, midias.map((a) => midiaEl(a.chave, a.mime, ehVideo(a.mime) ? { controls: true } : {}))),
            h('div', { class: 'pt' }, h('b', {}, (perfil?.username || '') + ' '), legenda.value.slice(0, 300), legenda.value.length > 300 ? '… mais' : '')
          )
        : h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Anexe a arte para ver como o post fica no feed.')
    );
  };
  atualizarPrevia();
  if (!estado.ig) api(`/api/instagram/${estado.marca}`).then((r) => ((estado.ig = r), atualizarPrevia())).catch(() => {});

  // comentários
  const listaCom = h(
    'div',
    { class: 'comentarios' },
    d.comentarios.length
      ? d.comentarios.map((c) =>
          h('div', { class: 'comentario' }, h('span', { class: 'avatar', style: { width: '28px', height: '28px' } }, iniciais(c.autor || 'Claude')), h('div', {}, h('div', { class: 'quem' }, `${c.autor || 'Claude'} · ${dataBR(c.criado_em, true)}`), h('div', { class: 'bolha' }, c.texto)))
        )
      : h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Sem comentários ainda.')
  );
  const novoCom = h('textarea', { class: 'entrada', placeholder: 'Escreva um comentário… (a equipe é avisada)', style: { minHeight: '60px' } });
  const enviarCom = tentar(async () => {
    if (!novoCom.value.trim()) return;
    await api(`/api/demandas/${id}/comentarios`, { json: { texto: novoCom.value } });
    abrirDemanda(id);
  });

  const NOMES_ACAO = { criou: 'criou a demanda', status: 'mudou o status', anexou: 'anexou', 'removeu anexo': 'removeu o anexo', legenda: 'editou a legenda', prazo: 'mudou o prazo', responsavel: 'definiu o responsável', agendou: 'agendou para', 'cancelou agendamento': 'cancelou o agendamento', 'publicar agora': 'mandou publicar agora', 'publicou no Instagram': 'publicou no Instagram', 'falha ao publicar': 'falha ao publicar', arquivou: 'arquivou' };
  const historico = h(
    'details',
    {},
    h('summary', { class: 'muted pequeno', style: { cursor: 'pointer' } }, `Histórico (${d.historico.length})`),
    h(
      'div',
      { class: 'historico', style: { marginTop: '8px' } },
      d.historico.map((x) =>
        h('div', {}, `${dataBR(x.criado_em, true)} · ${x.autor || 'Sistema'} ${NOMES_ACAO[x.acao] || x.acao}${x.acao === 'status' ? `: ${nomeStatus(x.de)} → ${nomeStatus(x.para)}` : x.acao === 'agendou' ? ` ${dataBR(x.para, true)}` : x.para && x.acao !== 'criou' ? ` ${x.para}` : x.de && x.acao === 'removeu anexo' ? ` ${x.de}` : ''}`)
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
        h('label', { class: 'campo' }, 'Responsável', resp),
        h('div', { class: 'secao' }, h('h4', {}, 'Briefing'), desc),
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

function subirArquivo(id, f, progresso) {
  return new Promise((resolver, rejeitar) => {
    const x = new XMLHttpRequest();
    x.open('POST', `/api/demandas/${id}/anexos`);
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

// ---------------- perfil do Instagram ----------------
async function abaPerfil(main) {
  main.replaceChildren(h('p', { class: 'muted' }, 'Carregando perfil…'));
  try {
    const [ig] = await Promise.all([api(`/api/instagram/${estado.marca}`), estado.demandas.length ? null : carregarDemandas()]);
    estado.ig = ig;
  } catch (e) {
    return main.replaceChildren(h('p', { class: 'erro' }, e.message));
  }
  const ig = estado.ig;
  if (!ig.conectado) return main.replaceChildren(cartaoConectar());
  const p = ig.perfil || {};
  const midias = ig.midias || [];
  const planejados = estado.demandas
    .filter((d) => ['aprovacao', 'aprovado', 'agendado'].includes(d.status) && d.capa && d.tipo !== 'story')
    .sort((a, b) => (b.agendado_para || b.prazo || '').localeCompare(a.agendado_para || a.prazo || ''));

  const ultimas = midias.slice(0, 12);
  const mediaCurtidas = ultimas.length ? Math.round(ultimas.reduce((s, m) => s + (m.like_count || 0), 0) / ultimas.length) : null;
  const mediaCom = ultimas.length ? Math.round(ultimas.reduce((s, m) => s + (m.comments_count || 0), 0) / ultimas.length) : null;
  const engaj = p.followers_count && ultimas.length ? ((mediaCurtidas + mediaCom) / p.followers_count) * 100 : null;
  const ultimoPost = midias[0]?.timestamp ? Math.floor((Date.now() - new Date(midias[0].timestamp)) / 86400000) : null;

  const tipoIcone = (m) => (m.media_type === 'CAROUSEL_ALBUM' ? icone('carrossel', 18) : m.media_type === 'VIDEO' ? icone('video', 18) : null);

  const grade = h(
    'div',
    { class: 'ig-grade' },
    estado.mostrarPlanejados
      ? planejados.map((d) =>
          h(
            'div',
            { class: 'celula planejado', onclick: () => abrirDemanda(d.id), title: d.titulo },
            midiaEl(d.capa, d.capa_mime),
            d.n_anexos > 1 ? h('span', { class: 'tipo' }, icone('carrossel', 18)) : null,
            h('span', { class: 'selo' }, d.status === 'agendado' ? `Agendado · ${dataBR(d.agendado_para, true)}` : nomeStatus(d.status))
          )
        )
      : [],
    midias.map((m) =>
      h(
        'a',
        { class: 'celula', href: m.permalink, target: '_blank', rel: 'noopener', title: (m.caption || '').slice(0, 120) },
        h('img', { src: m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url || m.children?.data?.[0]?.media_url, loading: 'lazy', alt: '', referrerpolicy: 'no-referrer' }),
        tipoIcone(m) ? h('span', { class: 'tipo' }, tipoIcone(m)) : null,
        h('span', { class: 'sobre' }, `♥ ${numero(m.like_count)}`, `💬 ${numero(m.comments_count)}`)
      )
    )
  );

  main.replaceChildren(
    avisoNotificacoes() || '',
    h(
      'div',
      { class: 'perfil-ig' },
      h(
        'div',
        { class: 'ferramentas' },
        h('h2', { class: 'titulo' }, 'Perfil'),
        h(
          'label',
          { class: 'linha pequeno', style: { gap: '6px' } },
          h('input', { type: 'checkbox', checked: estado.mostrarPlanejados, onchange: (e) => ((estado.mostrarPlanejados = e.target.checked), abaPerfil(main)) }),
          `Prévia com os ${planejados.length} posts planejados`
        ),
        h(
          'button',
          {
            class: 'btn mini',
            onclick: tentar(async () => {
              await api(`/api/instagram/${estado.marca}/sincronizar`, { method: 'POST' });
              toast('Feed atualizado.');
              abaPerfil(main);
            }),
          },
          'Atualizar agora'
        )
      ),
      ig.erro ? h('div', { class: 'aviso erro-pub' }, h('div', { class: 'texto' }, 'Última atualização falhou: ', ig.erro)) : null,
      h(
        'div',
        { class: 'metricas' },
        h('div', { class: 'metrica' }, h('div', { class: 'valor' }, numero(p.followers_count)), h('div', { class: 'rot' }, 'Seguidores')),
        h('div', { class: 'metrica' }, h('div', { class: 'valor' }, numero(mediaCurtidas)), h('div', { class: 'rot' }, 'Curtidas/post (últ. 12)')),
        h('div', { class: 'metrica' }, h('div', { class: 'valor' }, engaj == null ? '—' : engaj.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'), h('div', { class: 'rot' }, 'Engajamento')),
        h('div', { class: 'metrica' }, h('div', { class: 'valor' }, ultimoPost == null ? '—' : ultimoPost === 0 ? 'Hoje' : `${ultimoPost}d`), h('div', { class: 'rot' }, 'Desde o último post'))
      ),
      h(
        'div',
        { class: 'ig-cab' },
        h('div', { class: 'foto' }, p.profile_picture_url ? h('img', { src: p.profile_picture_url, alt: '', referrerpolicy: 'no-referrer' }) : null),
        h(
          'div',
          {},
          h('div', { class: 'usuario' }, p.username || ig.username, h('a', { class: 'btn mini', href: `https://instagram.com/${p.username || ig.username}`, target: '_blank', rel: 'noopener' }, 'Abrir no Instagram')),
          h('div', { class: 'numeros' }, h('span', {}, h('b', {}, numero(p.media_count)), ' posts'), h('span', {}, h('b', {}, numero(p.followers_count)), ' seguidores'), h('span', {}, h('b', {}, numero(p.follows_count)), ' seguindo')),
          h('div', { class: 'bio-wrap' }, p.name ? h('b', {}, p.name) : null, p.biography ? h('div', { class: 'bio' }, p.biography) : null, p.website ? h('a', { href: p.website, target: '_blank', rel: 'noopener' }, p.website.replace(/^https?:\/\//, '')) : null)
        )
      ),
      h('div', { class: 'ig-abas' }, h('span', {}, 'Posts')),
      grade,
      h('p', { class: 'muted pequeno', style: { textAlign: 'center', marginTop: '14px' } }, `Atualiza sozinho a cada 10 minutos · última vez ${ig.sincronizado_em ? new Date(ig.sincronizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}`)
    )
  );
}

function cartaoConectar() {
  const admin = estado.eu.papel === 'admin';
  const token = h('input', { class: 'entrada', placeholder: 'Token de acesso (começa com EAA… ou IG…)', autocomplete: 'off' });
  const idConta = h('input', { class: 'entrada', placeholder: 'ID da conta do Instagram (ex.: 17841452944849437)', inputmode: 'numeric', autocomplete: 'off' });
  const conectar = tentar(async () => {
    const r = await api(`/api/instagram/${estado.marca}/token`, { json: { token: token.value, ig_user_id: idConta.value } });
    toast(`@${r.username} conectado ✅`);
    abaPerfil(estado.$main);
  });
  return h(
    'div',
    { class: 'conectar' },
    h('h2', { class: 'titulo', style: { margin: 0 } }, `Conectar o Instagram da ${MARCAS[estado.marca].nome}`),
    h('p', { class: 'muted', style: { margin: 0 } }, 'Depois de conectado, o perfil e o feed aparecem aqui e se atualizam sozinhos, e as demandas aprovadas podem ser agendadas direto daqui.'),
    !admin
      ? h('p', { class: 'aviso' }, 'Peça para um administrador conectar.')
      : [
          h(
            'ol',
            {},
            h('li', {}, 'No painel da Meta (app ', h('b', {}, 'Plataforma Alldres'), ' → Casos de uso → Personalizar → API setup with Unified login), em ', h('b', {}, '2. Gerar tokens de acesso'), ', toque em ', h('b', {}, 'Gerar token'), ' na conta da marca e copie.'),
            h('li', {}, 'Cole o token abaixo e o ', h('b', {}, 'ID da conta'), ' (o número que aparece abaixo do nome da conta, na mesma tela).')
          ),
          h('label', { class: 'campo' }, 'Token de acesso', token),
          h('label', { class: 'campo' }, 'ID da conta do Instagram', idConta),
          h('button', { class: 'btn primario', onclick: conectar }, 'Conectar'),
          estado.meta.loginInstagram ? h('a', { class: 'btn', href: `/api/instagram/${estado.marca}/conectar` }, 'Ou entrar com Instagram') : null,
        ]
  );
}

// ---------------- equipe e configurações ----------------
async function telaConfig() {
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
        h('button', { class: 'btn icone fantasma', onclick: () => (history.length > 1 ? history.back() : navegar('/')) }, icone('voltar')),
        h('b', {}, 'Equipe e configurações'),
        h('div', { class: 'acoes' }, h('button', { class: 'btn icone fantasma', title: 'Início', onclick: () => navegar('/') }, icone('casa')), botaoSino())
      )
    ),
    main
  );

  // aparelhos
  const blocoAparelhos = h('div', { class: 'bloco' }, h('h3', {}, 'Notificações neste aparelho'));
  const desenharAparelhos = async () => {
    const lista = await api('/api/push/aparelhos').catch(() => []);
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const sub = reg && 'pushManager' in reg ? await reg.pushManager.getSubscription() : null;
    const atual = sub && lista.find((a) => a.endpoint === sub.endpoint);
    const caixas = Object.values(MARCAS).map((m) => h('label', { class: 'linha', style: { gap: '6px' } }, h('input', { type: 'checkbox', value: m.id, checked: atual ? atual.empresas.includes(m.id) : true }), m.nome));
    const empresasMarcadas = () => caixas.map((c) => c.querySelector('input')).filter((i) => i.checked).map((i) => i.value);
    blocoAparelhos.replaceChildren(
      h('h3', {}, 'Notificações neste aparelho'),
      ehIOS() && !instalado() ? h('div', { class: 'aviso' }, 'No iPhone: toque em Compartilhar → Adicionar à Tela de Início, abra pelo ícone e volte aqui para ativar.') : null,
      h('div', { class: 'linha' }, h('span', { class: 'muted' }, 'Receber avisos de:'), caixas),
      h(
        'div',
        { class: 'linha' },
        h('button', { class: 'btn primario', onclick: tentar(async () => (await ativarPush(empresasMarcadas()), desenharAparelhos())) }, atual ? 'Salvar e testar' : 'Ativar notificações'),
        atual
          ? h(
              'button',
              {
                class: 'btn',
                onclick: tentar(async () => {
                  await api('/api/push/cancelar', { json: { endpoint: sub.endpoint } });
                  await sub.unsubscribe();
                  toast('Notificações desativadas neste aparelho.');
                  desenharAparelhos();
                }),
              },
              'Desativar aqui'
            )
          : null
      ),
      lista.length ? h('p', { class: 'muted pequeno', style: { margin: 0 } }, `Aparelhos conectados na sua conta: ${lista.map((a) => a.nome || 'Navegador').join(', ')}`) : null
    );
  };

  // equipe
  const blocoEquipe = h('div', { class: 'bloco' });
  const desenharEquipe = async () => {
    estado.usuarios = await api('/api/usuarios');
    const nomesPapel = { admin: 'Administrador', equipe: 'Equipe', aprovador: 'Aprovador' };
    const nome = h('input', { class: 'entrada', placeholder: 'Nome' });
    const email = h('input', { class: 'entrada', type: 'email', placeholder: 'E-mail' });
    const papel = h('select', { class: 'entrada', style: { width: 'auto' } }, estado.meta.papeis.map((p) => h('option', { value: p, selected: p === 'equipe' }, nomesPapel[p])));
    blocoEquipe.replaceChildren(
      h('h3', {}, 'Equipe'),
      h('p', { class: 'muted pequeno', style: { margin: 0 } }, 'Equipe: cria e move demandas. Aprovador: também aprova. Administrador: tudo, inclusive convidar pessoas e conectar o Instagram.'),
      h(
        'table',
        { class: 'tabela' },
        estado.usuarios.map((u) =>
          h(
            'tr',
            { style: { opacity: u.ativo ? 1 : 0.5 } },
            h('td', {}, h('span', { class: 'avatar' }, iniciais(u.nome))),
            h('td', {}, h('b', {}, u.nome), h('div', { class: 'muted pequeno' }, u.email)),
            h(
              'td',
              {},
              admin && u.id !== eu.id
                ? h('select', { class: 'entrada', style: { width: 'auto', padding: '6px' }, onchange: tentar(async (e) => (await api(`/api/usuarios/${u.id}`, { method: 'PATCH', json: { papel: e.target.value } }), toast('Papel atualizado.'))) }, estado.meta.papeis.map((p) => h('option', { value: p, selected: p === u.papel }, nomesPapel[p])))
                : nomesPapel[u.papel]
            ),
            h(
              'td',
              { style: { textAlign: 'right' } },
              admin && u.id !== eu.id
                ? [
                    h(
                      'button',
                      {
                        class: 'btn mini fantasma',
                        onclick: tentar(async () => {
                          const r = await api(`/api/usuarios/${u.id}`, { method: 'PATCH', json: { redefinir_senha: true } });
                          mostrarSenha(u.nome, u.email, r.senha_nova);
                        }),
                      },
                      'Nova senha'
                    ),
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

  // instagram
  const blocoIg = h('div', { class: 'bloco' }, h('h3', {}, 'Instagram'));
  const desenharIg = async () => {
    const linhas = await Promise.all(
      Object.values(MARCAS).map(async (m) => {
        const r = await api(`/api/instagram/${m.id}`).catch(() => ({}));
        const dias = r.token_expira_em ? Math.round((r.token_expira_em - Date.now()) / 86400000) : null;
        return h(
          'tr',
          {},
          h('td', {}, h('b', {}, m.nome)),
          h('td', {}, r.conectado ? `@${r.username}` : h('span', { class: 'muted' }, 'Não conectado'), r.conectado ? h('div', { class: 'muted pequeno' }, dias == null ? 'Acesso permanente' : `Acesso renova sozinho · expira em ${dias} dias se não renovar`) : null),
          h(
            'td',
            { style: { textAlign: 'right' } },
            admin
              ? r.conectado
                ? h('button', { class: 'btn mini perigo', onclick: tentar(async () => (await confirmar('Desconectar', `Desconectar @${r.username}?`, 'Desconectar', true)) && (await api(`/api/instagram/${m.id}`, { method: 'DELETE' }), desenharIg())) }, 'Desconectar')
                : h('a', { class: 'btn mini primario', href: `/${m.id}?aba=perfil`, onclick: (e) => (e.preventDefault(), navegar(`/${m.id}?aba=perfil`)) }, 'Conectar')
              : null
          )
        );
      })
    );
    blocoIg.replaceChildren(h('h3', {}, 'Instagram'), h('table', { class: 'tabela' }, linhas));
  };

  // senha
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
    h(
      'button',
      {
        class: 'btn perigo',
        style: { justifySelf: 'start' },
        onclick: tentar(async () => {
          await api('/api/sair', { method: 'POST' });
          estado.eu = null;
          estado.meta = null;
          navegar('/entrar');
        }),
      },
      'Sair'
    )
  );

  main.replaceChildren(h('div', { class: 'config' }, blocoAparelhos, blocoEquipe, blocoIg, blocoConta));
  desenharAparelhos();
  desenharEquipe();
  desenharIg();
}

function mostrarSenha(nome, email, senha) {
  const texto = `Acesso à plataforma de demandas\n${location.origin}\nE-mail: ${email}\nSenha provisória: ${senha}\n(No primeiro acesso você cria a sua senha.)`;
  const f = dialogo([
    h('h3', { class: 'titulo' }, `Acesso de ${nome}`),
    h('p', { class: 'muted', style: { margin: 0 } }, 'Envie estes dados para a pessoa. A senha só aparece agora.'),
    h('pre', { class: 'codigo', style: { whiteSpace: 'pre-wrap', padding: '12px' } }, texto),
    h('div', { class: 'botoes' }, h('button', { class: 'btn', onclick: () => navigator.clipboard?.writeText(texto).then(() => toast('Copiado.')) }, 'Copiar'), h('button', { class: 'btn primario', onclick: () => f.remove() }, 'Pronto')),
  ]);
}

iniciar().catch((e) => {
  $app.replaceChildren(h('div', { class: 'carregando' }, 'Não foi possível carregar: ', e.message));
});
