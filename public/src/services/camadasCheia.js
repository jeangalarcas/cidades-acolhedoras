/**
 * SGA — Camadas de Cheia (escoamento animado · manchas oficiais · simulação HAND)
 *
 * Fontes (verificadas, carregadas no Supabase do SGA):
 *  - hidrografia_trechos: BHO 2017 50K (ANA/SNIRH), geometrias orientadas montante→jusante
 *  - manchas_inundacao:   SGB/CPRM (Caí doc/24364, Alegrete doc/23398, Uruguaiana doc/24616)
 *                         e IPH-UFRGS (Lajeado, lume 10183/294851 — versão preliminar)
 *  - manchas_simuladas:   SIMULAÇÃO HAND (ANADEM 30m + BHO) — não considera diques/bombas
 *  - manchas_impacto:     imóveis CNEFE (IBGE Censo 2022) pré-computados por mancha
 *
 * Integração: incluir <script src="/src/services/camadasCheia.js"></script> no index.html
 * e os 3 botões na toolbar do Mapa (ver Mapa.js). Sem dependências além do Leaflet.
 */
const CamadasCheia = {

  _SUPA: 'https://rprlpowscrnkomzapivy.supabase.co',
  _KEY:  'sb_publishable_UAh6fL5eG727al0m0E1Jzw_2AOqeA68',

  _ESTACOES: [
    { cod:'87270000', nome:'Montenegro — Passo Montenegro',      lat:-29.6884, lon:-51.4610, min:250,  max:1000, passo:50 },
    { cod:'87170000', nome:'S. Seb. do Caí — Barca do Caí',      lat:-29.5869, lon:-51.3757, min:750,  max:1600, passo:50 },
    { cod:'86879300', nome:'Lajeado — régua Estrela',            lat:-29.4669, lon:-51.9644, min:1900, max:3600, passo:50 },
    { cod:'76750000', nome:'Alegrete — rio Ibirapuitã',          lat:-29.7831, lon:-55.7919, min:950,  max:1450, passo:50 },
    { cod:'77150000', nome:'Uruguaiana — rio Uruguai (eventos)', lat:-29.7546, lon:-57.0883, min:833,  max:1252, passo:50 },
  ],
  _ESP: { 1:'Domicílios particulares', 2:'Domicílios coletivos', 3:'Estab. agropecuários',
          4:'Ensino', 5:'Saúde', 6:'Outros estabelecimentos', 7:'Em construção', 8:'Religiosos' },

  _fluxoLayers: null, _fluxoNivel2: false,
  _manchaLayer: null, _manchaPainel: null,
  _handLayer: null,   _handPainel: null,
  _cssOk: false, _limiares: {},

  /* ============================= util ============================= */

  _map() { return SGA.maps && SGA.maps.main; },

  _css() {
    if (this._cssOk) return;
    const st = document.createElement('style');
    st.textContent = `
      .cc-fluxo { stroke-dasharray:7 11; stroke-linecap:round; fill:none; animation:ccfluxo linear infinite; }
      @keyframes ccfluxo { to { stroke-dashoffset:-18; } }
      .cc-s1{animation-duration:2.6s}.cc-s2{animation-duration:2.1s}.cc-s3{animation-duration:1.6s}
      .cc-s4{animation-duration:1.2s}.cc-s5{animation-duration:.9s}.cc-s6{animation-duration:.7s}.cc-s7{animation-duration:.55s}
      .cc-painel { position:absolute; z-index:1001; background:var(--bg-1,#fff); color:var(--text-1,#222);
        border:1px solid var(--border,#ccc); border-radius:8px; padding:10px 12px; width:270px;
        font-size:12px; box-shadow:0 2px 10px rgba(0,0,0,.3); }
      .cc-painel select, .cc-painel input[type=range] { width:100%; margin:4px 0; }
      .cc-cota { font-size:17px; font-weight:700; text-align:center; }
      .cc-sit { text-align:center; font-weight:700; border-radius:4px; color:#fff; padding:1px 6px; margin:3px 0; }
      .cc-aviso { background:#f3e5f5; border:1px solid #ab47bc; color:#4a148c; padding:5px 7px;
        border-radius:5px; font-size:10px; line-height:1.35; margin-top:6px; }
      .cc-fonte { color:var(--text-2,#666); font-size:10px; margin-top:6px; line-height:1.3; }
      .cc-x { position:absolute; top:4px; right:8px; cursor:pointer; font-weight:700; }`;
    document.head.appendChild(st);
    this._cssOk = true;
  },

  async _rpc(fn, body) {
    const r = await fetch(this._SUPA + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: this._KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(fn + ' HTTP ' + r.status);
    return r.json();
  },

  async _rest(path) {
    const r = await fetch(this._SUPA + '/rest/v1/' + path, { headers: { apikey: this._KEY } });
    if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
    return r.json();
  },

  _btn(id, cls) { const b = document.getElementById(id); if (b) b.className = 'layer-btn' + (cls ? ' ' + cls : ''); },

  _painel(html, right, top) {
    const wrap = document.getElementById('leaflet-map');
    const el = document.createElement('div');
    el.className = 'cc-painel';
    el.style.right = right; el.style.top = top;
    el.innerHTML = html;
    wrap.appendChild(el);
    return el;
  },

  /* ================== 1) ESCOAMENTO ANIMADO (BHO) ================== */

  async toggleFluxo() {
    const map = this._map(); if (!map) return;
    this._css();
    if (this._fluxoLayers) {
      this._fluxoLayers.forEach(l => map.removeLayer(l));
      this._fluxoLayers = null; this._fluxoNivel2 = false;
      this._btn('lc-fluxo', '');
      return;
    }
    this._btn('lc-fluxo', 'on-blue');
    try {
      const gj = await this._rpc('hidrografia_geojson', { strahler_min: 3, strahler_max: 99 });
      this._fluxoLayers = this._renderFluxo(gj);
      // nível 2 carrega em seguida, sem travar a UI
      this._rpc('hidrografia_geojson', { strahler_min: 2, strahler_max: 2 }).then(g2 => {
        if (this._fluxoLayers) { this._fluxoLayers.push(...this._renderFluxo(g2)); this._fluxoNivel2 = true; }
      }).catch(() => {});
    } catch (e) {
      console.error('CamadasCheia fluxo:', e); this._btn('lc-fluxo', '');
    }
  },

  _renderFluxo(gj) {
    const map = this._map();
    const w = f => Math.max(1.2, (f.properties.strahler - 1) * 1.1);
    const base = L.geoJSON(gj, {
      style: f => ({ color:'#90caf9', weight:w(f) + 2, opacity:.8 }),
      onEachFeature: (f, ly) => {
        const p = f.properties;
        ly.bindPopup('<b>' + (p.norio || 'Curso d’água sem nome') + '</b><br>' +
          'Strahler: ' + p.strahler + ' · Trecho: ' + (p.comp_km ?? '-') + ' km<br>' +
          '<small>BHO 2017 (ANA) · trecho ' + p.cotrecho + '</small>');
      },
    }).addTo(map);
    const anim = L.geoJSON(gj, {
      style: f => ({ color:'#1565c0', weight:w(f), opacity:.95,
        className: 'cc-fluxo cc-s' + Math.min(7, Math.max(1, f.properties.strahler)) }),
      interactive: false,
    }).addTo(map);
    return [base, anim];
  },

  /* ============ 2) MANCHAS OFICIAIS POR COTA (SGB/UFRGS) ============ */

  toggleManchas() {
    const map = this._map(); if (!map) return;
    this._css();
    if (this._manchaPainel) { this._fecharManchas(); return; }
    this._btn('lc-manchas', 'on-blue');
    const opts = this._ESTACOES.map(e =>
      '<option value="' + e.cod + '">' + e.nome + '</option>').join('');
    this._manchaPainel = this._painel(
      '<span class="cc-x" onclick="CamadasCheia._fecharManchas()">×</span>' +
      '<b>Mancha oficial por cota</b>' +
      '<select id="cc-est" onchange="CamadasCheia._trocaEstacao()">' + opts + '</select>' +
      '<div class="cc-cota"><span id="cc-cota-v">–</span> cm na régua</div>' +
      '<input type="range" id="cc-cota" oninput="CamadasCheia._trocaCota()">' +
      '<div id="cc-sit" class="cc-sit" style="background:#1976d2">—</div>' +
      '<div id="cc-info"></div><div id="cc-imp"></div>' +
      '<div id="cc-avi" class="cc-aviso" style="display:none"></div>' +
      '<div class="cc-fonte">Manchas: SGB/CPRM e IPH-UFRGS (Lajeado, preliminar).' +
      ' Limiares: boletins SGB/SACE. Exibe a maior cota mapeada ≤ selecionada.</div>',
      '10px', '10px');
    this._trocaEstacao();
  },

  _fecharManchas() {
    const map = this._map();
    if (this._manchaLayer) { map.removeLayer(this._manchaLayer); this._manchaLayer = null; }
    if (this._manchaPainel) { this._manchaPainel.remove(); this._manchaPainel = null; }
    this._btn('lc-manchas', '');
  },

  async _trocaEstacao() {
    const est = this._ESTACOES.find(e => e.cod === document.getElementById('cc-est').value);
    const sl = document.getElementById('cc-cota');
    sl.min = est.min; sl.max = est.max; sl.step = est.passo; sl.value = est.min;
    this._map().flyTo([est.lat, est.lon], 13);
    try {
      const d = await this._rest('cotas_referencia?codigo_estacao=eq.' + est.cod +
        '&select=cota_atencao_cm,cota_alerta_cm,cota_inundacao_cm');
      const c = d[0] || {};
      this._limiares = { atencao:+c.cota_atencao_cm || null, alerta:+c.cota_alerta_cm || null,
                         inundacao:+c.cota_inundacao_cm || null };
    } catch (e) { this._limiares = {}; }
    this._trocaCota();
  },

  _corSituacao(cota) {
    const L1 = this._limiares;
    if (L1.inundacao != null && cota >= L1.inundacao) return ['#c62828', 'INUNDAÇÃO'];
    if (L1.alerta    != null && cota >= L1.alerta)    return ['#ef6c00', 'ALERTA'];
    if (L1.atencao   != null && cota >= L1.atencao)   return ['#f9a825', 'ATENÇÃO'];
    return ['#1976d2', 'NORMAL'];
  },

  _trocaCota() {
    clearTimeout(this._deb);
    this._deb = setTimeout(() => this._desenhaMancha(), 250);
    const cota = +document.getElementById('cc-cota').value;
    document.getElementById('cc-cota-v').textContent = cota;
    const [cor, rot] = this._corSituacao(cota);
    const s = document.getElementById('cc-sit');
    s.style.background = cor; s.textContent = rot;
  },

  async _desenhaMancha() {
    const map = this._map();
    const cod = document.getElementById('cc-est').value;
    const cota = +document.getElementById('cc-cota').value;
    try {
      const d = await this._rpc('mancha_para_cota', { estacao: cod, cota_cm: cota });
      if (this._manchaLayer) { map.removeLayer(this._manchaLayer); this._manchaLayer = null; }
      const avi = document.getElementById('cc-avi'); avi.style.display = 'none';
      if (!d.disponivel) {
        document.getElementById('cc-info').textContent = d.motivo || 'Sem mancha para esta cota.';
        document.getElementById('cc-imp').textContent = '';
        return;
      }
      const [cor] = this._corSituacao(cota);
      this._manchaLayer = L.geoJSON(d.geometry, {
        style: { color: cor, weight: 1.5, fillColor: cor, fillOpacity: .35 }, interactive: false,
      }).addTo(map);
      document.getElementById('cc-info').innerHTML =
        'Mancha da cota <b>' + d.cota_mancha_cm + ' cm</b> · <b>' + d.area_km2 + ' km²</b>';
      if (d.acima_da_faixa_mapeada) {
        avi.textContent = 'Cota acima da maior mancha mapeada (' + d.faixa_mapeada_cm[1] +
          ' cm) — exibindo a maior disponível; a inundação real tende a ser mais extensa.';
        avi.style.display = 'block';
      }
      this._impacto('oficial', cod, d.cota_mancha_cm, 'cc-imp');
    } catch (e) { console.error('CamadasCheia mancha:', e); }
  },

  async _impacto(tipo, ref, chave, elId) {
    try {
      const imp = await this._rest('manchas_impacto?tipo=eq.' + tipo + '&ref=eq.' + ref +
        '&cota_ou_dh=eq.' + chave + '&select=cod_especie,qtd');
      const el = document.getElementById(elId);
      if (!imp.length) { el.textContent = ''; return; }
      const tot = imp.reduce((a, x) => a + +x.qtd, 0);
      const dom = imp.find(x => x.cod_especie === 1);
      el.innerHTML = 'Imóveis CNEFE na área: <b>' + tot.toLocaleString('pt-BR') + '</b>' +
        (dom ? ' (' + (+dom.qtd).toLocaleString('pt-BR') + ' domicílios)' : '') +
        '<br><small>' + imp.filter(x => x.cod_especie !== 1)
          .map(x => this._ESP[x.cod_especie] + ': ' + x.qtd).join(' · ') + '</small>';
    } catch (e) { /* impacto é opcional */ }
  },

  /* ============= 3) SIMULAÇÃO HAND (região de Canoas) ============= */

  toggleSimulada() {
    const map = this._map(); if (!map) return;
    this._css();
    if (this._handPainel) { this._fecharHand(); return; }
    this._btn('lc-hand', 'on-amber');
    this._handPainel = this._painel(
      '<span class="cc-x" onclick="CamadasCheia._fecharHand()">×</span>' +
      '<b>Região de Canoas</b> <span style="background:#6a1b9a;color:#fff;font-size:10px;' +
      'font-weight:700;padding:1px 7px;border-radius:9px">SIMULAÇÃO</span>' +
      '<div class="cc-cota">Δh = <span id="cc-dh-v">1</span> m acima da drenagem</div>' +
      '<input type="range" id="cc-dh" min="1" max="5" step="1" value="1" oninput="CamadasCheia._trocaDh()">' +
      '<div id="cc-hand-info"></div><div id="cc-hand-imp"></div>' +
      '<div class="cc-aviso"><b>NÃO é mancha oficial.</b> HAND simplificado (MDT ANADEM 30 m + ' +
      'drenagem BHO). <b>Não considera diques e casas de bombas</b> — críticos em Canoas/RMPA. ' +
      'Δh não é cota de régua. Uso: visão geral de suscetibilidade.</div>' +
      '<div class="cc-fonte">ANADEM (IPH-UFRGS/ANA via IEDE-RS) · BHO 2017 (ANA) · CNEFE 2022 (IBGE)</div>',
      '10px', '10px');
    this._map().flyTo([-29.92, -51.20], 12);
    this._trocaDh();
  },

  _fecharHand() {
    const map = this._map();
    if (this._handLayer) { map.removeLayer(this._handLayer); this._handLayer = null; }
    if (this._handPainel) { this._handPainel.remove(); this._handPainel = null; }
    this._btn('lc-hand', '');
  },

  _trocaDh() {
    const dh = +document.getElementById('cc-dh').value;
    document.getElementById('cc-dh-v').textContent = dh;
    clearTimeout(this._deb2);
    this._deb2 = setTimeout(() => this._desenhaHand(dh), 250);
  },

  async _desenhaHand(dh) {
    const map = this._map();
    try {
      const d = await this._rpc('mancha_simulada', { p_regiao: 'CANOAS_REGIAO', p_dh_m: dh });
      if (this._handLayer) { map.removeLayer(this._handLayer); this._handLayer = null; }
      const info = document.getElementById('cc-hand-info');
      if (!d.disponivel) {
        info.textContent = d.motivo || 'Classe ainda não carregada.';
        document.getElementById('cc-hand-imp').textContent = '';
        return;
      }
      this._handLayer = L.geoJSON(d.geometry, {
        style: { color:'#6a1b9a', weight:1, fillColor:'#8e24aa', fillOpacity:.3 }, interactive:false,
      }).addTo(map);
      info.innerHTML = 'Área simulada: <b>' + d.area_km2 + ' km²</b>';
      this._impacto('simulada', 'CANOAS_REGIAO', dh, 'cc-hand-imp');
    } catch (e) { console.error('CamadasCheia HAND:', e); }
  },
};

window.CamadasCheia = CamadasCheia;