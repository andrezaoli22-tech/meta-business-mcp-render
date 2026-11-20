// Banco de dados (Cloudflare D1 / SQLite) da plataforma Flamme.
// As tabelas são criadas sozinhas no primeiro acesso: não precisa rodar nada no painel.
// Tudo é separado por cliente (cliente_id). Nunca misture dados de dois clientes.

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

// "Cérebro" de cada cliente: o que a IA usa para escrever no estilo dele.
// A ordem aqui é a ordem dos campos na tela.
export const CEREBRO = [
  { id: 'sobre', nome: 'Sobre o cliente', dica: 'Negócio, produtos/serviços, diferenciais, história, cidade.' },
  { id: 'publico', nome: 'Público-alvo', dica: 'Quem é, dores, desejos, objeções, linguagem que usa.' },
  { id: 'tom', nome: 'Tom de voz', dica: 'Ex.: próximo e bem-humorado, sem gírias; trata por "você"; usa emojis com moderação.' },
  { id: 'pilares', nome: 'Pilares de conteúdo', dica: 'Ex.: Autoridade · Bastidores · Prova social · Oferta. Um por linha, com o peso de cada um.' },
  { id: 'estilo_copy', nome: 'Estilo de copy', dica: 'Estrutura preferida (AIDA, PAS…), gatilhos, frases que funcionam, como chamar para ação.' },
  { id: 'estilo_legenda', nome: 'Estilo de legenda', dica: 'Tamanho, primeira linha, quebras, emojis, CTA, assinatura.' },
  { id: 'estilo_reels', nome: 'Estilo de roteiro de Reels', dica: 'Duração, tipo de gancho, quem aparece, formato (talking head, tutorial, trend…).' },
  { id: 'estilo_carrossel', nome: 'Estilo de carrossel (copy)', dica: 'Nº de slides, estrutura (capa → desenvolvimento → CTA), tamanho do texto por slide.' },
  { id: 'formato_carrossel', nome: 'Formato visual do carrossel', dica: 'Cores, fontes, layout, uso de foto, referências de design. Usado pelo gerador de carrossel.' },
  { id: 'estilo_post', nome: 'Estilo de post estático', dica: 'Tipo de arte, headline, quanto texto na imagem.' },
  { id: 'estilo_stories', nome: 'Estilo de stories', dica: 'Frequência, interações (enquete, caixinha), sequências fixas.' },
  { id: 'formato_video', nome: 'Formato de edição de vídeo', dica: 'Modelo do CapCut, legendas (fonte, cor, posição), cortes, zoom, trilha, vinheta, duração.' },
  { id: 'hashtags', nome: 'Hashtags base', dica: 'As que sempre entram e as que nunca entram.' },
  { id: 'evitar', nome: 'O que evitar', dica: 'Palavras, temas, promessas e comparações proibidas.' },
  { id: 'fontes', nome: 'Fontes de pesquisa', dica: 'Sites, portais e perfis de onde tirar notícias e tendências. Um link por linha.' },
  { id: 'referencias', nome: 'Referências', dica: 'Perfis e posts que servem de inspiração. Um por linha.' },
  { id: 'concorrentes', nome: 'Concorrentes', dica: '@ ou sites dos concorrentes.' },
  { id: 'exemplos', nome: 'Exemplos aprovados', dica: 'Cole legendas e roteiros que o cliente aprovou e amou.' },
];

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
  `CREATE TABLE IF NOT EXISTS sessoes (token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, expira_em INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    segmento TEXT NOT NULL DEFAULT '',
    cor TEXT NOT NULL DEFAULT '#922f11',
    instagram TEXT NOT NULL DEFAULT '',
    tiktok TEXT NOT NULL DEFAULT '',
    linkedin TEXT NOT NULL DEFAULT '',
    site TEXT NOT NULL DEFAULT '',
    google TEXT NOT NULL DEFAULT '',
    drive TEXT NOT NULL DEFAULT '',
    logo_chave TEXT,
    cerebro TEXT NOT NULL DEFAULT '{}',
    metas TEXT NOT NULL DEFAULT '{}',
    ativo INTEGER NOT NULL DEFAULT 1,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS estrategias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    mes TEXT NOT NULL,
    foco TEXT NOT NULL DEFAULT '',
    resumo TEXT NOT NULL DEFAULT '[]',
    objetivos TEXT NOT NULL DEFAULT '[]',
    texto TEXT NOT NULL DEFAULT '',
    anexo_chave TEXT,
    anexo_nome TEXT,
    anexo_mime TEXT,
    atualizado_por INTEGER,
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (cliente_id, mes)
  )`,
  `CREATE TABLE IF NOT EXISTS demandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL DEFAULT 'post',
    status TEXT NOT NULL DEFAULT 'briefing',
    pilar TEXT NOT NULL DEFAULT '',
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
    aprovado_cliente TEXT,
    criado_por INTEGER,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    arquivada INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demandas_cliente ON demandas(cliente_id, arquivada)`,
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
    autor_externo TEXT,
    texto TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demanda_id INTEGER NOT NULL,
    usuario_id INTEGER,
    autor_externo TEXT,
    acao TEXT NOT NULL,
    de TEXT,
    para TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_historico_demanda ON historico(demanda_id)`,
  `CREATE TABLE IF NOT EXISTS aprovacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL DEFAULT '',
    demanda_ids TEXT NOT NULL DEFAULT '[]',
    expira_em INTEGER NOT NULL,
    criado_por INTEGER,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    visto_em TEXT,
    respondido_em TEXT,
    ativo INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS paginas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    pai_id INTEGER,
    titulo TEXT NOT NULL DEFAULT 'Sem título',
    icone TEXT NOT NULL DEFAULT '',
    blocos TEXT NOT NULL DEFAULT '[]',
    ordem INTEGER NOT NULL DEFAULT 0,
    arquivada INTEGER NOT NULL DEFAULT 0,
    criado_por INTEGER,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_paginas_cliente ON paginas(cliente_id, arquivada)`,
  `CREATE TABLE IF NOT EXISTS ia_geracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    modo TEXT NOT NULL,
    pedido TEXT NOT NULL DEFAULT '',
    resposta TEXT NOT NULL DEFAULT '',
    dados TEXT,
    demanda_id INTEGER,
    usuario_id INTEGER,
    tokens_entrada INTEGER,
    tokens_saida INTEGER,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ia_cliente ON ia_geracoes(cliente_id, id)`,
  `CREATE TABLE IF NOT EXISTS notificacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    demanda_id INTEGER,
    titulo TEXT NOT NULL,
    corpo TEXT NOT NULL DEFAULT '',
    url TEXT,
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
    nome TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS instagram (
    cliente_id INTEGER PRIMARY KEY,
    ig_user_id TEXT,
    username TEXT,
    token TEXT,
    token_expira_em INTEGER,
    token_renovado_em INTEGER,
    perfil TEXT,
    midias TEXT,
    sincronizado_em INTEGER,
    painel TEXT,
    painel_em INTEGER,
    erro TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ig_diario (cliente_id INTEGER NOT NULL, dia TEXT NOT NULL, seguidores INTEGER, posts INTEGER, PRIMARY KEY (cliente_id, dia))`,
  `CREATE TABLE IF NOT EXISTS oauth_estados (estado TEXT PRIMARY KEY, cliente_id INTEGER NOT NULL, usuario_id INTEGER, expira_em INTEGER NOT NULL)`,
];

// Colunas novas em tabelas que já existem em produção entram aqui (cada uma num try/catch).
const ALTERACOES = [];

let migrado = false;
export async function migrar(env) {
  if (migrado) return;
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
  for (const sql of ALTERACOES) {
    try {
      await env.DB.prepare(sql).run();
    } catch {}
  }
  migrado = true;
}

export const agoraIso = () => new Date().toISOString();
export const hojeSP = (deslocDias = 0) => new Date(Date.now() + deslocDias * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export const mesSP = () => hojeSP().slice(0, 7);

export async function getConfig(env, chave) {
  const r = await env.DB.prepare('SELECT valor FROM config WHERE chave = ?').bind(chave).first();
  return r ? r.valor : null;
}

export async function setConfig(env, chave, valor) {
  await env.DB.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(chave, valor).run();
}

export async function carregarCliente(env, id) {
  const c = await env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(Number(id)).first();
  return c || null;
}

export const lerJsonSeguro = (txt, padrao) => {
  try {
    return txt ? JSON.parse(txt) : padrao;
  } catch {
    return padrao;
  }
};
