// Avisa a equipe: grava a notificação dentro da plataforma e manda push para os aparelhos conectados.

import { EMPRESAS } from './db.js';
import { enviarPush } from './push.js';

export async function notificar(env, { empresa, demandaId = null, titulo, corpo = '', autorId = null, somente = null }) {
  const nomeEmpresa = EMPRESAS[empresa]?.nome || '';
  const tituloFinal = nomeEmpresa ? `${nomeEmpresa} · ${titulo}` : titulo;

  let usuarios = (await env.DB.prepare('SELECT id, papel FROM usuarios WHERE ativo = 1').all()).results;
  if (somente) usuarios = usuarios.filter(somente);
  const destino = usuarios.filter((u) => u.id !== autorId);
  if (!destino.length) return;

  await env.DB.batch(
    destino.map((u) =>
      env.DB.prepare('INSERT INTO notificacoes (usuario_id, empresa, demanda_id, titulo, corpo) VALUES (?, ?, ?, ?, ?)').bind(
        u.id,
        empresa,
        demandaId,
        tituloFinal,
        corpo
      )
    )
  );

  const ids = destino.map((u) => u.id);
  const disp = (
    await env.DB.prepare(`SELECT * FROM dispositivos WHERE usuario_id IN (${ids.map(() => '?').join(',')})`)
      .bind(...ids)
      .all()
  ).results.filter((d) => {
    try {
      return !empresa || JSON.parse(d.empresas).includes(empresa);
    } catch {
      return true;
    }
  });

  const url = empresa ? `/${empresa}${demandaId ? `?d=${demandaId}` : ''}` : '/';
  const mensagem = { titulo: tituloFinal, corpo, url, empresa, tag: demandaId ? `demanda-${demandaId}` : undefined };
  const resultados = await Promise.all(disp.map((d) => enviarPush(env, d, mensagem).then((r) => [d.id, r])));
  const expirados = resultados.filter(([, r]) => r === 'expirado').map(([id]) => id);
  if (expirados.length) {
    await env.DB.prepare(`DELETE FROM dispositivos WHERE id IN (${expirados.map(() => '?').join(',')})`)
      .bind(...expirados)
      .run();
  }
}
