// Banco de dados (Cloudflare D1 / SQLite).
// As tabelas são criadas sozinhas no primeiro acesso: não precisa rodar nada no painel.

export const EMPRESAS = {
  rp: { id: 'rp', nome: 'RP' },
  citrino: { id: 'citrino', nome: 'Citrino Luz' },
};

export const STATUS = [
  { id: 'briefing', nome: 'Briefing' },
  { id: 'producao', nome: 'Em produção' },
  { id: 'aprovacao', nome: 'Em aprovação' },
  { id: 'ajustes', nome: 'Ajustes' },
  { id: 'aprovado', nome: 'Aprovado' },
  { id: 'agendado', nome: 'Agendado' },
  { id: 'publicado', nome: 'Publicado' },
];
export const STATUS_IDS = STATUS.map((s) => s.id);
export const statusNome = (id) => STATUS.find((s) => s.id === id)?.nome || id;

export const TIPOS = ['post', 'carrossel', 'reels', 'story', 'video', 'outro'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    senha_salt TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'equipe',
    ativo INTEGER NOT NULL DEFAULT 1,
    falhas INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate INTEGER NOT NULL DEFAULT 0,
    trocar_senha INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessoes (
    token_hash TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    expira_em INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS demandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL DEFAULT 'post',
    status TEXT NOT NULL DEFAULT 'briefing',
    responsavel_id INTEGER,
    prazo TEXT,
    legenda TEXT NOT NULL DEFAULT '',
    links TEXT NOT NULL DEFAULT '[]',
    agendado_para TEXT,
    publicar_auto INTEGER NOT NULL DEFAULT 0,
    publicado_em TEXT,
    permalink TEXT,
    ig_media_id TEXT,
    ig_container TEXT,
    erro_publicacao TEXT,
    publicando INTEGER NOT NULL DEFAULT 0,
    lembrete_enviado INTEGER NOT NULL DEFAULT 0,
    aprovado_por INTEGER,
    aprovado_em TEXT,
    criado_por INTEGER,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    arquivada INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demandas_empresa ON demandas(empresa, arquivada)`,
  `CREATE TABLE IF NOT EXISTS anexos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demanda_id INTEGER NOT NULL,
    chave TEXT NOT NULL,
    nome TEXT NOT NULL,
    mime TEXT NOT NULL,
    tamanho INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_anexos_demanda ON anexos(demanda_id)`,
  `CREATE TABLE IF NOT EXISTS comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demanda_id INTEGER NOT NULL,
    usuario_id INTEGER,
    texto TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demanda_id INTEGER NOT NULL,
    usuario_id INTEGER,
    acao TEXT NOT NULL,
    de TEXT,
    para TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_historico_demanda ON historico(demanda_id)`,
  `CREATE TABLE IF NOT EXISTS notificacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    empresa TEXT,
    demanda_id INTEGER,
    titulo TEXT NOT NULL,
    corpo TEXT NOT NULL DEFAULT '',
    lida INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificacoes(usuario_id, lida)`,
  `CREATE TABLE IF NOT EXISTS dispositivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    empresas TEXT NOT NULL DEFAULT '["rp","citrino"]',
    nome TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS instagram (
    empresa TEXT PRIMARY KEY,
    ig_user_id TEXT,
    username TEXT,
    token TEXT,
    token_expira_em INTEGER,
    token_renovado_em INTEGER,
    perfil TEXT,
    midias TEXT,
    sincronizado_em INTEGER,
    erro TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS oauth_estados (estado TEXT PRIMARY KEY, empresa TEXT NOT NULL, usuario_id INTEGER, expira_em INTEGER NOT NULL)`,
];

let migrado = false;
export async function migrar(env) {
  if (migrado) return;
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
  migrado = true;
}

export const agoraIso = () => new Date().toISOString();

export async function getConfig(env, chave) {
  const r = await env.DB.prepare('SELECT valor FROM config WHERE chave = ?').bind(chave).first();
  return r ? r.valor : null;
}

export async function setConfig(env, chave, valor) {
  await env.DB.prepare(
    'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
  )
    .bind(chave, valor)
    .run();
}
