/**
 * SGA — Câmeras de nível de rio (server/routes/cameras.js)
 * Fonte dos níveis: niveldorio.com (Infotec Sistemas — leitura por IA).
 * Integração por EXIBIÇÃO COM ATRIBUIÇÃO + LINK para a câmera na fonte
 * (uma requisição à listagem cobre todas as câmeras · cache 5 min).
 *
 *   GET /api/cameras            → todas as câmeras (com nível ao vivo)
 *   GET /api/cameras/:cod_ibge  → só as do município
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

let _cache = null, _cacheAte = 0;

async function niveisAoVivo() {
  if (_cache && Date.now() < _cacheAte) return _cache;
  const r = await fetch('https://niveldorio.com/cameras', {
    headers: { 'User-Agent': 'SGA-RS (defesa civil; contato via site)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error('niveldorio HTTP ' + r.status);
  const html = await r.text();
  const mapa = {};
  // blocos: href=".../cameras/{slug}" ... "Última medição ... N.NNm ... DD/MM/YYYY HH:MM"
  const partes = html.split(/href="https:\/\/niveldorio\.com\/cameras\//).slice(1);
  for (const p of partes) {
    const slug = (p.match(/^([A-Za-z0-9_-]+)"/) || [])[1];
    const nivel = (p.match(/([\d]+[.,]\d+)\s*m/) || [])[1];
    const quando = (p.match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/) || [])[1];
    if (slug && nivel && !mapa[slug]) {
      mapa[slug] = { nivel_m: parseFloat(nivel.replace(',', '.')), medido_em: quando || null };
    }
  }
  _cache = mapa; _cacheAte = Date.now() + 5 * 60 * 1000;
  return mapa;
}

async function responder(res, ibge) {
  const { rows } = await db.query(
    `SELECT slug, nome, municipio_nome, cod_ibge, rio_nome, url_pagina, fonte
       FROM cameras_rio
      WHERE ativo AND ($1::int IS NULL OR cod_ibge = $1)
      ORDER BY municipio_nome, nome`, [ibge]);
  let vivo = {}, aviso = null;
  try { vivo = await niveisAoVivo(); }
  catch (e) { aviso = 'níveis ao vivo indisponíveis no momento (' + e.message + ')'; }
  res.json({
    total: rows.length, aviso,
    cameras: rows.map(c => ({ ...c, ...(vivo[c.slug] || { nivel_m: null, medido_em: null }) })),
    fonte: 'niveldorio.com · Infotec Sistemas (câmeras com leitura por IA)',
  });
}

router.get('/', (req, res) =>
  responder(res, null).catch(e => res.status(500).json({ erro: e.message })));
router.get('/:cod_ibge', (req, res) =>
  responder(res, parseInt(req.params.cod_ibge, 10)).catch(e => res.status(500).json({ erro: e.message })));

module.exports = router;