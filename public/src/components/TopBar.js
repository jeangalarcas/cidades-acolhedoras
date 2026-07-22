/**
 * SGA v3 — TopBar + Sidebar
 * Mostra o municipio/bacia ativo dinamicamente
 */
const TopBar = {
  render() {
    return `
    <div class="topbar" style="display:flex;align-items:center;justify-content:space-between;padding:0 12px;height:52px;background:#1B3A2D;color:#fff;position:relative;z-index:200;flex-shrink:0;gap:8px">

      <button id="btn-menu" onclick="toggleSidebar()"
        style="display:none;flex-direction:column;justify-content:center;gap:5px;
               background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
               border-radius:6px;cursor:pointer;padding:7px 9px;flex-shrink:0;min-width:38px">
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
      </button>

      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;overflow:hidden">
        <img src="/app/icon-192.png" alt="Cidades Acolhedoras" style="width:34px;height:34px;border-radius:8px;flex-shrink:0">
        <span style="background:#4BAF82;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0">SGA V3</span>
        <span id="tb-title-text" style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          Sistema de Gestao e Alertas
        </span>
        <span class="tb-sub" style="font-size:10px;color:rgba(255,255,255,.45);white-space:nowrap">
          Cidades Acolhedoras · RS
        </span>
      </div>

      <div class="tb-status" style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="ts-item" style="display:flex;align-items:center;gap:4px;font-size:10px"><span style="width:6px;height:6px;border-radius:50%;background:#4BAF82;display:inline-block"></span>OSM</div>
        <div class="ts-item" style="display:flex;align-items:center;gap:4px;font-size:10px"><span style="width:6px;height:6px;border-radius:50%;background:#4BAF82;display:inline-block"></span>ANA</div>
        <div class="ts-item" style="display:flex;align-items:center;gap:4px;font-size:10px"><span style="width:6px;height:6px;border-radius:50%;background:#4BAF82;display:inline-block"></span>CPRM</div>
        <div class="ts-item" style="display:flex;align-items:center;gap:4px;font-size:10px"><span style="width:6px;height:6px;border-radius:50%;background:#E8A23A;display:inline-block"></span>IA</div>
        <span id="clock" class="tb-clock" style="font-size:10px;color:rgba(255,255,255,.5);font-family:monospace;white-space:nowrap">--/--/---- --:--</span>
        <button onclick="fazerLogout()"
          style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
                 color:rgba(255,255,255,.8);padding:4px 10px;border-radius:5px;
                 font-size:10px;cursor:pointer;white-space:nowrap;flex-shrink:0">
          Sair
        </button>
        <span id="tb-alertas" style="background:#B83A2E;color:#fff;font-size:10px;font-weight:700;
             padding:3px 8px;border-radius:12px;white-space:nowrap;flex-shrink:0;display:none">
  0 ALERTAS
</span>
      </div>
    </div>`;
  },
 atualizarAlertas() {
    const el = document.getElementById('tb-alertas');
    if (!el) return;
    const n = Array.isArray(SGA.alertasAtivos) ? SGA.alertasAtivos.length : 0;
    el.textContent = n + (n === 1 ? ' ALERTA' : ' ALERTAS');
    el.style.display = n > 0 ? 'inline-block' : 'none';
    // Central de Alertas lê a MESMA fonte — mantém os contadores em sincronia
    if (window.AlertasPage && AlertasPage.atualizar) AlertasPage.atualizar();
  },
};
window.TopBar = TopBar;

const Sidebar = {
  items: [
    { section: 'MONITORAMENTO', items: [
      { id:'painel',      icon:'P',  label:'Painel Geral' },
      { id:'controle',    icon:'CC', label:'Centro de Controle', badge:'SGB', badgeClass:'r' },
      { id:'mapa',        icon:'M',  label:'Mapa OSM / CPRM' },
      { id:'sensores',    icon:'S',  label:'Sensores e IoT'},
      { id:'integracoes', icon:'I',  label:'Integracoes' },
    ]},
    { section: 'RESPOSTA', items: [
      { id:'alertas',  icon:'A',  label:'Central de Alertas' },
      { id:'relatos',  icon:'RC', label:'Relatos do Cidadao', badge:'APP', badgeClass:'r' },
      { id:'fluxo',    icon:'F',  label:'Fluxo de Decisao' },
      { id:'abrigos',  icon:'Ab', label:'Abrigos e Rotas' },
      { id:'canais',   icon:'C',  label:'Canais de Emissao' },
    ]},
    { section: 'ANALISE', items: [
      { id:'ia',         icon:'IA', label:'IA Preditiva' },
      { id:'municipios', icon:'Mu', label:'Municipios RS', badge:'497', badgeClass:'b' },
      { id:'analise',    icon:'Ge', label:'Analise Espacial', badge:'IBGE', badgeClass:'b' },
      { id:'hidroweb',   icon:'H',  label:'ANA HidroWeb' },
      { id:'geodados',   icon:'G',  label:'Geodados e Sociais' },
      { id:'municipio',  icon:'MU', label:'Municipio Ativo', badge:'LIVE', badgeClass:'r' },
      { id:'relatorio',  icon:'R',  label:'Relatorios e Log' },
    ]},
  ],

  render() {
    var sections = this.items.map(function(s) {
      return `<div class="sb-section">
        <div class="sb-section-label">${s.section}</div>
        ${s.items.map(function(i) {
          return `<div class="nav-item" onclick="go('${i.id}')" id="nav-${i.id}">
            <span style="font-size:9px;font-weight:700;opacity:.6;min-width:20px">${i.icon}</span>
            ${i.label}
            ${i.badge ? `<span class="nav-badge ${i.badgeClass||''}">${i.badge}</span>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }).join('<div class="sb-divider"></div>');

    return `<aside class="sidebar">
      ${sections}
      <div class="sb-divider"></div>
      <div class="sb-footer">
        <div class="sb-region-name" id="sb-municipio-nome">Nenhum selecionado</div>
        <div class="sb-region-sub">Selecione um municipio</div>
        <div class="sb-count"><span id="sb-muni-count">0</span> municipio ativo</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-direction:column">
          <a href="selecionar.html"
            style="display:block;text-align:center;font-size:10px;font-weight:700;
                   color:#fff;background:rgba(75,175,130,.3);border-radius:6px;
                   padding:6px 0;text-decoration:none">
            Trocar municipio / bacia
          </a>
          <a href="escalador.html"
            style="display:block;text-align:center;font-size:10px;font-weight:600;
                   color:rgba(255,255,255,.6);padding:4px 0;text-decoration:none">
            Ver todos os 497 municipios
          </a>
        </div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;
