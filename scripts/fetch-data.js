#!/usr/bin/env node
/**
 * SGA — Fetch Data Script
 * Busca dados das APIs externas e salva em /public/data/
 *
 * Uso:
 *   node fetch-data.js --source ana
 *   node fetch-data.js --source cemaden
 *   node fetch-data.js --source inmet
 *   node fetch-data.js --check-alerts
 *   node fetch-data.js --all
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ARGS   = process.argv.slice(2);
const SOURCE = ARGS.find(a => a.startsWith('--source=') || a === '--source')?.replace('--source=','')
               || ARGS[ARGS.indexOf('--source') + 1];
const ALL    = ARGS.includes('--all');
const CHECK  = ARGS.includes('--check-alerts');

const DATA_DIR = path.join(__dirname, '../public/data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

function save(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`[OK] Salvo: ${filepath}`);
}

// ── Estações ANA HidroWeb ─────────────────────────────────────────
async function fetchANA() {
  console.log('[ANA] Buscando dados HidroWeb...');
  const estacoes = ['87480000','87600000','87620000','87400000','87520000','87540000'];
  const hoje = new Date().toISOString().slice(0,10);
  const results = [];

  for (const cod of estacoes) {
    try {
      // API SNIRH: https://telemetriaws1.ana.gov.br/
      const url = `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${cod}&dataInicio=${hoje}&dataFim=${hoje}`;
      // const data = await get(url); // Descomentar em produção
      // results.push({ codigo: cod, data });

      // Mock para teste:
      results.push({ codigo: cod, timestamp: new Date().toISOString(), status: 'mock' });
    } catch (e) {
      console.error(`[ANA] Erro na estação ${cod}:`, e.message);
    }
  }

  save('estacoes-ana.json', { updated: new Date().toISOString(), estacoes: results });
}

// ── CEMADEN ───────────────────────────────────────────────────────
async function fetchCEMADEN() {
  console.log('[CEMADEN] Buscando dados pluviométricos...');
  // PRODUÇÃO: https://www.cemaden.gov.br/mapainterativo/load/carregaEstacoes.php
  const mockData = {
    updated: new Date().toISOString(),
    estacoes: [
      { id:'PV-02', local:'Serra Botucaraí', mmh:138, acum6h:620 },
      { id:'PV-08', local:'Venâncio Aires',  mmh:92,  acum6h:380 },
    ]
  };
  save('cemaden.json', mockData);
}

// ── INMET ─────────────────────────────────────────────────────────
async function fetchINMET() {
  console.log('[INMET] Buscando dados meteorológicos...');
  // PRODUÇÃO: https://apitempo.inmet.gov.br/token/{token}/estacao/diaria/...
  const mockData = {
    updated: new Date().toISOString(),
    estacoes: [
      { id:'A836', nome:'Santa Cruz do Sul', temp:22.4, umid:88, prec:45.2 }
    ]
  };
  save('inmet.json', mockData);
}

// ── Open-Meteo (gratuito, sem chave) ─────────────────────────────
async function fetchOpenMeteo() {
  console.log('[Open-Meteo] Buscando previsão NWP...');
  try {
    const lat = -29.85, lng = -52.45;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,precipitation_probability,temperature_2m&forecast_days=3&timezone=America%2FSao_Paulo`;
    const data = await get(url);
    save('open-meteo.json', { updated: new Date().toISOString(), forecast: data });
    console.log('[Open-Meteo] OK');
  } catch(e) {
    console.error('[Open-Meteo] Erro:', e.message);
  }
}

// ── Verificação de alertas ────────────────────────────────────────
async function checkAlertas() {
  console.log('[Alertas] Verificando limiares críticos...');
  const limiares = { cota: 3.5, mmh: 80 };

  // Lê dados salvos e verifica limiares
  try {
    const ana = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'estacoes-ana.json'), 'utf8'));
    console.log(`[Alertas] Última atualização ANA: ${ana.updated}`);
    // Em produção: dispara notificações se limiares excedidos
  } catch(e) {
    console.log('[Alertas] Dados ANA não encontrados, executando fetch...');
    await fetchANA();
  }
}

// ── Main ──────────────────────────────────────────────────────────
(async () => {
  console.log(`\n=== SGA Data Sync · ${new Date().toLocaleString('pt-BR')} ===\n`);

  if (ALL) {
    await fetchANA();
    await fetchCEMADEN();
    await fetchINMET();
    await fetchOpenMeteo();
    await checkAlertas();
  } else if (CHECK) {
    await checkAlertas();
  } else {
    switch(SOURCE) {
      case 'ana':     await fetchANA();       break;
      case 'cemaden': await fetchCEMADEN();   break;
      case 'inmet':   await fetchINMET();     break;
      case 'meteo':   await fetchOpenMeteo(); break;
      default:
        console.log('Uso: node fetch-data.js --source [ana|cemaden|inmet|meteo] | --all | --check-alerts');
    }
  }

  console.log('\n=== Sync concluído ===\n');
})();
