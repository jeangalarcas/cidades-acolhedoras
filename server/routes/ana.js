/**
 * SGA — Integração ANA HidroWebService  (server/routes/ana.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Tudo aqui usa APENAS nomes de campos/parâmetros CONFIRMADOS na própria API
 * (via api-docs + chamadas reais em 03/07/2026). Nada inventado.
 *
 * ROTAS:
 *   POST /api/ana/sync-inventario?chave=...  → ANA (UF=RS) → upsert em estacoes_ana
 *   GET  /api/ana/estacoes[?telemetrica=1]   → lê as estações do Supabase
 *   GET  /api/ana/serie/:codigo[?range=...]  → leituras ao vivo (cota/chuva/vazão)
 *   GET  /api/ana/cota-municipio/:cod_ibge   → estação FLU mais próxima + cota (c/ plano B)
 *   POST /api/ana/enriquecer-status?chave=.. → atualiza categoria 12h (c/ plano B)
 *   GET  /api/ana/estacoes-geojson           → FeatureCollection p/ o mapa
 *   GET  /api/ana/resumo                     → KPIs do Painel de Situação
 *
 * PLANO B (15/07/2026): quando a API nova responde 5xx/demora, a última leitura
 * vem do serviço público antigo (telemetriaws1) — o campo `fonte` sempre informa.
 * FAIL-FAST (15/07/2026): chamadas à API nova têm teto de 6s (token: 8s) para
 * o plano B assumir em segundos quando a ANA agoniza (504 lento).
 *
 * SEGURANÇA: credenciais só via variáveis de ambiente (ANA_IDENTIFICADOR,
 * ANA_SENHA, ANA_SYNC_TOKEN). Token da ANA vale 60 min e é reaproveitado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

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
    signal: AbortSignal.timeout(8000),   // fail-fast: auth não pode pendurar
  });
  if (!r.ok) throw new Error(`Autenticação ANA falhou: HTTP ${r.status}`);
  const j = await r.json();
  const t = j && j.items && j.items.tokenautenticacao;   // campo confirmado
  if (!t) throw new Error('Autenticação ANA sem tokenautenticacao');
  _token = t;
  _tokenExpira = Date.now() + 50 * 60 * 1000;
  return t;
}

/* GET autenticado na ANA (params já com nomes oficiais) */
async function anaGet(path, params) {
  const t = await tokenANA();
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  const r = await fetch(`${BASE}${path}${q ? '?' + q : ''}`, {
    headers: { accept: '*/*', Authorization: 'Bearer ' + t },
    signal: AbortSignal.timeout(6000),   // fail-fast: 6s e o plano B assume
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`ANA ${path}: HTTP ${r.status}`);
  return j || {};
}

/* Helpers defensivos */
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const bool01 = (v) => v === 1 || v === '1' || v === true;
const ibgeRS = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 4300000 && n <= 4399999 ? n : null;
};

/* ── Fallback: última leitura pelo serviço PÚBLICO antigo (telemetriaws1) ── */
async function ultimaLeituraPublica(codigo) {
  const d = new Date(); const f = x => ('0' + x).slice(-2);
  const hoje = f(d.getDate()) + '/' + f(d.getMonth() + 1) + '/' + d.getFullYear();
  const ontem = new Date(d.getTime() - 86400e3);
  const ini = f(ontem.getDate()) + '/' + f(ontem.getMonth() + 1) + '/' + ontem.getFullYear();
  const url = 'http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos'
            + '?codEstacao=' + codigo + '&dataInicio=' + ini + '&dataFim=' + hoje;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('telemetriaws HTTP ' + r.status);
  const xml = await r.text();
  const blocos = xml.match(/<DadosHidrometereologicos[\s\S]*?<\/DadosHidrometereologicos>/g) || [];
  let ult = null;
  for (const b of blocos) {
    const g = t => { const m = b.match(new RegExp('<' + t + '>([^<]*)</' + t + '>')); return m ? m[1].trim() : null; };
    const dh = g('DataHora');
    if (dh && (!ult || dh > ult.dh)) ult = { dh, nivel: g('Nivel'), chuva: g('Chuva') };
  }
  if (!ult) return null;
  return {
    medEm: ult.dh.replace(' ', 'T'),
    cotaCm: ult.nivel != null && ult.nivel !== '' ? num(ult.nivel) : null,
    chuvaMm: ult.chuva != null && ult.chuva !== '' ? num(ult.chuva) : null,
  };
}

/* Última leitura: tenta a API nova; em FALHA ou resposta VAZIA, plano B público */
async function ultimaLeitura(codigo) {
  try {
    const j = await anaGet('/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1', {
      'Código da Estação': codigo, 'Tipo Filtro Data': 'DATA_LEITURA',
      'Data de Busca (yyyy-MM-dd)': new Date().toISOString().slice(0, 10),
      'Range Intervalo de busca': 'HORA_24',
    });
    const ls = j.items || []; const u = ls[ls.length - 1];
    if (u) {
      return {
        medEm: u.Data_Hora_Medicao,
        cotaCm: u.Cota_Adotada != null ? num(u.Cota_Adotada) : null,
        chuvaMm: u.Chuva_Adotada != null ? num(u.Chuva_Adotada) : null,
        fonte: 'ANA HidroWebService',
      };
    }
    // respondeu 200 mas VAZIO → não desiste: cai para o público (fix 16/07/2026)
  } catch (e) { /* segue para o plano B */ }
  const p = await ultimaLeituraPublica(codigo).catch(() => null);
  return p ? Object.assign(p, { fonte: 'ANA telemetria (público)' }) : null;
}

/* ── POST /api/ana/sync-inventario ────────────────────────────────────────── */
router.post('/sync-inventario', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN) {
      return res.status(403).json({ erro: 'chave de sincronização inválida' });
    }

    const j = await anaGet('/EstacoesTelemetricas/HidroInventarioEstacoes/v1',
                           { 'Unidade Federativa': 'RS' });
    const itens = Array.isArray(j.items) ? j.items : [];
    if (!itens.length) return res.status(502).json({ erro: 'ANA retornou 0 estações' });

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

/* ── GET /api/ana/cota-municipio/:cod_ibge — cota + COTAS DE REFERÊNCIA por estação ── */
router.get('/cota-municipio/:cod_ibge', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.codigo, e.nome, e.rio_nome,
             round((extensions.ST_DistanceSphere(e.geom,
               extensions.ST_SetSRID(extensions.ST_MakePoint(m.lng, m.lat),4326))/1000)::numeric,1) AS dist_km,
             cr.cota_atencao_cm, cr.cota_alerta_cm, cr.cota_inundacao_cm, cr.fonte AS ref_fonte
        FROM municipios m
        JOIN estacoes_ana e ON e.telemetrica AND e.tipo='Fluviometrica' AND e.geom IS NOT NULL
        LEFT JOIN cotas_referencia cr ON cr.codigo_estacao = e.codigo
       WHERE m.cod_ibge = $1
       ORDER BY e.geom <-> extensions.ST_SetSRID(extensions.ST_MakePoint(m.lng, m.lat),4326)
       LIMIT 1`, [parseInt(req.params.cod_ibge, 10)]);
    if (!rows.length) return res.status(404).json({ erro: 'município não encontrado' });
    const est = rows[0];
    const u = await ultimaLeitura(est.codigo);
    const cota = u ? u.cotaCm : null;

    // Classificação pelo limiar OFICIAL da própria estação (quando cadastrado)
    let nivel = null, cor = null;
    const temRef = est.cota_atencao_cm != null || est.cota_alerta_cm != null || est.cota_inundacao_cm != null;
    if (cota != null && temRef) {
      if      (est.cota_inundacao_cm != null && cota >= +est.cota_inundacao_cm) { nivel = 'inundacao';   cor = '#C0392B'; }
      else if (est.cota_alerta_cm    != null && cota >= +est.cota_alerta_cm)    { nivel = 'alerta';      cor = '#E8842C'; }
      else if (est.cota_atencao_cm   != null && cota >= +est.cota_atencao_cm)   { nivel = 'atencao';     cor = '#E6C229'; }
      else                                                                      { nivel = 'normalidade'; cor = '#2D7A5C'; }
    }

    res.json({
      online: cota != null, cota_m: cota != null ? +(cota / 100).toFixed(2) : null,
      fonte: u ? u.fonte : 'ANA', status: cota != null ? 'OK' : 'N/D',
      nome: est.nome + (est.rio_nome ? ' · ' + est.rio_nome : ''),
      cod_estacao: est.codigo, dist_km: +est.dist_km,
      // limiares oficiais desta estação (null = sem referência cadastrada — nunca inventado)
      referencia: temRef ? {
        atencao_m:   est.cota_atencao_cm   != null ? +(est.cota_atencao_cm/100).toFixed(2)   : null,
        alerta_m:    est.cota_alerta_cm    != null ? +(est.cota_alerta_cm/100).toFixed(2)    : null,
        inundacao_m: est.cota_inundacao_cm != null ? +(est.cota_inundacao_cm/100).toFixed(2) : null,
        fonte: est.ref_fonte,
      } : null,
      nivel_referencia: nivel, cor_nivel: cor,
      // compatibilidade com o front atual (será aposentado quando o front ler `referencia`)
      cota_alerta_m: est.cota_alerta_cm != null ? +(est.cota_alerta_cm/100).toFixed(2) : 3.5,
      cota_emergencia_m: est.cota_inundacao_cm != null ? +(est.cota_inundacao_cm/100).toFixed(2) : 4,
      medido_em: u ? u.medEm : null,
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── POST /api/ana/enriquecer-status (única versão — com plano B) ─────────── */
router.post('/enriquecer-status', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN)
      return res.status(403).json({ erro: 'chave inválida' });

    const limite = Math.min(parseInt(req.query.limite || '150', 10), 300);
    const offset = parseInt(req.query.offset || '0', 10);
    const LIMIAR_H = 12;

    const { rows: alvos } = await db.query(
      `SELECT codigo FROM estacoes_ana WHERE telemetrica
        ORDER BY codigo LIMIT $1 OFFSET $2`, [limite, offset]);

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let ativas = 0, silenciosas = 0, erros = 0;

    for (const { codigo } of alvos) {
      try {
        const u = await ultimaLeitura(codigo);
        const medEm = u ? u.medEm : null;
        const ativa = medEm && (Date.now() - new Date(medEm).getTime()) <= LIMIAR_H * 3600e3;
        if (ativa) ativas++; else silenciosas++;
        await db.query(
          `UPDATE estacoes_ana SET
             ultima_medicao_em = $2, ultima_cota_cm = $3, ultima_chuva_mm = $4,
             categoria = $5, cor = $6, enriquecido_em = now()
           WHERE codigo = $1`,
          [codigo, medEm, u ? u.cotaCm : null, u ? u.chuvaMm : null,
           ativa ? 'ativa' : 'silenciosa',
           ativa ? '#2D7A5C' : '#E8A23A']);
        await sleep(120); // ritmo gentil com a ANA
      } catch (_) { erros++; await sleep(200); }
    }

    const total = (await db.query('SELECT count(*)::int n FROM estacoes_ana WHERE telemetrica')).rows[0].n;
    res.json({ ok: true, processadas: alvos.length, ativas, silenciosas, erros,
               proximo_offset: offset + alvos.length,
               concluido: offset + alvos.length >= total, total_telemetricas: total });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── GET /api/ana/estacoes-geojson ────────────────────────────────────────── */
router.get('/estacoes-geojson', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT json_build_object(
        'type','FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type','Feature',
            'geometry', extensions.ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'codigo', codigo, 'nome', nome, 'tipo', tipo, 'rio', rio_nome,
              'municipio', municipio_nome, 'telemetrica', telemetrica,
              'categoria', categoria, 'cor', cor,
              'ultima_cota_cm', ultima_cota_cm, 'ultima_chuva_mm', ultima_chuva_mm,
              'ultima_medicao_em', ultima_medicao_em
            )
          )
        ) FILTER (WHERE geom IS NOT NULL), '[]'::json)
      ) AS fc
      FROM estacoes_ana`);
    res.json(rows[0].fc);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── GET /api/ana/resumo ──────────────────────────────────────────────────── */
router.get('/resumo', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        count(*) FILTER (WHERE categoria='ativa')::int      AS estacoes_ativas,
        count(*) FILTER (WHERE categoria='silenciosa')::int AS silenciosas,
        count(*) FILTER (WHERE telemetrica)::int            AS telemetricas,
        (SELECT count(DISTINCT cod_ibge) FROM estacoes_ana
          WHERE categoria='ativa' AND cod_ibge IS NOT NULL)::int AS municipios_monitorados,
        (SELECT json_build_object('mm', max(ultima_chuva_mm))
           FROM estacoes_ana WHERE categoria='ativa')            AS chuva_max,
        (SELECT json_build_object('cota_m', round((ultima_cota_cm/100.0)::numeric,2),
                                  'nome', nome, 'rio', rio_nome)
           FROM estacoes_ana
          WHERE categoria='ativa' AND ultima_cota_cm IS NOT NULL
            AND nome !~* 'UHE|CGH|PCH|BARRAMENTO'   -- réguas de rio, não reservatórios
          ORDER BY ultima_cota_cm DESC LIMIT 1)                  AS cota_max
      FROM estacoes_ana`);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;