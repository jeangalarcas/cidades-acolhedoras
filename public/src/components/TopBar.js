/**
 * SGA — TopBar + Sidebar
 * Versão com suporte mobile completo
 */
const TopBar = {
  render() {
    return `
    <div class="topbar" style="display:flex;align-items:center;justify-content:space-between;padding:0 12px;height:52px;background:#1B3A2D;color:#fff;position:fixed;top:0;left:0;right:0;z-index:1000;gap:8px">

      <!-- BOTAO HAMBURGUER — visivel apenas no mobile -->
      <button id="btn-menu" onclick="toggleSidebar()"
        style="display:none;flex-direction:column;justify-content:center;gap:5px;
               background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
               border-radius:6px;cursor:pointer;padding:7px 9px;flex-shrink:0;min-width:38px">
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
        <span style="display:block;width:18px;height:2px;background:#fff;border-radius:2px"></span>
      </button>

      <!-- LOGO + TITULO -->
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;overflow:hidden">
        <span style="background:#4BAF82;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0">SGA V3</span>
        <span id="tb-title-text" style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          Sistema de Gestao e Alertas
        </span>
        <span class="tb-sub" style="font-size:10px;color:rgba(255,255,255,.45);white-space:nowrap">
          Vale do Rio Pardo
        </span>
      </div>

      <!-- STATUS ITEMS — ocultos no mobile -->
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
        <span style="background:#B83A2E;color:#fff;font-size:10px;font-weight:700;
                     padding:3px 8px;border-radius:12px;white-space:nowrap;flex-shrink:0">
          3 ALERTAS
        </span>
      </div>

    </div>`;
  },
};
window.TopBar = TopBar;

/**
 * SGA — Sidebar
 */
const Sidebar = {
  items: [
    { section: 'MONITORAMENTO', items: [
      { id:'painel',      icon:'P',  label:'Painel geral' },
      { id:'mapa',        icon:'M',  label:'Mapa OSM / CPRM' },
      { id:'sensores',    icon:'S',  label:'Sensores e IoT',    badge:'11', badgeClass:'y' },
      { id:'integracoes', icon:'I',  label:'Integracoes',        badge:'16', badgeClass:'b' },
    ]},
    { section: 'RESPOSTA', items: [
      { id:'alertas',  icon:'A',  label:'Central de alertas', badge:'3' },
      { id:'fluxo',    icon:'F',  label:'Fluxo de decisao' },
      { id:'abrigos',  icon:'Ab', label:'Abrigos e rotas' },
      { id:'canais',   icon:'C',  label:'Canais de emissao' },
    ]},
    { section: 'ANALISE', items: [
      { id:'ia',         icon:'IA', label:'IA preditiva' },
      { id:'municipios', icon:'Mu', label:'Municipios RS', badge:'497', badgeClass:'b' },
      { id:'hidroweb',   icon:'H',  label:'ANA HidroWeb' },
      { id:'geodados',   icon:'G',  label:'Geodados e Sociais' },
      { id:'relatorio',  icon:'R',  label:'Relatorios e Log' },
    ]},
  ],

  render() {
    const sections = this.items.map(s => `
      <div class="sb-section">
        <div class="sb-section-label">${s.section}</div>
        ${s.items.map(i => `
          <div class="nav-item" onclick="go('${i.id}')" id="nav-${i.id}">
            <span style="font-size:9px;font-weight:700;opacity:.6;min-width:20px">${i.icon}</span>
            ${i.label}
            ${i.badge ? `<span class="nav-badge ${i.badgeClass||''}">${i.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('<div class="sb-divider"></div>');

    return `
    <aside class="sidebar">
      ${sections}
      <div class="sb-divider"></div>
      <div class="sb-footer">
        <div class="sb-region-name" id="sb-municipio-nome">Vale do Rio Pardo</div>
        <div class="sb-region-sub">Rio Grande do Sul - Brasil</div>
        <div class="sb-count"><span id="sb-muni-count">23</span> municipios monitorados</div>
        <div style="margin-top:8px">
          <a href="escalador.html"
            style="display:block;text-align:center;font-size:10px;font-weight:700;
                   color:#fff;background:rgba(75,175,130,.3);border-radius:6px;
                   padding:6px 0;text-decoration:none">
            Trocar municipio
          </a>
        </div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;
