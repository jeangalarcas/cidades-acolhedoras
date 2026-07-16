/**
 * SGA — Registro de Alertas e Ocorrências (trilha de auditoria · COBRADE)
 * Base histórica para relatórios, FIDE/S2iD e futura análise preditiva.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

const NIVEIS = ['amarelo', 'laranja', 'vermelho', 'roxo'];

/* POST /api/registro/alerta — grava um alerta emitido (dedup de 6h por município+título) */
router.post('/alerta', async (req, res) => {
  try {
    const { cod_ibge, municipio_nome, nivel, cobrade, titulo, descricao, gatilho, fonte_dados } = req.body || {};
    if (!titulo || !NIVEIS.includes(nivel))
      return res.status(400).json({ erro: 'titulo e nivel (amarelo|laranja|vermelho|roxo) são obrigatórios' });
    const dup = await db.query(
      `SELECT id FROM alertas_emitidos
        WHERE cod_ibge = $1 AND titulo = $2 AND nivel = $3
          AND criado_em > now() - interval '6 hours' AND encerrado_em IS NULL
        LIMIT 1`, [cod_ibge || null, titulo, nivel]);
    if (dup.rows.length) return res.json({ ok: true, id: dup.rows[0].id, duplicado: true });
    const r = await db.query(
      `INSERT INTO alertas_emitidos (cod_ibge, municipio_nome, nivel, cobrade, titulo, descricao, gatilho, fonte_dados)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, criado_em`,
      [cod_ibge || null, municipio_nome || null, nivel, cobrade || null,
       titulo, descricao || null, gatilho ? JSON.stringify(gatilho) : null, fonte_dados || null]);
    res.status(201).json({ ok: true, ...r.rows[0] });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/registro/alertas?ibge=&limite=50 — histórico */
router.get('/alertas', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite || '50', 10), 200);
    const ibge = req.query.ibge ? parseInt(req.query.ibge, 10) : null;
    const { rows } = await db.query(
      `SELECT a.*, c.denominacao AS cobrade_nome
         FROM alertas_emitidos a LEFT JOIN cobrade c ON c.codigo = a.cobrade
        WHERE ($1::int IS NULL OR a.cod_ibge = $1)
        ORDER BY a.criado_em DESC LIMIT $2`, [ibge, limite]);
    res.json({ total: rows.length, alertas: rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* POST /api/registro/ocorrencia — evento confirmado em campo */
router.post('/ocorrencia', async (req, res) => {
  try {
    const { cod_ibge, municipio_nome, cobrade, descricao, dados } = req.body || {};
    if (!descricao) return res.status(400).json({ erro: 'descricao é obrigatória' });
    const r = await db.query(
      `INSERT INTO ocorrencias (cod_ibge, municipio_nome, cobrade, descricao, dados)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, criado_em`,
      [cod_ibge || null, municipio_nome || null, cobrade || null, descricao,
       dados ? JSON.stringify(dados) : null]);
    res.status(201).json({ ok: true, ...r.rows[0] });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/registro/ocorrencias?ibge=&limite=50 */
router.get('/ocorrencias', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite || '50', 10), 200);
    const ibge = req.query.ibge ? parseInt(req.query.ibge, 10) : null;
    const { rows } = await db.query(
      `SELECT o.*, c.denominacao AS cobrade_nome
         FROM ocorrencias o LEFT JOIN cobrade c ON c.codigo = o.cobrade
        WHERE ($1::int IS NULL OR o.cod_ibge = $1)
        ORDER BY o.criado_em DESC LIMIT $2`, [ibge, limite]);
    res.json({ total: rows.length, ocorrencias: rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* GET /api/registro/cobrade — tipologia oficial disponível */
router.get('/cobrade', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT codigo, denominacao FROM cobrade ORDER BY codigo');
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;