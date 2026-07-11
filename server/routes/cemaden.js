/**
 * SGA — Integração CEMADEN / PED  (server/routes/cemaden.js)  — v2
 * ─────────────────────────────────────────────────────────────────────────────
 * TOKEN AUTOMÁTICO: a PED emite JWT com validade de 4h. Este módulo obtém e
 * renova o token sozinho via SGAA (schema confirmado pelo validador oficial):
 *   POST https://ped.cemaden.gov.br/SGAA/rest/controle-token/tokens
 *   Body: { "email": "...", "password": "..." }
 *
 * VARIÁVEIS NO RENDER (substituem o CEMADEN_TOKEN, que pode ser removido):
 *   CEMADEN_EMAIL = e-mail do cadastro na PED
 *   CEMADEN_SENHA = senha do portal PED
 *
 * Rotas (catálogo oficial do Swagger da PED):
 *   GET /api/cemaden/estacoes?ibge=4304606
 *   GET /api/cemaden/dados-recentes?ibge=4304606  (ou ?uf=RS)
 *   GET /api/cemaden/acumulados?ibge=4304606
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // v2, mesmo padrão do projeto

const PED  = 'https://sws.cemaden.gov.br/PED/rest';
const SGAA = 'https://ped.cemaden.gov.br/SGAA/rest/controle-token/tokens';

/* ── Token com cache (validade 4h → renovamos aos 3h30) ─────────────────── */
let _tok = null, _tokExp = 0;

async function tokenPED(forcar) {
  if (!forcar && _tok && Date.now() < _tokExp) return _tok;
  const email = (process.env.CEMADEN_EMAIL || '').trim();
  const senha = (process.env.CEMADEN_SENHA || '').trim();
  if (!email || !senha) {
    const e = new Error('CEMADEN_EMAIL / CEMADEN_SENHA não configurados no ambiente');
    e.status = 503; throw e;
  }
  const r = await fetch(SGAA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const corpo = await r.json().catch(() => null);
  // formatos possíveis de retorno: {token} | {items:{token}} | "eyJ..."
  const t = (corpo && (corpo.token || (corpo.items && corpo.items.token))) ||
            (typeof corpo === 'string' && corpo.startsWith('eyJ') ? corpo : null);
  if (!r.ok || !t) {
    const e = new Error('Autenticação PED falhou (HTTP ' + r.status + ')');
    e.status = 502; e.corpo = corpo; throw e;
  }
  _tok = t; _tokExp = Date.now() + 3.5 * 3600e3;
  return t;
}

async function pedGet(path, params, jaTentou) {
  const tok = await tokenPED(false);
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${PED}${path}${q ? '?' + q : ''}`, {
    headers: { accept: 'application/json', token: tok },
  });
  if ((r.status === 401 || r.status === 403) && !jaTentou) {
    _tok = null;                       // token pode ter expirado → renova 1x
    return pedGet(path, params, true);
  }
  const texto = await r.text();
  let corpo; try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  if (!r.ok) {
    const e = new Error(`PED ${path}: HTTP ${r.status}`);
    e.status = 502; e.corpo = corpo; throw e;
  }
  return corpo;
}

const trata = (res, fn) => fn().then(d => res.json(d)).catch(e =>
  res.status(e.status || 500).json({ erro: e.message, detalhe: e.corpo || null }));

router.get('/estacoes', (req, res) => trata(res, () =>
  pedGet('/pcds-cadastro/estacoes', { codibge: req.query.ibge, formato: 'json' })));

router.get('/dados-recentes', (req, res) => trata(res, () =>
  pedGet('/pcds/pcds-dados-recentes', {
    codibge: req.query.ibge, uf: req.query.uf,
    sensor: req.query.sensor, rede: req.query.rede, formato: 'json',
  })));

router.get('/acumulados', (req, res) => trata(res, () =>
  pedGet('/pcds-acum/acumulados-recentes', {
    codibge: req.query.ibge, codestacao: req.query.estacao, formato: 'json',
  })));

module.exports = router;