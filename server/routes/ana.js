/**
 * SGA — Integração ANA HidroWebService  (server/routes/ana.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Tudo aqui usa APENAS nomes de campos/parâmetros CONFIRMADOS na própria API
 * (via api-docs + chamadas reais em 03/07/2026). Nada inventado.
 *
 * ROTAS:
 *   POST /api/ana/sync-inventario?chave=...  → ANA (UF=RS) → upsert em estacoes_ana
 *   GET  /api/ana/estacoes[?telemetrica=1]   → lê as estações do Supabase
 *   GET  /api/ana/serie/:codigo[?range=HORA_24&data=yyyy-MM-dd]
 *                                            → leituras ao vivo (cota/chuva/vazão)
 *
 * COMO INSTALAR:
 *   1. Salve este arquivo como  server/routes/ana.js
 *   2. Ajuste a linha `const db = require('../db')` abaixo para o MESMO require
 *      que está no topo de server/routes/municipio.js (copie e cole de lá).
 *   3. No server/index.js, junto dos outros app.use, adicione:
 *        app.use('/api/ana', require('./routes/ana'));
 *   4. No Render → Environment, cadastre:
 *        ANA_IDENTIFICADOR = (seu CPF, só números)
 *        ANA_SENHA         = (sua senha da ANA)
 *        ANA_SYNC_TOKEN    = (uma frase secreta qualquer — protege o sync)
 *   5. Deploy. Depois rode a carga UMA vez (PowerShell):
 *        Invoke-RestMethod -Method Post "https://sga-api-1705.onrender.com/api/ana/sync-inventario?chave=SUA_FRASE"
 *
 * SEGURANÇA: credenciais só via variáveis de ambiente. O token da ANA vale 60
 * min e é reaproveitado (cache) — a ANA bloqueia IP que autentica em excesso.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const db = require('../db'); // ⚠ AJUSTE: use o mesmo require do topo de routes/municipio.js

const BASE = 'https://www.ana.gov.br/hidrowebservice';
const enc = encodeURIComponent;

/* ── Token ANA com cache (validade 60 min; renovamos aos 50) ──────────────── */
let _token = null;
let _tokenExpira = 0;

async function tokenANA() {
  if (_token && Date.now() < _tokenExpira) return _token;
  if (!process.env.ANA_IDENTIFICADOR || !process.env.ANA_SENHA) {
    throw new Error('ANA_IDENTIFICADOR / ANA_SENHA não configurados no ambiente');
  }
  const r = await fetch(`${BASE}/EstacoesTelemetricas/OAUth/v1`, {
    headers: {
      accept: '*/*',
      Identificador: process.env.ANA_IDENTIFICADOR,
      Senha: process.env.ANA_SENHA,
    },
  });
  if (!r.ok) throw new Error(`Autenticação ANA falhou: HTTP ${r.status}`);
  const j = await r.json();
  const t = j && j.items && j.items.tokenautenticacao;   // campo confirmado
  if (!t) throw new Error('Autenticação ANA sem tokenautenticacao');
  _token = t;
  _tokenExpira = Date.now() + 50 * 60 * 1000;
  return t;
}

/* GET autenticado na ANA (params já com nomes oficiais; encode cuida de espaços/acentos) */
async function anaGet(path, params) {
  const t = await tokenANA();
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  const r = await fetch(`${BASE}${path}${q ? '?' + q : ''}`, {
    headers: { accept: '*/*', Authorization: 'Bearer ' + t },
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`ANA ${path}: HTTP ${r.status}`);
  return j || {};
}

/* Helpers defensivos (formato numérico pode vir com vírgula) */
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const bool01 = (v) => v === 1 || v === '1' || v === true;
// cod_ibge só se o Municipio_Codigo da ANA for um IBGE de 7 dígitos do RS
const ibgeRS = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 4300000 && n <= 4399999 ? n : null;
};

/* ── POST /api/ana/sync-inventario ────────────────────────────────────────── */
router.post('/sync-inventario', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN) {
      return res.status(403).json({ erro: 'chave de sincronização inválida' });
    }

    // Parâmetro oficial: "Unidade Federativa" (com espaço — o encode resolve)
    const j = await anaGet('/EstacoesTelemetricas/HidroInventarioEstacoes/v1',
                           { 'Unidade Federativa': 'RS' });
    const itens = Array.isArray(j.items) ? j.items : [];
    if (!itens.length) return res.status(502).json({ erro: 'ANA retornou 0 estações' });

    // Mapeamento campo-a-campo (nomes confirmados na resposta real da ANA)
    const rows = itens.map(e => ({
      codigo:            String(e.codigoestacao || '').trim(),
      nome:              e.Estacao_Nome || null,
      tipo:              e.Tipo_Estacao != null ? String(e.Tipo_Estacao) : null,
      latitude:          num(e.Latitude),
      longitude:         num(e.Longitude),
      altitude:          num(e.Altitude),
      bacia_codigo:      e.codigobacia != null ? String(e.codigobacia) : null,
      sub_bacia_codigo:  e.Sub_Bacia_Codigo != null ? String(e.Sub_Bacia_Codigo) : null,
      rio_nome:          e.Rio_Nome || null,
      municipio_nome:    e.Municipio_Nome || null,
      uf:                e.UF_Estacao || 'RS',
      responsavel_sigla: e.Responsavel_Sigla || null,
      operadora_sigla:   e.Operadora_Sigla || null,
      telemetrica:       bool01(e.Tipo_Estacao_Telemetrica),
      cod_ibge:          ibgeRS(e.Municipio_Codigo),
    })).filter(r => r.codigo);

    // Upsert em lotes (16 colunas → lotes de 200 = 3.200 params, seguro p/ pg)
    const LOTE = 200;
    let gravadas = 0;
    for (let i = 0; i < rows.length; i += LOTE) {
      const lote = rows.slice(i, i + LOTE);
      const cols = ['codigo','nome','tipo','latitude','longitude','altitude','bacia_codigo',
                    'sub_bacia_codigo','rio_nome','municipio_nome','uf','responsavel_sigla',
                    'operadora_sigla','telemetrica','cod_ibge'];
      const values = lote.map((_, k) => {
        const b = k * cols.length;
        const p = cols.map((_, c) => `$${b + c + 1}`);
        // geom derivado de lng/lat ($5=lng? não — lat=$4, lng=$5 dentro do grupo)
        return `(${p.join(',')})`;
      }).join(',');
      const params = lote.flatMap(r => cols.map(c => r[c]));
      const sql = `
        INSERT INTO estacoes_ana
          (codigo, nome, tipo, latitude, longitude, altitude, bacia_codigo,
           sub_bacia_codigo, rio_nome, municipio_nome, uf, responsavel_sigla,
           operadora_sigla, telemetrica, cod_ibge)
        VALUES ${values}
        ON CONFLICT (codigo) DO UPDATE SET
          nome = EXCLUDED.nome, tipo = EXCLUDED.tipo,
          latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
          altitude = EXCLUDED.altitude, bacia_codigo = EXCLUDED.bacia_codigo,
          sub_bacia_codigo = EXCLUDED.sub_bacia_codigo, rio_nome = EXCLUDED.rio_nome,
          municipio_nome = EXCLUDED.municipio_nome, uf = EXCLUDED.uf,
          responsavel_sigla = EXCLUDED.responsavel_sigla,
          operadora_sigla = EXCLUDED.operadora_sigla,
          telemetrica = EXCLUDED.telemetrica, cod_ibge = EXCLUDED.cod_ibge,
          atualizado_em = now()`;
      const r = await db.query(sql, params);
      gravadas += r.rowCount;
    }

    // geom a partir de lat/lng (uma vez, para todas com coordenada)
    await db.query(`
      UPDATE estacoes_ana
         SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
       WHERE longitude IS NOT NULL AND latitude IS NOT NULL`);

    const stats = await db.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE telemetrica)::int AS telemetricas,
             count(*) FILTER (WHERE geom IS NOT NULL)::int AS com_geom
        FROM estacoes_ana`);

    res.json({ ok: true, recebidas_da_ana: itens.length, gravadas, ...stats.rows[0] });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

/* ── GET /api/ana/estacoes ────────────────────────────────────────────────── */
router.get('/estacoes', async (req, res) => {
  try {
    const soTele = req.query.telemetrica === '1';
    const { rows } = await db.query(`
      SELECT codigo, nome, tipo, latitude, longitude, altitude,
             rio_nome, municipio_nome, bacia_codigo, telemetrica,
             operadora_sigla, cod_ibge,
             ultima_cota_cm, ultima_chuva_mm, ultima_vazao_m3s, ultima_medicao_em
        FROM estacoes_ana
       ${soTele ? 'WHERE telemetrica = true' : ''}
       ORDER BY nome`);
    res.json({ total: rows.length, estacoes: rows, fonte: 'Supabase · estacoes_ana (origem: ANA)' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

/* ── GET /api/ana/serie/:codigo ───────────────────────────────────────────── */
// Enums oficiais — Range: MINUTO_5..MINUTO_30, HORA_1..HORA_24, DIAS_2..DIAS_30
router.get('/serie/:codigo', async (req, res) => {
  try {
    const range = req.query.range || 'HORA_24';
    const data  = req.query.data  || new Date().toISOString().slice(0, 10);
    const j = await anaGet('/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1', {
      'Código da Estação':          req.params.codigo,
      'Tipo Filtro Data':           'DATA_LEITURA',
      'Data de Busca (yyyy-MM-dd)': data,
      'Range Intervalo de busca':   range,
    });
    const leituras = Array.isArray(j.items) ? j.items : [];
    res.json({ codigo: req.params.codigo, range, data, total: leituras.length,
               leituras, fonte: 'ANA HidroWebService (tempo quase-real)' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
