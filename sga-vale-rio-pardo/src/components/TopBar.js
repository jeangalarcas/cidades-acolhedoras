/**
 * SGA — TopBar Component
 */
const TopBar = {
  render() {
    return `
    <div class="topbar">
      <div class="tb-brand">
        <span class="tb-logo">SGA · v3</span>
        <span class="tb-title">Sistema de Gestão e Alertas — Vale do Rio Pardo</span>
        <span class="tb-sub">Cidades Acolhedoras · RS</span>
      </div>
      <div class="tb-right">
        <div class="ts-item"><span class="ts-dot g"></span>OSM / Leaflet</div>
        <div class="ts-item"><span class="ts-dot g"></span>ANA HidroWeb</div>
        <div class="ts-item"><span class="ts-dot g"></span>CPRM GeoSGB</div>
        <div class="ts-item"><span class="ts-dot g"></span>124 sensores</div>
        <div class="ts-item"><span class="ts-dot y"></span>IA LSTM-v3</div>
        <div class="ts-item"><span class="ts-dot r"></span>3 alertas</div>
        <span class="tb-clock" id="clock">--/--/---- --:--:--</span>
        <span class="tb-alert-badge">⚠ 3 ALERTAS</span>
      </div>
    </div>`;
  },
};
window.TopBar = TopBar;


/**
 * SGA — Sidebar Component
 */
const Sidebar = {
  items: [
    { section: 'Monitoramento', items: [
      { id:'painel',       icon:'◼', label:'Painel geral' },
      { id:'mapa',         icon:'🗺', label:'Mapa OSM / CPRM' },
      { id:'sensores',     icon:'📡', label:'Sensores & IoT',      badge:'11', badgeClass:'y' },
      { id:'integracoes',  icon:'🔌', label:'Integrações',          badge:'16', badgeClass:'b' },
    ]},
    { section: 'Resposta', items: [
      { id:'alertas',      icon:'🔔', label:'Central de alertas',  badge:'3' },
      { id:'fluxo',        icon:'⚙',  label:'Fluxo de decisão' },
      { id:'abrigos',      icon:'🏠', label:'Abrigos & rotas' },
      { id:'canais',       icon:'📣', label:'Canais de emissão' },
    ]},
    { section: 'Análise', items: [
      { id:'ia',           icon:'🧠', label:'IA preditiva' },
      { id:'municipios',   icon:'🏙', label:'Municípios' },
      { id:'hidroweb',     icon:'💧', label:'ANA HidroWeb' },
      { id:'geodados',     icon:'🗂', label:'Geodados & Sociais' },
      { id:'relatorio',    icon:'📄', label:'Relatórios & Log' },
    ]},
  ],

  render() {
    const sections = this.items.map(s => `
      <div class="sb-section">
        <div class="sb-section-label">${s.section}</div>
        ${s.items.map(i => `
          <div class="nav-item" onclick="go('${i.id}')" id="nav-${i.id}">
            <span class="nav-icon">${i.icon}</span>
            ${i.label}
            ${i.badge ? `<span class="nav-badge ${i.badgeClass||''}">${i.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('<div class="sb-divider"></div>');

    return `
    <aside class="sidebar">
      ${sections}
      <div class="sb-footer">
        <div class="sb-region-name">Vale do Rio Pardo</div>
        <div class="sb-region-sub">Rio Grande do Sul · Brasil</div>
        <div class="sb-count"><span>23</span> municípios monitorados</div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;
