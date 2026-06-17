/**
 * SGA — Sidebar Component
 */
const Sidebar = {
  items: [
    { section: 'MONITORAMENTO', items: [
      { id:'painel',      icon:'[P]', label:'Painel geral' },
      { id:'mapa',        icon:'[M]', label:'Mapa OSM / CPRM' },
      { id:'sensores',    icon:'[S]', label:'Sensores e IoT',     badge:'11', badgeClass:'y' },
      { id:'integracoes', icon:'[I]', label:'Integracoes',         badge:'16', badgeClass:'b' },
    ]},
    { section: 'RESPOSTA', items: [
      { id:'alertas',  icon:'[A]', label:'Central de alertas', badge:'3' },
      { id:'fluxo',    icon:'[F]', label:'Fluxo de decisao' },
      { id:'abrigos',  icon:'[Ab]', label:'Abrigos e rotas' },
      { id:'canais',   icon:'[C]', label:'Canais de emissao' },
    ]},
    { section: 'ANALISE', items: [
      { id:'ia',         icon:'[IA]', label:'IA preditiva' },
      { id:'municipios', icon:'[Mu]', label:'Municipios RS', badge:'497', badgeClass:'b' },
      { id:'hidroweb',   icon:'[H]',  label:'ANA HidroWeb' },
      { id:'geodados',   icon:'[G]',  label:'Geodados e Sociais' },
      { id:'relatorio',  icon:'[R]',  label:'Relatorios e Log' },
    ]},
  ],

  render() {
    const sections = this.items.map(s => `
      <div class="sb-section">
        <div class="sb-section-label">${s.section}</div>
        ${s.items.map(i => `
          <div class="nav-item" onclick="go('${i.id}')" id="nav-${i.id}">
            <span class="nav-icon" style="font-style:normal;font-size:10px">${i.icon}</span>
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
          <a href="escalador.html" style="display:block;text-align:center;font-size:10px;font-weight:700;color:#fff;background:rgba(75,175,130,.3);border-radius:6px;padding:5px 0;text-decoration:none">
            Trocar municipio
          </a>
        </div>
      </div>
    </aside>`;
  },
};
window.Sidebar = Sidebar;