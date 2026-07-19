/**
 * SGA — Modo Bacia (public/src/services/baciaMode.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ativado por index.html?bacia=G040 (códigos oficiais SEMA — Decreto 53.885/2018).
 * O que faz:
 *   1. Busca o detalhe da bacia (municípios membros + estações dentro do
 *      polígono) e o polígono oficial;
 *   2. Desenha o polígono e enquadra a bacia em QUALQUER mapa Leaflet que a
 *      aplicação criar (via L.Map.addInitHook — sem acoplamento por página);
 *   3. Atualiza a topbar e injeta um banner com os agregados da bacia;
 *   4. Expõe SGA.config.baciaAtiva (com Set de IBGEs e de estações) para as
 *      páginas filtrarem quando quiserem.
 */
const BaciaMode = {
  _API: 'https://sga-api-1705.onrender.com',
  _dados: null,
  _feature: null,

  async iniciar(codigo) {
    try {
      const cod = String(codigo || '').toUpperCase();
      const [det, feat] = await Promise.all([
        fetch(this._API + '/api/bacias/' + cod).then(r => r.json()),
        fetch(this._API + '/api/bacias/' + cod + '/geojson').then(r => r.json()),
      ]);
      if (det.erro) { console.warn('[BaciaMode]', det.erro); return; }
      this._dados = det;
      this._feature = feat;

      window.SGA = window.SGA || {}; SGA.config = SGA.config || {};
      SGA.config.baciaAtiva = {
        codigo: det.codigo, nome: det.nome_curto, regiao: det.regiao,
        ibges: new Set(det.municipios.map(m => m.cod_ibge)),
        estacoes: new Set(det.estacoes.map(e => e.codigo)),
      };

      // Topbar
      const t = document.getElementById('tb-titulo') || document.querySelector('.tb-title');
      if (t) t.textContent = 'SGA — Bacia ' + det.nome_curto;
      const st = document.querySelector('.tb-sub') || document.getElementById('tb-sub');
      if (st) st.textContent = det.regiao + ' · ' + det.total_municipios + ' municípios · '
                             + det.estacoes_ativas + ' estações ativas';

      this._banner(det);
      // mapas já criados + futuros (initHook cuida dos futuros)
      (window.SGA_MAPAS || []).forEach(m => this._aplicarNoMapa(m));
      console.log('[BaciaMode] ativa:', det.codigo, det.nome_curto,
                  '·', det.total_municipios, 'municípios ·', det.total_estacoes, 'estações');
    } catch (e) { console.warn('[BaciaMode] falha:', e.message); }
  },

  _aplicarNoMapa(mapa) {
    if (!this._feature || !mapa || mapa.__baciaAplicada) return;
    try {
      const CORES = { 'Guaíba': '#2A5A8C', 'Uruguai': '#7A5C2D', 'Litoral': '#1B6B8C' };
      const ly = L.geoJSON(this._feature, {
        style: { color: CORES[this._dados.regiao] || '#2D7A5C',
                 weight: 3, fillOpacity: 0.06, dashArray: '6 4' },
        interactive: false,
      }).addTo(mapa);
      mapa.fitBounds(ly.getBounds(), { padding: [20, 20] });
      mapa.__baciaAplicada = true;
    } catch (e) { /* mapa pode não estar pronto; initHook tentará no próximo */ }
  },

  _banner(d) {
    if (document.getElementById('bacia-banner')) return;
    const alvo = document.querySelector('.page.active .page-body')
              || document.querySelector('.content') || document.body;
    const div = document.createElement('div');
    div.id = 'bacia-banner';
    div.style.cssText = 'margin:0 0 12px;padding:10px 14px;border:1px solid var(--border,#2a3f36);' +
      'border-left:4px solid #2A5A8C;border-radius:8px;background:var(--card,#12201a);' +
      'font-size:12px;color:var(--text-2,#b8c8c0);display:flex;gap:18px;flex-wrap:wrap;align-items:center';
    const reguas = d.estacoes.filter(e => e.cota_inundacao_cm != null).length;
    div.innerHTML =
      '<b style="color:var(--text-1,#e8f0ec);font-size:13px">🌊 Bacia ' + d.nome_curto + '</b>' +
      '<span>Região ' + d.regiao + '</span>' +
      '<span><b>' + d.total_municipios + '</b> municípios</span>' +
      '<span><b>' + (d.populacao_total || 0).toLocaleString('pt-BR') + '</b> hab. (sede na bacia)</span>' +
      '<span><b>' + d.estacoes_ativas + '</b>/' + d.total_estacoes + ' estações ativas</span>' +
      '<span><b>' + reguas + '</b> réguas com limiar oficial SGB</span>' +
      '<span style="opacity:.65">Fonte: ' + (d.fonte || 'SEMA/DRHS') + '</span>';
    alvo.prepend(div);
  },
};
window.BaciaMode = BaciaMode;

/* Registro universal de mapas Leaflet: qualquer mapa criado pela aplicação
   entra em SGA_MAPAS e, se houver bacia ativa, recebe polígono + enquadramento */
if (window.L && L.Map && L.Map.addInitHook) {
  L.Map.addInitHook(function () {
    (window.SGA_MAPAS = window.SGA_MAPAS || []).push(this);
    const self = this;
    setTimeout(function () {
      if (window.BaciaMode && BaciaMode._feature) BaciaMode._aplicarNoMapa(self);
    }, 400);
  });
}
