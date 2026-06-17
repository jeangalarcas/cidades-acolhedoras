/**
 * SGA v3 — Aplicação Principal
 * Vale do Rio Pardo → 497 Municípios do RS · Cidades Acolhedoras
 */

const App = {

  async init() {
    // 1. Detecta e ativa o município (URL, sessionStorage ou padrão)
    if (window.MunicipioInit && window.MunicipioService) {
      await MunicipioInit.init('canoas');
    }

    // 2. Renderiza a UI
    this.renderShell();

    // 3. Inicializa funcionalidades
    this.startClock();
    this.initMiniMap();
    this.initSparklines();
    this.startDataRefresh();

    // 4. Carrega tabela de municípios em background
    setTimeout(() => MunicipiosPage.iniciar(), 1000);

    // 5. Navega para o painel
    Router.go('painel');

    // 6. Atualiza label do município na sidebar
    if (SGA.config.municipioAtivo) {
      const el = document.getElementById('sb-municipio-nome');
      if (el) el.textContent = SGA.config.municipioAtivo.nome;
    }

    console.log('[SGA v3] Sistema inicializado · 497 municípios disponíveis');
  },

  renderShell() {
    document.getElementById('app').innerHTML = `
      ${TopBar.render()}
      <div class="app-wrap">
        ${Sidebar.render()}
        <div class="content" id="content">
          ${PainelPage.render()}
          ${MapaPage.render()}
          ${AlertasPage.render()}
          ${FluxoPage.render()}
          ${SensoresPage.render()}
          ${IntegracoesPage.render()}
          ${HidroWebPage.render()}
          ${GeodadosPage.render()}
          ${IAPage.render()}
          ${MunicipiosPage.render()}
          ${AbrigosPage.render()}
          ${CanaisPage.render()}
          ${RelatorioPage.render()}
        </div>
      </div>
    `;
  },

  startClock() {
    const pad = v => ('0'+v).slice(-2);
    const update = () => {
      const n = new Date();
      const el = document.getElementById('clock');
      if (el) el.textContent =
        `${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()} ` +
        `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    };
    update();
    setInterval(update, 1000);
  },

  initMiniMap()    { setTimeout(() => MapUtils.initMiniMap(), 400); },
  initSparklines() { setTimeout(() => SparklineUtils.renderAll(), 500); },

  startDataRefresh() {
    setInterval(() => {
      console.log('[SGA] Ciclo de atualização de dados...');
    }, SGA.config.dataRefreshMs);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

function fazerLogout(){localStorage.removeItem('sga_session');window.location.href='login.html';}window.fazerLogout=fazerLogout;

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var wrap = document.querySelector('.app-wrap');
  var overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleSidebar;
    wrap.appendChild(overlay);
  }
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  document.body.classList.toggle('sidebar-open');
}

function checkMobile() {
  var btn = document.getElementById('btn-menu');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
}
window.addEventListener('resize', checkMobile);
document.addEventListener('DOMContentLoaded', function(){ setTimeout(checkMobile, 600); });
window.toggleSidebar = toggleSidebar;
