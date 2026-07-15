/**
 * SGA v3 — DataService Universal
 * Dados climáticos para QUALQUER município do RS
 * Fontes: Open-Meteo (primária) + ANA HidroWeb (fallback) + INMET (estações)
 */
const DataService = {
  _cache: {},
  _CACHE_TTL: 5 * 60 * 1000,
  _estacoesINMET: null,
  _API: 'https://sga-api-1705.onrender.com',

  _dist(lat1,lng1,lat2,lng2){
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  },

  async _estacaoMaisProxima(lat,lng){
    try {
      if(!this._estacoesINMET){
        const r=await fetch('https://apitempo.inmet.gov.br/estacoes/T');
        if(!r.ok) throw new Error('INMET offline');
        const todas=await r.json();
        this._estacoesINMET=todas.filter(e=>e.SG_ESTADO==='RS'&&e.CD_SITUACAO==='Operante')
          .map(e=>({codigo:e.CD_ESTACAO,nome:e.DC_NOME,lat:parseFloat(e.VL_LATITUDE),lng:parseFloat(e.VL_LONGITUDE)}));
      }
      let melhor=null,menorDist=Infinity;
      for(const est of this._estacoesINMET){
        const d=this._dist(lat,lng,est.lat,est.lng);
        if(d<menorDist){menorDist=d;melhor={...est,dist_km:Math.round(d)};}
      }
      return melhor;
    } catch(e){ return null; }
  },

  async buscarPrevisao(lat,lng){
    const key=`prev_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if(this._cache[key]&&Date.now()-this._cache[key].ts<this._CACHE_TTL) return this._cache[key].data;
    try {
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`+
        `&hourly=precipitation,precipitation_probability,temperature_2m,windspeed_10m,wind_gusts_10m,relative_humidity_2m,cape,soil_moisture_0_to_1cm`+
        `&daily=precipitation_sum,precipitation_hours,precipitation_probability_max,windspeed_10m_max,temperature_2m_max,temperature_2m_min`+
        `&forecast_days=3&timezone=America%2FSao_Paulo`;
      const r=await fetch(url);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const d=await r.json();
      const h=d.hourly, di=d.daily;
      const resultado={
        fonte:'Open-Meteo', online:true, atualizado:new Date().toISOString(),
        agora:{
          precipitacao_mmh:h.precipitation[0]||0,
          prob_chuva_pct:h.precipitation_probability[0]||0,
          temperatura_c:h.temperature_2m[0]||0,
          vento_kmh:h.windspeed_10m[0]||0,
          rajada_kmh:h.wind_gusts_10m[0]||0,
          umidade_pct:h.relative_humidity_2m[0]||0,
          cape_jkg:h.cape[0]||0,
          umidade_solo:h.soil_moisture_0_to_1cm[0]||0,
          risco_convectivo:(h.cape[0]||0)>1000,
        },
        proximas6h:{
          precip_acum_mm:h.precipitation.slice(0,6).reduce((a,b)=>a+b,0),
          prob_max_pct:Math.max(...h.precipitation_probability.slice(0,6)),
          precip_max_mmh:Math.max(...h.precipitation.slice(0,6)),
        },
        proximas24h:{
          precip_acum_mm:h.precipitation.slice(0,24).reduce((a,b)=>a+b,0),
          prob_max_pct:Math.max(...h.precipitation_probability.slice(0,24)),
        },
        previsao_dias:di.time.map((t,i)=>({
          data:t, precip_mm:di.precipitation_sum[i]||0,
          horas_chuva:di.precipitation_hours[i]||0,
          prob_max_pct:di.precipitation_probability_max[i]||0,
          vento_max_kmh:di.windspeed_10m_max[i]||0,
          temp_max_c:di.temperature_2m_max[i]||0,
          temp_min_c:di.temperature_2m_min[i]||0,
        })),
        serie_horaria:h.time.slice(0,24).map((t,i)=>({
          hora:t, precip_mmh:h.precipitation[i]||0,
          prob_pct:h.precipitation_probability[i]||0,
          temp_c:h.temperature_2m[i]||0, vento_kmh:h.windspeed_10m[i]||0,
        })),
      };
      this._cache[key]={ts:Date.now(),data:resultado};
      return resultado;
    } catch(e){
      console.warn('[DataService] Open-Meteo:',e.message);
      return {fonte:'Open-Meteo',online:false,erro:e.message,
        agora:{precipitacao_mmh:0,prob_chuva_pct:0,temperatura_c:20,vento_kmh:0,rajada_kmh:0,umidade_pct:70,cape_jkg:0,umidade_solo:0.3,risco_convectivo:false},
        proximas6h:{precip_acum_mm:0,prob_max_pct:0,precip_max_mmh:0},
        proximas24h:{precip_acum_mm:0,prob_max_pct:0},
        previsao_dias:[],serie_horaria:[]};
    }
  },

  async buscarCota(cod_ibge){
    const key=`cota_${cod_ibge}`;
    if(this._cache[key]&&Date.now()-this._cache[key].ts<this._CACHE_TTL) return this._cache[key].data;
    try {
      const r=await fetch(`${this._API}/api/ana/cota-municipio/${cod_ibge}`,{signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data=await r.json();
      this._cache[key]={ts:Date.now(),data};
      return data;
    } catch(e){
      return {online:false,cota_m:null,status:'Indisponível',fonte:'ANA HidroWeb',erro:e.message};
    }
  },

  calcularScore(previsao,cota){
    const mmh=previsao?.agora?.precipitacao_mmh||0;
    const acum6h=previsao?.proximas6h?.precip_acum_mm||0;
    const solo=previsao?.agora?.umidade_solo||0;
    const cape=previsao?.agora?.cape_jkg||0;
    let score=0;
    score+=Math.min(mmh/120,1.0)*0.35;
    score+=Math.min(acum6h/60,1.0)*0.25;
    score+=Math.min(solo/0.5,1.0)*0.20;
    score+=Math.min(cape/2000,1.0)*0.10;
    if(cota?.cota_m) score+=Math.min(cota.cota_m/4.5,1.0)*0.10;
    return Math.max(0,Math.min(1,Math.round(score*1000)/1000));
  },

  nivelRisco(score){
    if(score>=0.85) return {nivel:5,str:'Critico',cor:'#7B0000',classe:'pill-red'};
    if(score>=0.65) return {nivel:4,str:'Alto',cor:'#B83A2E',classe:'pill-red'};
    if(score>=0.40) return {nivel:3,str:'Medio-Alto',cor:'#E8A23A',classe:'pill-amber'};
    if(score>=0.20) return {nivel:2,str:'Medio',cor:'#C9B830',classe:'pill-amber'};
    return {nivel:1,str:'Baixo',cor:'#4BAF82',classe:'pill-green'};
  },

  gerarAlertas(municipio,previsao,cota){
    const alertas=[];
    const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const nome=municipio?.nome||'Municipio';
    const mmh=previsao?.agora?.precipitacao_mmh||0;
    const acum6h=previsao?.proximas6h?.precip_acum_mm||0;
    const cape=previsao?.agora?.cape_jkg||0;
    const solo=previsao?.agora?.umidade_solo||0;
    if(mmh>=80) alertas.push({nivel:'Critico',titulo:`Chuva extrema - ${nome}`,desc:`${mmh.toFixed(1)}mm/h - Risco de inundacao imediata`,hora,fontes:['Open-Meteo']});
    else if(mmh>=40) alertas.push({nivel:'Alto',titulo:`Chuva intensa - ${nome}`,desc:`${mmh.toFixed(1)}mm/h - Acumulado 6h: ${acum6h.toFixed(0)}mm`,hora,fontes:['Open-Meteo']});
    else if(mmh>=20) alertas.push({nivel:'Atencao',titulo:`Chuva moderada - ${nome}`,desc:`${mmh.toFixed(1)}mm/h - Monitoramento forcado`,hora,fontes:['Open-Meteo']});
    if(acum6h>=60&&mmh<40) alertas.push({nivel:'Alto',titulo:`Volume acumulado alto - ${nome}`,desc:`${acum6h.toFixed(0)}mm acumulados - Solo em saturacao`,hora,fontes:['Open-Meteo']});
    if(cape>=1500) alertas.push({nivel:'Alto',titulo:`Risco de tempestade - ${nome}`,desc:`CAPE: ${Math.round(cape)} J/kg - Risco de granizo`,hora,fontes:['Open-Meteo']});
    if(cota?.cota_m&&cota?.cota_emergencia_m){
      if(cota.cota_m>=cota.cota_emergencia_m) alertas.push({nivel:'Critico',titulo:`Emergencia - ${cota.nome||'Rio'}`,desc:`Cota: ${cota.cota_m}m (lim: ${cota.cota_emergencia_m}m)`,hora,fontes:['ANA HidroWeb']});
      else if(cota.cota_m>=cota.cota_alerta_m) alertas.push({nivel:'Alto',titulo:`Alerta - ${cota.nome||'Rio'} em elevacao`,desc:`Cota: ${cota.cota_m}m`,hora,fontes:['ANA HidroWeb']});
    }
    if(solo>=0.45&&acum6h>20) alertas.push({nivel:'Atencao',titulo:`Solo saturado - ${nome}`,desc:`Umidade: ${(solo*100).toFixed(0)}% - Risco de deslizamento`,hora,fontes:['Open-Meteo']});
    return alertas;
  },

  async buscarTudo(municipio){
    if(!municipio) return null;
    console.log(`[DataService] Buscando: ${municipio.nome}`);
    const [previsao,cota,estacao]=await Promise.all([
      this.buscarPrevisao(municipio.lat,municipio.lng),
      this.buscarCota(municipio.cod_ibge),
      this._estacaoMaisProxima(municipio.lat,municipio.lng),
    ]);
    const score=this.calcularScore(previsao,cota);
    const risco=this.nivelRisco(score);
    const alertas=this.gerarAlertas(municipio,previsao,cota);
    return {municipio,previsao,cota,estacao_inmet:estacao,score,risco,alertas,atualizado:new Date().toISOString()};
  },
};
window.DataService=DataService;
