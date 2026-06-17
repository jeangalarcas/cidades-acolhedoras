/**
 * SGA — TopBar Component
 */
const TopBar = {
  render() {
    return `
    <div class="topbar">
      <div style="display:flex;align-items:center">
        <button class="btn-menu" id="btn-menu" onclick="toggleSidebar()" style="display:none;flex-direction:column;gap:4px;background:none;border:none;cursor:pointer;padding:8px;margin-right:6px">
          <span style="display:block;width:20px;height:2px;background:#fff;border-radius:2px"></span>
          <span style="display:block;width:20px;height:2px;background:#fff;border-radius:2px"></span>
          <span style="display:block;width:20px;height:2px;background:#fff;border-radius:2px"></span>
        </button>
        <div class="tb-brand">
          <span class="tb-logo">SGA v3</span>
          <span class="tb-title">Sistema de Gestao e Alertas - Vale do Rio Pardo</span>
          <span class="tb-sub">Cidades Acolhedoras RS</span>
        </div>
      </div>
      <div class="tb-right">
        <div class="ts-item"><span class="ts-dot g"></span>OSM / Leaflet</div>
        <div class="ts-item"><span class="ts-dot g"></span>ANA HidroWeb</div>
        <div class="ts-item"><span class="ts-dot g"></span>CPRM GeoSGB</div>
        <div class="ts-item"><span class="ts-dot g"></span>124 sensores</div>
        <div class="ts-item"><span class="ts-dot y"></span>IA LSTM-v3</div>
        <div class="ts-item"><span class="ts-dot r"></span>3 alertas</div>
        <span class="tb-clock" id="clock">--/--/---- --:--:--</span>
        <button onclick="fazerLogout()" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.8);padding:4px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-family:var(--font)">Sair</button>
        <span class="tb-alert-badge">3 ALERTAS</span>
      </div>
    </div>`;
  },
};
window.TopBar = TopBar;