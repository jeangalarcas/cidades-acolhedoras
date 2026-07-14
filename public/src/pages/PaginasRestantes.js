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
    return `
    <div class="page" id="p-sensores">
      <div class="page-header">
        <div>
          <div class="page-title">Sensores & IoT</div>
          <div class="page-sub">LoRaWAN + 4G · Atualização a cada 5 min</div>
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
                  <div><span class="sc-value" style="color:${s.col}">${s.cota}</span><span class="sc-unit">m</span></div>
                  <div class="sc-sub">Normal: ${s.normal}m · Taxa: ${s.taxa}</div>
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
                <div class="sc-sub">Acum. 6h: ${s.acum6h}mm</div>
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
    return `
    <div class="page" id="p-hidroweb">
      <div class="page-header">
        <div>
          <div class="page-title">ANA HidroWeb</div>
          <div class="page-sub">6 estações fluviométricas · Municipio Ativo</div>
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
                    <div style="font-size:10px;color:var(--text-3)">VARIAÇÃO</div>
                    <div style="font-size:20px;font-weight:700;font-family:var(--mono);color:${(e.variacao||'').startsWith('+')?'var(--red)':'var(--green-mid)'}">${e.variacao}</div>
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
 * SGA — IA Preditiva
 */
const IAPage = {
  render() {
    const municipios = SGA.municipios || [];
    return `
    <div class="page" id="p-ia">
      <div class="page-header">
        <div>
          <div class="page-title">IA Preditiva — LSTM-v3</div>
          <div class="page-sub">Previsão 24–48h · F1=0.891 · Acurácia 84%</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ai">LSTM-v3 Online</span>
        </div>
      </div>
      <div class="page-body">
        <div class="g2">
          <div class="card">
            <div class="card-header"><div class="card-title">📊 Previsão por Município — 24h</div></div>
            <div class="card-body">
              ${municipios.slice(0,8).map(m => `
                <div class="ia-pred ${m.score>=0.85?'high':m.score>=0.65?'medium':m.score>=0.40?'low':'safe'}">
                  <div class="ia-pct ${m.score>=0.85?'high':m.score>=0.65?'medium':m.score>=0.40?'low':'safe'}">${Math.round((m.score||0)*100)}%</div>
                  <div><div class="ia-name">${m.name}</div><div class="ia-detail">${m.nota}</div></div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">🧠 Métricas do Modelo</div></div>
            <div class="card-body">
              ${[
                ['Arquitetura','LSTM 3 camadas + Ensemble'],
                ['Acurácia 48h','84%'],
                ['F1-score','0.891'],
                ['Dados de treino','14 anos · 1,8M registros'],
                ['Fontes de treino','ANA + CEMADEN + INMET'],
                ['Retreino','Mensal automático'],
                ['Janela de previsão','24–48 horas'],
                ['IC saída','90% (isotonic calibration)'],
              ].map(([l,v]) => `
                <div class="metric-row"><span class="mr-label">${l}</span><span class="mr-value">${v}</span></div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
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