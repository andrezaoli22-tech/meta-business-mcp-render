// Avisa a equipe: grava a notificação dentro da plataforma e manda push para os aparelhos conectados.

import { enviarPush } from './push.js';

export async function notificar(env, { clienteId = null, demandaId = null, titulo, corpo = '', autorId = null, somente = null, url = null }) {
  let cliente = null;
  if (clienteId) cliente = await env.DB.prepare('SELECT nome, slug FROM clientes WHERE id = ?').bind(clienteId).first();
  const tituloFinal = cliente ? `${cliente.nome} · ${titulo}` : titulo;
  const destinoUrl = url || (cliente ? `/c/${cliente.slug}${demandaId ? `?d=${demandaId}` : ''}` : '/');

  let usuarios = (await env.DB.prepare('SELECT id, papel FROM usuarios WHERE ativo = 1').all()).results;
  if (somente) usuarios = usuarios.filter(somente);
  const destino = usuarios.filter((u) => u.id !== autorId);
  if (!destino.length) return;

  await env.DB.batch(
    destino.map((u) =>
      env.DB.prepare('INSERT INTO notificacoes (usuario_id, cliente_id, demanda_id, titulo, corpo, url) VALUES (?, ?, ?, ?, ?, ?)').bind(u.id, clienteId, demandaId, tituloFinal, corpo, destinoUrl)
    )
  );

  const ids = destino.map((u) => u.id);
  const disp = (await env.DB.prepare(`SELECT * FROM dispositivos WHERE usuario_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
  const mensagem = { titulo: tituloFinal, corpo, url: destinoUrl, tag: demandaId ? `demanda-${demandaId}` : undefined };
  const resultados = await Promise.all(disp.map((d) => enviarPush(env, d, mensagem).then((r) => [d.id, r])));
  const expirados = resultados.filter(([, r]) => r === 'expirado').map(([id]) => id);
  if (expirados.length) {
    await env.DB.prepare(`DELETE FROM dispositivos WHERE id IN (${expirados.map(() => '?').join(',')})`).bind(...expirados).run();
  }
}
