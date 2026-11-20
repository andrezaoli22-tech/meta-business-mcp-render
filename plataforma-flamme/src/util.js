// Utilidades: base64url, hashes, respostas HTTP.

const enc = new TextEncoder();

export function b64url(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob((str + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function concat(...partes) {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const texto = (s) => enc.encode(s);

export function aleatorio(n = 32) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function sha256(str) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}

// PBKDF2 com poucas iterações para caber no limite de CPU do plano grátis do Cloudflare.
// O login tem bloqueio após 5 tentativas erradas, o que compensa.
const ITERACOES = 20000;
export async function hashSenha(senha, saltB64) {
  const salt = saltB64 ? deB64url(saltB64) : aleatorio(16);
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERACOES }, chave, 256);
  return { hash: b64url(bits), salt: b64url(salt) };
}

export function iguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function json(dados, status = 200, headers = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const falha = (status, mensagem) => {
  throw new ErroHttp(status, mensagem);
};

export async function lerJson(request) {
  const tipo = request.headers.get('content-type') || '';
  if (!tipo.includes('application/json')) falha(415, 'Envie os dados em JSON.');
  try {
    return await request.json();
  } catch {
    falha(400, 'JSON inválido.');
  }
}

export function lerCookie(request, nome) {
  const c = request.headers.get('cookie') || '';
  for (const parte of c.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}
