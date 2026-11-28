// Plataforma Alldres (Alldres, RP e Citrino Luz) — servidor (Cloudflare Worker).

import { migrar, EMPRESAS, STATUS, STATUS_IDS, TIPOS, statusNome, getConfig, setConfig, agoraIso } from './db.js';
import { json, falha, ErroHttp, lerJson, lerCookie, hashSenha, iguais, sha256, aleatorio, b64url } from './util.js';
import { notificar } from './notificar.js';
import { chavesVapid } from './push.js';
import * as ig from './instagram.js';

const DIA = 86400000;
const SESSAO_DIAS = 30;
const PAPEIS = ['admin', 'equipe', 'aprovador'];
const podeAprovar = (u) => u.papel === 'admin' || u.papel === 'aprovador';

let urlRegistrada = null;

export default {
  async fetch(request, env, ctx) {
    try {
      await migrar(env);
      const url = new URL(request.url);
      if (urlRegistrada !== url.origin) {
        urlRegistrada = url.origin;
        ctx.waitUntil(setConfig(env, 'url_publica', url.origin));
      }
      if (url.pathname.startsWith('/api/')) return await api(request, env, ctx, url);
      if (url.pathname.startsWith('/m/')) return await midia(request, env, url);
      return await paginas(request, env, url);
    } catch (e) {
      if (e instanceof ErroHttp) return json({ erro: e.message }, e.status);
      console.log('erro', e.stack || e.message);
      return json({ erro: 'Erro interno: ' + e.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    await migrar(env);
    if (event.cron === '0 12 * * *') {
      ctx.waitUntil(rotinaDiaria(env));
    } else {
      ctx.waitUntil(rotinaFrequente(env));
    }
  },
};

// ---------------- Páginas (HTML, ícones e manifestos por marca) ----------------

const MARCAS_HTML = {
  alldres: { manifest: '/manifest-alldres.webmanifest', icone: '/marca/alldres-apple.png', cor: '#0c0b0b', titulo: 'Alldres · Demandas' },
  rp: { manifest: '/manifest-rp.webmanifest', icone: '/marca/rp-apple.png', cor: '#0e0e0e', titulo: 'RP · Demandas' },
  citrino: { manifest: '/manifest-citrino.webmanifest', icone: '/marca/citrino-apple.png', cor: '#ffffff', titulo: 'Citrino Luz · Demandas' },
};

async function paginas(request, env, url) {
  const primeiro = url.pathname.split('/')[1];
  const ehPagina = url.pathname === '/' || Boolean(EMPRESAS[primeiro]) || primeiro === 'equipe' || primeiro === 'entrar';
  if (!ehPagina) return env.ASSETS.fetch(request);
  const html = await env.ASSETS.fetch(new Request(new URL('/', url), request));
  const marca = MARCAS_HTML[primeiro];
  if (!marca) return html;
  return new HTMLRewriter()
    .on('link[rel="manifest"]', { element: (el) => el.setAttribute('href', marca.manifest) })
    .on('link[rel="apple-touch-icon"]', { element: (el) => el.setAttribute('href', marca.icone) })
    .on('meta[name="theme-color"]', { element: (el) => el.setAttribute('content', marca.cor) })
    .on('meta[name="apple-mobile-web-app-title"]', { element: (el) => el.setAttribute('content', EMPRESAS[primeiro].nome) })
    .on('title', { element: (el) => el.setInnerContent(marca.titulo) })
    .on('html', { element: (el) => el.setAttribute('data-marca', primeiro) })
    .transform(html);
}

// ---------------- Arquivos (R2) — links públicos com nome aleatório, usados também pelo Instagram ----------------

async function midia(request, env, url) {
  const chave = decodeURIComponent(url.pathname.slice(3));
  if (!chave || chave.includes('..')) return new Response('Não encontrado', { status: 404 });
  if (request.method === 'HEAD') {
    const h = await env.MIDIA.head(chave);
    if (!h) return new Response(null, { status: 404 });
    return new Response(null, { headers: cabecalhosMidia(h, h.size) });
  }
  const temRange = request.headers.has('range');
  const obj = await env.MIDIA.get(chave, temRange ? { range: request.headers } : {});
  if (!obj) return new Response('Não encontrado', { status: 404 });
  const headers = cabecalhosMidia(obj, obj.size);
  if (temRange && obj.range) {
    const inicio = obj.range.offset ?? 0;
    const tamanho = obj.range.length ?? obj.size - inicio;
    headers.set('content-range', `bytes ${inicio}-${inicio + tamanho - 1}/${obj.size}`);
    headers.set('content-length', String(tamanho));
    return new Response(obj.body, { status: 206, headers });
  }
  return new Response(obj.body, { headers });
}

function cabecalhosMidia(obj, tamanho) {
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('accept-ranges', 'bytes');
  h.set('content-length', String(tamanho));
  h.set('cache-control', 'public, max-age=31536000, immutable');
  return h;
}

// ---------------- API ----------------

async function api(request, env, ctx, url) {
  const m = request.method;
  const p = url.pathname.replace(/\/+$/, '');
  const seg = p.split('/').slice(2); // depois de /api/

  // Proteção contra envio de formulários de outros sites
  if (m !== 'GET' && m !== 'HEAD') {
    const origem = request.headers.get('origin');
    if (origem && origem !== url.origin) falha(403, 'Origem não permitida.');
  }

  // ---- rotas abertas ----
  if (p === '/api/estado' && m === 'GET') {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM usuarios').first();
    const u = await usuarioAtual(request, env);
    return json({ configurado: n.n > 0, usuario: u ? publico(u) : null });
  }
  if (p === '/api/setup' && m === 'POST') return setup(request, env);
  if (p === '/api/entrar' && m === 'POST') return entrar(request, env);
  if (p === '/api/sair' && m === 'POST') return sair(request, env);
  if (p === '/api/instagram/retorno' && m === 'GET') return instagramRetorno(request, env, url);

  // ---- daqui pra baixo precisa estar logado ----
  const eu = await usuarioAtual(request, env);
  if (!eu) falha(401, 'Faça login para continuar.');

  if (p === '/api/meta' && m === 'GET') {
    return json({
      empresas: Object.values(EMPRESAS),
      status: STATUS,
      tipos: TIPOS,
      papeis: PAPEIS,
      loginInstagram: Boolean(env.IG_APP_ID && env.IG_APP_SECRET),
    });
  }

  if (seg[0] === 'eu') return rotasEu(request, env, eu, seg, m);
  if (seg[0] === 'usuarios') return rotasUsuarios(request, env, eu, seg, m);
  if (seg[0] === 'push') return rotasPush(request, env, ctx, eu, seg, m);
  if (seg[0] === 'notificacoes') return rotasNotificacoes(request, env, eu, seg, m, url);
  if (seg[0] === 'demandas') return rotasDemandas(request, env, ctx, eu, seg, m, url);
  if (seg[0] === 'anexos') return rotasAnexos(request, env, eu, seg, m);
  if (seg[0] === 'instagram') return rotasInstagram(request, env, ctx, eu, seg, m, url);
  if (seg[0] === 'estrategias') return rotasEstrategias(request, env, ctx, eu, seg, m, url);
  if (seg[0] === 'importar' && seg[1] === 'notion' && m === 'POST') return importarNotion(request, env, ctx, eu);
  if (seg[0] === 'importar' && seg[1] === 'notion' && m === 'GET') {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM demandas WHERE origem LIKE ?').bind('notion:%').first();
    return json({ ja_importadas: r.n });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Login ----------------

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, trocar_senha: !!u.trocar_senha });

async function usuarioAtual(request, env) {
  const auth = request.headers.get('authorization') || '';
  // aceita API_TOKEN (nome padrão) ou API_TOKEN1 (nome usado no painel do Cloudflare)
  const chaveApi = env.API_TOKEN || env.API_TOKEN1;
  if (chaveApi && /^Bearer\s/i.test(auth) && iguais(auth.replace(/^(Bearer\s+)+/i, '').trim(), String(chaveApi).trim())) {
    return { id: 0, nome: 'Claude', email: 'claude@plataforma', papel: 'admin', trocar_senha: 0 };
  }
  const token = lerCookie(request, 'sessao');
  if (!token) return null;
  const h = await sha256(token);
  const s = await env.DB.prepare(
    'SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ? AND u.ativo = 1'
  )
    .bind(h, Date.now())
    .first();
  return s || null;
}

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 8) falha(400, 'A senha precisa ter pelo menos 8 caracteres.');
}
const limparEmail = (e) => String(e || '').trim().toLowerCase();

async function criarSessao(env, usuarioId) {
  const token = b64url(aleatorio(32));
  await env.DB.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)')
    .bind(await sha256(token), usuarioId, Date.now() + SESSAO_DIAS * DIA)
    .run();
  return `sessao=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSAO_DIAS * 86400}`;
}

async function setup(request, env) {
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM usuarios').first();
  if (n.n > 0) falha(403, 'A plataforma já foi configurada.');
  const { nome, email, senha } = await lerJson(request);
  if (!nome || !limparEmail(email).includes('@')) falha(400, 'Preencha nome e e-mail.');
  validarSenha(senha);
  const { hash, salt } = await hashSenha(senha);
  const r = await env.DB.prepare("INSERT INTO usuarios (nome, email, senha_hash, senha_salt, papel) VALUES (?, ?, ?, ?, 'admin')")
    .bind(String(nome).trim(), limparEmail(email), hash, salt)
    .run();
  const cookie = await criarSessao(env, r.meta.last_row_id);
  return json({ ok: true }, 200, { 'set-cookie': cookie });
}

async function entrar(request, env) {
  const { email, senha } = await lerJson(request);
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE email = ?').bind(limparEmail(email)).first();
  const erro = () => falha(401, 'E-mail ou senha incorretos.');
  if (!u || !u.ativo) erro();
  if (u.bloqueado_ate > Date.now()) falha(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.');
  const { hash } = await hashSenha(String(senha || ''), u.senha_salt);
  if (!iguais(hash, u.senha_hash)) {
    const falhas = u.falhas + 1;
    await env.DB.prepare('UPDATE usuarios SET falhas = ?, bloqueado_ate = ? WHERE id = ?')
      .bind(falhas >= 5 ? 0 : falhas, falhas >= 5 ? Date.now() + 15 * 60000 : 0, u.id)
      .run();
    erro();
  }
  await env.DB.prepare('UPDATE usuarios SET falhas = 0, bloqueado_ate = 0 WHERE id = ?').bind(u.id).run();
  await env.DB.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(Date.now()).run();
  const cookie = await criarSessao(env, u.id);
  return json({ ok: true, usuario: publico(u) }, 200, { 'set-cookie': cookie });
}

async function sair(request, env) {
  const token = lerCookie(request, 'sessao');
  if (token) await env.DB.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': 'sessao=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
}

async function rotasEu(request, env, eu, seg, m) {
  if (seg.length === 1 && m === 'GET') return json(publico(eu));
  if (seg[1] === 'senha' && m === 'POST') {
    if (!eu.id) falha(400, 'Usuário de API não tem senha.');
    const { atual, nova } = await lerJson(request);
    const { hash } = await hashSenha(String(atual || ''), eu.senha_salt);
    if (!iguais(hash, eu.senha_hash)) falha(400, 'A senha atual está incorreta.');
    validarSenha(nova);
    const n = await hashSenha(nova);
    await env.DB.prepare('UPDATE usuarios SET senha_hash = ?, senha_salt = ?, trocar_senha = 0 WHERE id = ?').bind(n.hash, n.salt, eu.id).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

async function rotasUsuarios(request, env, eu, seg, m) {
  if (seg.length === 1 && m === 'GET') {
    const r = await env.DB.prepare('SELECT id, nome, email, papel, ativo FROM usuarios ORDER BY nome').all();
    return json(r.results);
  }
  if (eu.papel !== 'admin') falha(403, 'Só administradores podem gerenciar a equipe.');
  if (seg.length === 1 && m === 'POST') {
    const { nome, email, papel = 'equipe', senha } = await lerJson(request);
    if (!nome || !limparEmail(email).includes('@')) falha(400, 'Preencha nome e e-mail.');
    if (!PAPEIS.includes(papel)) falha(400, 'Papel inválido.');
    const senhaInicial = senha || b64url(aleatorio(9));
    validarSenha(senhaInicial);
    const existe = await env.DB.prepare('SELECT id FROM usuarios WHERE email = ?').bind(limparEmail(email)).first();
    if (existe) falha(409, 'Já existe alguém com esse e-mail.');
    const { hash, salt } = await hashSenha(senhaInicial);
    await env.DB.prepare('INSERT INTO usuarios (nome, email, senha_hash, senha_salt, papel, trocar_senha) VALUES (?, ?, ?, ?, ?, 1)')
      .bind(String(nome).trim(), limparEmail(email), hash, salt, papel)
      .run();
    return json({ ok: true, senha_inicial: senhaInicial });
  }
  const id = Number(seg[1]);
  if (seg.length === 2 && m === 'PATCH') {
    const dados = await lerJson(request);
    if (id === eu.id && (dados.papel && dados.papel !== 'admin' || dados.ativo === false)) falha(400, 'Você não pode tirar o seu próprio acesso de administrador.');
    if (dados.papel && !PAPEIS.includes(dados.papel)) falha(400, 'Papel inválido.');
    if (dados.papel) await env.DB.prepare('UPDATE usuarios SET papel = ? WHERE id = ?').bind(dados.papel, id).run();
    if (typeof dados.ativo === 'boolean') {
      await env.DB.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').bind(dados.ativo ? 1 : 0, id).run();
      if (!dados.ativo) await env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(id).run();
    }
    let senha_nova = null;
    if (dados.redefinir_senha) {
      senha_nova = b64url(aleatorio(9));
      const { hash, salt } = await hashSenha(senha_nova);
      await env.DB.prepare('UPDATE usuarios SET senha_hash = ?, senha_salt = ?, trocar_senha = 1, falhas = 0, bloqueado_ate = 0 WHERE id = ?').bind(hash, salt, id).run();
      await env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(id).run();
    }
    return json({ ok: true, senha_nova });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Aparelhos (push) e notificações ----------------

async function rotasPush(request, env, ctx, eu, seg, m) {
  if (seg[1] === 'chave' && m === 'GET') return json({ chave: (await chavesVapid(env)).publica });
  if (!eu.id) falha(400, 'Usuário de API não recebe notificações.');
  if (seg[1] === 'inscrever' && m === 'POST') {
    const { inscricao, empresas = Object.keys(EMPRESAS), nome = '' } = await lerJson(request);
    if (!inscricao?.endpoint || !inscricao?.keys?.p256dh || !inscricao?.keys?.auth) falha(400, 'Inscrição inválida.');
    if (!/^https:\/\//.test(inscricao.endpoint)) falha(400, 'Endereço de push inválido.');
    const emp = empresas.filter((e) => EMPRESAS[e]);
    await env.DB.prepare(
      `INSERT INTO dispositivos (usuario_id, endpoint, p256dh, auth, empresas, nome) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth, empresas = excluded.empresas, nome = excluded.nome`
    )
      .bind(eu.id, inscricao.endpoint, inscricao.keys.p256dh, inscricao.keys.auth, JSON.stringify(emp), String(nome).slice(0, 80))
      .run();
    return json({ ok: true });
  }
  if (seg[1] === 'cancelar' && m === 'POST') {
    const { endpoint } = await lerJson(request);
    await env.DB.prepare('DELETE FROM dispositivos WHERE endpoint = ? AND usuario_id = ?').bind(endpoint, eu.id).run();
    return json({ ok: true });
  }
  if (seg[1] === 'aparelhos' && m === 'GET') {
    const r = await env.DB.prepare('SELECT id, nome, empresas, criado_em, endpoint FROM dispositivos WHERE usuario_id = ? ORDER BY id').bind(eu.id).all();
    return json(r.results.map((d) => ({ ...d, empresas: JSON.parse(d.empresas) })));
  }
  if (seg[1] === 'teste' && m === 'POST') {
    const { enviarPush } = await import('./push.js');
    const disp = (await env.DB.prepare('SELECT * FROM dispositivos WHERE usuario_id = ?').bind(eu.id).all()).results;
    const r = await Promise.all(disp.map((d) => enviarPush(env, d, { titulo: 'Notificações ativadas ✅', corpo: 'Este aparelho vai receber os avisos das demandas.', url: '/' })));
    return json({ enviados: r.filter((x) => x === 'ok').length, total: disp.length });
  }
  falha(404, 'Rota não encontrada.');
}

async function rotasNotificacoes(request, env, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY id DESC LIMIT 60').bind(eu.id).all();
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM notificacoes WHERE usuario_id = ? AND lida = 0').bind(eu.id).first();
    return json({ itens: r.results, nao_lidas: n.n });
  }
  if (seg[1] === 'lidas' && m === 'POST') {
    await env.DB.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?').bind(eu.id).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Demandas ----------------

const CAMPOS_EDITAVEIS = ['titulo', 'descricao', 'tipo', 'responsavel_id', 'prazo', 'legenda', 'links'];

async function carregarDemanda(env, id) {
  const d = await env.DB.prepare('SELECT * FROM demandas WHERE id = ? AND arquivada = 0').bind(id).first();
  if (!d) falha(404, 'Demanda não encontrada.');
  return d;
}

const registrar = (env, demandaId, usuarioId, acao, de = null, para = null) =>
  env.DB.prepare('INSERT INTO historico (demanda_id, usuario_id, acao, de, para) VALUES (?, ?, ?, ?, ?)').bind(demandaId, usuarioId || null, acao, de, para).run();

function normalizarLinks(links) {
  if (!Array.isArray(links)) return '[]';
  const ok = links
    .map((l) => (typeof l === 'string' ? { url: l } : l))
    .filter((l) => l && /^https?:\/\//i.test(String(l.url || '').trim()))
    .slice(0, 30)
    .map((l) => ({ url: String(l.url).trim().slice(0, 2000), titulo: String(l.titulo || '').slice(0, 120) }));
  return JSON.stringify(ok);
}

async function rotasDemandas(request, env, ctx, eu, seg, m, url) {
  // lista
  if (seg.length === 1 && m === 'GET') {
    const empresa = url.searchParams.get('empresa');
    if (!EMPRESAS[empresa]) falha(400, 'Empresa inválida.');
    const r = await env.DB.prepare(
      `SELECT d.*, u.nome AS responsavel_nome,
        (SELECT chave FROM anexos a WHERE a.demanda_id = d.id ORDER BY ordem, id LIMIT 1) AS capa,
        (SELECT mime FROM anexos a WHERE a.demanda_id = d.id ORDER BY ordem, id LIMIT 1) AS capa_mime,
        (SELECT COUNT(*) FROM anexos a WHERE a.demanda_id = d.id) AS n_anexos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.demanda_id = d.id) AS n_comentarios
       FROM demandas d LEFT JOIN usuarios u ON u.id = d.responsavel_id
       WHERE d.empresa = ? AND d.arquivada = 0 ORDER BY COALESCE(d.prazo, '9999'), d.id DESC`
    )
      .bind(empresa)
      .all();
    return json(r.results.map((d) => ({ ...d, links: JSON.parse(d.links || '[]') })));
  }

  // criar
  if (seg.length === 1 && m === 'POST') {
    const dados = await lerJson(request);
    if (!EMPRESAS[dados.empresa]) falha(400, 'Empresa inválida.');
    const titulo = String(dados.titulo || '').trim();
    if (!titulo) falha(400, 'Dê um título para a demanda.');
    const tipo = TIPOS.includes(dados.tipo) ? dados.tipo : 'post';
    const status = STATUS_IDS.includes(dados.status) && !['aprovado', 'agendado', 'publicado'].includes(dados.status) ? dados.status : 'briefing';
    const r = await env.DB.prepare(
      'INSERT INTO demandas (empresa, titulo, descricao, tipo, status, responsavel_id, prazo, legenda, links, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        dados.empresa,
        titulo.slice(0, 200),
        String(dados.descricao || ''),
        tipo,
        status,
        dados.responsavel_id || null,
        dados.prazo || null,
        String(dados.legenda || ''),
        normalizarLinks(dados.links),
        eu.id || null
      )
      .run();
    const id = r.meta.last_row_id;
    await registrar(env, id, eu.id, 'criou', null, status);
    ctx.waitUntil(notificar(env, { empresa: dados.empresa, demandaId: id, titulo: 'Nova demanda', corpo: `${eu.nome} adicionou “${titulo}”`, autorId: eu.id }));
    return json({ id });
  }

  const id = Number(seg[1]);
  if (!id) falha(404, 'Rota não encontrada.');

  // detalhe
  if (seg.length === 2 && m === 'GET') {
    const d = await carregarDemanda(env, id);
    const [anexos, comentarios, historico] = await Promise.all([
      env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ? ORDER BY ordem, id').bind(id).all(),
      env.DB.prepare('SELECT c.*, u.nome AS autor FROM comentarios c LEFT JOIN usuarios u ON u.id = c.usuario_id WHERE demanda_id = ? ORDER BY c.id').bind(id).all(),
      env.DB.prepare('SELECT h.*, u.nome AS autor FROM historico h LEFT JOIN usuarios u ON u.id = h.usuario_id WHERE demanda_id = ? ORDER BY h.id DESC LIMIT 100').bind(id).all(),
    ]);
    return json({ ...d, links: JSON.parse(d.links || '[]'), anexos: anexos.results, comentarios: comentarios.results, historico: historico.results });
  }

  // editar campos
  if (seg.length === 2 && m === 'PATCH') {
    const d = await carregarDemanda(env, id);
    const dados = await lerJson(request);
    const sets = [];
    const vals = [];
    for (const c of CAMPOS_EDITAVEIS) {
      if (!(c in dados)) continue;
      let v = dados[c];
      if (c === 'tipo' && !TIPOS.includes(v)) continue;
      if (c === 'titulo') {
        v = String(v || '').trim().slice(0, 200);
        if (!v) continue;
      }
      if (c === 'links') v = normalizarLinks(v);
      if (c === 'responsavel_id' || c === 'prazo') v = v || null;
      sets.push(`${c} = ?`);
      vals.push(v);
    }
    if (sets.length) {
      await env.DB.prepare(`UPDATE demandas SET ${sets.join(', ')}, atualizado_em = ? WHERE id = ?`).bind(...vals, agoraIso(), id).run();
      if ('responsavel_id' in dados && dados.responsavel_id && dados.responsavel_id !== d.responsavel_id) {
        const resp = await env.DB.prepare('SELECT nome FROM usuarios WHERE id = ?').bind(dados.responsavel_id).first();
        await registrar(env, id, eu.id, 'responsavel', null, resp?.nome || null);
        if (dados.responsavel_id !== eu.id)
          ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Você é responsável', corpo: `“${d.titulo}”`, autorId: eu.id, somente: (u) => u.id === Number(dados.responsavel_id) }));
      }
      if ('legenda' in dados && dados.legenda !== d.legenda) await registrar(env, id, eu.id, 'legenda');
      if ('prazo' in dados && (dados.prazo || null) !== d.prazo) await registrar(env, id, eu.id, 'prazo', d.prazo, dados.prazo || null);
    }
    return json({ ok: true });
  }

  // arquivar
  if (seg.length === 2 && m === 'DELETE') {
    const d = await carregarDemanda(env, id);
    if (d.status === 'agendado' && d.publicar_auto) falha(400, 'Cancele o agendamento antes de excluir.');
    await env.DB.prepare('UPDATE demandas SET arquivada = 1, atualizado_em = ? WHERE id = ?').bind(agoraIso(), id).run();
    await registrar(env, id, eu.id, 'arquivou');
    return json({ ok: true });
  }

  // mudar status
  if (seg[2] === 'status' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { status, comentario } = await lerJson(request);
    if (!STATUS_IDS.includes(status)) falha(400, 'Status inválido.');
    if (status === d.status) return json({ ok: true });
    if (status === 'aprovado' && !podeAprovar(eu)) falha(403, 'Só quem aprova (aprovador ou administrador) pode marcar como aprovado.');
    if (status === 'agendado') falha(400, 'Use o botão “Agendar” para escolher dia e hora.');
    if (d.status === 'agendado' && d.publicar_auto) falha(400, 'Cancele o agendamento antes de mudar o status.');
    const extra = status === 'aprovado' ? ', aprovado_por = ?, aprovado_em = ?' : '';
    const extraVals = status === 'aprovado' ? [eu.id || null, agoraIso()] : [];
    const publicado = status === 'publicado' ? ", publicado_em = COALESCE(publicado_em, strftime('%Y-%m-%dT%H:%M:%fZ','now'))" : '';
    await env.DB.prepare(`UPDATE demandas SET status = ?, atualizado_em = ?, erro_publicacao = NULL${extra}${publicado} WHERE id = ?`)
      .bind(status, agoraIso(), ...extraVals, id)
      .run();
    await registrar(env, id, eu.id, 'status', d.status, status);
    if (status === 'aprovado' && d.agendado_para) {
      const quando = new Date(d.agendado_para);
      const quandoTxt = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
      if (quando.getTime() > Date.now() - 60000) {
        await env.DB.prepare("UPDATE demandas SET status = 'agendado', lembrete_enviado = 0 WHERE id = ?").bind(id).run();
        await registrar(env, id, eu.id, 'agendou', 'aprovado', d.agendado_para);
        ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Aprovado e agendado ✅', corpo: `“${d.titulo}” ${d.publicar_auto ? 'será publicado sozinho' : 'tem lembrete de publicação'} em ${quandoTxt}.` }));
      } else {
        await env.DB.prepare('UPDATE demandas SET agendado_para = NULL WHERE id = ?').bind(id).run();
        ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Horário já passou', corpo: `“${d.titulo}” foi aprovado depois do horário marcado (${quandoTxt}). Agende de novo.` }));
      }
    }
    if (comentario && String(comentario).trim()) {
      await env.DB.prepare('INSERT INTO comentarios (demanda_id, usuario_id, texto) VALUES (?, ?, ?)').bind(id, eu.id || null, String(comentario).trim()).run();
    }
    const frases = {
      aprovacao: 'está aguardando aprovação',
      aprovado: 'foi aprovada ✅',
      ajustes: 'voltou para ajustes',
      producao: 'entrou em produção',
      publicado: 'foi publicada',
    };
    const corpo = `${eu.nome}: “${d.titulo}” ${frases[status] || `foi para ${statusNome(status)}`}${comentario ? ` — ${String(comentario).slice(0, 120)}` : ''}`;
    ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: statusNome(status), corpo, autorId: eu.id }));
    return json({ ok: true });
  }

  // comentar
  if (seg[2] === 'comentarios' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { texto } = await lerJson(request);
    const t = String(texto || '').trim();
    if (!t) falha(400, 'Escreva o comentário.');
    await env.DB.prepare('INSERT INTO comentarios (demanda_id, usuario_id, texto) VALUES (?, ?, ?)').bind(id, eu.id || null, t.slice(0, 5000)).run();
    ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Novo comentário', corpo: `${eu.nome} em “${d.titulo}”: ${t.slice(0, 140)}`, autorId: eu.id }));
    return json({ ok: true });
  }

  // anexar arquivo (corpo = o próprio arquivo)
  if (seg[2] === 'anexos' && seg.length === 3 && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const mime = (request.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
    const tamanho = Number(request.headers.get('content-length') || 0);
    if (!tamanho) falha(411, 'Tamanho do arquivo não informado.');
    if (tamanho > 95 * 1024 * 1024) falha(413, 'Arquivo maior que 95 MB. Para vídeos grandes, comprima ou cole o link.');
    const nome = decodeURIComponent(request.headers.get('x-nome') || 'arquivo').slice(0, 200);
    const ext = (nome.match(/\.([a-z0-9]{1,5})$/i)?.[1] || mime.split('/')[1] || 'bin').toLowerCase();
    const chave = `${d.empresa}/${id}/${crypto.randomUUID()}.${ext}`;
    await env.MIDIA.put(chave, request.body, { httpMetadata: { contentType: mime } });
    const ordem = await env.DB.prepare('SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM anexos WHERE demanda_id = ?').bind(id).first();
    const r = await env.DB.prepare('INSERT INTO anexos (demanda_id, chave, nome, mime, tamanho, ordem) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, chave, nome, mime, tamanho, ordem.o)
      .run();
    await registrar(env, id, eu.id, 'anexou', null, nome);
    return json({ id: r.meta.last_row_id, chave });
  }

  // anexar direto do Google Drive (arquivo original, sem passar pelo limite de envio de 95 MB)
  if (seg[2] === 'anexos' && seg[3] === 'drive' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { link, nome: nomeInformado } = await lerJson(request);
    const r = await anexarDoDrive(env, d, link, nomeInformado);
    await registrar(env, id, eu.id, 'anexou do Drive', null, r.nome);
    return json(r);
  }

  // reordenar anexos
  if (seg[2] === 'anexos' && seg[3] === 'ordem' && m === 'POST') {
    await carregarDemanda(env, id);
    const { ids } = await lerJson(request);
    if (!Array.isArray(ids)) falha(400, 'Envie a lista de anexos.');
    await env.DB.batch(ids.map((a, i) => env.DB.prepare('UPDATE anexos SET ordem = ? WHERE id = ? AND demanda_id = ?').bind(i, Number(a), id)));
    return json({ ok: true });
  }

  // agendar publicação
  if (seg[2] === 'agendar' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { agendado_para, publicar_auto = true, apos_aprovacao = false } = await lerJson(request);
    const quando = new Date(agendado_para);
    if (isNaN(quando)) falha(400, 'Escolha dia e hora.');
    if (quando.getTime() < Date.now() - 60000) falha(400, 'Escolha um horário no futuro.');
    const jaAprovada = ['aprovado', 'agendado'].includes(d.status);
    // Pré-agendamento: guarda o horário, mas só publica depois que alguém aprovar.
    const preAgendar = !jaAprovada && (apos_aprovacao || !podeAprovar(eu));
    if (publicar_auto) {
      const conta = await env.DB.prepare('SELECT token FROM instagram WHERE empresa = ?').bind(d.empresa).first();
      if (!conta?.token) falha(400, 'Conecte o Instagram desta marca (aba Perfil) para publicar automaticamente.');
      const anexos = (await env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ?').bind(id).all()).results;
      const erro = ig.validarParaPublicar(d, anexos);
      if (erro) falha(400, erro);
    }
    const quandoTxt = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    if (preAgendar) {
      await env.DB.prepare(
        'UPDATE demandas SET agendado_para = ?, publicar_auto = ?, lembrete_enviado = 0, erro_publicacao = NULL, ig_container = NULL, atualizado_em = ? WHERE id = ?'
      )
        .bind(quando.toISOString(), publicar_auto ? 1 : 0, agoraIso(), id)
        .run();
      await registrar(env, id, eu.id, 'pré-agendou', d.status, quando.toISOString());
      ctx.waitUntil(
        notificar(env, {
          empresa: d.empresa,
          demandaId: id,
          titulo: 'Agendado após aprovação',
          corpo: `“${d.titulo}” está marcado para ${quandoTxt}. Só publica depois de aprovado.`,
          autorId: eu.id,
        })
      );
      return json({ ok: true, pre_agendado: true });
    }
    await env.DB.prepare(
      "UPDATE demandas SET status = 'agendado', agendado_para = ?, publicar_auto = ?, lembrete_enviado = 0, erro_publicacao = NULL, ig_container = NULL, atualizado_em = ? WHERE id = ?"
    )
      .bind(quando.toISOString(), publicar_auto ? 1 : 0, agoraIso(), id)
      .run();
    await registrar(env, id, eu.id, 'agendou', d.status, quando.toISOString());
    ctx.waitUntil(
      notificar(env, {
        empresa: d.empresa,
        demandaId: id,
        titulo: 'Agendado',
        corpo: `“${d.titulo}” ${publicar_auto ? 'será publicado sozinho' : 'tem lembrete de publicação'} em ${quandoTxt}`,
        autorId: eu.id,
      })
    );
    return json({ ok: true });
  }

  if (seg[2] === 'cancelar-agendamento' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    if (d.status !== 'agendado' && d.agendado_para && d.status !== 'publicado') {
      await env.DB.prepare('UPDATE demandas SET agendado_para = NULL, publicar_auto = 0, atualizado_em = ? WHERE id = ?').bind(agoraIso(), id).run();
      await registrar(env, id, eu.id, 'cancelou agendamento');
      return json({ ok: true });
    }
    if (d.status !== 'agendado') falha(400, 'Esta demanda não está agendada.');
    if (d.publicando && d.publicando > Date.now() - 15 * 60000) falha(409, 'A publicação já está em andamento.');
    await env.DB.prepare("UPDATE demandas SET status = 'aprovado', agendado_para = NULL, publicar_auto = 0, ig_container = NULL, atualizado_em = ? WHERE id = ?")
      .bind(agoraIso(), id)
      .run();
    await registrar(env, id, eu.id, 'cancelou agendamento');
    ctx.waitUntil(notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Agendamento cancelado', corpo: `${eu.nome} cancelou “${d.titulo}”`, autorId: eu.id }));
    return json({ ok: true });
  }

  if (seg[2] === 'publicar-agora' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    if (!['aprovado', 'agendado'].includes(d.status) && !podeAprovar(eu)) falha(400, 'A demanda precisa estar aprovada para publicar.');
    const conta = await env.DB.prepare('SELECT token FROM instagram WHERE empresa = ?').bind(d.empresa).first();
    if (!conta?.token) falha(400, 'Conecte o Instagram desta marca (aba Perfil) primeiro.');
    const anexos = (await env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ?').bind(id).all()).results;
    const erro = ig.validarParaPublicar(d, anexos);
    if (erro) falha(400, erro);
    await env.DB.prepare(
      "UPDATE demandas SET status = 'agendado', agendado_para = ?, publicar_auto = 1, erro_publicacao = NULL, ig_container = NULL, atualizado_em = ? WHERE id = ?"
    )
      .bind(agoraIso(), agoraIso(), id)
      .run();
    await registrar(env, id, eu.id, 'publicar agora');
    // A publicação roda na rotina de 5 minutos (que pode durar vários minutos). Fazer aqui seria cortado
    // pelo limite de 30 s do Cloudflare em carrosséis e vídeos, deixando a demanda travada.
    return json({ ok: true, mensagem: 'Vai para o Instagram em até 5 minutos. Você recebe um aviso quando sair.' });
  }

  falha(404, 'Rota não encontrada.');
}

async function rotasAnexos(request, env, eu, seg, m) {
  const id = Number(seg[1]);
  if (seg.length === 2 && m === 'DELETE') {
    const a = await env.DB.prepare('SELECT * FROM anexos WHERE id = ?').bind(id).first();
    if (!a) falha(404, 'Anexo não encontrado.');
    await env.MIDIA.delete(a.chave);
    await env.DB.prepare('DELETE FROM anexos WHERE id = ?').bind(id).run();
    await registrar(env, a.demanda_id, eu.id, 'removeu anexo', a.nome, null);
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Instagram ----------------

async function rotasInstagram(request, env, ctx, eu, seg, m, url) {
  const empresa = seg[1];
  if (!EMPRESAS[empresa]) falha(400, 'Empresa inválida.');

  if (seg.length === 2 && m === 'GET') {
    const c = await env.DB.prepare('SELECT * FROM instagram WHERE empresa = ?').bind(empresa).first();
    if (c?.token && (!c.sincronizado_em || Date.now() - c.sincronizado_em > 10 * 60000)) {
      ctx.waitUntil(ig.sincronizar(env, empresa).catch(() => {}));
    }
    return json({
      conectado: Boolean(c?.token),
      username: c?.username || null,
      perfil: c?.perfil ? JSON.parse(c.perfil) : null,
      midias: c?.midias ? JSON.parse(c.midias) : [],
      sincronizado_em: c?.sincronizado_em || null,
      token_expira_em: c?.token_expira_em || null,
      erro: c?.erro || null,
    });
  }

  if (seg[2] === 'sincronizar' && m === 'POST') {
    await ig.sincronizar(env, empresa);
    return json({ ok: true });
  }

  if (eu.papel !== 'admin') falha(403, 'Só administradores podem conectar ou desconectar o Instagram.');

  if (seg[2] === 'conectar' && m === 'GET') {
    if (!env.IG_APP_ID || !env.IG_APP_SECRET) falha(400, 'Configure IG_APP_ID e IG_APP_SECRET no Cloudflare (veja o README).');
    const estado = b64url(aleatorio(24));
    await env.DB.prepare('INSERT INTO oauth_estados (estado, empresa, usuario_id, expira_em) VALUES (?, ?, ?, ?)')
      .bind(estado, empresa, eu.id, Date.now() + 15 * 60000)
      .run();
    return Response.redirect(ig.urlAutorizacao(env, `${url.origin}/api/instagram/retorno`, estado), 302);
  }

  if (seg[2] === 'token' && m === 'POST') {
    const { token, ig_user_id } = await lerJson(request);
    if (!token || String(token).length < 20) falha(400, 'Cole o token completo.');
    let final = String(token).trim();
    const idConta = String(ig_user_id || '').replace(/\D/g, '') || null;
    let expira = null; // token do usuário do sistema (EAA…) não expira
    if (ig.ehTokenInstagram(final)) {
      expira = Date.now() + 60 * DIA;
      try {
        const r = await ig.renovarToken(final);
        final = r.token;
        expira = r.expiraEm;
      } catch {}
    } else if (!idConta) {
      falha(400, 'Para esse tipo de token, preencha também o ID da conta do Instagram (o número abaixo do nome no painel da Meta).');
    }
    try {
      const perfil = await ig.salvarConta(env, empresa, final, expira, idConta);
      return json({ ok: true, username: perfil.username });
    } catch (e) {
      falha(400, 'O Instagram não aceitou esse token: ' + e.message);
    }
  }

  if (seg.length === 2 && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM instagram WHERE empresa = ?').bind(empresa).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

async function instagramRetorno(request, env, url) {
  const estado = url.searchParams.get('state');
  const codigo = url.searchParams.get('code');
  const voltar = (empresa, msg) => Response.redirect(`${url.origin}/${empresa || ''}?aba=perfil&ig=${encodeURIComponent(msg)}`, 302);
  const e = estado ? await env.DB.prepare('SELECT * FROM oauth_estados WHERE estado = ?').bind(estado).first() : null;
  if (!e || e.expira_em < Date.now()) return voltar('', 'O login expirou. Tente de novo.');
  await env.DB.prepare('DELETE FROM oauth_estados WHERE estado = ?').bind(estado).run();
  if (!codigo) return voltar(e.empresa, url.searchParams.get('error_description') || 'Login cancelado.');
  try {
    const { token, expiraEm } = await ig.trocarCodigo(env, codigo.replace(/#_$/, ''), `${url.origin}/api/instagram/retorno`);
    const perfil = await ig.salvarConta(env, e.empresa, token, expiraEm);
    return voltar(e.empresa, `ok:@${perfil.username} conectado`);
  } catch (err) {
    return voltar(e.empresa, 'Não foi possível conectar: ' + err.message);
  }
}

// ---------------- Publicação no Instagram ----------------

async function publicarDemanda(env, id, autor = null) {
  // trava para duas rodadas não publicarem a mesma demanda
  // 'publicando' guarda o horário (ms) em que a publicação começou; uma trava com mais de 15 min é considerada abandonada
  const agoraMs = Date.now();
  const trava = await env.DB.prepare("UPDATE demandas SET publicando = ? WHERE id = ? AND (publicando = 0 OR publicando < ?) AND status = 'agendado'")
    .bind(agoraMs, id, agoraMs - 15 * 60000)
    .run();
  if (!trava.meta.changes) return;
  const d = await env.DB.prepare('SELECT * FROM demandas WHERE id = ?').bind(id).first();
  try {
    let container = d.ig_container;
    if (!container) {
      const anexos = (await env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ? ORDER BY ordem, id').bind(id).all()).results;
      const erro = ig.validarParaPublicar(d, anexos);
      if (erro) throw new Error(erro);
      container = await ig.prepararPublicacao(env, d, anexos);
      await env.DB.prepare('UPDATE demandas SET ig_container = ? WHERE id = ?').bind(container, id).run();
    }
    const r = await ig.concluirPublicacao(env, d.empresa, container);
    if (!r) return; // vídeo ainda processando: a próxima rodada (5 min) termina
    await env.DB.prepare(
      "UPDATE demandas SET status = 'publicado', publicado_em = ?, permalink = ?, ig_media_id = ?, ig_container = NULL, erro_publicacao = NULL, atualizado_em = ? WHERE id = ?"
    )
      .bind(agoraIso(), r.permalink, r.mediaId, agoraIso(), id)
      .run();
    await registrar(env, id, null, 'publicou no Instagram', 'agendado', 'publicado');
    await notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Publicado no Instagram ✅', corpo: `“${d.titulo}” está no ar.` });
    await ig.sincronizar(env, d.empresa).catch(() => {});
  } catch (e) {
    await env.DB.prepare(
      "UPDATE demandas SET status = 'aprovado', publicar_auto = 0, ig_container = NULL, erro_publicacao = ?, atualizado_em = ? WHERE id = ?"
    )
      .bind(e.message, agoraIso(), id)
      .run();
    await registrar(env, id, null, 'falha ao publicar', null, e.message.slice(0, 300));
    await notificar(env, { empresa: d.empresa, demandaId: id, titulo: 'Falha ao publicar ⚠️', corpo: `“${d.titulo}”: ${e.message}` });
  } finally {
    await env.DB.prepare('UPDATE demandas SET publicando = 0 WHERE id = ?').bind(id).run();
  }
}

// A cada 5 minutos: publica o que venceu, manda lembretes e atualiza o feed.
async function rotinaFrequente(env) {
  const agora = agoraIso();
  const vencidas = (
    await env.DB.prepare("SELECT id, publicar_auto, lembrete_enviado, empresa, titulo FROM demandas WHERE status = 'agendado' AND arquivada = 0 AND agendado_para <= ? AND (publicando = 0 OR publicando < ?)").bind(agora, Date.now() - 15 * 60000).all()
  ).results;
  for (const d of vencidas) {
    if (d.publicar_auto) {
      await publicarDemanda(env, d.id);
    } else if (!d.lembrete_enviado) {
      await env.DB.prepare('UPDATE demandas SET lembrete_enviado = 1 WHERE id = ?').bind(d.id).run();
      await notificar(env, { empresa: d.empresa, demandaId: d.id, titulo: 'Hora de publicar ⏰', corpo: `“${d.titulo}” está marcado para agora. Publique pelo app e marque como publicado.` });
    }
  }
  const semAprovacao = (
    await env.DB.prepare(
      "SELECT id, empresa, titulo FROM demandas WHERE status NOT IN ('agendado','aprovado','publicado') AND arquivada = 0 AND agendado_para IS NOT NULL AND agendado_para <= ? AND lembrete_enviado = 0"
    ).bind(agora).all()
  ).results;
  for (const d of semAprovacao) {
    await env.DB.prepare('UPDATE demandas SET lembrete_enviado = 1 WHERE id = ?').bind(d.id).run();
    await notificar(env, { empresa: d.empresa, demandaId: d.id, titulo: 'Não publicado ⚠️', corpo: `“${d.titulo}” chegou no horário marcado, mas ainda não foi aprovado. Aprove e agende de novo.` });
  }
  const contas = (await env.DB.prepare('SELECT empresa, sincronizado_em FROM instagram WHERE token IS NOT NULL').all()).results;
  for (const c of contas) {
    if (!c.sincronizado_em || Date.now() - c.sincronizado_em > 10 * 60000) await ig.sincronizar(env, c.empresa).catch(() => {});
  }
}

// Todo dia às 9h (Brasília): renova os tokens do Instagram e avisa sobre prazos.
async function rotinaDiaria(env) {
  const contas = (await env.DB.prepare('SELECT * FROM instagram WHERE token IS NOT NULL').all()).results;
  for (const c of contas) {
    if (ig.ehTokenInstagram(c.token) && c.token_expira_em && c.token_expira_em - Date.now() < 30 * DIA && Date.now() - (c.token_renovado_em || 0) > DIA) {
      try {
        const r = await ig.renovarToken(c.token);
        await env.DB.prepare('UPDATE instagram SET token = ?, token_expira_em = ?, token_renovado_em = ? WHERE empresa = ?').bind(r.token, r.expiraEm, Date.now(), c.empresa).run();
      } catch (e) {
        await notificar(env, {
          empresa: c.empresa,
          titulo: 'Reconecte o Instagram',
          corpo: `Não consegui renovar o acesso de @${c.username}: ${e.message}`,
          somente: (u) => u.papel === 'admin',
        });
      }
    }
  }

  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const amanha = new Date(Date.now() + DIA).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  for (const empresa of Object.keys(EMPRESAS)) {
    const abertas = (
      await env.DB.prepare(
        "SELECT titulo, prazo FROM demandas WHERE empresa = ? AND arquivada = 0 AND status NOT IN ('aprovado','agendado','publicado') AND prazo IS NOT NULL AND prazo <= ?"
      )
        .bind(empresa, amanha)
        .all()
    ).results;
    const atrasadas = abertas.filter((d) => d.prazo < hoje);
    const hojeL = abertas.filter((d) => d.prazo === hoje);
    const amanhaL = abertas.filter((d) => d.prazo === amanha);
    const partes = [];
    if (atrasadas.length) partes.push(`${atrasadas.length} atrasada(s)`);
    if (hojeL.length) partes.push(`${hojeL.length} vence(m) hoje`);
    if (amanhaL.length) partes.push(`${amanhaL.length} vence(m) amanhã`);
    if (partes.length) {
      await notificar(env, {
        empresa,
        titulo: 'Prazos do dia',
        corpo: `${partes.join(' · ')}: ${abertas.slice(0, 3).map((d) => d.titulo).join(', ')}${abertas.length > 3 ? '…' : ''}`,
      });
    }
  }
  await env.DB.prepare('DELETE FROM oauth_estados WHERE expira_em < ?').bind(Date.now()).run();
  await env.DB.prepare("DELETE FROM notificacoes WHERE criado_em < strftime('%Y-%m-%dT%H:%M:%fZ','now','-60 days')").run();
}


// ---------------- Estratégia do mês ----------------

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function rotasEstrategias(request, env, ctx, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const empresa = url.searchParams.get('empresa');
    if (!EMPRESAS[empresa]) falha(400, 'Empresa inválida.');
    const r = await env.DB.prepare('SELECT * FROM estrategias WHERE empresa = ? ORDER BY mes DESC, id DESC').bind(empresa).all();
    return json(r.results);
  }
  if (eu.papel === 'aprovador' && m !== 'GET') falha(403, 'Só a equipe e os administradores editam a estratégia.');
  if (seg.length === 1 && m === 'POST') {
    const { empresa, mes, titulo, conteudo = '', link = null } = await lerJson(request);
    if (!EMPRESAS[empresa]) falha(400, 'Empresa inválida.');
    if (!MES_RE.test(String(mes))) falha(400, 'Escolha o mês da estratégia.');
    const t = String(titulo || '').trim() || `Estratégia de ${nomeMes(mes)}`;
    const r = await env.DB.prepare('INSERT INTO estrategias (empresa, mes, titulo, conteudo, link, criado_por) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(empresa, mes, t.slice(0, 200), String(conteudo), link || null, eu.id || null)
      .run();
    ctx.waitUntil(notificar(env, { empresa, titulo: 'Estratégia do mês', corpo: `${eu.nome} publicou: ${t}`, autorId: eu.id }));
    return json({ id: r.meta.last_row_id });
  }
  const id = Number(seg[1]);
  const e = await env.DB.prepare('SELECT * FROM estrategias WHERE id = ?').bind(id).first();
  if (!e) falha(404, 'Estratégia não encontrada.');
  if (seg.length === 2 && m === 'PATCH') {
    const dados = await lerJson(request);
    const mes = dados.mes ?? e.mes;
    if (!MES_RE.test(String(mes))) falha(400, 'Mês inválido.');
    await env.DB.prepare('UPDATE estrategias SET mes = ?, titulo = ?, conteudo = ?, link = ?, atualizado_em = ? WHERE id = ?')
      .bind(mes, String(dados.titulo ?? e.titulo).slice(0, 200), String(dados.conteudo ?? e.conteudo), dados.link ?? e.link, agoraIso(), id)
      .run();
    return json({ ok: true });
  }
  if (seg.length === 2 && m === 'DELETE') {
    if (eu.papel !== 'admin') falha(403, 'Só administradores excluem a estratégia.');
    await env.DB.prepare('DELETE FROM estrategias WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

function nomeMes(mes) {
  const [a, m] = String(mes).split('-').map(Number);
  const n = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${a}`;
}

// ---------------- Importação do Notion ----------------
// O arquivo de importação (JSON gerado a partir do Notion) é enviado pela tela de configurações;
// o conteúdo dos clientes não fica no repositório. Reimportar não duplica: cada item tem 'origem'.

async function importarNotion(request, env, ctx, eu) {
  if (eu.papel !== 'admin') falha(403, 'Só administradores podem importar.');
  if (Number(request.headers.get('content-length') || 0) > 5 * 1024 * 1024) falha(413, 'Arquivo grande demais.');
  const dadosNotion = await lerJson(request);
  if (!Array.isArray(dadosNotion?.demandas) || !Array.isArray(dadosNotion?.estrategias)) falha(400, 'Arquivo de importação inválido.');
  const validoD = (d) => d && EMPRESAS[d.empresa] && typeof d.titulo === 'string' && d.titulo.trim() && /^(notion|manual):/.test(String(d.origem || ''));
  // status permitidos na importação (aprovado/agendado/publicado continuam exigindo a ação na plataforma)
  const statusImport = (st) => (['briefing', 'producao', 'aprovacao', 'ajustes'].includes(st) ? st : 'briefing');
  const validoE = (e) => e && EMPRESAS[e.empresa] && /^\d{4}-(0[1-9]|1[0-2])$/.test(String(e.mes)) && /^(notion|manual):/.test(String(e.origem || ''));
  dadosNotion.demandas = dadosNotion.demandas.filter(validoD).slice(0, 500);
  dadosNotion.estrategias = dadosNotion.estrategias.filter(validoE).slice(0, 50);
  const usuarios = (await env.DB.prepare('SELECT id, nome FROM usuarios WHERE ativo = 1').all()).results;
  const acharUsuario = (nome) => {
    if (!nome) return null;
    const alvo = nome.trim().toLowerCase();
    return usuarios.find((u) => u.nome.trim().toLowerCase().split(/\s+/)[0] === alvo)?.id || null;
  };
  const existentes = new Set(
    (await env.DB.prepare("SELECT origem FROM demandas WHERE origem IS NOT NULL UNION ALL SELECT origem FROM estrategias WHERE origem IS NOT NULL").all()).results.map((r) => r.origem)
  );
  const stmts = [];
  let novasDemandas = 0;
  let novasEstrategias = 0;
  for (const d of dadosNotion.demandas) {
    if (existentes.has(d.origem)) continue;
    novasDemandas++;
    stmts.push(
      env.DB.prepare(
        "INSERT INTO demandas (empresa, titulo, descricao, tipo, status, responsavel_id, prazo, legenda, links, criado_por, origem) VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)"
      ).bind(d.empresa, d.titulo.slice(0, 200), String(d.descricao || ''), TIPOS.includes(d.tipo) ? d.tipo : 'post', statusImport(d.status), acharUsuario(d.responsavel), /^\d{4}-\d{2}-\d{2}$/.test(d.prazo || '') ? d.prazo : null, normalizarLinks(d.links), eu.id || null, d.origem)
    );
  }
  for (const e of dadosNotion.estrategias) {
    if (existentes.has(e.origem)) continue;
    novasEstrategias++;
    stmts.push(
      env.DB.prepare('INSERT INTO estrategias (empresa, mes, titulo, conteudo, link, origem, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
        e.empresa, e.mes, String(e.titulo || 'Estratégia do mês').slice(0, 200), String(e.conteudo || ''), /^https?:\/\//.test(e.link || '') ? e.link : null, e.origem, eu.id || null
      )
    );
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  await env.DB.prepare(
    "INSERT INTO historico (demanda_id, usuario_id, acao, de, para) SELECT id, ?, 'importou do Notion', NULL, NULL FROM demandas d WHERE origem LIKE 'notion:%' AND NOT EXISTS (SELECT 1 FROM historico h WHERE h.demanda_id = d.id AND h.acao = 'importou do Notion')"
  ).bind(eu.id || null).run();
  if (novasDemandas || novasEstrategias) {
    ctx.waitUntil(
      notificar(env, { empresa: null, titulo: 'Importação', corpo: `${novasDemandas} demanda(s) e ${novasEstrategias} estratégia(s) foram importadas.`, autorId: eu.id })
    );
  }
  return json({ ok: true, demandas: novasDemandas, estrategias: novasEstrategias });
}


// ---------------- Anexar do Google Drive ----------------
// A plataforma baixa o arquivo direto do Drive e grava no R2 byte a byte (sem recompressão).
// O arquivo precisa estar aberto para "qualquer pessoa com o link".

function idDoDrive(link) {
  const t = String(link || '').trim();
  if (/^[\w-]{20,}$/.test(t)) return t;
  let u;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.com$/.test(u.hostname)) return null;
  return u.pathname.match(/\/d\/([\w-]{20,})/)?.[1] || u.searchParams.get('id') || null;
}

function nomeDoCabecalho(cd) {
  if (!cd) return null;
  const utf = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) {
    try {
      return decodeURIComponent(utf[1].trim().replace(/^"|"$/g, ''));
    } catch {}
  }
  return cd.match(/filename="?([^";]+)"?/i)?.[1] || null;
}

async function anexarDoDrive(env, d, link, nomeInformado) {
  const idArquivo = idDoDrive(link);
  if (!idArquivo) falha(400, 'Cole o link de um arquivo do Google Drive (drive.google.com/file/d/...).');
  let resp;
  try {
    resp = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(idArquivo)}&export=download&confirm=t`, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (plataforma-alldres)' },
    });
  } catch (e) {
    falha(502, 'Não consegui acessar o Google Drive agora: ' + e.message);
  }
  const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!resp.ok || tipo.startsWith('text/html')) {
    try { await resp.body?.cancel(); } catch {}
    falha(400, 'O Drive não liberou o download. Confira se o arquivo está como "Qualquer pessoa com o link".');
  }
  const tamanho = Number(resp.headers.get('content-length') || 0);
  if (!tamanho) {
    try { await resp.body?.cancel(); } catch {}
    falha(502, 'O Drive não informou o tamanho do arquivo. Tente de novo em alguns minutos.');
  }
  const nome = String(nomeInformado || nomeDoCabecalho(resp.headers.get('content-disposition')) || `drive-${idArquivo}`).slice(0, 200);
  const ext = (nome.match(/\.([a-z0-9]{1,5})$/i)?.[1] || tipo.split('/')[1] || 'bin').toLowerCase();
  const mime = tipo && tipo !== 'application/octet-stream' ? tipo : ext === 'mov' ? 'video/quicktime' : ext === 'mp4' ? 'video/mp4' : 'application/octet-stream';
  const chave = `${d.empresa}/${d.id}/${crypto.randomUUID()}.${ext}`;
  // FixedLengthStream garante ao R2 o tamanho exato e falha se o download vier incompleto
  const { readable, writable } = new FixedLengthStream(tamanho);
  const copia = resp.body.pipeTo(writable);
  await env.MIDIA.put(chave, readable, { httpMetadata: { contentType: mime } });
  await copia;
  const gravado = await env.MIDIA.head(chave);
  if (!gravado || gravado.size !== tamanho) {
    await env.MIDIA.delete(chave);
    falha(502, 'O download do Drive veio incompleto. Tente de novo.');
  }
  const ordem = await env.DB.prepare('SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM anexos WHERE demanda_id = ?').bind(d.id).first();
  const r = await env.DB.prepare('INSERT INTO anexos (demanda_id, chave, nome, mime, tamanho, ordem) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(d.id, chave, nome, mime, tamanho, ordem.o)
    .run();
  return { id: r.meta.last_row_id, chave, nome, mime, tamanho };
}
