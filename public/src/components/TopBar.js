/**
 * SGA â€” TopBar Component
 */
const TopBar = {
  render() {
    return `
    <div class="topbar">
      <button class="btn-menu" id="btn-menu" onclick="toggleSidebar()" style="display:none"><span></span><span></span><span></span></button><div class="tb-brand">
        <span class="tb-logo">SGA Â· v3</span>
        <span class="tb-title">Sistema de GestÃ£o e Alertas â€” Vale do Rio Pardo</span>
        <span class="tb-sub">Cidades Acolhedoras Â· RS</span>
      </div>
      <div class="tb-right">
        <div class="ts-item"><span class="ts-dot g"></span>OSM / Leaflet</div>
        <div class="ts-item"><span class="ts-dot g"></span>ANA HidroWeb</div>
        <div class="ts-item"><span class="ts-dot g"></span>CPRM GeoSGB</div>
        <div class="ts-item"><span class="ts-dot g"></span>124 sensores</div>
        <div class="ts-item"><span class="ts-dot y"></span>IA LSTM-v3</div>
        <div class="ts-item"><span class="ts-dot r"></span>3 alertas</div>
        <span class="tb-clock" id="clock">--/--/---- --:--:--</span>
        <button onclick="fazerLogout()" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.8);padding:4px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-family:var(--font)">âŽ‹ Sair</button>
        <span class="tb-alert-badge">âš  3 ALERTAS</span>
      </div>
    </div>`;
  },
};
window.TopBar = TopBar;


/**
 * SGA â€” Sidebar Component
 */
const Sidebar = {
  items: [
    { section: 'Monitoramento', items: [
      { id:'painel',       icon:'â—¼', label:'Painel geral' },
      { id:'mapa',         icon:'ðŸ—º', label:'Mapa OSM / CPRM' },
      { id:'sensores',     icon:'ðŸ“¡', label:'Sensores & IoT',      badge:'11', badgeClass:'y' },
      { id:'integracoes',  icon:'ðŸ”Œ', label:'IntegraÃ§Ãµes',          badge:'16', badgeClass:'b' },
    ]},
    { section: 'Resposta', items: [
      { id:'alertas',      icon:'ðŸ””', label:'Central de alertas',  badge:'3' },
      { id:'fluxo',        icon:'âš™',  label:'Fluxo de decisÃ£o' },
      { id:'abrigos',      icon:'ðŸ ', label:'Abrigos & rotas' },
      { id:'canais',       icon:'ðŸ“£', label:'Canais de emissÃ£o' },
    ]},
    { section: 'AnÃ¡lise', items: [
      { id:'ia',           icon:'ðŸ§ ', label:'IA preditiva' },
      { id:'municipios',   icon:'ðŸ™', label:'MunicÃ­pios' },
      { id:'hidroweb',     icon:'ðŸ’§', label:'ANA HidroWeb' },
      { id:'geodados',     icon:'ðŸ—‚', label:'Geodados & Sociais' },
      { id:'relatorio',    icon:'ðŸ“„', label:'RelatÃ³rios & Log' },
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
        <div class="sb-region-sub">Rio Grande do Sul Â· Brasil</div>
        <div class="sb-count"><span>23</span> municÃ­pios monitorados</div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;

