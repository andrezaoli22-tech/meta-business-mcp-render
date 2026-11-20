// Notificações push (padrão Web Push: RFC 8291 + VAPID RFC 8292), feitas só com WebCrypto.
// Funciona em Android, computador e iPhone (iOS 16.4+ com o app adicionado à Tela de Início).

import { b64url, deB64url, concat, texto, aleatorio } from './util.js';
import { getConfig as getConfigSafe } from './db.js';

// As chaves VAPID são geradas sozinhas no primeiro uso e guardadas no banco.
export async function chavesVapid(env) {
  let pub = await getConfigSafe(env, 'vapid_publica');
  let priv = await getConfigSafe(env, 'vapid_privada');
  if (pub && priv) return { publica: pub, privadaJwk: JSON.parse(priv) };
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  pub = b64url(raw);
  // INSERT OR IGNORE evita duas chaves diferentes se dois acessos chegarem juntos
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)').bind('vapid_publica', pub),
    env.DB.prepare('INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)').bind('vapid_privada', JSON.stringify(jwk)),
  ]);
  return chavesVapid(env);
}

const jwtCache = new Map();
async function jwtVapid(audiencia, privadaJwk, sujeito) {
  const agora = Math.floor(Date.now() / 1000);
  const c = jwtCache.get(audiencia);
  if (c && c.exp - agora > 3600) return c.token;
  const exp = agora + 12 * 3600;
  const cab = b64url(texto(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64url(texto(JSON.stringify({ aud: audiencia, exp, sub: sujeito })));
  const chave = await crypto.subtle.importKey('jwk', privadaJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, texto(`${cab}.${corpo}`));
  const token = `${cab}.${corpo}.${b64url(assinatura)}`;
  jwtCache.set(audiencia, { token, exp });
  return token;
}

async function hkdf(salt, ikm, info, bits) {
  const chave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, chave, bits));
}

// Criptografa a mensagem para um aparelho (aes128gcm).
export async function criptografar(conteudo, p256dhB64, authB64) {
  const uaPublica = deB64url(p256dhB64);
  const segredoAuth = deB64url(authB64);
  const efemera = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', efemera.publicKey));
  const uaChave = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const segredoEcdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChave }, efemera.privateKey, 256));

  const ikm = await hkdf(segredoAuth, segredoEcdh, concat(texto('WebPush: info\0'), uaPublica, asPublica), 256);
  const salt = aleatorio(16);
  const cek = await hkdf(salt, ikm, texto('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(salt, ikm, texto('Content-Encoding: nonce\0'), 96);

  const claro = concat(texto(conteudo), new Uint8Array([2]));
  const chaveAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chaveAes, claro));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

// Envia para um aparelho. Retorna 'ok', 'expirado' (apagar inscrição) ou 'erro'.
export async function enviarPush(env, dispositivo, mensagem) {
  const { publica, privadaJwk } = await chavesVapid(env);
  const url = new URL(dispositivo.endpoint);
  const sujeito = (await getConfigSafe(env, 'url_publica')) || 'mailto:plataforma@example.com';
  const jwt = await jwtVapid(url.origin, privadaJwk, sujeito.startsWith('http') || sujeito.startsWith('mailto:') ? sujeito : 'mailto:plataforma@example.com');
  const corpo = await criptografar(JSON.stringify(mensagem), dispositivo.p256dh, dispositivo.auth);
  try {
    const r = await fetch(dispositivo.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${publica}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body: corpo,
    });
    if (r.status === 404 || r.status === 410) return 'expirado';
    if (!r.ok) {
      console.log('push falhou', r.status, await r.text().catch(() => ''));
      return 'erro';
    }
    return 'ok';
  } catch (e) {
    console.log('push erro', e.message);
    return 'erro';
  }
}
