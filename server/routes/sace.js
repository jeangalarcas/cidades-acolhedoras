/**
 * SGA — Verificador de cotas de referência contra os boletins SACE/SGB
 * (server/routes/sace.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * As URLs /sace/{bacia}/ultimo_boletim.php do SGB servem SEMPRE o PDF do
 * boletim mais recente (verificado em 16/07/2026). Esta rota baixa os três
 * (Caí, Taquari, Uruguai), extrai o texto e CONFERE se cada limiar gravado
 * em cotas_referencia continua aparecendo no boletim da sua bacia.
 *
 * DECISÃO DE PROJETO (segurança do dado): a rota NUNCA altera valores
 * sozinha — parsing de PDF é falível e limiar oficial não admite erro.
 * Ela responde {confirmadas, possivel_mudanca}; o workflow mensal FALHA
 * (e o GitHub avisa por e-mail) quando houver possivel_mudanca, e a
 * atualização é feita por humano lendo o boletim.
 *
 * Dependência: pdf-parse  →  npm install pdf-parse
 * Proteção: ?chave=ANA_SYNC_TOKEN (mesmo secret do enriquecimento)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

let pdfParse = null;
try {
  const _pp = require('pdf-parse');
  pdfParse = (typeof _pp === 'function') ? _pp
           : (typeof _pp.default === 'function') ? _pp.default
           : (typeof _pp.pdf === 'function') ? _pp.pdf : null;
} catch (_) { /* tratado na rota */ }

const BACIAS = {
  'Caí':     'https://www.sgb.gov.br/sace/cai/ultimo_boletim.php',
  'Taquari': 'https://www.sgb.gov.br/sace/taquari/ultimo_boletim.php',
  'Uruguai': 'https://www.sgb.gov.br/sace/uruguai/ultimo_boletim.php',
};

/* normaliza para comparação: maiúsculas e sem acentos */
const norm = (t) => String(t || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/* o valor (em cm) aparece no texto do boletim?
   aceita "(900 cm)", "(900cm)" (rótulos de gráfico) ou o número isolado
   a até 300 caracteres de uma ocorrência do nome da estação (linha de tabela) */
function valorConfere(txtNorm, nomeNorm, valor) {
  const v = String(Math.round(valor));
  if (new RegExp('\\(\\s*' + v + '\\s*CM\\s*\\)').test(txtNorm)) return true;
  let i = txtNorm.indexOf(nomeNorm);
  while (i !== -1) {
    const janela = txtNorm.slice(i, i + nomeNorm.length + 300);
    if (new RegExp('\\b' + v + '\\b').test(janela)) return true;
    i = txtNorm.indexOf(nomeNorm, i + 1);
  }
  return false;
}

/* GET/POST /api/sace/verificar-cotas?chave=... */
router.all('/verificar-cotas', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN)
      return res.status(403).json({ erro: 'chave inválida' });
    if (!pdfParse)
      return res.status(500).json({ erro: 'dependência ausente: rode "npm install pdf-parse" e faça deploy' });

    const { rows: estacoes } = await db.query(`
      SELECT cr.codigo_estacao, cr.cota_atencao_cm, cr.cota_alerta_cm,
             cr.cota_inundacao_cm, cr.fonte, e.nome
        FROM cotas_referencia cr
        JOIN estacoes_ana e ON e.codigo = cr.codigo_estacao`);

    const resultado = [];
    for (const [bacia, url] of Object.entries(BACIAS)) {
      const doBacia = estacoes.filter(r => (r.fonte || '').includes(bacia));
      const item = { bacia, url, estacoes: doBacia.length,
                     confirmadas: 0, possivel_mudanca: [], erro: null };
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.slice(0, 4).toString() !== '%PDF') throw new Error('resposta não é PDF');
        const txt = norm((await pdfParse(buf)).text);
        item.boletim_kb = Math.round(buf.length / 1024);

        for (const est of doBacia) {
          const nomeN = norm(est.nome);
          const campos = [['atencao', est.cota_atencao_cm],
                          ['alerta', est.cota_alerta_cm],
                          ['inundacao', est.cota_inundacao_cm]]
                         .filter(([, v]) => v != null);
          const falhas = campos.filter(([, v]) => !valorConfere(txt, nomeN, +v));
          if (falhas.length === 0) item.confirmadas++;
          else item.possivel_mudanca.push({
            codigo: est.codigo_estacao, estacao: est.nome,
            campos: falhas.map(([c, v]) => c + '=' + v + 'cm'),
          });
        }
      } catch (e) { item.erro = e.message; }
      resultado.push(item);
    }

    const totalMudancas = resultado.reduce((s, b) => s + b.possivel_mudanca.length, 0);
    res.json({
      ok: true, consultado_em: new Date().toISOString(),
      total_possivel_mudanca: totalMudancas,
      bacias: resultado,
      politica: 'Valores NÃO são alterados automaticamente. Em caso de possivel_mudanca, conferir o boletim oficial e atualizar cotas_referencia manualmente.',
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;