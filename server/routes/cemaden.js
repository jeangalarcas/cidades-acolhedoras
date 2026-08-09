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

/* ═══════════════════════════════════════════════════════════════════════════
 * ENRIQUECIMENTO VIA FEED PÚBLICO (sem login) — "Célula Restinga" Fase 1
 * ───────────────────────────────────────────────────────────────────────────
 * O feed público do mapa interativo do CEMADEN entrega leituras em tempo real
 * de ~455 estações no RS, sem autenticação:
 *   https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=RS
 *
 * Esta rota casa essas leituras com as estações CEMADEN do inventário
 * (estacoes_ana) e atualiza chuva/status — as estações "acendem" no mapa.
 *
 * CASAMENTO (validado em 09/08/2026: 120/141 estações = 85%):
 *   chave = cod_ibge + sufixo do nome normalizado (sem acento/minúsculo/alfanum)
 *   BD:   "PORTO ALEGRE_Restinga"  → 4314902|restinga
 *   feed: cidade + "G2-Restinga"   → 4314902|restinga
 *
 * POST /api/cemaden/enriquecer-chuva?chave=<ANA_SYNC_TOKEN>
 * Agendado no ana-status.yml (passo final, após os blocos ANA).
 * ═══════════════════════════════════════════════════════════════════════════ */

const db = require('../db');
const FEED_PUBLICO = 'https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=RS';

const normaliza = s => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

// "09/08/26 21:10" (hora de Brasília) → Date ISO com fuso -03:00
function parseDataFeed(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(`20${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

router.post('/enriquecer-chuva', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN)
      return res.status(403).json({ erro: 'chave inválida' });

    const LIMIAR_H = 12; // mesmo limiar do enriquecimento ANA

    // 1) feed público (timeout: nunca pendurar — lição da integração ANA)
    const r = await fetch(FEED_PUBLICO, { timeout: 25000 });
    if (!r.ok) return res.status(502).json({ erro: 'feed CEMADEN HTTP ' + r.status });
    const feed = await r.json();
    if (!Array.isArray(feed) || !feed.length)
      return res.status(502).json({ erro: 'feed CEMADEN vazio — nada atualizado' });

    // 2) indexa feed por ibge|sufixo (nomeestacao sem o prefixo "G2-")
    const porChave = new Map();
    for (const e of feed) {
      const suf = String(e.nomeestacao || '').replace(/^G\d-/, '');
      const k = `${e.codibge}|${normaliza(suf)}`;
      // se repetir a chave, fica a leitura mais recente
      const atual = porChave.get(k);
      if (!atual || (parseDataFeed(e.datahoraUltimovalor) || 0) > (parseDataFeed(atual.datahoraUltimovalor) || 0))
        porChave.set(k, e);
    }

    // 3) estações CEMADEN do inventário
    const { rows: alvos } = await db.query(
      `SELECT codigo, nome, cod_ibge FROM estacoes_ana
        WHERE telemetrica AND responsavel_sigla = 'CEMADEN'`);

    let casadas = 0, ativas = 0, silenciosas = 0, semPar = [];
    for (const a of alvos) {
      const suf = a.nome.includes('_') ? a.nome.split('_').slice(1).join('_') : a.nome;
      const e = porChave.get(`${a.cod_ibge}|${normaliza(suf)}`);
      if (!e) { semPar.push(a.codigo); continue; }
      casadas++;

      const medEm = parseDataFeed(e.datahoraUltimovalor);
      const ativa = medEm && (Date.now() - medEm.getTime()) <= LIMIAR_H * 3600e3;
      const chuva24 = (e.acc24hr === '-' || e.acc24hr == null) ? null : Number(e.acc24hr);
      if (ativa) ativas++; else silenciosas++;

      await db.query(
        `UPDATE estacoes_ana SET
           ultima_medicao_em = $2, ultima_chuva_mm = $3,
           categoria = $4, cor = $5, enriquecido_em = now()
         WHERE codigo = $1`,
        [a.codigo, medEm, Number.isFinite(chuva24) ? chuva24 : null,
         ativa ? 'ativa' : 'silenciosa',
         ativa ? '#2D7A5C' : '#E8A23A']);
    }

    res.json({
      ok: true, fonte: 'CEMADEN feed público (mapa interativo)',
      estacoes_feed_rs: feed.length, inventario_cemaden: alvos.length,
      casadas, ativas, silenciosas, sem_par: semPar.length,
      sem_par_codigos: semPar,
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;