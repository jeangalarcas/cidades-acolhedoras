/**
 * SGA — Avisos oficiais do INMET (apiprevmet3), filtrados para o RS.
 * Nota honesta: a API do INMET oscila (503 verificado em 15/07/2026);
 * esta rota degrada com elegância e informa a indisponibilidade.
 */
const express = require('express');
const router = express.Router();

let _cache = null, _cacheAte = 0;

router.get('/avisos', async (req, res) => {
  try {
    if (_cache && Date.now() < _cacheAte) return res.json(_cache);
    const r = await fetch('https://apiprevmet3.inmet.gov.br/avisos/ativos', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error('INMET HTTP ' + r.status);
    const j = await r.json();
    const todos = [].concat(j && j.hoje || [], j && j.futuro || [], Array.isArray(j) ? j : []);
    const doRS = todos.filter(a => {
      const alvo = JSON.stringify([a.estados, a.geocodes, a.municipios, a.uf] || '').toLowerCase();
      return alvo.includes('rio grande do sul') || alvo.includes('"rs"') || /"43\d{5}"/.test(alvo);
    });
    const corpo = { disponivel: true, total_rs: doRS.length, avisos: doRS,
                    fonte: 'INMET · apiprevmet3', consultado_em: new Date().toISOString() };
    _cache = corpo; _cacheAte = Date.now() + 10 * 60 * 1000;   // cache 10 min
    res.json(corpo);
  } catch (e) {
    res.json({ disponivel: false, total_rs: 0, avisos: [],
               motivo: 'INMET indisponível no momento (' + e.message + ')' });
  }
});

module.exports = router;