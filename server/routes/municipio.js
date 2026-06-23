/**
 * SGA — Rota Universal por Município
 * GET /api/municipio/:cod_ibge/dados
 * GET /api/municipio/:cod_ibge/cota
 * GET /api/municipio/:cod_ibge/previsao
 */
const router = require('express').Router();
const fetch  = require('node-fetch');
const db     = require('../db');

const ESTACOES_ANA = [
  {cod:'87480000',nome:'Rio Gravataí - Canoas',lat:-29.923,lng:-51.187},
  {cod:'87110000',nome:'Rio dos Sinos - S.Leopoldo',lat:-29.767,lng:-51.148},
  {cod:'87150000',nome:'Rio Caí - Montenegro',lat:-29.692,lng:-51.461},
  {cod:'86990000',nome:'Guaíba - Porto Alegre',lat:-30.020,lng:-51.218},
  {cod:'87380000',nome:'Rio Jacuí - Cachoeira do Sul',lat:-30.040,lng:-52.890},
  {cod:'87600000',nome:'Rio Pardinho - Santa Cruz',lat:-29.725,lng:-52.428},
  {cod:'87540000',nome:'Rio Camaquã',lat:-30.538,lng:-52.518},
  {cod:'87400000',nome:'Rio Jacuí - Passo Sobrado',lat:-29.780,lng:-52.050},
  {cod:'87200000',nome:'Rio Pelotas',lat:-28.500,lng:-51.500},
  {cod:'75680000',nome:'Rio Uruguai - Uruguaiana',lat:-29.750,lng:-57.083},
];

function dist(lat1,lng1,lat2,lng2){
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function estacaoMaisProxima(lat,lng){
  let melhor=ESTACOES_ANA[0],menorDist=Infinity;
  for(const est of ESTACOES_ANA){
    const d=dist(lat,lng,est.lat,est.lng);
    if(d<menorDist){menorDist=d;melhor=est;}
  }
  return {...melhor,dist_km:Math.round(menorDist)};
}

async function fetchCota(codEstacao){
  try {
    const ontem=new Date(Date.now()-86400000).toISOString().split('T')[0];
    const hoje=new Date().toISOString().split('T')[0];
    const url=`https://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroSerieHistorica?codEstacao=${codEstacao}&dataInicio=${ontem}&dataFim=${hoje}&tipoDados=3&nivelConsistencia=1`;
    const r=await fetch(url,{timeout:8000});
    const xml=await r.text();
    const cotas=[...xml.matchAll(/<Cota>([\d.]+)<\/Cota>/g)];
    const datas=[...xml.matchAll(/<DataHora>([^<]+)<\/DataHora>/g)];
    const vazoes=[...xml.matchAll(/<Vazao>([\d.]+)<\/Vazao>/g)];
    if(!cotas.length) throw new Error('Sem dados');
    const i=cotas.length-1;
    const cota=parseFloat(cotas[i][1]);
    return {cota_m:cota,vazao_m3s:vazoes[i]?parseFloat(vazoes[i][1]):null,
      data_hora:datas[i]?datas[i][1]:new Date().toISOString(),online:true,fonte:'ANA HidroWeb',
      status:cota>=4.0?'Emergencia':cota>=3.5?'Alerta':cota>=3.0?'Atencao':'Normal',
      cota_atencao_m:3.0,cota_alerta_m:3.5,cota_emergencia_m:4.0};
  } catch(e){
    return {online:false,cota_m:null,fonte:'ANA HidroWeb (offline)',erro:e.message,
      status:'N/D',cota_alerta_m:3.5,cota_emergencia_m:4.0};
  }
}

async function fetchPrevisao(lat,lng){
  try {
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`+
      `&hourly=precipitation,precipitation_probability,temperature_2m,windspeed_10m,wind_gusts_10m,relative_humidity_2m,cape,soil_moisture_0_to_1cm`+
      `&daily=precipitation_sum,precipitation_hours,precipitation_probability_max,windspeed_10m_max,temperature_2m_max,temperature_2m_min`+
      `&forecast_days=3&timezone=America/Sao_Paulo`;
    const r=await fetch(url,{timeout:10000});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data=await r.json();
    return {...data,online:true,fonte:'Open-Meteo'};
  } catch(e){
    return {online:false,fonte:'Open-Meteo',erro:e.message};
  }
}

function calcScore(previsao,cota){
  const h=previsao?.hourly||{};
  const mmh=h.precipitation?.[0]||0;
  const acum6h=(h.precipitation||[]).slice(0,6).reduce((a,b)=>a+b,0);
  const solo=h.soil_moisture_0_to_1cm?.[0]||0;
  const cape=h.cape?.[0]||0;
  let s=0;
  s+=Math.min(mmh/120,1)*0.35;
  s+=Math.min(acum6h/60,1)*0.25;
  s+=Math.min(solo/0.5,1)*0.20;
  s+=Math.min(cape/2000,1)*0.10;
  if(cota?.cota_m) s+=Math.min(cota.cota_m/4.5,1)*0.10;
  return Math.max(0,Math.min(1,Math.round(s*1000)/1000));
}

router.get('/:cod_ibge/dados', async(req,res)=>{
  try {
    const{rows}=await db.query('SELECT * FROM municipios WHERE cod_ibge=$1',[parseInt(req.params.cod_ibge)]);
    if(!rows.length) return res.status(404).json({erro:'Municipio nao encontrado'});
    const m=rows[0];
    const est=estacaoMaisProxima(m.lat,m.lng);
    const[previsao,cota]=await Promise.all([fetchPrevisao(m.lat,m.lng),fetchCota(est.cod)]);
    const score=calcScore(previsao,cota);
    const nivel=score>=0.85?'Critico':score>=0.65?'Alto':score>=0.40?'Medio-Alto':score>=0.20?'Medio':'Baixo';
    res.json({municipio:m,previsao,cota:{...cota,nome:est.nome,cod_estacao:est.cod,dist_km:est.dist_km},score,nivel,atualizado:new Date().toISOString()});
  } catch(e){ res.status(500).json({erro:e.message}); }
});

router.get('/:cod_ibge/cota', async(req,res)=>{
  try {
    const{rows}=await db.query('SELECT lat,lng FROM municipios WHERE cod_ibge=$1',[parseInt(req.params.cod_ibge)]);
    if(!rows.length) return res.status(404).json({erro:'Nao encontrado'});
    const est=estacaoMaisProxima(rows[0].lat,rows[0].lng);
    const cota=await fetchCota(est.cod);
    res.json({...cota,nome:est.nome,cod_estacao:est.cod,dist_km:est.dist_km});
  } catch(e){ res.status(500).json({erro:e.message}); }
});

router.get('/:cod_ibge/previsao', async(req,res)=>{
  try {
    const{rows}=await db.query('SELECT lat,lng FROM municipios WHERE cod_ibge=$1',[parseInt(req.params.cod_ibge)]);
    if(!rows.length) return res.status(404).json({erro:'Nao encontrado'});
    const data=await fetchPrevisao(rows[0].lat,rows[0].lng);
    res.json(data);
  } catch(e){ res.status(500).json({erro:e.message}); }
});

router.get('/:cod_ibge/social', async (req, res) => {
  try {
    const ibge = parseInt(req.params.cod_ibge, 10);
    if (Number.isNaN(ibge)) {
      return res.status(400).json({ erro: 'cod_ibge inválido' });
    }
 
    const { rows } = await db.query(
      `SELECT
         cad_familias_risco, cad_bolsa_familia, cad_pcds_idosos, cad_criancas,
         suas_cras, suas_creas, suas_acolhimento, suas_vagas, suas_assistentes,
         samu_viaturas, samu_equipes_bombeiros, samu_ocorrencias,
         samu_tmr_min, samu_resgates_24h,
         social_atualizado_em
       FROM municipios
       WHERE cod_ibge = $1`,
      [ibge]
    );
 
    if (!rows.length) {
      return res.status(404).json({ erro: 'Município não encontrado' });
    }
 
    const m = rows[0];
 
    res.json({
      cadunico: {
        familias_risco: m.cad_familias_risco,
        bolsa_familia:  m.cad_bolsa_familia,
        pcds_idosos:    m.cad_pcds_idosos,
        criancas:       m.cad_criancas,
      },
      suas: {
        cras:        m.suas_cras,
        creas:       m.suas_creas,
        acolhimento: m.suas_acolhimento,
        vagas:       m.suas_vagas,
        assistentes: m.suas_assistentes,
      },
      samu: {
        viaturas:          m.samu_viaturas,
        equipes_bombeiros: m.samu_equipes_bombeiros,
        ocorrencias:       m.samu_ocorrencias,
        tmr_min:           m.samu_tmr_min,
        resgates_24h:      m.samu_resgates_24h,
      },
      atualizado_em: m.social_atualizado_em,
      fonte: 'Supabase · municipios',
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports=router;
