// Plataforma Flamme — servidor (Cloudflare Worker).
// Clientes da agência, estratégia do mês, demandas, aprovação (equipe e link para o cliente),
// organização estilo Notion, IA por cliente, Instagram (publicação e painel).

import { migrar, STATUS, STATUS_IDS, TIPOS, CEREBRO, statusNome, setConfig, agoraIso, hojeSP, mesSP, carregarCliente, lerJsonSeguro } from './db.js';
import { json, falha, ErroHttp, lerJson, lerCookie, hashSenha, iguais, sha256, aleatorio, b64url } from './util.js';
import { notificar } from './notificar.js';
import { chavesVapid } from './push.js';
import * as ig from './instagram.js';
import * as ia from './ia.js';

const DIA = 86400000;
const SESSAO_DIAS = 30;
const PAPEIS = ['admin', 'equipe', 'aprovador'];
const podeAprovar = (u) => u.papel === 'admin' || u.papel === 'aprovador';
const ROTAS_APP = new Set(['', 'c', 'entrar', 'config', 'organizacao', 'aprovar']);

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
      const primeiro = url.pathname.split('/')[1];
      if (ROTAS_APP.has(primeiro)) return env.ASSETS.fetch(new Request(new URL('/', url), request));
      return env.ASSETS.fetch(request);
    } catch (e) {
      if (e instanceof ErroHttp) return json({ erro: e.message }, e.status);
      console.log('erro', e.stack || e.message);
      return json({ erro: 'Erro interno: ' + e.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    await migrar(env);
    if (event.cron === '0 12 * * *') ctx.waitUntil(rotinaDiaria(env));
    else ctx.waitUntil(rotinaFrequente(env));
  },
};

// ---------------- Arquivos (R2): links públicos com nome aleatório, usados também pelo Instagram ----------------

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

async function guardarArquivo(request, env, prefixo) {
  const mime = (request.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
  const tamanho = Number(request.headers.get('content-length') || 0);
  if (!tamanho) falha(411, 'Tamanho do arquivo não informado.');
  if (tamanho > 95 * 1024 * 1024) falha(413, 'Arquivo maior que 95 MB. Para vídeos grandes, comprima ou cole o link do Drive.');
  const nome = decodeURIComponent(request.headers.get('x-nome') || 'arquivo').slice(0, 200);
  const ext = (nome.match(/\.([a-z0-9]{1,5})$/i)?.[1] || mime.split('/')[1] || 'bin').toLowerCase();
  const chave = `${prefixo}/${crypto.randomUUID()}.${ext}`;
  await env.MIDIA.put(chave, request.body, { httpMetadata: { contentType: mime } });
  return { chave, nome, mime, tamanho };
}

// ---------------- API ----------------

async function api(request, env, ctx, url) {
  const m = request.method;
  const p = url.pathname.replace(/\/+$/, '');
  const seg = p.split('/').slice(2); // depois de /api/

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
  if (seg[0] === 'publico') return rotasPublicas(request, env, ctx, seg, m);

  // ---- daqui pra baixo precisa estar logado ----
  const eu = await usuarioAtual(request, env);
  if (!eu) falha(401, 'Faça login para continuar.');

  if (p === '/api/meta' && m === 'GET') {
    return json({
      status: STATUS,
      tipos: TIPOS,
      papeis: PAPEIS,
      cerebro: CEREBRO,
      modos_ia: Object.entries(ia.MODOS).map(([id, v]) => ({ id, nome: v.nome })),
      ia_configurada: Boolean(env.ANTHROPIC_API_KEY),
      loginInstagram: Boolean(env.IG_APP_ID && env.IG_APP_SECRET),
    });
  }

  if (seg[0] === 'eu') return rotasEu(request, env, eu, seg, m);
  if (seg[0] === 'usuarios') return rotasUsuarios(request, env, eu, seg, m);
  if (seg[0] === 'push') return rotasPush(request, env, eu, seg, m);
  if (seg[0] === 'notificacoes') return rotasNotificacoes(request, env, eu, seg, m);
  if (seg[0] === 'resumo') return resumoAgencia(env);
  if (seg[0] === 'clientes') return rotasClientes(request, env, ctx, eu, seg, m);
  if (seg[0] === 'demandas') return rotasDemandas(request, env, ctx, eu, seg, m, url);
  if (seg[0] === 'anexos') return rotasAnexos(request, env, eu, seg, m);
  if (seg[0] === 'aprovacoes') return rotasAprovacoes(request, env, eu, seg, m, url);
  if (seg[0] === 'paginas') return rotasPaginas(request, env, eu, seg, m, url);
  if (seg[0] === 'ia') return rotasIa(request, env, eu, seg, m, url);
  if (seg[0] === 'instagram') return rotasInstagram(request, env, ctx, eu, seg, m, url);
  falha(404, 'Rota não encontrada.');
}

// ---------------- Login ----------------

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, trocar_senha: !!u.trocar_senha });

async function usuarioAtual(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (env.API_TOKEN && auth.startsWith('Bearer ') && iguais(auth.slice(7), env.API_TOKEN)) {
    return { id: 0, nome: 'Claude', email: 'claude@plataforma', papel: 'admin', trocar_senha: 0 };
  }
  const token = lerCookie(request, 'sessao');
  if (!token) return null;
  const h = await sha256(token);
  const s = await env.DB.prepare('SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ? AND u.ativo = 1')
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
    const { nome, email, papel = 'admin', senha } = await lerJson(request);
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
    if (id === eu.id && ((dados.papel && dados.papel !== 'admin') || dados.ativo === false)) falha(400, 'Você não pode tirar o seu próprio acesso de administrador.');
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

async function rotasPush(request, env, eu, seg, m) {
  if (seg[1] === 'chave' && m === 'GET') return json({ chave: (await chavesVapid(env)).publica });
  if (!eu.id) falha(400, 'Usuário de API não recebe notificações.');
  if (seg[1] === 'inscrever' && m === 'POST') {
    const { inscricao, nome = '' } = await lerJson(request);
    if (!inscricao?.endpoint || !inscricao?.keys?.p256dh || !inscricao?.keys?.auth) falha(400, 'Inscrição inválida.');
    if (!/^https:\/\//.test(inscricao.endpoint)) falha(400, 'Endereço de push inválido.');
    await env.DB.prepare(
      `INSERT INTO dispositivos (usuario_id, endpoint, p256dh, auth, nome) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth, nome = excluded.nome`
    )
      .bind(eu.id, inscricao.endpoint, inscricao.keys.p256dh, inscricao.keys.auth, String(nome).slice(0, 80))
      .run();
    return json({ ok: true });
  }
  if (seg[1] === 'cancelar' && m === 'POST') {
    const { endpoint } = await lerJson(request);
    await env.DB.prepare('DELETE FROM dispositivos WHERE endpoint = ? AND usuario_id = ?').bind(endpoint, eu.id).run();
    return json({ ok: true });
  }
  if (seg[1] === 'aparelhos' && m === 'GET') {
    const r = await env.DB.prepare('SELECT id, nome, criado_em, endpoint FROM dispositivos WHERE usuario_id = ? ORDER BY id').bind(eu.id).all();
    return json(r.results);
  }
  if (seg[1] === 'teste' && m === 'POST') {
    const { enviarPush } = await import('./push.js');
    const disp = (await env.DB.prepare('SELECT * FROM dispositivos WHERE usuario_id = ?').bind(eu.id).all()).results;
    const r = await Promise.all(disp.map((d) => enviarPush(env, d, { titulo: 'Notificações ativadas ✅', corpo: 'Este aparelho vai receber os avisos da Flamme.', url: '/' })));
    return json({ enviados: r.filter((x) => x === 'ok').length, total: disp.length });
  }
  falha(404, 'Rota não encontrada.');
}

async function rotasNotificacoes(request, env, eu, seg, m) {
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

// ---------------- Resumo da agência (início) ----------------

async function resumoAgencia(env) {
  const hoje = hojeSP();
  const mesIni = mesSP() + '-01';
  const [clientes, contagens, urgentes, publicadosMes] = await Promise.all([
    env.DB.prepare(
      `SELECT c.id, c.slug, c.nome, c.segmento, c.cor, c.instagram, c.tiktok, c.linkedin, c.logo_chave, c.metas,
        i.username AS ig_username, i.perfil AS ig_perfil, i.token IS NOT NULL AS ig_conectado,
        (SELECT foco FROM estrategias e WHERE e.cliente_id = c.id ORDER BY mes DESC LIMIT 1) AS foco,
        (SELECT mes FROM estrategias e WHERE e.cliente_id = c.id ORDER BY mes DESC LIMIT 1) AS estrategia_mes
       FROM clientes c LEFT JOIN instagram i ON i.cliente_id = c.id WHERE c.ativo = 1 ORDER BY c.ordem, c.nome`
    ).all(),
    env.DB.prepare('SELECT cliente_id, status, COUNT(*) AS n FROM demandas WHERE arquivada = 0 GROUP BY cliente_id, status').all(),
    env.DB.prepare(
      `SELECT d.id, d.titulo, d.prazo, d.status, d.tipo, d.agendado_para, c.slug, c.nome AS cliente, c.cor
       FROM demandas d JOIN clientes c ON c.id = d.cliente_id
       WHERE d.arquivada = 0 AND c.ativo = 1 AND (
         (d.status NOT IN ('aprovado','agendado','publicado') AND d.prazo IS NOT NULL AND d.prazo <= ?)
         OR d.status = 'aprovacao'
         OR (d.status = 'agendado' AND substr(d.agendado_para, 1, 10) BETWEEN ? AND ?))
       ORDER BY COALESCE(d.prazo, d.agendado_para) LIMIT 60`
    )
      .bind(hoje, hojeSP(-1), hojeSP(1))
      .all(),
    env.DB.prepare("SELECT cliente_id, tipo, COUNT(*) AS n FROM demandas WHERE arquivada = 0 AND status = 'publicado' AND publicado_em >= ? GROUP BY cliente_id, tipo").bind(mesIni).all(),
  ]);
  const porCliente = {};
  for (const r of contagens.results) (porCliente[r.cliente_id] ||= {})[r.status] = r.n;
  const pubMes = {};
  for (const r of publicadosMes.results) (pubMes[r.cliente_id] ||= {})[r.tipo] = r.n;
  return json({
    hoje,
    clientes: clientes.results.map((c) => {
      const perfil = lerJsonSeguro(c.ig_perfil, null);
      return {
        ...c,
        ig_perfil: undefined,
        metas: lerJsonSeguro(c.metas, {}),
        seguidores: perfil?.followers_count ?? null,
        foto: perfil?.profile_picture_url || null,
        status: porCliente[c.id] || {},
        publicados_mes: pubMes[c.id] || {},
      };
    }),
    urgentes: urgentes.results,
  });
}

// ---------------- Clientes ----------------

const CAMPOS_CLIENTE = ['nome', 'segmento', 'cor', 'instagram', 'tiktok', 'linkedin', 'site', 'google', 'drive', 'ordem'];
const limparArroba = (s) => String(s || '').trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, '').replace(/^@/, '').replace(/\/.*$/, '').slice(0, 80);

function slugDe(nome) {
  return (
    String(nome)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'cliente'
  );
}

const PAGINAS_INICIAIS = [
  {
    titulo: 'Briefing do cliente',
    icone: '📌',
    blocos: [
      ['h2', 'Sobre o negócio'],
      ['p', ''],
      ['h2', 'Contatos e responsáveis'],
      ['lista', 'Quem aprova:'],
      ['lista', 'WhatsApp do grupo:'],
      ['h2', 'Combinados'],
      ['tarefa', 'Frequência de posts por semana'],
      ['tarefa', 'Dias e horários de aprovação'],
      ['tarefa', 'Acesso às redes recebido'],
    ],
  },
  { titulo: 'Banco de ideias', icone: '💡', blocos: [['destaque', 'Anote aqui ideias soltas. A IA também pode trazer pautas na aba Estúdio IA.'], ['lista', '']] },
  { titulo: 'Reuniões', icone: '🗓️', blocos: [['h2', 'Reunião de AAAA-MM-DD'], ['lista', 'Pauta:'], ['lista', 'Decisões:'], ['tarefa', 'Próximo passo']] },
];

function blocosDe(lista) {
  return JSON.stringify(lista.map(([tipo, texto]) => ({ id: crypto.randomUUID().slice(0, 8), tipo, texto, feito: false })));
}

async function rotasClientes(request, env, ctx, eu, seg, m) {
  if (seg.length === 1 && m === 'GET') {
    const r = await env.DB.prepare('SELECT id, slug, nome, segmento, cor, instagram, tiktok, linkedin, logo_chave, ativo, ordem FROM clientes ORDER BY ativo DESC, ordem, nome').all();
    return json(r.results);
  }
  if (seg.length === 1 && m === 'POST') {
    if (eu.papel !== 'admin') falha(403, 'Só administradores podem adicionar clientes.');
    const dados = await lerJson(request);
    const nome = String(dados.nome || '').trim().slice(0, 80);
    if (!nome) falha(400, 'Dê um nome para o cliente.');
    let slug = slugDe(dados.slug || nome);
    for (let i = 2; await env.DB.prepare('SELECT 1 FROM clientes WHERE slug = ?').bind(slug).first(); i++) slug = `${slugDe(nome)}-${i}`;
    const r = await env.DB.prepare('INSERT INTO clientes (slug, nome, segmento, cor, instagram, tiktok, linkedin, site) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        slug,
        nome,
        String(dados.segmento || '').slice(0, 120),
        /^#[0-9a-f]{6}$/i.test(dados.cor || '') ? dados.cor : '#922f11',
        limparArroba(dados.instagram),
        limparArroba(dados.tiktok),
        String(dados.linkedin || '').trim().slice(0, 300),
        String(dados.site || '').trim().slice(0, 300)
      )
      .run();
    const id = r.meta.last_row_id;
    await env.DB.batch(
      PAGINAS_INICIAIS.map((pg, i) =>
        env.DB.prepare('INSERT INTO paginas (cliente_id, titulo, icone, blocos, ordem, criado_por) VALUES (?, ?, ?, ?, ?, ?)').bind(id, pg.titulo, pg.icone, blocosDe(pg.blocos), i, eu.id || null)
      )
    );
    return json({ id, slug });
  }

  const id = Number(seg[1]);
  const c = await carregarCliente(env, id);
  if (!c) falha(404, 'Cliente não encontrado.');

  if (seg.length === 2 && m === 'GET') {
    const [estrategia, igc] = await Promise.all([
      env.DB.prepare('SELECT * FROM estrategias WHERE cliente_id = ? ORDER BY mes DESC LIMIT 1').bind(id).first(),
      env.DB.prepare('SELECT username, token IS NOT NULL AS conectado FROM instagram WHERE cliente_id = ?').bind(id).first(),
    ]);
    return json({ ...c, cerebro: lerJsonSeguro(c.cerebro, {}), metas: lerJsonSeguro(c.metas, {}), estrategia: estrategia ? formatarEstrategia(estrategia) : null, ig: igc || null });
  }

  if (seg.length === 2 && m === 'PATCH') {
    const dados = await lerJson(request);
    const sets = [];
    const vals = [];
    for (const k of CAMPOS_CLIENTE) {
      if (!(k in dados)) continue;
      let v = dados[k];
      if (k === 'nome') {
        v = String(v || '').trim().slice(0, 80);
        if (!v) continue;
      } else if (k === 'cor') {
        if (!/^#[0-9a-f]{6}$/i.test(v || '')) continue;
      } else if (k === 'instagram' || k === 'tiktok') v = limparArroba(v);
      else if (k === 'ordem') v = Number(v) || 0;
      else v = String(v || '').trim().slice(0, 300);
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    if (dados.cerebro && typeof dados.cerebro === 'object') {
      const atual = lerJsonSeguro(c.cerebro, {});
      for (const campo of CEREBRO) if (campo.id in dados.cerebro) atual[campo.id] = String(dados.cerebro[campo.id] || '').slice(0, 20000);
      sets.push('cerebro = ?');
      vals.push(JSON.stringify(atual));
    }
    if (dados.metas && typeof dados.metas === 'object') {
      const metas = {};
      for (const k of ['posts', 'reels', 'carrosseis', 'stories', 'seguidores']) if (dados.metas[k] !== '' && dados.metas[k] != null) metas[k] = Math.max(0, Number(dados.metas[k]) || 0);
      sets.push('metas = ?');
      vals.push(JSON.stringify(metas));
    }
    if (typeof dados.ativo === 'boolean') {
      if (eu.papel !== 'admin') falha(403, 'Só administradores podem arquivar clientes.');
      sets.push('ativo = ?');
      vals.push(dados.ativo ? 1 : 0);
    }
    if (sets.length) await env.DB.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
    return json({ ok: true });
  }

  if (seg[2] === 'logo' && m === 'POST') {
    const a = await guardarArquivo(request, env, `clientes/${id}/logo`);
    if (!a.mime.startsWith('image/')) falha(400, 'Envie uma imagem.');
    if (c.logo_chave) ctx.waitUntil(env.MIDIA.delete(c.logo_chave));
    await env.DB.prepare('UPDATE clientes SET logo_chave = ? WHERE id = ?').bind(a.chave, id).run();
    return json({ chave: a.chave });
  }

  // estratégias do mês
  if (seg[2] === 'estrategias') {
    if (seg.length === 3 && m === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM estrategias WHERE cliente_id = ? ORDER BY mes DESC LIMIT 24').bind(id).all();
      return json(r.results.map(formatarEstrategia));
    }
    const mes = seg[3];
    if (!/^\d{4}-\d{2}$/.test(mes || '')) falha(400, 'Mês inválido (use AAAA-MM).');
    if (seg.length === 4 && m === 'PUT') {
      const d = await lerJson(request);
      const lista = (v) => JSON.stringify((Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean).slice(0, 12));
      await env.DB.prepare(
        `INSERT INTO estrategias (cliente_id, mes, foco, resumo, objetivos, texto, atualizado_por, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(cliente_id, mes) DO UPDATE SET foco = excluded.foco, resumo = excluded.resumo, objetivos = excluded.objetivos, texto = excluded.texto, atualizado_por = excluded.atualizado_por, atualizado_em = excluded.atualizado_em`
      )
        .bind(id, mes, String(d.foco || '').slice(0, 300), lista(d.resumo), lista(d.objetivos), String(d.texto || '').slice(0, 60000), eu.id || null, agoraIso())
        .run();
      return json({ ok: true });
    }
    if (seg[4] === 'anexo' && m === 'POST') {
      const a = await guardarArquivo(request, env, `clientes/${id}/estrategias/${mes}`);
      const antigo = await env.DB.prepare('SELECT anexo_chave FROM estrategias WHERE cliente_id = ? AND mes = ?').bind(id, mes).first();
      if (antigo?.anexo_chave) ctx.waitUntil(env.MIDIA.delete(antigo.anexo_chave));
      await env.DB.prepare(
        `INSERT INTO estrategias (cliente_id, mes, anexo_chave, anexo_nome, anexo_mime, atualizado_por, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(cliente_id, mes) DO UPDATE SET anexo_chave = excluded.anexo_chave, anexo_nome = excluded.anexo_nome, anexo_mime = excluded.anexo_mime, atualizado_em = excluded.atualizado_em`
      )
        .bind(id, mes, a.chave, a.nome, a.mime, eu.id || null, agoraIso())
        .run();
      return json({ ok: true, chave: a.chave });
    }
    if (seg[4] === 'resumir' && m === 'POST') {
      const e = await env.DB.prepare('SELECT * FROM estrategias WHERE cliente_id = ? AND mes = ?').bind(id, mes).first();
      if (!e || (!e.texto && !e.anexo_chave)) falha(400, 'Cole o texto da estratégia ou anexe o PDF antes de resumir.');
      let pdf = null;
      if (e.anexo_chave && e.anexo_mime === 'application/pdf') {
        const obj = await env.MIDIA.get(e.anexo_chave);
        if (obj && obj.size <= 20 * 1024 * 1024) pdf = await obj.arrayBuffer();
      }
      const r = await ia.gerar(env, { modo: 'estrategia', cliente: c, estrategia: { ...e, resumo: '[]', objetivos: '[]', foco: '' }, pdf });
      const d = r.dados || {};
      const foco = String(d.foco || '').slice(0, 300);
      const objetivos = JSON.stringify((d.objetivos || []).map(String).slice(0, 6));
      const resumo = JSON.stringify((d.resumo || []).map(String).slice(0, 8));
      await env.DB.prepare('UPDATE estrategias SET foco = ?, objetivos = ?, resumo = ?, atualizado_em = ? WHERE id = ?').bind(foco, objetivos, resumo, agoraIso(), e.id).run();
      await env.DB.prepare('INSERT INTO ia_geracoes (cliente_id, modo, pedido, resposta, usuario_id, tokens_entrada, tokens_saida) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, 'estrategia', `Resumo da estratégia de ${mes}`, r.texto, eu.id || null, r.uso.entrada, r.uso.saida)
        .run();
      return json({ ok: true, foco, objetivos: JSON.parse(objetivos), resumo: JSON.parse(resumo) });
    }
  }

  falha(404, 'Rota não encontrada.');
}

const formatarEstrategia = (e) => ({ ...e, resumo: lerJsonSeguro(e.resumo, []), objetivos: lerJsonSeguro(e.objetivos, []) });

// ---------------- Demandas ----------------

const CAMPOS_EDITAVEIS = ['titulo', 'descricao', 'tipo', 'pilar', 'responsavel_id', 'prazo', 'legenda', 'links'];

async function carregarDemanda(env, id) {
  const d = await env.DB.prepare('SELECT * FROM demandas WHERE id = ? AND arquivada = 0').bind(id).first();
  if (!d) falha(404, 'Demanda não encontrada.');
  return d;
}

const registrar = (env, demandaId, usuarioId, acao, de = null, para = null, autorExterno = null) =>
  env.DB.prepare('INSERT INTO historico (demanda_id, usuario_id, autor_externo, acao, de, para) VALUES (?, ?, ?, ?, ?, ?)').bind(demandaId, usuarioId || null, autorExterno, acao, de, para).run();

function normalizarLinks(links) {
  if (!Array.isArray(links)) return '[]';
  const ok = links
    .map((l) => (typeof l === 'string' ? { url: l } : l))
    .filter((l) => l && /^https?:\/\//i.test(String(l.url || '').trim()))
    .slice(0, 30)
    .map((l) => ({ url: String(l.url).trim().slice(0, 2000), titulo: String(l.titulo || '').slice(0, 120) }));
  return JSON.stringify(ok);
}

const FRASES_STATUS = {
  aprovacao: 'está aguardando aprovação',
  aprovado: 'foi aprovada ✅',
  ajustes: 'voltou para ajustes',
  producao: 'entrou em produção',
  publicado: 'foi publicada',
};

async function rotasDemandas(request, env, ctx, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const clienteId = Number(url.searchParams.get('cliente'));
    if (!(await carregarCliente(env, clienteId))) falha(400, 'Cliente inválido.');
    const r = await env.DB.prepare(
      `SELECT d.*, u.nome AS responsavel_nome,
        (SELECT chave FROM anexos a WHERE a.demanda_id = d.id ORDER BY ordem, id LIMIT 1) AS capa,
        (SELECT mime FROM anexos a WHERE a.demanda_id = d.id ORDER BY ordem, id LIMIT 1) AS capa_mime,
        (SELECT COUNT(*) FROM anexos a WHERE a.demanda_id = d.id) AS n_anexos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.demanda_id = d.id) AS n_comentarios
       FROM demandas d LEFT JOIN usuarios u ON u.id = d.responsavel_id
       WHERE d.cliente_id = ? AND d.arquivada = 0 ORDER BY COALESCE(d.prazo, '9999'), d.id DESC`
    )
      .bind(clienteId)
      .all();
    return json(r.results.map((d) => ({ ...d, links: lerJsonSeguro(d.links, []) })));
  }

  if (seg.length === 1 && m === 'POST') {
    const dados = await lerJson(request);
    const cliente = await carregarCliente(env, dados.cliente_id);
    if (!cliente) falha(400, 'Cliente inválido.');
    const titulo = String(dados.titulo || '').trim();
    if (!titulo) falha(400, 'Dê um título para a demanda.');
    const tipo = TIPOS.includes(dados.tipo) ? dados.tipo : 'post';
    const status = STATUS_IDS.includes(dados.status) && !['aprovado', 'agendado', 'publicado'].includes(dados.status) ? dados.status : 'briefing';
    const r = await env.DB.prepare(
      'INSERT INTO demandas (cliente_id, titulo, descricao, tipo, status, pilar, responsavel_id, prazo, legenda, links, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        cliente.id,
        titulo.slice(0, 200),
        String(dados.descricao || ''),
        tipo,
        status,
        String(dados.pilar || '').slice(0, 80),
        dados.responsavel_id || null,
        dados.prazo || null,
        String(dados.legenda || ''),
        normalizarLinks(dados.links),
        eu.id || null
      )
      .run();
    const id = r.meta.last_row_id;
    await registrar(env, id, eu.id, 'criou', null, status);
    ctx.waitUntil(notificar(env, { clienteId: cliente.id, demandaId: id, titulo: 'Nova demanda', corpo: `${eu.nome} adicionou “${titulo}”`, autorId: eu.id }));
    return json({ id });
  }

  const id = Number(seg[1]);
  if (!id) falha(404, 'Rota não encontrada.');

  if (seg.length === 2 && m === 'GET') {
    const d = await carregarDemanda(env, id);
    const [anexos, comentarios, historico] = await Promise.all([
      env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ? ORDER BY ordem, id').bind(id).all(),
      env.DB.prepare('SELECT c.*, COALESCE(u.nome, c.autor_externo) AS autor, c.autor_externo IS NOT NULL AS externo FROM comentarios c LEFT JOIN usuarios u ON u.id = c.usuario_id WHERE demanda_id = ? ORDER BY c.id').bind(id).all(),
      env.DB.prepare('SELECT h.*, COALESCE(u.nome, h.autor_externo) AS autor FROM historico h LEFT JOIN usuarios u ON u.id = h.usuario_id WHERE demanda_id = ? ORDER BY h.id DESC LIMIT 100').bind(id).all(),
    ]);
    return json({ ...d, links: lerJsonSeguro(d.links, []), anexos: anexos.results, comentarios: comentarios.results, historico: historico.results });
  }

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
      if (c === 'pilar') v = String(v || '').slice(0, 80);
      sets.push(`${c} = ?`);
      vals.push(v);
    }
    if (sets.length) {
      await env.DB.prepare(`UPDATE demandas SET ${sets.join(', ')}, atualizado_em = ? WHERE id = ?`).bind(...vals, agoraIso(), id).run();
      if ('responsavel_id' in dados && dados.responsavel_id && dados.responsavel_id !== d.responsavel_id) {
        const resp = await env.DB.prepare('SELECT nome FROM usuarios WHERE id = ?').bind(dados.responsavel_id).first();
        await registrar(env, id, eu.id, 'responsavel', null, resp?.nome || null);
        if (dados.responsavel_id !== eu.id)
          ctx.waitUntil(notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Você é responsável', corpo: `“${d.titulo}”`, autorId: eu.id, somente: (u) => u.id === Number(dados.responsavel_id) }));
      }
      if ('legenda' in dados && dados.legenda !== d.legenda) await registrar(env, id, eu.id, 'legenda');
      if ('prazo' in dados && (dados.prazo || null) !== d.prazo) await registrar(env, id, eu.id, 'prazo', d.prazo, dados.prazo || null);
    }
    return json({ ok: true });
  }

  if (seg.length === 2 && m === 'DELETE') {
    const d = await carregarDemanda(env, id);
    if (d.status === 'agendado' && d.publicar_auto) falha(400, 'Cancele o agendamento antes de excluir.');
    await env.DB.prepare('UPDATE demandas SET arquivada = 1, atualizado_em = ? WHERE id = ?').bind(agoraIso(), id).run();
    await registrar(env, id, eu.id, 'arquivou');
    return json({ ok: true });
  }

  if (seg[2] === 'status' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { status, comentario } = await lerJson(request);
    if (!STATUS_IDS.includes(status)) falha(400, 'Status inválido.');
    if (status === d.status) return json({ ok: true });
    if (status === 'aprovado' && !podeAprovar(eu)) falha(403, 'Só quem aprova (aprovador ou administrador) pode marcar como aprovado.');
    if (status === 'agendado') falha(400, 'Use o botão “Agendar” para escolher dia e hora.');
    if (d.status === 'agendado' && d.publicar_auto) falha(400, 'Cancele o agendamento antes de mudar o status.');
    const extra = status === 'aprovado' ? ', aprovado_por = ?, aprovado_em = ?, aprovado_cliente = NULL' : '';
    const extraVals = status === 'aprovado' ? [eu.id || null, agoraIso()] : [];
    const publicado = status === 'publicado' ? ", publicado_em = COALESCE(publicado_em, strftime('%Y-%m-%dT%H:%M:%fZ','now'))" : '';
    await env.DB.prepare(`UPDATE demandas SET status = ?, atualizado_em = ?, erro_publicacao = NULL${extra}${publicado} WHERE id = ?`).bind(status, agoraIso(), ...extraVals, id).run();
    await registrar(env, id, eu.id, 'status', d.status, status);
    if (comentario && String(comentario).trim()) {
      await env.DB.prepare('INSERT INTO comentarios (demanda_id, usuario_id, texto) VALUES (?, ?, ?)').bind(id, eu.id || null, String(comentario).trim()).run();
    }
    const corpo = `${eu.nome}: “${d.titulo}” ${FRASES_STATUS[status] || `foi para ${statusNome(status)}`}${comentario ? ` — ${String(comentario).slice(0, 120)}` : ''}`;
    ctx.waitUntil(notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: statusNome(status), corpo, autorId: eu.id }));
    return json({ ok: true });
  }

  if (seg[2] === 'comentarios' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { texto } = await lerJson(request);
    const t = String(texto || '').trim();
    if (!t) falha(400, 'Escreva o comentário.');
    await env.DB.prepare('INSERT INTO comentarios (demanda_id, usuario_id, texto) VALUES (?, ?, ?)').bind(id, eu.id || null, t.slice(0, 5000)).run();
    ctx.waitUntil(notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Novo comentário', corpo: `${eu.nome} em “${d.titulo}”: ${t.slice(0, 140)}`, autorId: eu.id }));
    return json({ ok: true });
  }

  if (seg[2] === 'anexos' && seg.length === 3 && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const a = await guardarArquivo(request, env, `clientes/${d.cliente_id}/${id}`);
    const ordem = await env.DB.prepare('SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM anexos WHERE demanda_id = ?').bind(id).first();
    const r = await env.DB.prepare('INSERT INTO anexos (demanda_id, chave, nome, mime, tamanho, ordem) VALUES (?, ?, ?, ?, ?, ?)').bind(id, a.chave, a.nome, a.mime, a.tamanho, ordem.o).run();
    await registrar(env, id, eu.id, 'anexou', null, a.nome);
    return json({ id: r.meta.last_row_id, chave: a.chave });
  }

  if (seg[2] === 'anexos' && seg[3] === 'ordem' && m === 'POST') {
    await carregarDemanda(env, id);
    const { ids } = await lerJson(request);
    if (!Array.isArray(ids)) falha(400, 'Envie a lista de anexos.');
    await env.DB.batch(ids.map((a, i) => env.DB.prepare('UPDATE anexos SET ordem = ? WHERE id = ? AND demanda_id = ?').bind(i, Number(a), id)));
    return json({ ok: true });
  }

  if (seg[2] === 'agendar' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    const { agendado_para, publicar_auto = true } = await lerJson(request);
    const quando = new Date(agendado_para);
    if (isNaN(quando)) falha(400, 'Escolha dia e hora.');
    if (quando.getTime() < Date.now() - 60000) falha(400, 'Escolha um horário no futuro.');
    if (!['aprovado', 'agendado'].includes(d.status) && !podeAprovar(eu)) falha(400, 'A demanda precisa estar aprovada para agendar.');
    if (publicar_auto) {
      const conta = await env.DB.prepare('SELECT token FROM instagram WHERE cliente_id = ?').bind(d.cliente_id).first();
      if (!conta?.token) falha(400, 'Conecte o Instagram deste cliente (aba Cliente → Redes) para publicar automaticamente.');
      const anexos = (await env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ?').bind(id).all()).results;
      const erro = ig.validarParaPublicar(d, anexos);
      if (erro) falha(400, erro);
    }
    await env.DB.prepare(
      "UPDATE demandas SET status = 'agendado', agendado_para = ?, publicar_auto = ?, lembrete_enviado = 0, erro_publicacao = NULL, ig_container = NULL, atualizado_em = ? WHERE id = ?"
    )
      .bind(quando.toISOString(), publicar_auto ? 1 : 0, agoraIso(), id)
      .run();
    await registrar(env, id, eu.id, 'agendou', d.status, quando.toISOString());
    const quandoTxt = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    ctx.waitUntil(notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Agendado', corpo: `“${d.titulo}” ${publicar_auto ? 'será publicado sozinho' : 'tem lembrete de publicação'} em ${quandoTxt}`, autorId: eu.id }));
    return json({ ok: true });
  }

  if (seg[2] === 'cancelar-agendamento' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    if (d.status !== 'agendado') falha(400, 'Esta demanda não está agendada.');
    if (d.publicando) falha(409, 'A publicação já está em andamento.');
    await env.DB.prepare("UPDATE demandas SET status = 'aprovado', agendado_para = NULL, publicar_auto = 0, ig_container = NULL, atualizado_em = ? WHERE id = ?").bind(agoraIso(), id).run();
    await registrar(env, id, eu.id, 'cancelou agendamento');
    ctx.waitUntil(notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Agendamento cancelado', corpo: `${eu.nome} cancelou “${d.titulo}”`, autorId: eu.id }));
    return json({ ok: true });
  }

  if (seg[2] === 'publicar-agora' && m === 'POST') {
    const d = await carregarDemanda(env, id);
    if (!['aprovado', 'agendado'].includes(d.status) && !podeAprovar(eu)) falha(400, 'A demanda precisa estar aprovada para publicar.');
    const conta = await env.DB.prepare('SELECT token FROM instagram WHERE cliente_id = ?').bind(d.cliente_id).first();
    if (!conta?.token) falha(400, 'Conecte o Instagram deste cliente primeiro.');
    const anexos = (await env.DB.prepare('SELECT * FROM anexos WHERE demanda_id = ?').bind(id).all()).results;
    const erro = ig.validarParaPublicar(d, anexos);
    if (erro) falha(400, erro);
    await env.DB.prepare("UPDATE demandas SET status = 'agendado', agendado_para = ?, publicar_auto = 1, erro_publicacao = NULL, ig_container = NULL, atualizado_em = ? WHERE id = ?")
      .bind(agoraIso(), agoraIso(), id)
      .run();
    await registrar(env, id, eu.id, 'publicar agora');
    ctx.waitUntil(publicarDemanda(env, id));
    return json({ ok: true, mensagem: 'Enviando para o Instagram. Você recebe um aviso quando terminar.' });
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

// ---------------- Aprovação pelo cliente (link sem login) ----------------

async function rotasAprovacoes(request, env, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const clienteId = Number(url.searchParams.get('cliente'));
    const r = await env.DB.prepare('SELECT id, titulo, mensagem, demanda_ids, expira_em, criado_em, visto_em, respondido_em, ativo FROM aprovacoes WHERE cliente_id = ? ORDER BY id DESC LIMIT 30')
      .bind(clienteId)
      .all();
    return json(r.results.map((a) => ({ ...a, demanda_ids: lerJsonSeguro(a.demanda_ids, []) })));
  }
  if (seg.length === 1 && m === 'POST') {
    const { cliente_id, demanda_ids, titulo, mensagem = '', dias = 15 } = await lerJson(request);
    const cliente = await carregarCliente(env, cliente_id);
    if (!cliente) falha(400, 'Cliente inválido.');
    const ids = [...new Set((demanda_ids || []).map(Number).filter(Boolean))].slice(0, 40);
    if (!ids.length) falha(400, 'Escolha pelo menos uma demanda.');
    const ok = await env.DB.prepare(`SELECT COUNT(*) AS n FROM demandas WHERE cliente_id = ? AND arquivada = 0 AND id IN (${ids.map(() => '?').join(',')})`).bind(cliente.id, ...ids).first();
    if (ok.n !== ids.length) falha(400, 'Alguma demanda não é deste cliente.');
    const token = b64url(aleatorio(24));
    const tituloFinal = String(titulo || `Aprovação · ${cliente.nome}`).slice(0, 120);
    await env.DB.prepare('INSERT INTO aprovacoes (cliente_id, token_hash, titulo, mensagem, demanda_ids, expira_em, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(cliente.id, await sha256(token), tituloFinal, String(mensagem).slice(0, 1000), JSON.stringify(ids), Date.now() + Math.min(60, Math.max(1, Number(dias) || 15)) * DIA, eu.id || null)
      .run();
    // quem ainda está em produção/briefing vai para "em aprovação"
    for (const did of ids) {
      const d = await env.DB.prepare('SELECT status FROM demandas WHERE id = ?').bind(did).first();
      if (['briefing', 'producao', 'ajustes'].includes(d.status)) {
        await env.DB.prepare("UPDATE demandas SET status = 'aprovacao', atualizado_em = ? WHERE id = ?").bind(agoraIso(), did).run();
        await registrar(env, did, eu.id, 'status', d.status, 'aprovacao');
      }
      await registrar(env, did, eu.id, 'enviou ao cliente');
    }
    return json({ ok: true, url: `${url.origin}/aprovar/${token}` });
  }
  const id = Number(seg[1]);
  if (seg.length === 2 && m === 'DELETE') {
    await env.DB.prepare('UPDATE aprovacoes SET ativo = 0 WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

async function linkAprovacao(env, token) {
  if (!token || token.length < 20) falha(404, 'Link inválido.');
  const a = await env.DB.prepare('SELECT * FROM aprovacoes WHERE token_hash = ?').bind(await sha256(token)).first();
  if (!a || !a.ativo) falha(404, 'Este link de aprovação não existe mais. Peça um novo para a Flamme.');
  if (a.expira_em < Date.now()) falha(410, 'Este link de aprovação expirou. Peça um novo para a Flamme.');
  return a;
}

async function rotasPublicas(request, env, ctx, seg, m) {
  // /api/publico/aprovacao/:token  e  /api/publico/aprovacao/:token/:demandaId
  if (seg[1] !== 'aprovacao') falha(404, 'Rota não encontrada.');
  const a = await linkAprovacao(env, seg[2]);
  const ids = lerJsonSeguro(a.demanda_ids, []);
  const cliente = await carregarCliente(env, a.cliente_id);

  if (seg.length === 3 && m === 'GET') {
    if (!a.visto_em) await env.DB.prepare('UPDATE aprovacoes SET visto_em = ? WHERE id = ?').bind(agoraIso(), a.id).run();
    const lista = ids.length
      ? (await env.DB.prepare(`SELECT id, titulo, tipo, status, legenda, prazo, agendado_para, aprovado_cliente FROM demandas WHERE arquivada = 0 AND cliente_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(a.cliente_id, ...ids).all()).results
      : [];
    const anexos = ids.length ? (await env.DB.prepare(`SELECT demanda_id, chave, mime, nome FROM anexos WHERE demanda_id IN (${ids.map(() => '?').join(',')}) ORDER BY ordem, id`).bind(...ids).all()).results : [];
    const igc = await env.DB.prepare('SELECT username, perfil FROM instagram WHERE cliente_id = ?').bind(a.cliente_id).first();
    const perfil = lerJsonSeguro(igc?.perfil, null);
    return json({
      titulo: a.titulo,
      mensagem: a.mensagem,
      expira_em: a.expira_em,
      cliente: { nome: cliente.nome, cor: cliente.cor, logo_chave: cliente.logo_chave, instagram: igc?.username || cliente.instagram, foto: perfil?.profile_picture_url || null },
      itens: ids
        .map((id) => lista.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => ({ ...d, anexos: anexos.filter((x) => x.demanda_id === d.id).map(({ chave, mime, nome }) => ({ chave, mime, nome })) })),
    });
  }

  const demandaId = Number(seg[3]);
  if (seg.length === 4 && m === 'POST') {
    if (!ids.includes(demandaId)) falha(404, 'Este post não faz parte deste link.');
    const d = await carregarDemanda(env, demandaId);
    const { acao, comentario = '', nome = '' } = await lerJson(request);
    const quem = String(nome || '').trim().slice(0, 60) || `Cliente (${cliente.nome})`;
    const texto = String(comentario || '').trim().slice(0, 3000);
    if (!['aprovar', 'ajustes'].includes(acao)) falha(400, 'Ação inválida.');
    if (acao === 'ajustes' && !texto) falha(400, 'Conte o que precisa mudar.');
    if (['agendado', 'publicado'].includes(d.status)) falha(400, 'Este post já foi agendado ou publicado. Fale com a Flamme para mudar.');
    const novo = acao === 'aprovar' ? 'aprovado' : 'ajustes';
    if (novo === 'aprovado') {
      await env.DB.prepare("UPDATE demandas SET status = 'aprovado', aprovado_em = ?, aprovado_por = NULL, aprovado_cliente = ?, atualizado_em = ? WHERE id = ?").bind(agoraIso(), quem, agoraIso(), d.id).run();
    } else {
      await env.DB.prepare("UPDATE demandas SET status = 'ajustes', atualizado_em = ? WHERE id = ?").bind(agoraIso(), d.id).run();
    }
    await registrar(env, d.id, null, acao === 'aprovar' ? 'cliente aprovou' : 'cliente pediu ajuste', d.status, novo, quem);
    if (texto) await env.DB.prepare('INSERT INTO comentarios (demanda_id, autor_externo, texto) VALUES (?, ?, ?)').bind(d.id, quem, texto).run();
    await env.DB.prepare('UPDATE aprovacoes SET respondido_em = ? WHERE id = ?').bind(agoraIso(), a.id).run();
    ctx.waitUntil(
      notificar(env, {
        clienteId: d.cliente_id,
        demandaId: d.id,
        titulo: acao === 'aprovar' ? 'Cliente aprovou ✅' : 'Cliente pediu ajuste',
        corpo: `${quem}: “${d.titulo}”${texto ? ` — ${texto.slice(0, 120)}` : ''}`,
      })
    );
    return json({ ok: true, status: novo });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Organização (páginas estilo Notion) ----------------

const TIPOS_BLOCO = new Set(['p', 'h1', 'h2', 'h3', 'lista', 'numerada', 'tarefa', 'citacao', 'destaque', 'divisor', 'codigo']);

function limparBlocos(blocos) {
  if (!Array.isArray(blocos)) falha(400, 'Blocos inválidos.');
  return JSON.stringify(
    blocos.slice(0, 2000).map((b) => ({
      id: String(b.id || crypto.randomUUID().slice(0, 8)).slice(0, 16),
      tipo: TIPOS_BLOCO.has(b.tipo) ? b.tipo : 'p',
      texto: String(b.texto || '').slice(0, 10000),
      feito: Boolean(b.feito),
    }))
  );
}

async function rotasPaginas(request, env, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const alvo = url.searchParams.get('cliente');
    const r =
      alvo === 'agencia'
        ? await env.DB.prepare('SELECT id, cliente_id, pai_id, titulo, icone, ordem, atualizado_em FROM paginas WHERE cliente_id IS NULL AND arquivada = 0 ORDER BY ordem, id').all()
        : await env.DB.prepare('SELECT id, cliente_id, pai_id, titulo, icone, ordem, atualizado_em FROM paginas WHERE cliente_id = ? AND arquivada = 0 ORDER BY ordem, id').bind(Number(alvo)).all();
    return json(r.results);
  }
  if (seg.length === 1 && m === 'POST') {
    const d = await lerJson(request);
    const clienteId = d.cliente_id ? Number(d.cliente_id) : null;
    if (clienteId && !(await carregarCliente(env, clienteId))) falha(400, 'Cliente inválido.');
    const ordem = await env.DB.prepare('SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM paginas WHERE cliente_id IS ? AND pai_id IS ?').bind(clienteId, d.pai_id || null).first();
    const r = await env.DB.prepare('INSERT INTO paginas (cliente_id, pai_id, titulo, icone, blocos, ordem, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(clienteId, d.pai_id || null, String(d.titulo || 'Sem título').slice(0, 200), String(d.icone || '').slice(0, 8), d.blocos ? limparBlocos(d.blocos) : blocosDe([['p', '']]), ordem.o, eu.id || null)
      .run();
    return json({ id: r.meta.last_row_id });
  }
  const id = Number(seg[1]);
  const pg = await env.DB.prepare('SELECT * FROM paginas WHERE id = ? AND arquivada = 0').bind(id).first();
  if (!pg) falha(404, 'Página não encontrada.');
  if (seg.length === 2 && m === 'GET') return json({ ...pg, blocos: lerJsonSeguro(pg.blocos, []) });
  if (seg.length === 2 && m === 'PATCH') {
    const d = await lerJson(request);
    const sets = [];
    const vals = [];
    if ('titulo' in d) sets.push('titulo = ?') && vals.push(String(d.titulo || 'Sem título').slice(0, 200));
    if ('icone' in d) sets.push('icone = ?') && vals.push(String(d.icone || '').slice(0, 8));
    if ('blocos' in d) sets.push('blocos = ?') && vals.push(limparBlocos(d.blocos));
    if ('pai_id' in d) sets.push('pai_id = ?') && vals.push(d.pai_id ? Number(d.pai_id) : null);
    if ('ordem' in d) sets.push('ordem = ?') && vals.push(Number(d.ordem) || 0);
    if (sets.length) await env.DB.prepare(`UPDATE paginas SET ${sets.join(', ')}, atualizado_em = ? WHERE id = ?`).bind(...vals, agoraIso(), id).run();
    return json({ ok: true });
  }
  if (seg.length === 2 && m === 'DELETE') {
    // arquiva a página e as subpáginas
    const todas = (await env.DB.prepare('SELECT id, pai_id FROM paginas WHERE cliente_id IS ? AND arquivada = 0').bind(pg.cliente_id).all()).results;
    const apagar = new Set([id]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const x of todas) if (x.pai_id && apagar.has(x.pai_id) && !apagar.has(x.id)) apagar.add(x.id) && (mudou = true);
    }
    await env.DB.prepare(`UPDATE paginas SET arquivada = 1 WHERE id IN (${[...apagar].map(() => '?').join(',')})`).bind(...apagar).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- IA ----------------

async function rotasIa(request, env, eu, seg, m, url) {
  if (seg.length === 1 && m === 'GET') {
    const clienteId = Number(url.searchParams.get('cliente'));
    const r = await env.DB.prepare('SELECT id, modo, pedido, resposta, dados, demanda_id, criado_em FROM ia_geracoes WHERE cliente_id = ? ORDER BY id DESC LIMIT 40').bind(clienteId).all();
    return json(r.results.map((g) => ({ ...g, dados: lerJsonSeguro(g.dados, null) })));
  }
  if (seg.length === 1 && m === 'POST') {
    const { cliente_id, modo, pedido = '', demanda_id = null } = await lerJson(request);
    const cliente = await carregarCliente(env, cliente_id);
    if (!cliente) falha(400, 'Cliente inválido.');
    if (!ia.MODOS[modo] || modo === 'estrategia') falha(400, 'Escolha o que a IA deve fazer.');
    let demanda = null;
    if (demanda_id) {
      demanda = await carregarDemanda(env, Number(demanda_id));
      if (demanda.cliente_id !== cliente.id) falha(400, 'A demanda não é deste cliente.');
    }
    const estrategia = await env.DB.prepare('SELECT * FROM estrategias WHERE cliente_id = ? AND mes <= ? ORDER BY mes DESC LIMIT 1').bind(cliente.id, mesSP()).first();
    let dadosInstagram = null;
    if (modo === 'insights') {
      const c = await env.DB.prepare('SELECT perfil, painel FROM instagram WHERE cliente_id = ?').bind(cliente.id).first();
      if (!c) falha(400, 'Conecte o Instagram do cliente para gerar insights dos números.');
      let painel = lerJsonSeguro(c.painel, null);
      if (!painel) painel = await ig.lerPainel(env, cliente.id).catch(() => null);
      const historico = (await env.DB.prepare('SELECT dia, seguidores FROM ig_diario WHERE cliente_id = ? ORDER BY dia DESC LIMIT 60').bind(cliente.id).all()).results;
      const perfil = lerJsonSeguro(c.perfil, {});
      dadosInstagram = { perfil: { seguidores: perfil.followers_count, posts: perfil.media_count, bio: perfil.biography }, ultimos_30_dias: painel?.totais, alcance_diario: painel?.alcance_diario, posts_recentes: painel?.posts, seguidores_por_dia: historico };
    }
    let r;
    try {
      r = await ia.gerar(env, { modo, cliente, estrategia, pedido: String(pedido).slice(0, 4000), demanda, dadosInstagram });
    } catch (e) {
      falha(502, e.message);
    }
    const ins = await env.DB.prepare('INSERT INTO ia_geracoes (cliente_id, modo, pedido, resposta, dados, demanda_id, usuario_id, tokens_entrada, tokens_saida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(cliente.id, modo, String(pedido).slice(0, 4000), r.texto, r.dados ? JSON.stringify(r.dados) : null, demanda?.id || null, eu.id || null, r.uso.entrada, r.uso.saida)
      .run();
    return json({ id: ins.meta.last_row_id, texto: r.texto, dados: r.dados });
  }
  falha(404, 'Rota não encontrada.');
}

// ---------------- Instagram ----------------

async function rotasInstagram(request, env, ctx, eu, seg, m, url) {
  const clienteId = Number(seg[1]);
  if (!(await carregarCliente(env, clienteId))) falha(400, 'Cliente inválido.');

  if (seg.length === 2 && m === 'GET') {
    const c = await env.DB.prepare('SELECT * FROM instagram WHERE cliente_id = ?').bind(clienteId).first();
    if (c?.token && (!c.sincronizado_em || Date.now() - c.sincronizado_em > 10 * 60000)) ctx.waitUntil(ig.sincronizar(env, clienteId).catch(() => {}));
    return json({
      conectado: Boolean(c?.token),
      username: c?.username || null,
      perfil: lerJsonSeguro(c?.perfil, null),
      midias: lerJsonSeguro(c?.midias, []),
      sincronizado_em: c?.sincronizado_em || null,
      token_expira_em: c?.token_expira_em || null,
      erro: c?.erro || null,
    });
  }

  if (seg[2] === 'painel' && m === 'GET') {
    const c = await env.DB.prepare('SELECT token, painel, painel_em FROM instagram WHERE cliente_id = ?').bind(clienteId).first();
    if (!c?.token) return json({ conectado: false });
    let painel = lerJsonSeguro(c.painel, null);
    const velho = !c.painel_em || Date.now() - c.painel_em > 6 * 3600000;
    if (!painel || url.searchParams.get('atualizar') === '1' || velho) {
      try {
        painel = await ig.lerPainel(env, clienteId);
      } catch (e) {
        if (!painel) falha(502, 'Não consegui ler os números do Instagram: ' + e.message);
      }
    }
    const historico = (await env.DB.prepare('SELECT dia, seguidores FROM ig_diario WHERE cliente_id = ? ORDER BY dia DESC LIMIT 120').bind(clienteId).all()).results.reverse();
    return json({ conectado: true, ...painel, seguidores_por_dia: historico });
  }

  if (seg[2] === 'sincronizar' && m === 'POST') {
    await ig.sincronizar(env, clienteId);
    return json({ ok: true });
  }

  if (eu.papel !== 'admin') falha(403, 'Só administradores podem conectar ou desconectar o Instagram.');

  if (seg[2] === 'conectar' && m === 'GET') {
    if (!env.IG_APP_ID || !env.IG_APP_SECRET) falha(400, 'Configure IG_APP_ID e IG_APP_SECRET no Cloudflare (veja o README).');
    const estado = b64url(aleatorio(24));
    await env.DB.prepare('INSERT INTO oauth_estados (estado, cliente_id, usuario_id, expira_em) VALUES (?, ?, ?, ?)').bind(estado, clienteId, eu.id, Date.now() + 15 * 60000).run();
    return Response.redirect(ig.urlAutorizacao(env, `${url.origin}/api/instagram/retorno`, estado), 302);
  }

  if (seg[2] === 'token' && m === 'POST') {
    const { token, ig_user_id } = await lerJson(request);
    if (!token || String(token).length < 20) falha(400, 'Cole o token completo.');
    let final = String(token).trim();
    const idConta = String(ig_user_id || '').replace(/\D/g, '') || null;
    let expira = null;
    if (ig.ehTokenInstagram(final)) {
      expira = Date.now() + 60 * DIA;
      try {
        const r = await ig.renovarToken(final);
        final = r.token;
        expira = r.expiraEm;
      } catch {}
    } else if (!idConta) {
      falha(400, 'Para esse tipo de token, preencha também o ID da conta do Instagram.');
    }
    try {
      const perfil = await ig.salvarConta(env, clienteId, final, expira, idConta);
      return json({ ok: true, username: perfil.username });
    } catch (e) {
      falha(400, 'O Instagram não aceitou esse token: ' + e.message);
    }
  }

  if (seg.length === 2 && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM instagram WHERE cliente_id = ?').bind(clienteId).run();
    return json({ ok: true });
  }
  falha(404, 'Rota não encontrada.');
}

async function instagramRetorno(request, env, url) {
  const estado = url.searchParams.get('state');
  const codigo = url.searchParams.get('code');
  const e = estado ? await env.DB.prepare('SELECT * FROM oauth_estados WHERE estado = ?').bind(estado).first() : null;
  const cliente = e ? await carregarCliente(env, e.cliente_id) : null;
  const voltar = (msg) => Response.redirect(`${url.origin}/${cliente ? `c/${cliente.slug}` : ''}?aba=cliente&ig=${encodeURIComponent(msg)}`, 302);
  if (!e || e.expira_em < Date.now()) return voltar('O login expirou. Tente de novo.');
  await env.DB.prepare('DELETE FROM oauth_estados WHERE estado = ?').bind(estado).run();
  if (!codigo) return voltar(url.searchParams.get('error_description') || 'Login cancelado.');
  try {
    const { token, expiraEm } = await ig.trocarCodigo(env, codigo.replace(/#_$/, ''), `${url.origin}/api/instagram/retorno`);
    const perfil = await ig.salvarConta(env, e.cliente_id, token, expiraEm);
    return voltar(`ok:@${perfil.username} conectado`);
  } catch (err) {
    return voltar('Não foi possível conectar: ' + err.message);
  }
}

// ---------------- Publicação no Instagram ----------------

async function publicarDemanda(env, id) {
  const trava = await env.DB.prepare("UPDATE demandas SET publicando = 1 WHERE id = ? AND publicando = 0 AND status = 'agendado'").bind(id).run();
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
    const r = await ig.concluirPublicacao(env, d.cliente_id, container);
    if (!r) return; // vídeo ainda processando: a próxima rodada (5 min) termina
    await env.DB.prepare(
      "UPDATE demandas SET status = 'publicado', publicado_em = ?, permalink = ?, ig_media_id = ?, ig_container = NULL, erro_publicacao = NULL, atualizado_em = ? WHERE id = ?"
    )
      .bind(agoraIso(), r.permalink, r.mediaId, agoraIso(), id)
      .run();
    await registrar(env, id, null, 'publicou no Instagram', 'agendado', 'publicado');
    await notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Publicado no Instagram ✅', corpo: `“${d.titulo}” está no ar.` });
    await ig.sincronizar(env, d.cliente_id).catch(() => {});
  } catch (e) {
    await env.DB.prepare("UPDATE demandas SET status = 'aprovado', publicar_auto = 0, ig_container = NULL, erro_publicacao = ?, atualizado_em = ? WHERE id = ?").bind(e.message, agoraIso(), id).run();
    await registrar(env, id, null, 'falha ao publicar', null, e.message.slice(0, 300));
    await notificar(env, { clienteId: d.cliente_id, demandaId: id, titulo: 'Falha ao publicar ⚠️', corpo: `“${d.titulo}”: ${e.message}` });
  } finally {
    await env.DB.prepare('UPDATE demandas SET publicando = 0 WHERE id = ?').bind(id).run();
  }
}

// A cada 5 minutos: publica o que venceu, manda lembretes e atualiza um perfil por vez (o mais antigo).
async function rotinaFrequente(env) {
  const vencidas = (
    await env.DB.prepare("SELECT id, publicar_auto, lembrete_enviado, cliente_id, titulo FROM demandas WHERE status = 'agendado' AND arquivada = 0 AND agendado_para <= ? AND publicando = 0").bind(agoraIso()).all()
  ).results;
  for (const d of vencidas) {
    if (d.publicar_auto) {
      await publicarDemanda(env, d.id);
    } else if (!d.lembrete_enviado) {
      await env.DB.prepare('UPDATE demandas SET lembrete_enviado = 1 WHERE id = ?').bind(d.id).run();
      await notificar(env, { clienteId: d.cliente_id, demandaId: d.id, titulo: 'Hora de publicar ⏰', corpo: `“${d.titulo}” está marcado para agora. Publique pelo app e marque como publicado.` });
    }
  }
  const conta = await env.DB.prepare('SELECT cliente_id, sincronizado_em FROM instagram WHERE token IS NOT NULL ORDER BY COALESCE(sincronizado_em, 0) LIMIT 1').first();
  if (conta && (!conta.sincronizado_em || Date.now() - conta.sincronizado_em > 10 * 60000)) await ig.sincronizar(env, conta.cliente_id).catch(() => {});
}

// Todo dia às 9h (Brasília): renova tokens, avisa prazos e estratégia do mês que falta.
async function rotinaDiaria(env) {
  const contas = (await env.DB.prepare('SELECT * FROM instagram WHERE token IS NOT NULL').all()).results;
  for (const c of contas) {
    if (ig.ehTokenInstagram(c.token) && c.token_expira_em && c.token_expira_em - Date.now() < 30 * DIA && Date.now() - (c.token_renovado_em || 0) > DIA) {
      try {
        const r = await ig.renovarToken(c.token);
        await env.DB.prepare('UPDATE instagram SET token = ?, token_expira_em = ?, token_renovado_em = ? WHERE cliente_id = ?').bind(r.token, r.expiraEm, Date.now(), c.cliente_id).run();
      } catch (e) {
        await notificar(env, { clienteId: c.cliente_id, titulo: 'Reconecte o Instagram', corpo: `Não consegui renovar o acesso de @${c.username}: ${e.message}`, somente: (u) => u.papel === 'admin' });
      }
    }
  }

  const hoje = hojeSP();
  const amanha = hojeSP(1);
  const clientes = (await env.DB.prepare('SELECT id, nome FROM clientes WHERE ativo = 1').all()).results;
  const semEstrategia = [];
  for (const cl of clientes) {
    const abertas = (
      await env.DB.prepare("SELECT titulo, prazo FROM demandas WHERE cliente_id = ? AND arquivada = 0 AND status NOT IN ('aprovado','agendado','publicado') AND prazo IS NOT NULL AND prazo <= ?")
        .bind(cl.id, amanha)
        .all()
    ).results;
    const partes = [];
    const n = (f) => abertas.filter(f).length;
    if (n((d) => d.prazo < hoje)) partes.push(`${n((d) => d.prazo < hoje)} atrasada(s)`);
    if (n((d) => d.prazo === hoje)) partes.push(`${n((d) => d.prazo === hoje)} vence(m) hoje`);
    if (n((d) => d.prazo === amanha)) partes.push(`${n((d) => d.prazo === amanha)} vence(m) amanhã`);
    if (partes.length) {
      await notificar(env, { clienteId: cl.id, titulo: 'Prazos do dia', corpo: `${partes.join(' · ')}: ${abertas.slice(0, 3).map((d) => d.titulo).join(', ')}${abertas.length > 3 ? '…' : ''}` });
    }
    const est = await env.DB.prepare('SELECT 1 FROM estrategias WHERE cliente_id = ? AND mes = ?').bind(cl.id, mesSP()).first();
    if (!est) semEstrategia.push(cl.nome);
  }
  // no dia 1 e no dia 5 lembra das estratégias que faltam
  if (semEstrategia.length && ['01', '05'].includes(hoje.slice(8))) {
    await notificar(env, { titulo: 'Estratégias do mês', corpo: `Ainda sem estratégia de ${mesSP()}: ${semEstrategia.join(', ')}` });
  }
  await env.DB.prepare('DELETE FROM oauth_estados WHERE expira_em < ?').bind(Date.now()).run();
  await env.DB.prepare("DELETE FROM notificacoes WHERE criado_em < strftime('%Y-%m-%dT%H:%M:%fZ','now','-60 days')").run();
}

