// Instagram: conexão pelo login do Instagram (API do Instagram com login do Instagram),
// leitura do perfil e do feed, e publicação (foto, carrossel, reels, story).

import { getConfig } from './db.js';

const GRAPH = 'https://graph.instagram.com';
const GRAPH_FB = 'https://graph.facebook.com';
const versao = (env) => env.GRAPH_VERSION || 'v23.0';

// Dois tipos de acesso:
// - token do Instagram (começa com "IG"): API do Instagram com login do Instagram, em graph.instagram.com, dura 60 dias;
// - token do Facebook/usuário do sistema (começa com "EAA"): login unificado do painel novo da Meta,
//   em graph.facebook.com, não expira e precisa do ID da conta do Instagram.
export const ehTokenInstagram = (token) => String(token || '').startsWith('IG');
const hostDe = (token) => (ehTokenInstagram(token) ? GRAPH : GRAPH_FB);
const api = (env, token, caminho) => `${hostDe(token)}/${versao(env)}/${caminho}`;

export const ESCOPOS = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
].join(',');

async function chamar(url, opcoes = {}) {
  const r = await fetch(url, opcoes);
  const dados = await r.json().catch(() => ({}));
  if (!r.ok || dados.error) {
    const msg = dados.error?.error_user_msg || dados.error?.message || dados.error_message || `HTTP ${r.status}`;
    const e = new Error(msg);
    e.codigo = dados.error?.code;
    throw e;
  }
  return dados;
}

export function urlAutorizacao(env, redirectUri, estado) {
  const u = new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('enable_fb_login', '0');
  u.searchParams.set('force_authentication', '1');
  u.searchParams.set('client_id', env.IG_APP_ID);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', ESCOPOS);
  u.searchParams.set('state', estado);
  return u.toString();
}

// Troca o código do login por um token de 60 dias.
export async function trocarCodigo(env, codigo, redirectUri) {
  const form = new URLSearchParams({
    client_id: env.IG_APP_ID,
    client_secret: env.IG_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code: codigo,
  });
  const curto = await chamar('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
  const item = Array.isArray(curto.data) ? curto.data[0] : curto;
  const u = new URL(`${GRAPH}/access_token`);
  u.searchParams.set('grant_type', 'ig_exchange_token');
  u.searchParams.set('client_secret', env.IG_APP_SECRET);
  u.searchParams.set('access_token', item.access_token);
  const longo = await chamar(u.toString());
  return { token: longo.access_token, expiraEm: Date.now() + (longo.expires_in || 5184000) * 1000 };
}

export async function renovarToken(token) {
  const u = new URL(`${GRAPH}/refresh_access_token`);
  u.searchParams.set('grant_type', 'ig_refresh_token');
  u.searchParams.set('access_token', token);
  const r = await chamar(u.toString());
  return { token: r.access_token, expiraEm: Date.now() + (r.expires_in || 5184000) * 1000 };
}

const CAMPOS_PERFIL = 'user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count';
const CAMPOS_MIDIA =
  'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{media_type,media_url,thumbnail_url}';

export async function lerPerfil(env, token, igUserId) {
  const ig = ehTokenInstagram(token);
  if (!ig && !igUserId) throw new Error('Informe o ID da conta do Instagram (o número que aparece abaixo do nome no painel da Meta).');
  const base = api(env, token, ig ? 'me' : igUserId);
  const campos = ig ? CAMPOS_PERFIL : 'id,username,name,profile_picture_url,followers_count,follows_count,media_count';
  const t = encodeURIComponent(token);
  let perfil;
  try {
    perfil = await chamar(`${base}?fields=${campos},biography,website&access_token=${t}`);
  } catch {
    // alguns tipos de conta não devolvem bio/site
    perfil = await chamar(`${base}?fields=${campos}&access_token=${t}`);
  }
  perfil.user_id = String(perfil.user_id || perfil.id || igUserId);
  const midias = await chamar(`${base}/media?fields=${CAMPOS_MIDIA}&limit=30&access_token=${t}`);
  return { perfil, midias: midias.data || [] };
}

// Atualiza a cópia do perfil e do feed guardada no banco.
export async function sincronizar(env, empresa) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE empresa = ?').bind(empresa).first();
  if (!conta?.token) return null;
  try {
    const { perfil, midias } = await lerPerfil(env, conta.token, conta.ig_user_id);
    await env.DB.prepare(
      'UPDATE instagram SET perfil = ?, midias = ?, username = ?, ig_user_id = COALESCE(?, ig_user_id), sincronizado_em = ?, erro = NULL WHERE empresa = ?'
    )
      .bind(JSON.stringify(perfil), JSON.stringify(midias), perfil.username || conta.username, perfil.user_id ? String(perfil.user_id) : null, Date.now(), empresa)
      .run();
    return { perfil, midias };
  } catch (e) {
    await env.DB.prepare('UPDATE instagram SET erro = ?, sincronizado_em = ? WHERE empresa = ?').bind(e.message, Date.now(), empresa).run();
    throw e;
  }
}

export async function salvarConta(env, empresa, token, expiraEm, igUserId) {
  const { perfil } = await lerPerfil(env, token, igUserId);
  await env.DB.prepare(
    `INSERT INTO instagram (empresa, ig_user_id, username, token, token_expira_em, token_renovado_em)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(empresa) DO UPDATE SET ig_user_id = excluded.ig_user_id, username = excluded.username,
       token = excluded.token, token_expira_em = excluded.token_expira_em, token_renovado_em = excluded.token_renovado_em, erro = NULL`
  )
    .bind(empresa, String(perfil.user_id || perfil.id), perfil.username, token, expiraEm, Date.now())
    .run();
  await sincronizar(env, empresa);
  return perfil;
}

// ---------- Publicação ----------

const ehVideo = (a) => a.mime.startsWith('video/');

async function criarContainer(env, conta, params) {
  const corpo = new URLSearchParams({ ...params, access_token: conta.token });
  const r = await chamar(api(env, conta.token, `${conta.ig_user_id}/media`), { method: 'POST', body: corpo });
  return r.id;
}

async function statusContainer(env, conta, id) {
  const r = await chamar(api(env, conta.token, `${id}?fields=status_code,status&access_token=${encodeURIComponent(conta.token)}`));
  return r.status_code || 'FINISHED';
}

export function validarParaPublicar(demanda, anexos) {
  const midias = anexos.filter((a) => a.mime === 'image/jpeg' || ehVideo(a));
  if (!midias.length) return 'Anexe a arte final (JPG ou vídeo MP4/MOV) para publicar pelo Instagram.';
  if (anexos.some((a) => a.mime.startsWith('image/') && a.mime !== 'image/jpeg'))
    return 'O Instagram só aceita imagem em JPG. Reenvie a arte (a plataforma converte sozinha ao anexar de novo).';
  if (demanda.tipo === 'story' && midias.length > 1) return 'Story aceita 1 arquivo por vez.';
  if ((demanda.tipo === 'reels' || demanda.tipo === 'video') && !midias.some(ehVideo)) return 'Reels precisa de um vídeo.';
  if (midias.length > 10) return 'O carrossel aceita no máximo 10 arquivos pela API do Instagram.';
  if ((demanda.legenda || '').length > 2200) return 'A legenda passou de 2.200 caracteres.';
  if (((demanda.legenda || '').match(/#[^\s#]+/g) || []).length > 30) return 'A legenda tem mais de 30 hashtags.';
  return null;
}

// Cria os containers (1ª etapa). Retorna o id do container principal.
export async function prepararPublicacao(env, demanda, anexos) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE empresa = ?').bind(demanda.empresa).first();
  if (!conta?.token) throw new Error('O Instagram desta marca ainda não está conectado.');
  const base = await getConfig(env, 'url_publica');
  const urlDe = (a) => `${base}/m/${a.chave}`;
  const midias = anexos.filter((a) => a.mime === 'image/jpeg' || ehVideo(a)).sort((a, b) => a.ordem - b.ordem);
  const legenda = demanda.legenda || '';

  if (demanda.tipo === 'story') {
    const a = midias[0];
    return criarContainer(env, conta, ehVideo(a) ? { media_type: 'STORIES', video_url: urlDe(a) } : { media_type: 'STORIES', image_url: urlDe(a) });
  }
  if (midias.length === 1) {
    const a = midias[0];
    if (ehVideo(a)) return criarContainer(env, conta, { media_type: 'REELS', video_url: urlDe(a), caption: legenda, share_to_feed: 'true' });
    return criarContainer(env, conta, { image_url: urlDe(a), caption: legenda });
  }
  const filhos = [];
  for (const a of midias) {
    filhos.push(
      await criarContainer(env, conta, ehVideo(a) ? { media_type: 'VIDEO', video_url: urlDe(a), is_carousel_item: 'true' } : { image_url: urlDe(a), is_carousel_item: 'true' })
    );
  }
  // espera os vídeos do carrossel ficarem prontos (até ~2 min); se não, tenta na próxima rodada
  for (const id of filhos) {
    for (let i = 0; i < 24; i++) {
      const st = await statusContainer(env, conta, id);
      if (st === 'FINISHED') break;
      if (st === 'ERROR' || st === 'EXPIRED') throw new Error('O Instagram recusou um dos arquivos do carrossel.');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return criarContainer(env, conta, { media_type: 'CAROUSEL', children: filhos.join(','), caption: legenda });
}

// 2ª etapa: publica quando o container estiver pronto. Retorna null se ainda está processando.
export async function concluirPublicacao(env, empresa, containerId, esperarMs = 60000) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE empresa = ?').bind(empresa).first();
  const limite = Date.now() + esperarMs;
  let st = await statusContainer(env, conta, containerId);
  while (st === 'IN_PROGRESS' && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 5000));
    st = await statusContainer(env, conta, containerId);
  }
  if (st === 'IN_PROGRESS') return null;
  if (st !== 'FINISHED' && st !== 'PUBLISHED') throw new Error(`O Instagram não processou o arquivo (status ${st}).`);
  const corpo = new URLSearchParams({ creation_id: containerId, access_token: conta.token });
  const r = await chamar(api(env, conta.token, `${conta.ig_user_id}/media_publish`), { method: 'POST', body: corpo });
  let permalink = null;
  try {
    const m = await chamar(api(env, conta.token, `${r.id}?fields=permalink&access_token=${encodeURIComponent(conta.token)}`));
    permalink = m.permalink;
  } catch {}
  return { mediaId: r.id, permalink };
}
