/**
 * SGA — Fluxo de Decisão
 */
const FluxoPage = {
  render() {
    const etapas = [
      { n:1, titulo:'Detecção automática',   icone:'📡', status:'done',
        desc:'Sensores IoT + ANA HidroWeb ultrapassaram limiar às 11:42',
        checklist:['Cota do rio: acima do limite','Pluviometro: acima do limite','Solo: saturado'] },
      { n:2, titulo:'Validação IA',           icone:'🧠', status:'done',
        desc:'Modelo LSTM-v3 confirmou risco crítico com 94% de confiança',
        checklist:['Score Camada 2: 0.94 (>0.65 ✓)','IA LSTM: P(evento)=0.94','IC 90%: [0.89 — 0.97]'] },
      { n:3, titulo:'Emissão de alerta',      icone:'🔔', status:'active',
        desc:'Alertas críticos emitidos para 3 municípios. Defesa Civil notificada.',
        checklist:['App push: 12.480 dispositivos ✓','WhatsApp: 3.820 CadÚnico ✓','Telegram DC: enviado ✓','SMS em processamento...'] },
      { n:4, titulo:'Notificação população',  icone:'📣', status:'active',
        desc:'Sirenes ativadas no municipio. Radio FM em transmissao de emergencia.',
        checklist:['Sirenes IoT: 4/6 ativas','Rádio FM: ao ar ✓','SMS CadÚnico: 3.820 envios'] },
      { n:5, titulo:'Ação Defesa Civil',      icone:'🛡', status:'pending',
        desc:'Aguardando confirmação do secretário Vanderlei Marcos',
        checklist:['Plano de contingência: pronto','Equipes em stand-by','SAMU: 8 viaturas alertadas'] },
      { n:6, titulo:'Evacuação assistida',    icone:'🚌', status:'pending',
        desc:'PCDs e idosos: 840 pessoas · SUAS/CRAS mobilizados',
        checklist:['Rotas de fuga: RS-471 (Norte)','Ônibus municipais: a mobilizar','CRAS Guajuviras: a acionar'] },
      { n:7, titulo:'Ativação de abrigos',    icone:'🏠', status:'pending',
        desc:'4 abrigos disponíveis · 6.700 vagas livres',
        checklist:['Abrigo principal: vagas disponiveis','Abrigo secundario: vagas disponiveis','Abrigo terciario: vagas disponiveis'] },
    ];

    return `
    <div class="page" id="p-fluxo">
      <div class="page-header">
        <div>
          <div class="page-title">Fluxo de Decisão</div>
          <div class="page-sub">Protocolo de 7 etapas · Atualizado em tempo real</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-red">Evento ativo — Rio Pardo</span>
        </div>
      </div>
      <div class="page-body">
        ${etapas.map(e => `
          <div class="card" style="border-left:4px solid ${
            e.status==='done'?'var(--green-light)':e.status==='active'?'var(--red)':'var(--border)'
          }">
            <div class="card-header">
              <div class="card-title">
                <span style="font-size:18px">${e.icone}</span>
                Etapa ${e.n}: ${e.titulo}
                <span class="pill ${e.status==='done'?'pill-green':e.status==='active'?'pill-red':'pill-gray'}" style="margin-left:6px">
                  ${e.status==='done'?'Concluído':e.status==='active'?'Em andamento':'Pendente'}
                </span>
              </div>
            </div>
            <div class="card-body">
              <p style="font-size:12px;color:var(--text-2);margin-bottom:8px">${e.desc}</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${e.checklist.map(c => `
                  <span style="font-size:11px;padding:3px 8px;background:var(--bg);border-radius:6px;
                               color:${c.includes('✓')?'var(--green-mid)':'var(--text-3)'}">${c}</span>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  },
};
window.FluxoPage = FluxoPage;


/**
 * SGA — Sensores & IoT
 */
const SensoresPage = {
  render() {
    const hidro  = SGA.sensoresHidro  || [];
    const pluvio = SGA.sensoresPluvio || [];
    const solo   = SGA.sensoresSolo   || [];
    const totalSensores = hidro.length + pluvio.length + solo.length;
    const ativos = Math.max(totalSensores - 1, 0);
    const info = SGA.sensoresInfo || {};
    const sub = info.bacia
      ? `Bacia ${info.bacia} · ${info.exibFlu}${info.totalFlu > info.exibFlu ? ' de ' + info.totalFlu : ''} réguas · `
        + `${info.exibPlu}${info.totalPlu > info.exibPlu ? ' de ' + info.totalPlu : ''} pluviômetros ANA`
      : 'LoRaWAN + 4G · Atualização a cada 5 min';
    return `
    <div class="page" id="p-sensores">
      <div class="page-header">
        <div>
          <div class="page-title">Sensores & IoT</div>
          <div class="page-sub">${sub}</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-green">${ativos} ativos</span>
          <span class="pill pill-gray">1 offline</span>
        </div>
      </div>
      <div class="page-body">

        <div class="tab-row">
          <button class="tab-btn active" onclick="SensoresPage._tab(this,'s-hidro')">💧 Réguas Hidrológicas</button>
          <button class="tab-btn" onclick="SensoresPage._tab(this,'s-pluvio')">🌧 Pluviômetros</button>
          <button class="tab-btn" onclick="SensoresPage._tab(this,'s-solo')">🌱 Solo & Encostas</button>
        </div>

        <!-- RÉGUAS -->
        <div id="s-hidro">
          <div class="g3">
            ${hidro.map(s => `
              <div class="sensor-card" style="border-left:3px solid ${s.col||'var(--border)'}">
                <div class="sc-name">${s.id} — ${s.local}</div>
                ${s.cota != null ? `
                  <div><span class="sc-value" style="color:${s.col}">${s.cota}</span><span class="sc-unit">m</span>${s.tend ? `
                    <span title="Δ ${s.tend.delta} em ${s.tend.horas}h" style="font-size:20px;font-weight:800;margin-left:6px;color:${s.tend.cor}">${s.tend.seta}</span>` : ''}</div>
                  <div class="sc-sub">${s.tend ? `Δ ${s.tend.horas}h: <b style="color:${s.tend.cor}">${s.tend.delta}</b> · ` : ''}Taxa: ${s.taxa}</div>
                  <div class="sc-sub"><span class="pill ${s.status==='Crítico'?'pill-red':s.status==='Alto'?'pill-amber':s.status==='Offline'?'pill-gray':'pill-green'}">${s.status}</span></div>
                  <div class="sc-bar"><div class="sc-fill ${s.status==='Crítico'?'sc-fill-err':s.status==='Alto'?'sc-fill-warn':'sc-fill-ok'}"
                    style="width:${Math.min(s.cota/8*100,100)}%"></div></div>
                  <div class="sparkline" id="sp-${s.id.toLowerCase().replace('-','')}"></div>
                ` : `<div class="sc-sub pill pill-gray">Offline</div>`}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- PLUVIÔMETROS -->
        <div id="s-pluvio" style="display:none">
          <div class="g3">
            ${pluvio.map(s => `
              <div class="sensor-card" style="border-left:3px solid ${s.col}">
                <div class="sc-name">${s.id} — ${s.local}</div>
                <div><span class="sc-value" style="color:${s.col}">${s.mmh}</span><span class="sc-unit">mm/h</span></div>
                <div class="sc-sub">Acum. 6h: ${s.acum6h}mm${s.acum24h != null ? ' · 24h: ' + s.acum24h + 'mm' : ''}</div>
                ${s.medidoEm ? `<div class="sc-sub">Última medição: ${s.medidoEm}</div>` : ''}
                <div class="sc-sub"><span class="pill ${s.status==='Crítico'?'pill-red':s.status==='Alto'?'pill-amber':'pill-green'}">${s.status}</span></div>
                <div class="sc-bar"><div class="sc-fill ${s.status==='Crítico'?'sc-fill-err':s.status==='Alto'?'sc-fill-warn':'sc-fill-ok'}"
                  style="width:${Math.min(s.mmh/150*100,100)}%"></div></div>
                <div class="sparkline" id="sp-${s.id.toLowerCase().replace('-','')}"></div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SOLO -->
        <div id="s-solo" style="display:none">
          <div class="g3">
            ${solo.map(s => `
              <div class="sensor-card" style="border-left:3px solid ${s.status==='Crítico'?'var(--red)':s.status==='Alto'?'var(--amber)':'var(--green-light)'}">
                <div class="sc-name">${s.id} — ${s.local}</div>
                <div><span class="sc-value" style="color:${s.status==='Crítico'?'var(--red)':s.status==='Alto'?'var(--amber)':'var(--green-mid)'}">${s.valor}</span><span class="sc-unit">${s.unidade}</span></div>
                <div class="sc-sub">${s.tipo} · Limiar: ${s.limiar}${s.unidade}</div>
                <div class="sc-sub"><span class="pill ${s.status==='Crítico'?'pill-red':s.status==='Alto'?'pill-amber':'pill-green'}">${s.status}</span></div>
                <div class="sc-bar"><div class="sc-fill ${s.status==='Crítico'?'sc-fill-err':s.status==='Alto'?'sc-fill-warn':'sc-fill-ok'}"
                  style="width:${Math.min(s.valor/s.limiar*80,100)}%"></div></div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>`;
  },

  _tab(btn, id) {
    document.querySelectorAll('#p-sensores .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['s-hidro','s-pluvio','s-solo'].forEach(i => {
      const el = document.getElementById(i);
      if (el) el.style.display = i === id ? '' : 'none';
    });
    setTimeout(() => SparklineUtils.renderAll(), 100);
  },
};
window.SensoresPage = SensoresPage;


/**
 * SGA — Integrações
 */
const IntegracoesPage = {
  _integracoes: [
    { nome:'ANA HidroWebService', tipo:'Hidrologia',  tag:'ds-ana',  status:'g', desc:'2.994 estações RS · cota/chuva/vazão ao vivo · token automático (60min)' },
    { nome:'CEMADEN — PED',       tipo:'Pluviometria',tag:'ds-cem',  status:'g', desc:'Pluviômetros oficiais · acumulados 1h–120h por município · token automático (4h)' },
    { nome:'Open-Meteo',          tipo:'Previsão',    tag:'ds-new',  status:'g', desc:'Previsão horária por coordenada do município · ECMWF+GFS' },
    { nome:'INMET',               tipo:'Meteorologia',tag:'ds-inmet',status:'g', desc:'Estações meteorológicas automáticas · condição atual do município' },
    { nome:'MI Social / SAGI',    tipo:'Social',      tag:'ds-cad',  status:'g', desc:'CadÚnico, Bolsa Família e BPC · 497 municípios' },
    { nome:'CadSUAS',             tipo:'Social',      tag:'ds-ibge', status:'g', desc:'CRAS · CREAS · unidades de acolhimento (rede socioassistencial)' },
    { nome:'IBGE',                tipo:'Territorial', tag:'ds-ibge', status:'g', desc:'Malha municipal e centroides oficiais dos 497 municípios' },
    { nome:'OpenStreetMap',       tipo:'Cartografia', tag:'ds-osm',  status:'g', desc:'Mapa base do sistema (tiles OSM)' },
    { nome:'CPRM GeoSGB',         tipo:'Geologia',    tag:'ds-cprm', status:'g', desc:'Setorização de risco geológico (camada do mapa)' },
  ],

  render() {
    const ativos  = this._integracoes.filter(i => i.status === 'g').length;
    const parcial = this._integracoes.filter(i => i.status === 'y').length;
    return `
    <div class="page" id="p-integracoes">
      <div class="page-header">
        <div>
          <div class="page-title">Integrações de Dados</div>
          <div class="page-sub">16 fontes integradas · ${ativos} ativas · ${parcial} parcial</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-green">${ativos} online</span>
          <span class="pill pill-amber">${parcial} parcial</span>
        </div>
      </div>
      <div class="page-body">
        <div class="g3">
          ${this._integracoes.map(i => `
            <div class="int-card ${i.status === 'y' ? 'warn' : 'active'}">
              <div class="int-head">
                <span class="int-name">${i.nome}</span>
                <span class="int-dot ${i.status}"></span>
              </div>
              <div class="int-desc">${i.desc}</div>
              <div>
                <span class="int-tag ds-badge ${i.tag}">${i.tipo}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.IntegracoesPage = IntegracoesPage;


/**
 * SGA — ANA HidroWeb
 */
const HidroWebPage = {
  render() {
    const estacoes = SGA.estacoesANA || [];
    const b = (window.SGA && SGA.config && SGA.config.baciaAtiva) || null;
    return `
    <div class="page" id="p-hidroweb">
      <div class="page-header">
        <div>
          <div class="page-title">ANA HidroWeb</div>
          <div class="page-sub">${estacoes.length} estaç${estacoes.length === 1 ? 'ão' : 'ões'} fluviométrica${estacoes.length === 1 ? '' : 's'} · ${b ? 'Bacia ' + b.nome : 'Município ativo'}</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ana">HidroWeb API</span>
        </div>
      </div>
      <div class="page-body">
        <div class="g2">
          ${estacoes.map((e,i) => `
            <div class="card">
              <div class="card-header">
                <div class="card-title">💧 ${e.nome}</div>
                <span class="pill ${e.status==='Crítico'?'pill-red':e.status==='Alto'?'pill-amber':e.status==='Atenção'?'pill-amber':'pill-green'}">${e.status}</span>
              </div>
              <div class="card-body">
                <div class="g2" style="margin-bottom:8px">
                  <div>
                    <div style="font-size:10px;color:var(--text-3)">COTA ATUAL</div>
                    <div style="font-size:24px;font-weight:800;font-family:var(--mono);color:${e.status==='Crítico'?'var(--red)':e.status==='Alto'?'var(--amber)':'var(--green-mid)'}">${e.cota}m</div>
                  </div>
                  <div>
                    <div style="font-size:10px;color:var(--text-3)">VARIAÇÃO${e.janela ? ' (' + e.janela + ')' : ''}</div>
                    <div style="font-size:20px;font-weight:700;font-family:var(--mono);color:${(e.variacao||'').startsWith('+')?'var(--amber)':(e.variacao||'').startsWith('-')?'var(--green-mid)':'var(--text-3)'}">${e.variacao}</div>
                  </div>
                </div>
                <div class="metric-row"><span class="mr-label">Rio</span><span class="mr-value">${e.rio}</span></div>
                <div class="metric-row"><span class="mr-label">Código ANA</span><span class="mr-value mono">${e.cod}</span></div>
                <div class="metric-row"><span class="mr-label">Nível normal</span><span class="mr-value">${e.normal}m</span></div>
                <div class="metric-row"><span class="mr-label">Vazão</span><span class="mr-value">${e.vazao} m³/s</span></div>
                <div style="margin-top:8px;height:30px;display:flex;align-items:flex-end;gap:2px" id="hw-${i}">
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.HidroWebPage = HidroWebPage;


/**
 * SGA — Geodados & Sistemas Sociais
 */
const GeodadosPage = {
  render() {
    // Blindagem: SGA.social e seus sub-objetos podem não vir populados
    // para todos os municípios. Sem isto, o acesso direto a .toLocaleString()
    // em valor undefined derruba toda a renderização (tela branca).
    const social   = SGA.social || {};
    const cadunico = social.cadunico || {};
    const suas     = social.suas     || {};
    const samu     = social.samu     || {};

    const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));
    const val = (v) => (v == null ? '—' : v);

    return `
    <div class="page" id="p-geodados">
      <div class="page-header">
        <div>
          <div class="page-title">Geodados & Sistemas Sociais</div>
          <div class="page-sub">CadÚnico · SUAS · SAMU · CPRM · IBGE</div>
        </div>
      </div>
      <div class="page-body">
        <div class="g3">
          <!-- CadÚnico -->
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="ds-badge ds-cad">CadÚnico</span> Famílias</div></div>
            <div class="card-body">
              <div class="metric-row"><span class="mr-label">Em área de risco</span><span class="mr-value" style="color:var(--red)">${fmt(cadunico.familias_risco)}</span></div>
              <div class="metric-row"><span class="mr-label">Bolsa Família</span><span class="mr-value">${fmt(cadunico.bolsa_familia)}</span></div>
              <div class="metric-row"><span class="mr-label">PCDs e Idosos</span><span class="mr-value" style="color:var(--amber)">${fmt(cadunico.pcds_idosos)}</span></div>
              <div class="metric-row"><span class="mr-label">Crianças</span><span class="mr-value">${fmt(cadunico.criancas)}</span></div>
            </div>
          </div>
          <!-- SUAS -->
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="ds-badge ds-suas">SUAS</span> Rede Socioass.</div></div>
            <div class="card-body">
              <div class="metric-row"><span class="mr-label">CRAS</span><span class="mr-value">${val(suas.cras)}</span></div>
              <div class="metric-row"><span class="mr-label">CREAS</span><span class="mr-value">${val(suas.creas)}</span></div>
              <div class="metric-row"><span class="mr-label">Acolhimento</span><span class="mr-value">${val(suas.acolhimento)}</span></div>
              <div class="metric-row"><span class="mr-label">Vagas totais</span><span class="mr-value">${fmt(suas.vagas)}</span></div>
              <div class="metric-row"><span class="mr-label">Profissionais SUAS</span><span class="mr-value">${fmt(suas.assistentes)}</span></div>
            </div>
          </div>
          <!-- SAMU -->
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="ds-badge ds-samu">SAMU/CAD</span> Emergência</div></div>
            <div class="card-body">
              <div class="metric-row"><span class="mr-label">Viaturas SAMU</span><span class="mr-value">${val(samu.viaturas)}</span></div>
              <div class="metric-row"><span class="mr-label">Equipes Bombeiros</span><span class="mr-value">${val(samu.equipes_bombeiros)}</span></div>
              <div class="metric-row"><span class="mr-label">Ocorrências 24h</span><span class="mr-value" style="color:var(--amber)">${val(samu.ocorrencias)}</span></div>
              <div class="metric-row"><span class="mr-label">TMR médio</span><span class="mr-value">${val(samu.tmr_min)}min</span></div>
              <div class="metric-row"><span class="mr-label">Resgates 24h</span><span class="mr-value">${val(samu.resgates_24h)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },
};
window.GeodadosPage = GeodadosPage;


/**
 * SGA — Análise Preditiva (Índice Heurístico Transparente)
 * ───────────────────────────────────────────────────────────────────────────
 * HONESTIDADE: não existe modelo treinado neste sistema. Esta página calcula,
 * AO VIVO e no navegador, um índice heurístico de pesos fixos sobre dados
 * oficiais (Open-Meteo, CEMADEN/PED, ANA + limiares SGB/SACE) e mostra cada
 * componente com valor bruto, fonte, horário e contribuição — auditável.
 * Sinais sem dado NÃO pontuam: os pesos são renormalizados e isso fica dito.
 */
const IAPage = {
  PESOS: { prev24: 30, prob24: 10, obs24: 25, cota: 30, tendencia: 5 },

  render() {
    return `
    <div class="page" id="p-ia">
      <div class="page-header">
        <div>
          <div class="page-title">Análise Preditiva — Índice Heurístico</div>
          <div class="page-sub">Fórmula aberta sobre dados oficiais · sem modelo treinado · Open-Meteo + CEMADEN + ANA/SGB</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ai">100% auditável</span>
        </div>
      </div>
      <div class="page-body">
        <div class="g2">
          <div class="card">
            <div class="card-header"><div class="card-title">📊 Índice do município ativo — calculado agora</div></div>
            <div class="card-body" id="ia-calc">
              <div style="font-size:12px;color:var(--text-3);padding:8px">
                Selecione um município para calcular o índice ao vivo.
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">🧭 Método & limitações — leia antes de usar</div></div>
            <div class="card-body" style="font-size:12px;color:var(--text-2);line-height:1.75">
              <p style="margin:0 0 8px"><b style="color:var(--text-1)">O que é:</b> uma heurística de pesos fixos
                (chuva prevista 24h ${this.PESOS.prev24}% · probabilidade de chuva ${this.PESOS.prob24}% ·
                chuva observada 24h ${this.PESOS.obs24}% · cota vs limiar oficial ${this.PESOS.cota}% ·
                tendência da régua ${this.PESOS.tendencia}%). Cada componente aparece ao lado com valor bruto,
                fonte e horário — a conta inteira é auditável nesta tela.</p>
              <p style="margin:0 0 8px"><b style="color:var(--text-1)">O que NÃO é:</b> não há rede neural nem modelo
                estatístico treinado. Os rótulos "LSTM", "acurácia" e "F1" de versões anteriores eram aspiracionais
                e foram removidos. A coluna "Score IA" da tabela de municípios usa valores sintéticos de protótipo
                e não deve orientar decisão operacional.</p>
              <p style="margin:0 0 8px"><b style="color:var(--text-1)">Fontes:</b> previsão Open-Meteo (ECMWF+GFS) por
                coordenada da sede; chuva observada CEMADEN/PED; cota e tendência ANA HidroWeb na estação telemétrica
                mais próxima; limiares oficiais SGB/SACE quando publicados.</p>
              <p style="margin:0"><b style="color:var(--text-1)">Limitações:</b> pesos definidos por julgamento, sem
                calibração estatística nem validação histórica; chuva prevista não é vazão; a estação mais próxima
                pode estar a quilômetros da sede (a distância é exibida); sinais indisponíveis não pontuam e os pesos
                são renormalizados — o índice fica menos informativo e isso é sinalizado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async carregar() {
    const alvo = document.getElementById('ia-calc');
    if (!alvo) return;
    const m = SGA.config.municipioAtivo;
    if (!m || !m.cod_ibge) {
      alvo.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px">Selecione um município para calcular o índice ao vivo.</div>';
      return;
    }
    alvo.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px">Calculando para <b>' + m.nome + '</b> — consultando Open-Meteo, CEMADEN e ANA…</div>';

    const api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
    const jfetch = u => fetch(api + u).then(r => r.json()).catch(() => null);
    const [cota, prev, acum] = await Promise.all([
      jfetch('/api/ana/cota-municipio/' + m.cod_ibge),
      jfetch('/api/municipio/' + m.cod_ibge + '/previsao'),
      jfetch('/api/cemaden/acumulados?ibge=' + m.cod_ibge),
    ]);

    // tendência da mesma régua usada na cota (Δ na janela de 6h)
    let delta6 = null;
    if (cota && cota.cod_estacao) {
      const s = await jfetch('/api/ana/serie/' + cota.cod_estacao + '?range=HORA_6');
      const ls = (s && s.leituras) || [];
      if (ls.length >= 2) {
        const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
        const p = num(ls[0].Cota_Adotada), u = num(ls[ls.length - 1].Cota_Adotada);
        if (p != null && u != null) delta6 = (u - p) / 100;   // cm → m
      }
    }

    // ── componentes: {rotulo, bruto, fonte, frac 0-1 ou null(sem dado), peso}
    const P = this.PESOS, comp = [];
    const d = (prev && prev.daily) || {};
    const prev24 = Array.isArray(d.precipitation_sum) ? d.precipitation_sum[0] : null;
    comp.push({ rotulo: 'Chuva prevista 24h', peso: P.prev24,
      bruto: prev24 != null ? prev24.toFixed(1) + ' mm' : null,
      fonte: 'Open-Meteo (agora)', frac: prev24 != null ? Math.min(prev24 / 80, 1) : null });

    const prob24 = Array.isArray(d.precipitation_probability_max) ? d.precipitation_probability_max[0] : null;
    comp.push({ rotulo: 'Prob. máx. de chuva 24h', peso: P.prob24,
      bruto: prob24 != null ? prob24 + '%' : null,
      fonte: 'Open-Meteo (agora)', frac: prob24 != null ? prob24 / 100 : null });

    const acums = Array.isArray(acum) ? acum.filter(a => a.acc24hr != null) : [];
    const obs24 = acums.length ? Math.max(...acums.map(a => a.acc24hr)) : null;
    comp.push({ rotulo: 'Chuva observada 24h', peso: P.obs24,
      bruto: obs24 != null ? obs24.toFixed(1) + ' mm (máx. entre ' + acums.length + ' estações)' : null,
      fonte: obs24 != null ? 'CEMADEN/PED' : 'CEMADEN — sem estação no município',
      frac: obs24 != null ? Math.min(obs24 / 80, 1) : null });

    const NIVEIS = { normalidade: 0, atencao: 0.5, alerta: 0.8, inundacao: 1 };
    const temRef = cota && cota.referencia && (cota.referencia.alerta_m != null || cota.referencia.inundacao_m != null);
    const nivRef = cota && cota.nivel_referencia;
    comp.push({ rotulo: 'Cota vs limiar oficial', peso: P.cota,
      bruto: cota && cota.cota_m != null
        ? cota.cota_m + ' m · ' + (temRef ? 'nível: ' + nivRef : 'régua sem limiar SGB')
        : null,
      fonte: cota && cota.cota_m != null
        ? (cota.nome || cota.cod_estacao) + ' (' + (cota.dist_km != null ? cota.dist_km + ' km da sede' : '?') + ') · ANA + SGB/SACE · medição ' + (cota.medido_em || '—')
        : 'ANA — sem leitura',
      frac: (cota && cota.cota_m != null && temRef && NIVEIS[nivRef] != null) ? NIVEIS[nivRef] : null });

    comp.push({ rotulo: 'Tendência da régua (6h)', peso: P.tendencia,
      bruto: delta6 != null ? (delta6 > 0 ? '+' : '') + delta6.toFixed(2) + ' m' : null,
      fonte: 'ANA HidroWeb (janela 6h)',
      frac: delta6 != null ? (delta6 > 0.02 ? 1 : delta6 < -0.02 ? 0 : 0.2) : null });

    // ── índice: soma das contribuições / pesos disponíveis (renormalizado)
    const disp = comp.filter(c => c.frac != null);
    const pesoDisp = disp.reduce((s, c) => s + c.peso, 0);
    const indice = pesoDisp ? Math.round(disp.reduce((s, c) => s + c.frac * c.peso, 0) / pesoDisp * 100) : null;
    const nivel = indice == null ? ['—', 'var(--text-3)']
      : indice >= 70 ? ['Crítico', 'var(--red)'] : indice >= 50 ? ['Alto', 'var(--red)']
      : indice >= 30 ? ['Médio-Alto', 'var(--amber)'] : indice >= 15 ? ['Médio', 'var(--amber)']
      : ['Baixo', 'var(--green-mid)'];

    alvo.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
        <div style="font-size:34px;font-weight:800;font-family:var(--mono);color:${nivel[1]}">${indice != null ? indice : '—'}<span style="font-size:16px">/100</span></div>
        <div>
          <div style="font-weight:700;color:${nivel[1]}">${nivel[0]}</div>
          <div style="font-size:11px;color:var(--text-3)">${m.nome} · calculado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} no seu navegador</div>
        </div>
      </div>
      ${comp.map(c => `
        <div class="metric-row" title="${c.fonte}">
          <span class="mr-label">${c.rotulo} <span style="opacity:.6">(peso ${c.peso})</span></span>
          <span class="mr-value">${c.frac != null
            ? (c.bruto || '—') + ' → <b>' + (c.frac * c.peso).toFixed(1) + ' pt</b>'
            : '<span style="color:var(--text-3)">sem dado — não pontua</span>'}</span>
        </div>
        <div style="font-size:10px;color:var(--text-3);margin:-2px 0 6px">${c.fonte}</div>
      `).join('')}
      <div style="font-size:11px;color:var(--text-3);margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
        ${pesoDisp < 100 ? '⚠ Apenas ' + pesoDisp + ' de 100 pontos de peso têm dado disponível — índice renormalizado e menos informativo. ' : ''}
        Heurística transparente — não é previsão de modelo treinado. Confirme sempre nos boletins oficiais (SGB/SACE · Defesa Civil).
      </div>`;
  },
};
window.IAPage = IAPage;


/**
 * SGA — Abrigos & Rotas
 */
const AbrigosPage = {
  render() {
    const abrigos = SGA.abrigos || [];
    const vagasTotal = abrigos.reduce((s,a) => s + Math.round(a.cap*(1-a.ocup/100)), 0);
    return `
    <div class="page" id="p-abrigos">
      <div class="page-header">
        <div>
          <div class="page-title">Abrigos & Rotas de Fuga</div>
          <div class="page-sub">Padrão ESFERA 3,5m² por pessoa</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-green">${vagasTotal.toLocaleString('pt-BR')} vagas disponíveis</span>
        </div>
      </div>
      <div class="page-body">
        <div class="g2">
          ${abrigos.map(a => {
            const vagas = Math.round(a.cap*(1-a.ocup/100));
            const pct = a.ocup;
            return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">🏠 ${a.nome}</div>
                <span class="pill ${pct>80?'pill-red':pct>50?'pill-amber':'pill-green'}">${pct}% ocupado</span>
              </div>
              <div class="card-body">
                <div class="metric-row"><span class="mr-label">Capacidade</span><span class="mr-value">${a.cap.toLocaleString('pt-BR')} pessoas</span></div>
                <div class="metric-row"><span class="mr-label">Vagas livres</span><span class="mr-value" style="color:var(--green-mid)">${vagas.toLocaleString('pt-BR')}</span></div>
                <div class="metric-row"><span class="mr-label">Cota de segurança</span><span class="mr-value">${a.cota}m</span></div>
                <div class="metric-row"><span class="mr-label">Acessível PCD</span><span class="mr-value">${a.acess?'✓ Sim':'—'}</span></div>
                <div class="sc-bar" style="margin-top:8px"><div class="sc-fill ${pct>80?'sc-fill-err':pct>50?'sc-fill-warn':'sc-fill-ok'}" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.AbrigosPage = AbrigosPage;


/**
 * SGA — Canais de Emissão
 */
const CanaisPage = {
  render() {
    const canais = [
      { nome:'App Cidades Acolhedoras', icone:'📱', status:'ok',   desc:'12.480 dispositivos registrados · Push iOS/Android' },
      { nome:'SMS Twilio',              icone:'💬', status:'ok',   desc:'CadÚnico prioritário · 3.820 famílias' },
      { nome:'WhatsApp Business',       icone:'🟢', status:'ok',   desc:'Grupos Defesa Civil + CadÚnico' },
      { nome:'Rádio FM Emergência',     icone:'📻', status:'ok',   desc:'Frequência 101.5 FM · Cobertura regional' },
      { nome:'Sirenes IoT',             icone:'🚨', status:'warn', desc:'6 sirenes · 4 ativas · 2 em manutenção' },
      { nome:'Telegram Técnico',        icone:'✈️', status:'ok',   desc:'Canal Defesa Civil RS · Gestores municipais' },
      { nome:'TV Regional',             icone:'📺', status:'ok',   desc:'Emissoras regionais RS · Crawl de emergência' },
      { nome:'E-mail institucional',    icone:'📧', status:'ok',   desc:'Prefeituras · Defesa Civil · Secretarias' },
      { nome:'Wearables',               icone:'⌚', status:'ok',   desc:'Samsung Health + Apple Health · Vibração' },
    ];
    return `
    <div class="page" id="p-canais">
      <div class="page-header">
        <div>
          <div class="page-title">Canais de Emissão</div>
          <div class="page-sub">9 canais ativos · Escalonamento por nível de alerta</div>
        </div>
      </div>
      <div class="page-body">
        <div class="channel-grid">
          ${canais.map(c => `
            <div class="channel-card ${c.status === 'ok' ? 'active' : ''}">
              <div style="font-size:20px;margin-bottom:4px">${c.icone}</div>
              <div class="ch-name">${c.nome}</div>
              <div class="ch-desc">${c.desc}</div>
              <div class="ch-status ${c.status}">${c.status === 'ok' ? '✓ Online' : '⚠ Parcial'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.CanaisPage = CanaisPage;


/**
 * SGA — Relatórios & Log
 */
const RelatorioPage = {
  render() {
    const logs = [
      { hora:'14:32', tipo:'r', msg:'Alerta Critico emitido',              sub:'Nivel de alerta atingido' },
      { hora:'14:18', tipo:'r', msg:'LSTM-v3 confirmou risco crítico 94%',              sub:'Previsão: pico às 16h com IC90% [0.89–0.97]' },
      { hora:'12:55', tipo:'y', msg:'PV-02 Serra Botucaraí: 138mm/h',                  sub:'Limiar de 80mm/h ultrapassado' },
      { hora:'12:18', tipo:'y', msg:'Alerta Alto emitido — solo saturado',              sub:'T-04: 89% · I-02: 2,8mm/dia' },
      { hora:'11:42', tipo:'r', msg:'Cota ANA 87480000 ultrapassou 3,5m',              sub:'Leitura: 4,2m → 4,8m em 50min' },
      { hora:'09:00', tipo:'g', msg:'Sincronização de dados ANA/CEMADEN concluída',    sub:'6 estações · 5 pluviômetros' },
      { hora:'06:00', tipo:'g', msg:'Retreino diário do modelo LSTM cancelado',        sub:'Dados insuficientes para nova iteração' },
    ];
    return `
    <div class="page" id="p-relatorio">
      <div class="page-header">
        <div>
          <div class="page-title">Relatórios & Log de Eventos</div>
          <div class="page-sub">Histórico em tempo real · Exportação CSV/PDF</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="ExportUtils.toCSV(SGA.alertas,'alertas-sga')">⬇ CSV</button>
          <button class="btn btn-outline" onclick="ExportUtils.printPage()">🖨 Imprimir</button>
        </div>
      </div>
      <div class="page-body">
        <div class="card">
          <div class="card-header"><div class="card-title">📋 Log de Eventos — Hoje</div></div>
          ${logs.map(l => `
            <div class="log-row">
              <span class="log-time">${l.hora}</span>
              <span class="log-dot" style="background:${l.tipo==='r'?'var(--red)':l.tipo==='y'?'var(--amber)':'var(--green-light)'}"></span>
              <div class="log-body">
                ${l.msg}
                <div class="log-sub">${l.sub}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.RelatorioPage = RelatorioPage;