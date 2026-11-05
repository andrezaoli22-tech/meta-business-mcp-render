/* Utilitários comuns aos templates de motion.
 * Cada template define window.renderFrame(t) e lê seus parâmetros de window.PARAMS.
 * Curvas: use saídas suaves (expo/quart). Evite elásticos e "bounce": é o que mais
 * denuncia template genérico. Movimento curto, rápido na entrada, lento no assentamento. */
window.M = {
  P: Object.assign({}, window.PADRAO || {}, window.PARAMS || {}),
  clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
  expo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  quart: x => 1 - Math.pow(1 - x, 4),
  inOut: x => x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2,
  cubicIn: x => x * x * x,
  /* progresso 0..1 de uma animação que começa em ini e dura d */
  p(t, ini, d, curva) { return (curva || M.expo)(M.clamp((t - ini) / d)); },
  /* entrada e saída: 1 enquanto visível, 0 fora; d1 entra, d2 sai no fim (fim = DURACAO) */
  envelope(t, d1, d2, fim) {
    const e = M.expo(M.clamp(t / d1));
    const s = M.cubicIn(M.clamp((t - (fim - d2)) / d2));
    return { e, s, v: e * (1 - s) };
  },
  lerp: (a, b, x) => a + (b - a) * x,
};
window.DURACAO = M.P.duracao || window.DURACAO || 3;
