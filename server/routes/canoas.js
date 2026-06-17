/**
 * SGA — Rotas de API para dados reais de Canoas
 * server/routes/canoas.js
 *
 * Endpoints:
 *   GET /api/canoas/status          → resumo geral em tempo real
 *   GET /api/canoas/cota            → cota Rio Gravataí (ANA)
 *   GET /api/canoas/precipitacao    → pluviômetros CEMADEN
 *   GET /api/canoas/bairros         → bairros com scores de risco
 *   GET /api/canoas/abrigos         → abrigos e vagas
 *   GET /api/canoas/cadunico        → dados CadÚnico por bairro
 *   GET /api/canoas/alertas         → alertas ativos calculados
 */

const router  = require('express').Router();
const fetch   = require('node-fetch');
const db      = require('../db');

// ── DADOS FIXOS CANOAS ─────────────────────────────────────────────
const CANOAS_DATA = require('./canoas_data.json');

// ── UTILITÁRIOS ────────────────────────────────────────────────────
const statusCota = (m) =>
  m >= 4.5 ? 'Colapso' : m >= 4.0 ? 'Emergência' :
  m >= 3.5 ? 'Alerta'  : m >= 3.0 ? 'Atenção' : 'Normal';

const statusChuva = (mmh) =>
  mmh >= 80 ? 'Emergência' : mmh >= 50 ? 'Alerta' :
  mmh >= 25 ? 'Atenção'   : 'Normal';

// ── ANA HIDROWEB ───────────────────────────────────────────────────
async function fetchANA(estacao) {
  try {
    const url = `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos` +
                `?codEstacao=${estacao}`;
    const r = await fetch(url, { timeout: 8000 });
    const xml = await r.text();

    // Parser simples de XML para cota
    const cotaMatch  = xml.match(/<Cota>([\d.]+)<\/Cota>/);
    const vazaoMatch = xml.match(/<Vazao>([\d.]+)<\/Vazao>/);
    const dataMatch  = xml.match(/<DataHora>([^<]+)<\/DataHora>/);

    if (!cotaMatch) throw new Error('Cota não encontrada no XML');

    const cota  = parseFloat(cotaMatch[1]);
    const vazao = vazaoMatch ? parseFloat(vazaoMatch[1]) : null;
    return {
      cota_m:     cota,
      vazao_m3s:  vazao,
      data_hora:  dataMatch ? dataMatch[1] : new Date().toISOString(),
      status:     statusCota(cota),
      fonte:      'ANA HidroWeb',
      online:     true,
    };
  } catch(e) {
    console.warn('[ANA] Fallback para mock:', e.message);
    // Retorna dado realista baseado no histórico
    return {
      cota_m: 2.1, vazao_m3s: 142,
      data_hora: new Date().toISOString(),
      status: 'Normal', fonte: 'ANA HidroWeb (cache)',
      online: false, erro: e.message,
    };
  }
}

// ── CEMADEN ────────────────────────────────────────────────────────
async function fetchCEMADEN(codMunicipio = '4304606') {
  try {
    const url = `http://sjc.salvar.cemaden.gov.br/resources/graficos/` +
                `interativo/getJson.php?cod_uf=43&cod_municipio=${codMunicipio}`;
    const r = await fetch(url, { timeout: 8000 });
    const data = await r.json();
    return data.map(e => ({
      codigo:    e.codEstacao,
      nome:      e.nomeEstacao,
      bairro:    e.nomeEstacao,
      mmh:       parseFloat(e.valorMedida || 0),
      acum1h:    parseFloat(e.acumulado1h || 0),
      acum6h:    parseFloat(e.acumulado6h || 0),
      acum24h:   parseFloat(e.acumulado24h || 0),
      data_hora: e.dataHora,
      status:    statusChuva(parseFloat(e.valorMedida || 0)),
      fonte:     'CEMADEN',
      online:    true,
    }));
  } catch(e) {
    console.warn('[CEMADEN] Fallback para mock:', e.message);
    return CANOAS_DATA.estacoes_cemaden.map(est => ({
      codigo:  est.codigo,
      nome:    est.nome,
      bairro:  est.bairro,
      mmh: 0, acum1h: 0, acum6h: 0, acum24h: 0,
      data_hora: new Date().toISOString(),
      status: 'Normal', fonte: 'CEMADEN (offline)',
      online: false,
    }));
  }
}

// ── OPEN-METEO (previsão grátis) ───────────────────────────────────
async function fetchPrevisao() {
  try {
    const { lat, lng } = CANOAS_DATA.municipio;
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=precipitation,precipitation_probability,windspeed_10m,temperature_2m` +
      `&forecast_days=2&timezone=America/Sao_Paulo`;
    const r = await fetch(url, { timeout: 10000 });
    const data = await r.json();
    const horas = data.hourly.time.slice(0, 24).map((t, i) => ({
      hora:        t,
      precipitacao: data.hourly.precipitation[i],
      probabilidade: data.hourly.precipitation_probability[i],
      temperatura:  data.hourly.temperature_2m[i],
      vento_kmh:   data.hourly.windspeed_10m[i],
    }));
    const maxChuva24h = Math.max(...horas.map(h => h.precipitacao));
    return { horas, maxChuva24h, fonte: 'Open-Meteo', online: true };
  } catch(e) {
    return { horas: [], maxChuva24h: 0, fonte: 'Open-Meteo (offline)', online: false };
  }
}

// ── GERAR ALERTAS ──────────────────────────────────────────────────
function gerarAlertas(cota, pluvio) {
  const alertas = [];
  const agora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});

  if (cota.cota_m >= 4.0) {
    alertas.push({ nivel:'Crítico', titulo:'Emergência — Rio Gravataí',
      desc:`Cota ${cota.cota_m}m · TR estimado 50 anos · Evacuar bairros críticos`,
      hora:agora, fontes:['ANA HidroWeb'] });
  } else if (cota.cota_m >= 3.5) {
    alertas.push({ nivel:'Alto', titulo:'Alerta — Rio Gravataí em elevação',
      desc:`Cota ${cota.cota_m}m · Acionar CRAS e pré-posicionar equipes`,
      hora:agora, fontes:['ANA HidroWeb'] });
  } else if (cota.cota_m >= 3.0) {
    alertas.push({ nivel:'Atenção', titulo:'Atenção — Rio Gravataí',
      desc:`Cota ${cota.cota_m}m · Monitoramento reforçado`,
      hora:agora, fontes:['ANA HidroWeb'] });
  }

  pluvio.forEach(p => {
    if (p.mmh >= 50) alertas.push({
      nivel: p.mmh >= 80 ? 'Crítico' : 'Alto',
      titulo: `Chuva intensa — ${p.bairro}`,
      desc: `${p.mmh}mm/h · Acum 6h: ${p.acum6h}mm`,
      hora: agora, fontes: ['CEMADEN'],
    });
  });

  return alertas;
}

// ══ ROTAS ══════════════════════════════════════════════════════════

// GET /api/canoas/status
router.get('/status', async (req, res) => {
  try {
    const [cota, pluvio, previsao] = await Promise.all([
      fetchANA(CANOAS_DATA.estacoes_ana[0].codigo),
      fetchCEMADEN(),
      fetchPrevisao(),
    ]);
    const alertas = gerarAlertas(cota, pluvio);
    const mmhMax  = Math.max(...pluvio.map(p => p.mmh), 0);
    const score   = Math.min(1,
      (cota.cota_m - 1.5) / 3.0 * 0.5 +
      mmhMax / 100 * 0.3 +
      (pluvio[0]?.acum6h || 0) / 80 * 0.2
    );
    res.json({
      municipio: 'Canoas', cod_ibge: 4304606,
      cota, pluvio, previsao,
      alertas, score_atual: Math.max(0, Math.round(score * 100) / 100),
      nivel_atual: alertas.length > 0 ? alertas[0].nivel : 'Normal',
      atualizado: new Date().toISOString(),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/canoas/bairros
router.get('/bairros', (req, res) => res.json(CANOAS_DATA.bairros));

// GET /api/canoas/abrigos
router.get('/abrigos', (req, res) => res.json(CANOAS_DATA.abrigos));

// GET /api/canoas/cadunico
router.get('/cadunico', (req, res) => res.json(CANOAS_DATA.cadunico));

// GET /api/canoas/cota
router.get('/cota', async (req, res) => {
  try {
    const cota = await fetchANA(CANOAS_DATA.estacoes_ana[0].codigo);
    res.json(cota);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/canoas/precipitacao
router.get('/precipitacao', async (req, res) => {
  try {
    const pluvio = await fetchCEMADEN();
    res.json(pluvio);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/canoas/alertas
router.get('/alertas', async (req, res) => {
  try {
    const [cota, pluvio] = await Promise.all([
      fetchANA(CANOAS_DATA.estacoes_ana[0].codigo),
      fetchCEMADEN(),
    ]);
    res.json(gerarAlertas(cota, pluvio));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
