/**
 * SGA — Camadas Oficiais IBGE + Análise Espacial (public/src/services/geoOficial.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Camadas vetoriais de FONTES OFICIAIS, servidas como GeoJSON estático
 * (processadas da fonte primária, sem edição de conteúdo):
 *   • Limite estadual RS ....... IBGE, Malha Territorial 2022 (EPSG:4674)
 *   • Municípios RS (499*) ..... IBGE, Malha Municipal 2022 (*inclui Lagoa dos
 *                                Patos e Lagoa Mirim, presentes na malha oficial)
 *   • Bairros (RS inteiro) ..... IBGE, Malha de Bairros CD2022 + Agregados por
 *                                bairros do Censo 2022 (v0001 pessoas, v0002
 *                                domicílios, v0007 ocupados — dicionário oficial).
 *                                2.240 bairros em 162 municípios; os demais 335
 *                                municípios (incl. Quaraí) NÃO têm bairro
 *                                delimitado no CD2022 (lacuna do próprio IBGE).
 *   • Rios (BC250) ............. IBGE BC250 v2025, trechos de drenagem COM NOME
 *                                (16.631 trechos no RS; atributos nome, tipo,
 *                                regime, largura média quando publicada)
 *   • Lagos/Massas d'água ...... IBGE BC250 v2025, massa_dagua (5.658 no RS)
 * Geometrias simplificadas p/ web (Douglas-Peucker via mapshaper) — para uso
 * cartográfico de visualização; medições oficiais devem usar a fonte primária.
 * Todas as camadas iniciam DESLIGADAS; labels conforme zoom.
 */
const GeoOficial = {
  _defs: {
    uf:      { arq: 'uf_rs.geojson',           rotulo: 'Limite RS' },
    mun:     { arq: 'municipios_rs.geojson',   rotulo: 'Municípios' },
    bairros: { arq: 'bairros_rs.geojson',      rotulo: 'Bairros' },
    rios:    { arq: 'hidro_rios_rs.geojson',   rotulo: 'Rios BC250' },
    massas:  { arq: 'hidro_massas_rs.geojson', rotulo: 'Massas d’água' },
  },
  _dados: {}, _layers: {}, _carregando: {},

  _mapa() {
    return (window.SGA_MAPAS || []).find(m => m._container && m._container.id === 'leaflet-map')
        || (window.SGA_MAPAS || [])[0] || null;
  },

  async dados(id) {
    if (this._dados[id]) return this._dados[id];
    const r = await fetch('/data/geo/' + this._defs[id].arq);
    if (!r.ok) throw new Error(this._defs[id].arq + ' HTTP ' + r.status);
    this._dados[id] = await r.json();
    return this._dados[id];
  },

  async toggle(id) {
    const mapa = this._mapa(); const btn = document.getElementById('lg-' + id);
    if (!mapa || this._carregando[id]) return;
    if (this._layers[id] && mapa.hasLayer(this._layers[id])) {
      mapa.removeLayer(this._layers[id]);
      if (btn) btn.className = 'layer-btn';
      return;
    }
    if (!this._layers[id]) {
      this._carregando[id] = true;
      if (btn) btn.textContent = '⏳ ' + this._defs[id].rotulo;
      try { this._layers[id] = this._construir(id, await this.dados(id), mapa); }
      catch (e) { console.warn('[GeoOficial]', id, e.message); }
      this._carregando[id] = false;
      if (btn) btn.textContent = this._btnRotulo(id);
    }
    if (this._layers[id]) {
      this._layers[id].addTo(mapa);
      if (btn) btn.className = 'layer-btn on-blue';
    }
  },

  _btnRotulo(id) {
    return { uf: '🗺 Limite RS', mun: '🔲 Municípios', bairros: '🏘 Bairros',
             rios: '〰 Rios BC250', massas: '🔵 Lagos/Massas' }[id] || this._defs[id].rotulo;
  },

  _construir(id, gj, mapa) {
    const T = { sticky: true };
    if (id === 'uf') {
      return L.geoJSON(gj, {
        style: { color: '#e8f0ec', weight: 2.5, fillOpacity: 0, dashArray: '2 6' },
        onEachFeature: (f, ly) => ly.bindTooltip('<b>Rio Grande do Sul</b><br>IBGE · Malha Territorial 2022', T),
      });
    }
    if (id === 'mun') {
      const ly = L.geoJSON(gj, {
        style: { color: '#8aa79b', weight: 1, fillOpacity: 0.02, fillColor: '#8aa79b' },
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindTooltip('<b>' + p.NM_MUN + '</b><br>IBGE ' + p.CD_MUN + ' · ' +
                        (+p.AREA_KM2).toLocaleString('pt-BR') + ' km²<br>Fonte: IBGE Malha Municipal 2022', T);
        },
      });
      this._labelsPorZoom(mapa, ly, 'NM_MUN', 10, 'geo-label');
      return ly;
    }
    if (id === 'bairros') {
      const ly = L.geoJSON(gj, {
        style: { color: '#E8A23A', weight: 1.4, fillOpacity: 0.10, fillColor: '#E8A23A' },
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindPopup('<b>' + p.NM_BAIRRO + '</b> · ' + p.NM_MUN +
            '<br>População: <b>' + (p.pessoas != null ? (+p.pessoas).toLocaleString('pt-BR') : '—') + '</b> pessoas' +
            '<br>Domicílios: <b>' + (p.domicilios != null ? (+p.domicilios).toLocaleString('pt-BR') : '—') + '</b>' +
            ' (' + (p.dom_ocupados != null ? (+p.dom_ocupados).toLocaleString('pt-BR') : '—') + ' ocupados)' +
            '<br>Área: ' + (+p.area_km2).toFixed(2) + ' km² · Densidade: ' +
            (p.dens_hab_km2 != null ? (+p.dens_hab_km2).toLocaleString('pt-BR') : '—') + ' hab/km²' +
            '<br><span style="opacity:.65">Censo 2022 (IBGE) · Agregados por bairros</span>');
        },
      });
      this._labelsPorZoom(mapa, ly, 'NM_BAIRRO', 12, 'geo-label geo-label-amber');
      return ly;
    }
    if (id === 'rios') {
      return L.geoJSON(gj, {
        style: f => ({ color: '#3C8DBC', opacity: 0.85,
                       weight: (f.properties.larguramed || 0) > 100 ? 2.4 : (f.properties.larguramed || 0) > 30 ? 1.6 : 1 }),
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindTooltip('<b>' + (p.nome || '—') + '</b>' +
            '<br>Classe: ' + (p.tipotrecho || '—') + ' · Regime: ' + (p.regime || '—') +
            (p.larguramed != null ? '<br>Largura média: ' + p.larguramed + ' m' : '') +
            '<br><span style="opacity:.65">IBGE BC250 v2025 · vazão não publicada nesta base</span>', T);
        },
      });
    }
    if (id === 'massas') {
      return L.geoJSON(gj, {
        style: { color: '#1B6B8C', weight: 1, fillColor: '#2980B9', fillOpacity: 0.28 },
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindTooltip('<b>' + (p.nome || 'Massa d’água sem nome') + '</b>' +
            '<br>Tipo: ' + (p.tipomassad || '—') + ' · Regime: ' + (p.regime || '—') +
            '<br><span style="opacity:.65">IBGE BC250 v2025</span>', T);
        },
      });
    }
  },

  /* Labels permanentes só a partir de um zoom mínimo (senão 499 nomes = ruído) */
  _labelsPorZoom(mapa, layer, campo, minZoom, cls) {
    const aplica = () => {
      const mostrar = mapa.getZoom() >= minZoom && mapa.hasLayer(layer);
      layer.eachLayer(l => {
        const nome = l.feature && l.feature.properties[campo];
        if (!nome) return;
        const tem = l.getTooltip() && l.getTooltip().options.permanent;
        if (mostrar && !tem) {
          l.unbindTooltip();
          l.bindTooltip(nome, { permanent: true, direction: 'center', className: cls });
        } else if (!mostrar && tem) {
          l.unbindTooltip();
        }
      });
    };
    mapa.on('zoomend layeradd layerremove', aplica);
  },
};
window.GeoOficial = GeoOficial;


/**
 * SGA — Ferramentas Web GIS de medição (turf.js) no mapa principal.
 * 📏 Distância: cliques adicionam vértices; duplo clique encerra.
 * ⬛ Área: cliques desenham o polígono; duplo clique fecha e mede.
 * Medição geodésica (WGS84) via turf.length / turf.area.
 */
const MedirMapa = {
  _modo: null, _pts: [], _layer: null, _click: null, _dbl: null,

  distancia() { this._iniciar('dist'); },
  area()      { this._iniciar('area'); },

  _mapa() {
    return (window.SGA_MAPAS || []).find(m => m._container && m._container.id === 'leaflet-map')
        || (window.SGA_MAPAS || [])[0] || null;
  },

  _iniciar(modo) {
    const mapa = this._mapa();
    if (!mapa || !window.turf) return;
    this.limpar();
    this._modo = modo; this._pts = [];
    mapa._container.style.cursor = 'crosshair';
    mapa.doubleClickZoom.disable();
    this._click = (ev) => { this._pts.push([ev.latlng.lng, ev.latlng.lat]); this._desenhar(); };
    this._dbl   = () => this._finalizar();
    mapa.on('click', this._click);
    mapa.on('dblclick', this._dbl);
    const btn = document.getElementById(modo === 'dist' ? 'wg-dist' : 'wg-area');
    if (btn) btn.className = 'layer-btn on-amber';
  },

  _desenhar(fechado) {
    const mapa = this._mapa();
    if (this._layer) mapa.removeLayer(this._layer);
    if (this._pts.length < 1) return;
    const latlngs = this._pts.map(p => [p[1], p[0]]);
    let rotulo = '';
    if (this._modo === 'area' && this._pts.length >= 3) {
      const anel = [...this._pts, this._pts[0]];
      const km2 = turf.area(turf.polygon([anel])) / 1e6;
      rotulo = km2 >= 1 ? km2.toFixed(2) + ' km²' : Math.round(km2 * 1e6).toLocaleString('pt-BR') + ' m²';
      this._layer = L.polygon(latlngs, { color: '#E8A23A', weight: 2, fillOpacity: 0.12 });
    } else if (this._pts.length >= 2) {
      const km = turf.length(turf.lineString(this._pts), { units: 'kilometers' });
      rotulo = km >= 1 ? km.toFixed(2) + ' km' : Math.round(km * 1000) + ' m';
      this._layer = L.polyline(latlngs, { color: '#E8A23A', weight: 3, dashArray: fechado ? null : '6 4' });
    } else {
      this._layer = L.circleMarker(latlngs[0], { radius: 4, color: '#E8A23A' });
    }
    if (rotulo) this._layer.bindTooltip('📐 ' + rotulo + (fechado ? '' : ' (duplo clique encerra)'),
                                        { permanent: true, sticky: false });
    this._layer.addTo(mapa);
  },

  _finalizar() {
    const mapa = this._mapa();
    this._desenhar(true);
    if (mapa) {
      mapa.off('click', this._click); mapa.off('dblclick', this._dbl);
      mapa._container.style.cursor = ''; mapa.doubleClickZoom.enable();
    }
    ['wg-dist', 'wg-area'].forEach(id => { const b = document.getElementById(id); if (b) b.className = 'layer-btn'; });
    this._modo = null;
  },

  limpar() {
    const mapa = this._mapa();
    if (mapa && this._layer) mapa.removeLayer(this._layer);
    this._layer = null;
    this._finalizar();
  },
};
window.MedirMapa = MedirMapa;


/**
 * SGA — Análise Espacial (página) — população/imóveis na faixa de influência
 * Método (dasimetria simples, DECLARADO na tela): buffer de X m sobre a
 * hidrografia BC250 dentro do município; para cada bairro, estima-se
 * pessoas/domicílios na faixa multiplicando os totais do Censo 2022 pela
 * FRAÇÃO DA ÁREA do bairro intersectada. É estimativa proporcional à área
 * (assume distribuição uniforme dentro do bairro) — não é contagem exata.
 */
const AnaliseEspacialPage = {
  _ord: { col: 'pessoas', desc: true },

  render() {
    return `
    <div class="page" id="p-analise">
      <div class="page-header">
        <div>
          <div class="page-title">Análise Espacial — Bairros & Hidrografia</div>
          <div class="page-sub">IBGE Censo 2022 + BC250 · estimativa proporcional à área (método declarado abaixo)</div>
        </div>
        <div class="page-actions"><span class="ds-badge ds-ibge">IBGE oficial</span></div>
      </div>
      <div class="page-body">
        <div class="card">
          <div class="card-body" style="padding:10px 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <select id="ae-mun" class="msel-select" style="width:210px"></select>
            <select id="ae-dist" class="msel-select" style="width:170px">
              <option value="50">Faixa de 50 m</option>
              <option value="100" selected>Faixa de 100 m</option>
              <option value="200">Faixa de 200 m</option>
              <option value="500">Faixa de 500 m</option>
            </select>
            <button class="btn btn-primary" onclick="AnaliseEspacialPage.analisar()">📐 Analisar população na faixa</button>
            <span id="ae-status" style="font-size:11px;color:var(--text-3)"></span>
          </div>
        </div>
        <div id="ae-resultado"></div>
        <div class="card">
          <div class="card-header"><div class="card-title">📋 Tabela de atributos — Bairros (Censo 2022)</div></div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table" id="ae-tabela"><thead></thead><tbody>
              <tr><td style="padding:16px;color:var(--text-3)">Carregando bairros…</td></tr>
            </tbody></table>
          </div>
        </div>
        <div class="card">
          <div class="card-body" style="font-size:12px;color:var(--text-2);line-height:1.7;padding:10px 14px">
            <b style="color:var(--text-1)">Fontes e método:</b> bairros e atributos do IBGE (Malha de Bairros CD2022 +
            Agregados por bairros do Censo 2022; dicionário oficial: v0001 pessoas, v0002 domicílios, v0007 ocupados);
            hidrografia IBGE BC250 v2025 (trechos nomeados e massas d'água — vazão não é publicada nesta base).
            A análise gera um buffer da distância escolhida sobre a hidrografia dentro do município e estima
            pessoas/domicílios na faixa pela <b>fração da área</b> de cada bairro intersectada (dasimetria simples —
            assume distribuição uniforme; é estimativa de planejamento, não contagem). Cobertura: <b>2.240 bairros
            em 162 municípios do RS</b> — os demais 335 municípios (incluindo Quaraí) não têm bairro delimitado no
            CD2022 (lacuna do próprio IBGE). Em municípios grandes a análise pode levar até ~1 minuto.
            Geometrias simplificadas para web.
          </div>
        </div>
      </div>
    </div>`;
  },

  async carregar() {
    const sel = document.getElementById('ae-mun');
    if (!sel) return;
    try {
      const gj = await GeoOficial.dados('bairros');
      if (!sel.options.length) {
        const muns = {};
        gj.features.forEach(f => { muns[f.properties.CD_MUN] = f.properties.NM_MUN; });
        sel.innerHTML = Object.entries(muns).sort((a, b) => a[1].localeCompare(b[1]))
          .map(([cd, nm]) => `<option value="${cd}">${nm}</option>`).join('');
        const ativo = window.SGA && SGA.config.municipioAtivo;
        if (ativo && muns[String(ativo.cod_ibge)]) sel.value = String(ativo.cod_ibge);
      }
      this._tabela(gj.features.map(f => f.properties));
    } catch (e) {
      const tb = document.querySelector('#ae-tabela tbody');
      if (tb) tb.innerHTML = '<tr><td style="padding:16px;color:var(--amber)">Falha ao carregar bairros: ' + e.message + '</td></tr>';
    }
  },

  _tabela(props) {
    const o = this._ord;
    // sort robusto: numérico quando ambos os valores forem números (mesmo se
    // vierem como string do GeoJSON); senão, alfabético pt-BR; null no fim
    const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
    props = [...props].sort((a, b) => {
      const x = num(a[o.col]), y = num(b[o.col]);
      let r;
      if (x != null && y != null) r = x - y;
      else if (x == null && y == null) r = String(a[o.col] ?? '').localeCompare(String(b[o.col] ?? ''), 'pt');
      else return x == null ? 1 : -1;   // null sempre no fim
      return r * (o.desc ? -1 : 1);
    });
    const COLS = [['NM_BAIRRO','Bairro'],['NM_MUN','Município'],['pessoas','Pessoas'],['domicilios','Domicílios'],
                  ['dom_ocupados','Ocupados'],['media_moradores','Média morad.'],['area_km2','Área km²'],['dens_hab_km2','Dens. hab/km²']];
    const thead = document.querySelector('#ae-tabela thead');
    const tbody = document.querySelector('#ae-tabela tbody');
    if (!thead || !tbody) return;
    thead.innerHTML = '<tr>' + COLS.map(([c, t]) =>
      `<th style="cursor:pointer" onclick="AnaliseEspacialPage._ordenar('${c}')">${t}${this._ord.col === c ? (this._ord.desc ? ' ↓' : ' ↑') : ''}</th>`).join('') + '<th>Mapa</th></tr>';
    tbody.innerHTML = props.map(p => `
      <tr>
        <td><b>${p.NM_BAIRRO}</b></td><td style="font-size:11px">${p.NM_MUN}</td>
        <td class="mono">${p.pessoas != null ? (+p.pessoas).toLocaleString('pt-BR') : '—'}</td>
        <td class="mono">${p.domicilios != null ? (+p.domicilios).toLocaleString('pt-BR') : '—'}</td>
        <td class="mono">${p.dom_ocupados != null ? (+p.dom_ocupados).toLocaleString('pt-BR') : '—'}</td>
        <td class="mono">${p.media_moradores != null ? p.media_moradores : '—'}</td>
        <td class="mono">${(+p.area_km2).toFixed(2)}</td>
        <td class="mono">${p.dens_hab_km2 != null ? (+p.dens_hab_km2).toLocaleString('pt-BR') : '—'}</td>
        <td><button class="btn btn-outline" style="font-size:10px;padding:2px 8px"
          onclick="AnaliseEspacialPage.verNoMapa('${p.CD_BAIRRO}')">🗺</button></td>
      </tr>`).join('');
  },

  async _ordenar(col) {
    if (this._ord.col === col) this._ord.desc = !this._ord.desc;
    else this._ord = { col, desc: true };
    const gj = await GeoOficial.dados('bairros');
    this._tabela(gj.features.map(f => f.properties));
  },

  async verNoMapa(cdBairro) {
    const gj = await GeoOficial.dados('bairros');
    const f = gj.features.find(x => String(x.properties.CD_BAIRRO) === String(cdBairro));
    if (!f) return;
    if (window.Router) Router.go('mapa');
    setTimeout(async () => {
      const mapa = GeoOficial._mapa(); if (!mapa) return;
      if (!GeoOficial._layers.bairros || !mapa.hasLayer(GeoOficial._layers.bairros)) await GeoOficial.toggle('bairros');
      try { mapa.fitBounds(L.geoJSON(f).getBounds(), { padding: [30, 30] }); } catch (_) {}
    }, 500);
  },

  async analisar() {
    const st = document.getElementById('ae-status');
    const out = document.getElementById('ae-resultado');
    if (!window.turf) { if (st) st.textContent = 'turf.js não carregou — recarregue a página.'; return; }
    const cd = document.getElementById('ae-mun').value;
    const dist = +document.getElementById('ae-dist').value;
    if (st) st.textContent = 'Carregando camadas…';
    try {
      const [bj, rj, mj] = await Promise.all([
        GeoOficial.dados('bairros'), GeoOficial.dados('rios'), GeoOficial.dados('massas')]);
      const bairros = bj.features.filter(f => String(f.properties.CD_MUN) === String(cd));
      if (!bairros.length) { if (st) st.textContent = 'Município sem bairros no piloto.'; return; }
      const bboxMun = turf.bbox({ type: 'FeatureCollection', features: bairros });
      const bboxPol = turf.bboxPolygon(turf.bbox(turf.buffer(turf.bboxPolygon(bboxMun), dist / 1000 + 0.3, { units: 'kilometers' })));
      const dentro = fc => fc.features.filter(f => { try { return turf.booleanIntersects(f, bboxPol); } catch (_) { return false; } });
      const hidro = [...dentro(rj), ...dentro(mj)];
      if (st) st.textContent = 'Gerando buffer de ' + dist + ' m sobre ' + hidro.length + ' feições de hidrografia…';
      await new Promise(r => setTimeout(r, 30));  // deixa a UI respirar

      // buffers individuais → união incremental (dissolve) p/ não contar sobreposição
      let uni = null, falhas = 0;
      for (const h of hidro) {
        try {
          const b = turf.buffer(h, dist / 1000, { units: 'kilometers' });
          uni = uni ? turf.union(turf.featureCollection([uni, b])) : b;
        } catch (_) { falhas++; }
      }
      if (!uni) { if (st) st.textContent = 'Sem hidrografia BC250 na área do município.'; return; }

      if (st) st.textContent = 'Intersectando com ' + bairros.length + ' bairros…';
      await new Promise(r => setTimeout(r, 30));
      const linhas = [];
      let totP = 0, totD = 0;
      for (const f of bairros) {
        const p = f.properties;
        let fra = 0;
        try {
          const inter = turf.intersect(turf.featureCollection([f, uni]));
          if (inter) fra = turf.area(inter) / turf.area(f);
        } catch (_) { /* geometria degenerada após simplificação */ }
        const eP = Math.round((p.pessoas || 0) * fra), eD = Math.round((p.domicilios || 0) * fra);
        totP += eP; totD += eD;
        linhas.push({ nome: p.NM_BAIRRO, pessoas: p.pessoas || 0, domicilios: p.domicilios || 0,
                      fra: +(fra * 100).toFixed(1), eP, eD });
      }
      linhas.sort((a, b) => b.eP - a.eP);
      const nomeMun = bairros[0].properties.NM_MUN;
      if (st) st.textContent = '';
      out.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📐 ${nomeMun} — estimativa na faixa de ${dist} m da hidrografia BC250</div>
            <span class="pill pill-amber">~${totP.toLocaleString('pt-BR')} pessoas · ~${totD.toLocaleString('pt-BR')} domicílios</span>
          </div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table">
              <thead><tr><th>Bairro</th><th>% área na faixa</th><th>Pessoas (est.)</th><th>Domicílios (est.)</th><th>Pop. total</th></tr></thead>
              <tbody>${linhas.map(l => `
                <tr>
                  <td><b>${l.nome}</b></td>
                  <td class="mono" style="color:${l.fra > 50 ? 'var(--red)' : l.fra > 20 ? 'var(--amber)' : 'var(--text-2)'}">${l.fra}%</td>
                  <td class="mono">~${l.eP.toLocaleString('pt-BR')}</td>
                  <td class="mono">~${l.eD.toLocaleString('pt-BR')}</td>
                  <td class="mono" style="color:var(--text-3)">${(+l.pessoas).toLocaleString('pt-BR')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="card-body" style="font-size:11px;color:var(--text-3);border-top:1px solid var(--border)">
            Estimativa proporcional à área (dasimetria simples) sobre Censo 2022 + BC250 simplificada${falhas ? ' · ' + falhas + ' feições de hidrografia ignoradas por erro de geometria' : ''}.
            Não substitui mancha de inundação modelada — a faixa é distância euclidiana da hidrografia, não cota atingida.
          </div>
        </div>`;
    } catch (e) {
      if (st) st.textContent = 'Falha na análise: ' + e.message;
    }
  },
};
window.AnaliseEspacialPage = AnaliseEspacialPage;
