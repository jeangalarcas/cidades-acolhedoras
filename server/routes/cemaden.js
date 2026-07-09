/**
 * SGA — Integração CEMADEN / PED  (server/routes/cemaden.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas baseadas no catálogo OFICIAL do Swagger da PED (sws.cemaden.gov.br),
 * extraído em 08/07/2026 — nomes de rotas/parâmetros conforme a fonte:
 *   /pcds-cadastro/estacoes        (token, codibge, formato)
 *   /pcds/pcds-dados-recentes      (token, codibge, uf, sensor, rede, ...)
 *   /pcds-acum/acumulados-recentes (token, codibge, codestacao, formato)
 *
 * FASE 1 (esta): conector fiel — devolve a resposta da PED como veio, para
 * validarmos os campos reais antes de mapear para os cards do sistema.
 *
 * INSTALAÇÃO:
 *   1. Salvar como  server/routes/cemaden.js
 *   2. No server/index.js, junto dos outros app.use:
 *        app.use('/api/cemaden', require('./routes/cemaden'));
 *   3. Render → Environment:  CEMADEN_TOKEN = (o JWT recebido no cadastro)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // v2, mesmo padrão do projeto

const PED = 'https://sws.cemaden.gov.br/PED/rest';

async function pedGet(path, params) {
  if (!process.env.CEMADEN_TOKEN) {
    const e = new Error('CEMADEN_TOKEN não configurado no ambiente');
    e.status = 503; throw e;
  }
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${PED}${path}${q ? '?' + q : ''}`, {
    headers: { accept: 'application/json', token: process.env.CEMADEN_TOKEN },
  });
  const texto = await r.text();
  let corpo; try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  if (r.status === 401 || r.status === 403) {
    const e = new Error('Token CEMADEN recusado (HTTP ' + r.status + ') — renove o token na PED e atualize CEMADEN_TOKEN no Render');
    e.status = 502; e.corpo = corpo; throw e;
  }
  if (!r.ok) {
    const e = new Error(`PED ${path}: HTTP ${r.status}`);
    e.status = 502; e.corpo = corpo; throw e;
  }
  return corpo;
}

const trata = (res, fn) => fn().then(d => res.json(d)).catch(e =>
  res.status(e.status || 500).json({ erro: e.message, detalhe: e.corpo || null }));

/* GET /api/cemaden/estacoes?ibge=4304606 — cadastro das estações CEMADEN do município */
router.get('/estacoes', (req, res) => trata(res, () =>
  pedGet('/pcds-cadastro/estacoes', { codibge: req.query.ibge, formato: 'json' })));

/* GET /api/cemaden/dados-recentes?ibge=4304606  (ou ?uf=RS) — últimas leituras */
router.get('/dados-recentes', (req, res) => trata(res, () =>
  pedGet('/pcds/pcds-dados-recentes', {
    codibge: req.query.ibge, uf: req.query.uf,
    sensor: req.query.sensor, rede: req.query.rede, formato: 'json',
  })));

/* GET /api/cemaden/acumulados?ibge=4304606 — chuva acumulada 1h/3h/6h/12h/24h... */
router.get('/acumulados', (req, res) => trata(res, () =>
  pedGet('/pcds-acum/acumulados-recentes', {
    codibge: req.query.ibge, codestacao: req.query.estacao, formato: 'json',
  })));

module.exports = router;