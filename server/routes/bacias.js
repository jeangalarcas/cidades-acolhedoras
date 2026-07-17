/**
 * SGA — Bacias Hidrográficas oficiais do RS (server/routes/bacias.js)
 * Fontes: Decreto Estadual 53.885/2018 · polígonos KMZ SEMA (BCRS25,
 * simplificados ~100 m) · vínculos NT 02/2020/DIPLA/DRHS (com áreas).
 *
 * ROTAS:
 *   GET /api/bacias                → as 25 bacias (região, municípios, estações)
 *   GET /api/bacias/geojson        → FeatureCollection dos polígonos (mapa)
 *   GET /api/bacias/:codigo        → detalhe: municípios membros + estações + agregados
 *   GET /api/bacias/:codigo/geojson→ polígono individual (fitBounds)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

let _cacheLista = null, _cacheListaAte = 0;
let _cacheGeo = null, _cacheGeoAte = 0;

/* GET /api/bacias — lista com contagens (cache 10 min) */
router.get('/', async (req, res) => {
  try {
    if (_cacheLista && Date.now() < _cacheListaAte) return res.json(_cacheLista);
    const { rows } = await db.query(`
      SELECT b.codigo, b.nome, b.regiao,
             regexp_replace(b.nome, '^Bacia Hidrográfica (do |dos |da |de )?', '') AS nome_curto,
             (SELECT count(*) FROM municipio_bacia mb WHERE mb.bacia_codigo=b.codigo)::int AS municipios,
             (SELECT count(*) FROM municipio_bacia mb WHERE mb.bacia_codigo=b.codigo AND mb.principal)::int AS municipios_principais,
             (SELECT count(*) FROM estacoes_ana e
               WHERE e.geom IS NOT NULL AND extensions.ST_Within(e.geom, b.geom))::int AS estacoes,
             (SELECT count(*) FROM estacoes_ana e
               WHERE e.categoria='ativa' AND e.geom IS NOT NULL
                 AND extensions.ST_Within(e.geom, b.geom))::int AS estacoes_ativas
        FROM bacias_rs b ORDER BY b.regiao, b.nome`);
    _cacheLista = { total: rows.length, bacias: rows,
                    fonte: 'SEMA/DRHS — Decreto 53.885/2018 · NT 02/2020' };
    _cacheListaAte = Date.now() + 10 * 60 * 1000;
    res.json(_cacheLista);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/bacias/geojson — todos os polígonos (cache 1 h; extra-simplificado p/ camada estadual) */
router.get('/geojson', async (req, res) => {
  try {
    if (_cacheGeo && Date.now() < _cacheGeoAte) return res.json(_cacheGeo);
    const { rows } = await db.query(`
      SELECT json_build_object('type','FeatureCollection','features', json_agg(
        json_build_object('type','Feature',
          'geometry', extensions.ST_AsGeoJSON(
            extensions.ST_SimplifyPreserveTopology(geom, 0.002), 5)::json,
          'properties', json_build_object('codigo',codigo,'nome',nome,'regiao',regiao)
        ))) AS fc FROM bacias_rs`);
    _cacheGeo = rows[0].fc; _cacheGeoAte = Date.now() + 60 * 60 * 1000;
    res.json(_cacheGeo);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/bacias/:codigo/geojson — um polígono (fidelidade cheia armazenada) */
router.get('/:codigo/geojson', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT json_build_object('type','Feature',
        'geometry', extensions.ST_AsGeoJSON(geom, 5)::json,
        'properties', json_build_object('codigo',codigo,'nome',nome,'regiao',regiao)) AS f
      FROM bacias_rs WHERE codigo = $1`, [req.params.codigo.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ erro: 'bacia não encontrada' });
    res.json(rows[0].f);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/bacias/:codigo — municípios membros + estações + agregados */
router.get('/:codigo', async (req, res) => {
  try {
    const cod = req.params.codigo.toUpperCase();
    const b = await db.query(`
      SELECT codigo, nome, regiao,
             regexp_replace(nome, '^Bacia Hidrográfica (do |dos |da |de )?', '') AS nome_curto
        FROM bacias_rs WHERE codigo=$1`, [cod]);
    if (!b.rows.length) return res.status(404).json({ erro: 'bacia não encontrada' });

    const municipios = await db.query(`
      SELECT m.cod_ibge, m.nome, m.lat, m.lng, m.populacao,
             m.risco_nivel_str, m.risco_cor, m.mesorregiao,
             mb.principal, round(mb.area_km2,1) AS area_na_bacia_km2
        FROM municipio_bacia mb JOIN municipios m ON m.cod_ibge = mb.cod_ibge
       WHERE mb.bacia_codigo = $1
       ORDER BY mb.principal DESC, m.populacao DESC NULLS LAST`, [cod]);

    const estacoes = await db.query(`
      SELECT e.codigo, e.nome, e.tipo, e.rio_nome, e.categoria,
             e.latitude, e.longitude,
             round((e.ultima_cota_cm/100.0)::numeric,2) AS cota_m,
             cr.cota_alerta_cm, cr.cota_inundacao_cm
        FROM estacoes_ana e
        JOIN bacias_rs b ON b.codigo = $1 AND extensions.ST_Within(e.geom, b.geom)
        LEFT JOIN cotas_referencia cr ON cr.codigo_estacao = e.codigo
       WHERE e.telemetrica
       ORDER BY (cr.codigo_estacao IS NOT NULL) DESC, e.nome`, [cod]);

    res.json({
      ...b.rows[0],
      populacao_total: municipios.rows.reduce((s,m)=>s+(m.principal?(m.populacao||0):0),0),
      total_municipios: municipios.rows.length,
      municipios: municipios.rows,
      total_estacoes: estacoes.rows.length,
      estacoes_ativas: estacoes.rows.filter(e=>e.categoria==='ativa').length,
      estacoes: estacoes.rows,
      fonte: 'SEMA/DRHS (Decreto 53.885/2018 · NT 02/2020) + ANA',
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;