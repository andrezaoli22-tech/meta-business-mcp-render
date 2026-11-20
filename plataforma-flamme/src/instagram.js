// Instagram: conexão pelo login do Instagram (API do Instagram com login do Instagram),
// leitura do perfil e do feed, números do painel (insights) e publicação (foto, carrossel, reels, story).
// Cada cliente da Flamme tem a sua conta (tabela instagram, chave cliente_id).

import { getConfig, hojeSP } from './db.js';

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
export async function sincronizar(env, clienteId) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE cliente_id = ?').bind(clienteId).first();
  if (!conta?.token) return null;
  try {
    const { perfil, midias } = await lerPerfil(env, conta.token, conta.ig_user_id);
    await env.DB.prepare(
      'UPDATE instagram SET perfil = ?, midias = ?, username = ?, ig_user_id = COALESCE(?, ig_user_id), sincronizado_em = ?, erro = NULL WHERE cliente_id = ?'
    )
      .bind(JSON.stringify(perfil), JSON.stringify(midias), perfil.username || conta.username, perfil.user_id ? String(perfil.user_id) : null, Date.now(), clienteId)
      .run();
    // guarda o número de seguidores do dia (histórico para o gráfico de crescimento)
    if (perfil.followers_count != null) {
      await env.DB.prepare(
        'INSERT INTO ig_diario (cliente_id, dia, seguidores, posts) VALUES (?, ?, ?, ?) ON CONFLICT(cliente_id, dia) DO UPDATE SET seguidores = excluded.seguidores, posts = excluded.posts'
      )
        .bind(clienteId, hojeSP(), perfil.followers_count, perfil.media_count ?? null)
        .run();
    }
    return { perfil, midias };
  } catch (e) {
    await env.DB.prepare('UPDATE instagram SET erro = ?, sincronizado_em = ? WHERE cliente_id = ?').bind(e.message, Date.now(), clienteId).run();
    throw e;
  }
}

export async function salvarConta(env, clienteId, token, expiraEm, igUserId) {
  const { perfil } = await lerPerfil(env, token, igUserId);
  await env.DB.prepare(
    `INSERT INTO instagram (cliente_id, ig_user_id, username, token, token_expira_em, token_renovado_em)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cliente_id) DO UPDATE SET ig_user_id = excluded.ig_user_id, username = excluded.username,
       token = excluded.token, token_expira_em = excluded.token_expira_em, token_renovado_em = excluded.token_renovado_em, erro = NULL`
  )
    .bind(clienteId, String(perfil.user_id || perfil.id), perfil.username, token, expiraEm, Date.now())
    .run();
  await sincronizar(env, clienteId);
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
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE cliente_id = ?').bind(demanda.cliente_id).first();
  if (!conta?.token) throw new Error('O Instagram deste cliente ainda não está conectado.');
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
export async function concluirPublicacao(env, clienteId, containerId, esperarMs = 60000) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE cliente_id = ?').bind(clienteId).first();
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

// ---------- Painel (insights) ----------
// A API devolve no máximo 30 dias por consulta. Cada métrica é pedida separada:
// se uma não existir para o tipo de conta, as outras continuam aparecendo.

const METRICAS_CONTA = ['reach', 'views', 'accounts_engaged', 'total_interactions', 'profile_links_taps', 'follows_and_unfollows'];
const METRICAS_POST = ['reach', 'saved', 'shares', 'total_interactions', 'views'];

export async function lerPainel(env, clienteId) {
  const conta = await env.DB.prepare('SELECT * FROM instagram WHERE cliente_id = ?').bind(clienteId).first();
  if (!conta?.token) throw new Error('O Instagram deste cliente ainda não está conectado.');
  const t = encodeURIComponent(conta.token);
  const base = api(env, conta.token, conta.ig_user_id);
  const ate = Math.floor(Date.now() / 1000);
  const desde = ate - 29 * 86400;

  const totais = {};
  await Promise.all(
    METRICAS_CONTA.map(async (m) => {
      try {
        const r = await chamar(`${base}/insights?metric=${m}&period=day&metric_type=total_value&since=${desde}&until=${ate}&access_token=${t}`);
        const item = r.data?.[0];
        if (m === 'follows_and_unfollows') {
          const quebra = item?.total_value?.breakdowns?.[0]?.results || [];
          totais.novos_seguidores = quebra.find((x) => x.dimension_values?.[0] === 'FOLLOWER')?.value ?? null;
          totais.deixaram_de_seguir = quebra.find((x) => x.dimension_values?.[0] === 'NON_FOLLOWER')?.value ?? null;
        } else {
          totais[m] = item?.total_value?.value ?? null;
        }
      } catch {
        totais[m] = null;
      }
    })
  );

  let alcanceDiario = [];
  try {
    const r = await chamar(`${base}/insights?metric=reach&period=day&since=${desde}&until=${ate}&access_token=${t}`);
    alcanceDiario = (r.data?.[0]?.values || []).map((v) => ({ dia: String(v.end_time || '').slice(0, 10), valor: v.value ?? 0 }));
  } catch {}

  const midias = conta.midias ? JSON.parse(conta.midias) : [];
  const recentes = midias.slice(0, 12);
  const posts = await Promise.all(
    recentes.map(async (m) => {
      const valores = {};
      try {
        const r = await chamar(api(env, conta.token, `${m.id}/insights?metric=${METRICAS_POST.join(',')}&access_token=${t}`));
        for (const it of r.data || []) valores[it.name] = it.values?.[0]?.value ?? it.total_value?.value ?? null;
      } catch {
        try {
          const r = await chamar(api(env, conta.token, `${m.id}/insights?metric=reach,saved,total_interactions&access_token=${t}`));
          for (const it of r.data || []) valores[it.name] = it.values?.[0]?.value ?? it.total_value?.value ?? null;
        } catch {}
      }
      return {
        id: m.id,
        tipo: m.media_product_type === 'REELS' ? 'reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : m.media_type === 'VIDEO' ? 'video' : 'post',
        timestamp: m.timestamp,
        permalink: m.permalink,
        legenda: (m.caption || '').slice(0, 160),
        curtidas: m.like_count ?? null,
        comentarios: m.comments_count ?? null,
        alcance: valores.reach ?? null,
        salvos: valores.saved ?? null,
        compartilhamentos: valores.shares ?? null,
        interacoes: valores.total_interactions ?? null,
        visualizacoes: valores.views ?? null,
      };
    })
  );

  const painel = { totais, alcance_diario: alcanceDiario, posts, gerado_em: Date.now() };
  await env.DB.prepare('UPDATE instagram SET painel = ?, painel_em = ? WHERE cliente_id = ?').bind(JSON.stringify(painel), Date.now(), clienteId).run();
  return painel;
}
