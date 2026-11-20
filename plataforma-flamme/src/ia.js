// IA da Flamme (Claude). Cada cliente tem o seu "cérebro" (estilos e referências cadastrados na plataforma)
// e a estratégia do mês; a IA usa os dois em toda geração.

import Anthropic from '@anthropic-ai/sdk';
import { CEREBRO, lerJsonSeguro, hojeSP } from './db.js';

const MODELO = 'claude-opus-5-5';

export const MODOS = {
  legenda: { nome: 'Legenda', web: false },
  roteiro: { nome: 'Roteiro de Reels', web: false },
  carrossel: { nome: 'Carrossel (copy)', web: false },
  post: { nome: 'Post estático', web: false },
  stories: { nome: 'Sequência de stories', web: false },
  hashtags: { nome: 'Hashtags', web: false },
  temas: { nome: 'Pesquisar temas em alta', web: true },
  insights: { nome: 'Insights dos números', web: false },
  livre: { nome: 'Pedido livre', web: false },
  estrategia: { nome: 'Resumo da estratégia', web: false },
};

const SISTEMA_BASE = `Você é a social media sênior e copywriter da Flamme, agência de marketing digital brasileira.
Você cuida do conteúdo de vários clientes e escreve sempre no estilo próprio de cada um, a partir do "cérebro do cliente" e da estratégia do mês que vêm abaixo.

Regras fixas:
- Escreva em português do Brasil, natural, sem cara de texto gerado por IA. Nada de clichês como "No mundo de hoje", "Descubra", "Você sabia que" na abertura, a não ser que o estilo do cliente peça.
- Respeite o tom de voz, o que evitar e os exemplos aprovados do cliente acima de qualquer preferência sua.
- Siga a estratégia do mês: objetivos, foco e pilares.
- Limites do Instagram: legenda até 2.200 caracteres, no máximo 30 hashtags, carrossel com até 10 slides.
- Não invente dados, preços, depoimentos ou resultados do cliente. Quando faltar uma informação, deixe um marcador entre colchetes, como [preço], e siga.
- Formate a resposta em Markdown simples (títulos com ##, listas com -, negrito com **). Seja direta: entregue o conteúdo pronto, sem introdução nem despedida.`;

function blocoCliente(cliente, estrategia) {
  const cerebro = lerJsonSeguro(cliente.cerebro, {});
  const partes = [`# Cliente: ${cliente.nome}`];
  if (cliente.segmento) partes.push(`Segmento: ${cliente.segmento}`);
  const redes = [
    cliente.instagram && `Instagram @${cliente.instagram}`,
    cliente.tiktok && `TikTok @${cliente.tiktok}`,
    cliente.linkedin && `LinkedIn ${cliente.linkedin}`,
    cliente.site && `Site ${cliente.site}`,
  ].filter(Boolean);
  if (redes.length) partes.push(`Redes: ${redes.join(' · ')}`);
  partes.push('\n## Cérebro do cliente');
  let algum = false;
  for (const c of CEREBRO) {
    const v = String(cerebro[c.id] || '').trim();
    if (!v) continue;
    algum = true;
    partes.push(`### ${c.nome}\n${v}`);
  }
  if (!algum) partes.push('(Ainda não preenchido. Use bom senso para o segmento e deixe claro o que precisa ser confirmado.)');
  if (estrategia) {
    partes.push(`\n## Estratégia de ${estrategia.mes}`);
    if (estrategia.foco) partes.push(`Foco do mês: ${estrategia.foco}`);
    const obj = lerJsonSeguro(estrategia.objetivos, []);
    if (obj.length) partes.push(`Objetivos:\n${obj.map((o) => `- ${o}`).join('\n')}`);
    const res = lerJsonSeguro(estrategia.resumo, []);
    if (res.length) partes.push(`Resumo:\n${res.map((o) => `- ${o}`).join('\n')}`);
    if (estrategia.texto) partes.push(`Estratégia completa:\n${estrategia.texto.slice(0, 20000)}`);
  }
  return partes.join('\n');
}

function instrucao(modo, { pedido, demanda, dadosInstagram }) {
  const hoje = hojeSP();
  const contexto = demanda
    ? `\n\nDemanda: "${demanda.titulo}" (formato: ${demanda.tipo}${demanda.pilar ? `, pilar: ${demanda.pilar}` : ''})\nBriefing: ${demanda.descricao || '(sem briefing)'}${demanda.legenda ? `\nLegenda atual: ${demanda.legenda}` : ''}`
    : '';
  const extra = pedido ? `\n\nPedido da equipe: ${pedido}` : '';
  switch (modo) {
    case 'legenda':
      return `Escreva a legenda deste post seguindo o estilo de legenda e de copy do cliente.${contexto}${extra}

Responda SÓ com a legenda pronta para colar no Instagram: primeira linha forte, corpo, chamada para ação e, no fim, as hashtags (use as hashtags base do cliente e complete até no máximo 20). Sem títulos, sem comentários.`;
    case 'roteiro':
      return `Crie o roteiro de um Reels seguindo o estilo de Reels e o formato de edição de vídeo do cliente.${contexto}${extra}

Estrutura:
## Gancho (0–3s)
fala + texto na tela + o que aparece
## Desenvolvimento
cena a cena, com tempo aproximado, fala, texto na tela e sugestão de imagem/b-roll
## Chamada para ação
## Edição
cortes, legendas, zoom, trilha/áudio em alta sugerido, duração total
## Legenda
legenda curta pronta, com hashtags`;
    case 'carrossel':
      return `Crie um carrossel seguindo o estilo de carrossel (copy) e o formato visual do cliente.${contexto}${extra}

Estrutura:
## Slide 1 (capa)
título forte (até 8 palavras) + subtítulo
## Slides 2 a N
para cada um: título, texto curto (até 35 palavras) e sugestão visual
## Último slide
chamada para ação
## Legenda
legenda pronta com hashtags

Use entre 5 e 10 slides.`;
    case 'post':
      return `Crie um post estático seguindo o estilo de post do cliente.${contexto}${extra}

## Texto da arte
headline + linha de apoio (pouco texto)
## Sugestão visual
## Legenda
pronta, com hashtags`;
    case 'stories':
      return `Crie uma sequência de stories seguindo o estilo de stories do cliente.${contexto}${extra}

Para cada story (de 3 a 7): tipo (foto, vídeo, enquete, caixinha, quiz, link), texto na tela, o que aparece e a interação. Termine com a chamada para ação.`;
    case 'hashtags':
      return `Selecione hashtags para este conteúdo.${contexto}${extra}

## Amplas (alto volume)
## De nicho
## Locais
## Da marca
No total, no máximo 30. Depois, uma linha "Para colar:" com as 20 melhores separadas por espaço.`;
    case 'temas':
      return `Hoje é ${hoje}. Pesquise na web o que está em alta AGORA no nicho deste cliente (notícias, tendências, datas, assuntos virais, sazonalidade). Priorize as fontes de pesquisa cadastradas no cérebro do cliente quando houver. Cruze com a estratégia do mês.${extra}

Traga de 6 a 8 pautas prontas para virar conteúdo. Responda SOMENTE com um bloco \`\`\`json contendo uma lista assim:
[{"titulo": "título da pauta", "formato": "reels|carrossel|post|story", "gancho": "primeira frase/gancho", "resumo": "do que se trata e o ângulo do cliente (2-3 frases)", "por_que_agora": "por que é relevante esta semana", "fonte": "URL da notícia ou referência"}]`;
    case 'insights':
      return `Analise os números do Instagram do cliente abaixo e a estratégia do mês.${extra}

Dados (JSON):
${JSON.stringify(dadosInstagram || {}, null, 0).slice(0, 30000)}

Responda com:
## Resumo em 3 linhas
## O que está funcionando
## O que não está
## Melhores formatos e horários
## Próximos passos (2 semanas)
ações concretas e numeradas, com o formato e o tema de cada conteúdo sugerido`;
    case 'estrategia':
      return `Leia a estratégia do mês deste cliente (texto e/ou arquivo anexado) e resuma para o topo da página do cliente.${extra}

Responda SOMENTE com um bloco \`\`\`json assim:
{"foco": "o foco do mês em uma frase curta", "objetivos": ["até 4 objetivos mensuráveis"], "resumo": ["de 3 a 6 tópicos curtos com as ações principais do mês"]}`;
    default:
      return `${pedido || 'Ajude com o conteúdo deste cliente.'}${contexto}`;
  }
}

function base64DeBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Extrai o primeiro bloco ```json (ou o primeiro [..]/{..}) da resposta.
export function extrairJson(texto) {
  const m = texto.match(/```json\s*([\s\S]*?)```/i) || texto.match(/```\s*([\s\S]*?)```/);
  const bruto = m ? m[1] : texto.slice(Math.min(...['[', '{'].map((c) => (texto.indexOf(c) < 0 ? Infinity : texto.indexOf(c)))));
  try {
    return JSON.parse(bruto.trim());
  } catch {
    return null;
  }
}

/**
 * Gera conteúdo para um cliente.
 * @returns {{texto: string, dados: any, uso: {entrada: number, saida: number}}}
 */
export async function gerar(env, { modo, cliente, estrategia, pedido = '', demanda = null, dadosInstagram = null, pdf = null }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('Configure a chave da IA (ANTHROPIC_API_KEY) no Cloudflare para usar a IA.');
  if (!MODOS[modo]) throw new Error('Modo de IA inválido.');
  // ANTHROPIC_BASE_URL só é usado em testes locais (servidor simulado)
  const cliente_ = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });

  const conteudo = [];
  if (pdf) conteudo.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64DeBuffer(pdf) } });
  conteudo.push({ type: 'text', text: instrucao(modo, { pedido, demanda, dadosInstagram }) });
  const mensagens = [{ role: 'user', content: conteudo }];

  const params = {
    model: MODELO,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: MODOS[modo].web ? 'high' : 'medium' },
    // parte fixa primeiro (cacheável); dados do cliente logo depois
    system: [
      { type: 'text', text: SISTEMA_BASE },
      { type: 'text', text: blocoCliente(cliente, estrategia), cache_control: { type: 'ephemeral' } },
    ],
    messages: mensagens,
  };
  if (MODOS[modo].web) params.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8, user_location: { type: 'approximate', country: 'BR', timezone: 'America/Sao_Paulo' } }];

  let resposta;
  const uso = { entrada: 0, saida: 0 };
  // a busca na web pode pausar o turno (pause_turn): continua até 3 vezes
  for (let i = 0; i < 4; i++) {
    resposta = await cliente_.beta.messages.stream(params).finalMessage();
    uso.entrada += resposta.usage?.input_tokens || 0;
    uso.saida += resposta.usage?.output_tokens || 0;
    if (resposta.stop_reason !== 'pause_turn') break;
    mensagens.push({ role: 'assistant', content: resposta.content });
  }
  if (resposta.stop_reason === 'refusal') throw new Error('A IA não quis gerar esse conteúdo. Reformule o pedido.');

  const texto = resposta.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!texto) throw new Error('A IA não devolveu texto. Tente de novo.');
  const dados = modo === 'temas' || modo === 'estrategia' ? extrairJson(texto) : null;
  return { texto, dados, uso };
}
