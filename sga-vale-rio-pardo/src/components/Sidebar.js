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
      { id:'municipios',   icon:'🏙', label:'Municípios RS',       badge:'497', badgeClass:'b' },
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
      <div class="sb-divider"></div>
      <div class="sb-footer">
        <div class="sb-region-name" id="sb-municipio-nome">Vale do Rio Pardo</div>
        <div class="sb-region-sub">Rio Grande do Sul · Brasil</div>
        <div class="sb-count"><span id="sb-muni-count">23</span> municípios monitorados</div>
        <div style="margin-top:8px">
          <a href="escalador.html" style="
            display:block;text-align:center;font-size:10px;font-weight:700;
            color:#fff;background:rgba(75,175,130,.3);border-radius:6px;
            padding:5px 0;text-decoration:none;
          ">🗺 Trocar município →</a>
        </div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;
