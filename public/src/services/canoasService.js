/**
 * SGA — Serviço de Dados Reais de Canoas/RS
 * Integra: ANA HidroWeb, CEMADEN, Open-Meteo, CadÚnico
 */

const CanoasService = {

  // ── CONFIGURAÇÃO ──────────────────────────────────────────────────
  config: {
    codIBGE:        4304606,
    estacaoANA:     '87480000',
    estacoesPluvio: ['RS434606101A','RS434606102A','RS434606103A'],
    lat:            -29.9178,
    lng:            -51.1836,
  },

  // ── ANA HIDROWEB — Cota do Rio Gravataí ──────────────────────────
  async buscarCotaRio() {
    try {
      const url = '/api/ana/cota?estacao=' + this.config.estacaoANA;
      const r = await fetch(url);
      if (!r.ok) throw new Error('ANA offline');
      const data = await r.json();
      return {
        cota:     data.cota_m,
        variacao: data.variacao_m,
        vazao:    data.vazao_m3s,
        hora:     data.data_hora,
        status:   this._statusCota(data.cota_m),
        fonte:    'ANA HidroWeb',
      };
    } catch(e) {
      console.warn('[CanoasService] ANA indisponível:', e.message);
      return this._mockCota();
    }
  },

  _statusCota(cota) {
    if (cota >= 4.0) return 'Emergência';
    if (cota >= 3.5) return 'Alerta';
    if (cota >= 3.0) return 'Atenção';
    return 'Normal';
  },

  _mockCota() {
    return { cota:2.1, variacao:'+0.02', vazao:142, hora: new Date().toISOString(),
             status:'Normal', fonte:'Mock — ANA offline' };
  },

  // ── CEMADEN — Pluviômetros por bairro ────────────────────────────
  async buscarPrecipitacao() {
    const resultados = [];
    for (const cod of this.config.estacoesPluvio) {
      try {
        const url = '/api/cemaden/precipitacao?estacao=' + cod;
        const r = await fetch(url);
        if (!r.ok) throw new Error('CEMADEN offline');
        const data = await r.json();
        resultados.push({
          estacao: cod,
          bairro:  data.nome,
          mmh:     data.precipitacao_mmh,
          acum6h:  data.acumulado_6h,
          status:  this._statusChuva(data.precipitacao_mmh),
          fonte:   'CEMADEN',
        });
      } catch(e) {
        resultados.push(this._mockPluvio(cod));
      }
    }
    return resultados;
  },

  _statusChuva(mmh) {
    if (mmh >= 80) return 'Emergência';
    if (mmh >= 50) return 'Alerta';
    if (mmh >= 25) return 'Atenção';
    return 'Normal';
  },

  _mockPluvio(cod) {
    const mock = { 'RS434606101A': { bairro:'Guajuviras',    mmh:12, acum6h:28 },
                   'RS434606102A': { bairro:'Mathias Velho', mmh:8,  acum6h:19 },
                   'RS434606103A': { bairro:'Centro',        mmh:5,  acum6h:11 } };
    const m = mock[cod] || { bairro:'Desconhecido', mmh:0, acum6h:0 };
    return { estacao:cod, ...m, status:this._statusChuva(m.mmh), fonte:'Mock — CEMADEN offline' };
  },

  // ── OPEN-METEO — Previsão 48h grátis ─────────────────────────────
  async buscarPrevisao() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.config.lat}&longitude=${this.config.lng}&hourly=precipitation,precipitation_probability,windspeed_10m&forecast_days=2&timezone=America/Sao_Paulo`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Open-Meteo offline');
      const data = await r.json();

      // Pegar próximas 12 horas
      const horas = data.hourly.time.slice(0, 12).map((t, i) => ({
        hora:         t,
        precipitacao: data.hourly.precipitation[i],
        probabilidade: data.hourly.precipitation_probability[i],
        vento_kmh:    data.hourly.windspeed_10m[i],
      }));

      return { horas, fonte: 'Open-Meteo', atualizado: new Date().toISOString() };
    } catch(e) {
      console.warn('[CanoasService] Open-Meteo indisponível:', e.message);
      return { horas: [], fonte: 'Mock', atualizado: new Date().toISOString() };
    }
  },

  // ── SCORE DE RISCO COMBINADO ──────────────────────────────────────
  calcularScoreRisco(cota, mmh, acum6h) {
    const cotaNormal = 1.5;
    const scoreCota  = Math.min((cota - cotaNormal) / 3.0, 1.0);
    const scoreChuva = Math.min(mmh / 100, 1.0);
    const scoreAcum  = Math.min(acum6h / 80, 1.0);
    const score = scoreCota * 0.50 + scoreChuva * 0.30 + scoreAcum * 0.20;
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  },

  // ── ALERTAS AUTOMÁTICOS ──────────────────────────────────────────
  gerarAlertas(cota, pluvio) {
    const alertas = [];
    const agora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});

    if (cota.cota >= 4.0) {
      alertas.push({
        nivel: 'Crítico', icon: '🔴',
        titulo: 'Emergência — Rio Gravataí',
        desc: `Cota ${cota.cota}m — Evacuar imediatamente bairros críticos`,
        hora: agora, fontes: ['ANA HidroWeb'],
      });
    } else if (cota.cota >= 3.5) {
      alertas.push({
        nivel: 'Alto', icon: '🟠',
        titulo: 'Alerta — Rio Gravataí em elevação',
        desc: `Cota ${cota.cota}m — Acionar CRAS e preparar abrigos`,
        hora: agora, fontes: ['ANA HidroWeb'],
      });
    } else if (cota.cota >= 3.0) {
      alertas.push({
        nivel: 'Atenção', icon: '🟡',
        titulo: 'Atenção — Rio Gravataí',
        desc: `Cota ${cota.cota}m — Monitoramento intensivo`,
        hora: agora, fontes: ['ANA HidroWeb'],
      });
    }

    pluvio.forEach(p => {
      if (p.mmh >= 50) {
        alertas.push({
          nivel: p.mmh >= 80 ? 'Crítico' : 'Alto', icon: p.mmh >= 80 ? '🔴' : '🟠',
          titulo: `Chuva intensa — ${p.bairro}`,
          desc: `${p.mmh}mm/h · Acum 6h: ${p.acum6h}mm`,
          hora: agora, fontes: ['CEMADEN'],
        });
      }
    });

    return alertas;
  },

  // ── BUSCAR TUDO DE UMA VEZ ────────────────────────────────────────
  async buscarTudo() {
    console.log('[CanoasService] Buscando dados em tempo real...');
    const [cota, pluvio, previsao] = await Promise.all([
      this.buscarCotaRio(),
      this.buscarPrecipitacao(),
      this.buscarPrevisao(),
    ]);
    const alertas = this.gerarAlertas(cota, pluvio);
    const mmhMax  = Math.max(...pluvio.map(p => p.mmh));
    const score   = this.calcularScoreRisco(cota.cota, mmhMax, pluvio[0]?.acum6h || 0);

    return { cota, pluvio, previsao, alertas, score,
             atualizado: new Date().toISOString() };
  },
};

window.CanoasService = CanoasService;
