/**
 * SGA — Centro de Controle (public/src/pages/Controle.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Panorama estadual das réguas com LIMIAR OFICIAL (SGB/SACE), ranqueadas pelo
 * % da cota de inundação. Fluxo em duas camadas, declarado na tela:
 *   1. /api/ana/panorama-limiares → cache do banco (instantâneo, pode ter
 *      horas de defasagem — o horário de cada medição é exibido);
 *   2. as N mais críticas são ATUALIZADAS AO VIVO na ANA (lotes de 4),
 *      marcadas com ● AO VIVO.
 * Auto-refresh a cada 5 min enquanto a página estiver aberta.
 */
const ControlePage = {
  _AO_VIVO: 12,          // quantas réguas do topo são refrescadas na ANA
  _timer: null,
  _dados: null,

  render() {
    return `
    <div class="page" id="p-controle">
      <div class="page-header">
        <div>
          <div class="page-title">Centro de Controle — Rios com Limiar Oficial</div>
          <div class="page-sub">% da cota de inundação (SGB/SACE) · topo atualizado ao vivo na ANA · auto-refresh 5 min</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-gray" id="ct-hora">—</span>
          <button class="btn btn-outline" onclick="ControlePage.carregar(true)">↺ Atualizar agora</button>
        </div>
      </div>
      <div class="page-body">
        <div class="metric-grid cols-4" id="ct-kpis">
          <div class="mc neutral"><div class="mc-label">Réguas com limiar</div><div class="mc-value" id="ct-k-tot">—</div></div>
          <div class="mc error"><div class="mc-label">≥ 70% da inundação</div><div class="mc-value" style="color:var(--red)" id="ct-k-crit">—</div></div>
          <div class="mc warn"><div class="mc-label">Maior %</div><div class="mc-value" style="color:var(--amber)" id="ct-k-max">—</div></div>
          <div class="mc ok"><div class="mc-label">Ao vivo agora</div><div class="mc-value" style="color:var(--green-mid)" id="ct-k-vivo">—</div></div>
        </div>
        <div class="card">
          <table class="data-table">
            <thead><tr><th>#</th><th>Estação · Rio</th><th>Município</th><th>Cota</th><th>Inundação</th><th>% do limiar</th><th>Medido</th><th>Mapa</th></tr></thead>
            <tbody id="ct-tbody">
              <tr><td colspan="8" style="padding:18px;text-align:center;color:var(--text-3)">Carregando panorama…</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-body" style="font-size:11px;color:var(--text-3);line-height:1.7;padding:10px 14px">
            <b style="color:var(--text-2)">Método:</b> apenas réguas com cota de inundação OFICIAL publicada
            (boletins SAH do SGB/SACE — bacias Caí, Taquari e Uruguai) entram no ranking; % = cota atual ÷ cota de
            inundação. As ${'12'} primeiras são consultadas AO VIVO na ANA a cada atualização (marcadas com ●);
            as demais usam o cache do banco — o horário de cada medição está na tabela. Rios sem limiar oficial
            não aparecem aqui: sem referência publicada, % seria invenção.
          </div>
        </div>
      </div>
    </div>`;
  },

  iniciar() {
    this.carregar();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      const pg = document.getElementById('p-controle');
      if (pg && pg.classList.contains('active')) this.carregar();
    }, 5 * 60 * 1000);
  },

  async carregar(manual) {
    const tbody = document.getElementById('ct-tbody');
    if (!tbody) return;
    const api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
    try {
      if (manual) tbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--text-3)">Atualizando…</td></tr>';
      const d = await (await fetch(api + '/api/ana/panorama-limiares')).json();
      let est = d.estacoes || [];

      // ── camada 2: topo AO VIVO, em lotes de 4 (mesma tática do anaSensores)
      const topo = est.slice(0, this._AO_VIVO);
      const aoVivo = {};
      for (let i = 0; i < topo.length; i += 4) {
        await Promise.all(topo.slice(i, i + 4).map(async e => {
          try {
            const s = await (await fetch(api + '/api/ana/serie/' + e.codigo + '?range=HORA_6')).json();
            const ls = s.leituras || []; const u = ls[ls.length - 1];
            const c = u ? parseFloat(u.Cota_Adotada) : NaN;
            if (Number.isFinite(c)) aoVivo[e.codigo] = { cota_cm: c, medido_em: u.Data_Hora_Medicao };
          } catch (_) {}
        }));
      }
      est = est.map(e => aoVivo[e.codigo]
        ? { ...e, ...aoVivo[e.codigo], vivo: true,
            pct_inundacao: Math.round(aoVivo[e.codigo].cota_cm / e.inundacao_cm * 1000) / 10 }
        : e);
      est.sort((a, b) => (b.pct_inundacao ?? -1) - (a.pct_inundacao ?? -1));
      this._dados = est;

      // KPIs
      const crit = est.filter(e => (e.pct_inundacao ?? 0) >= 70).length;
      const kmax = est.find(e => e.pct_inundacao != null);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('ct-k-tot', est.length);
      set('ct-k-crit', crit);
      set('ct-k-max', kmax ? kmax.pct_inundacao + '%' : '—');
      set('ct-k-vivo', Object.keys(aoVivo).length + '/' + topo.length);
      set('ct-hora', 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

      const fmtQuando = (dh) => {
        if (!dh) return '—';
        const s = String(dh).replace('T', ' ');
        return s.slice(8, 10) + '/' + s.slice(5, 7) + ' ' + s.slice(11, 16);
      };
      tbody.innerHTML = est.map((e, i) => {
        const p = e.pct_inundacao;
        const cor = p == null ? 'var(--text-3)' : p >= 100 ? 'var(--red)' : p >= 70 ? '#E8842C' : p >= 50 ? 'var(--amber)' : 'var(--green-mid)';
        const pisc = p != null && p >= 70 ? 'animation:st-blink-off 1.2s ease-in-out infinite;' : '';
        return `
        <tr>
          <td style="color:var(--text-3)">${i + 1}</td>
          <td><b>${e.nome}</b><div style="font-size:10px;color:var(--blue)">${e.rio || '—'}</div></td>
          <td style="font-size:11px">${e.municipio || '—'}</td>
          <td class="mono">${e.cota_cm != null ? (e.cota_cm / 100).toFixed(2) + ' m' : '—'}${e.vivo ? ' <span style="color:#39FF14;font-size:9px">● AO VIVO</span>' : ''}</td>
          <td class="mono" style="color:var(--text-3)">${(e.inundacao_cm / 100).toFixed(2)} m</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <b class="mono" style="color:${cor};${pisc}min-width:52px">${p != null ? p + '%' : '—'}</b>
              <div style="flex:1;min-width:70px;height:6px;background:var(--bg-2);border-radius:3px;overflow:hidden">
                <div style="height:6px;width:${Math.min(p || 0, 100)}%;background:${cor};border-radius:3px"></div>
              </div>
            </div>
          </td>
          <td class="mono" style="font-size:10px;color:var(--text-3)">${fmtQuando(e.medido_em)}</td>
          <td><button class="btn btn-outline" style="font-size:10px;padding:2px 8px"
            onclick="ControlePage.verNoMapa(${e.lat},${e.lng},'${(e.nome || '').replace(/'/g, '')}')">🗺</button></td>
        </tr>`;
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--amber)">Falha ao carregar panorama: ' + e.message + '</td></tr>';
    }
  },

  verNoMapa(lat, lng, nome) {
    if (window.Router) Router.go('mapa');
    setTimeout(() => {
      const mapa = (window.SGA_MAPAS || []).find(m => m._container && m._container.id === 'leaflet-map');
      if (mapa && lat != null) {
        mapa.setView([lat, lng], 12);
        L.popup().setLatLng([lat, lng]).setContent('<b>' + nome + '</b>').openOn(mapa);
      }
    }, 400);
  },
};
window.ControlePage = ControlePage;
