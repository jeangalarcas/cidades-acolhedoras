/**
 * SGA — Módulo de Bairro: RESTINGA · Porto Alegre (public/src/pages/Restinga.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * PILOTO do padrão "módulo de bairro/região": linha de base VERIFICADA
 * (cada indicador com fonte, vintage e status), cenários climáticos/sociais
 * com matriz de impacto (visão GESTOR × CIDADÃO), rede de apoio confirmada
 * em fonte oficial e recorte em tempo real (CEMADEN/INMET via API do SGA).
 *
 * Honestidade de dados (padrão do sistema):
 *  • Nenhuma coordenada inventada — equipamentos sem match ficam sem pino;
 *    abrigos vêm da base OSM estadual (abrigos_rs.geojson) filtrados pelo
 *    polígono IBGE do bairro (point-in-polygon via turf).
 *  • Indicadores de 2010 são exibidos como HISTÓRICOS (vintage declarado).
 *  • Fontes ao vivo que falham degradam com aviso, nunca com número falso.
 *
 * Dados estáticos: /data/restinga/{baseline,cenarios,setores_risco}.json
 *                  /data/restinga/equipamentos.geojson
 * Documentação:    docs/modulo-restinga.md
 */
const RestingaPage = {
  IBGE_POA: '4314902',
  _visao: 'cidadao',          // 'cidadao' | 'gestor'
  _base: null, _cen: null, _equip: null, _setores: null,
  _abrigos: null, _feat: null, _timer: null, _carregado: false,
  _mapaL: null, _abrigosLayer: null,

  render() {
    return `
    <div class="page" id="p-restinga">
      <div class="page-header">
        <div>
          <div class="page-title">Módulo Restinga — Porto Alegre <span class="pill pill-amber" style="font-size:9px;vertical-align:middle">PILOTO</span></div>
          <div class="page-sub">Bairro mais populoso da capital · Censo 2022 · setores de risco SGB · cenários e rede de apoio</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" id="rt-btn-cidadao" onclick="RestingaPage.setVisao('cidadao')">👤 Cidadão</button>
          <button class="btn btn-outline" id="rt-btn-gestor" onclick="RestingaPage.setVisao('gestor')">🏛 Gestor</button>
          <button class="btn btn-outline" onclick="RestingaPage.verNoMapa()">🗺 Ver no mapa</button>
          <button class="btn btn-outline" onclick="RestingaPage.carregar(true)">↺ Atualizar</button>
        </div>
      </div>
      <div class="page-body">

        <div class="metric-grid cols-4">
          <div class="mc neutral"><div class="mc-label">População (Censo 2022)</div><div class="mc-value" id="rt-k-pop">—</div></div>
          <div class="mc warn"><div class="mc-label">Setores de risco SGB</div><div class="mc-value" style="color:var(--amber)" id="rt-k-setores">—</div></div>
          <div class="mc error"><div class="mc-label">Avisos INMET (POA)</div><div class="mc-value" style="color:var(--red)" id="rt-k-inmet">—</div></div>
          <div class="mc ok"><div class="mc-label">Chuva 24h · CEMADEN</div><div class="mc-value" style="color:var(--green-mid)" id="rt-k-chuva">—</div></div>
        </div>

        <div id="rt-alertas"></div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🗺 Mapa do bairro — rede de apoio oficial</div>
            <span class="pill pill-gray" style="font-size:9px">pinos: CNES/DataSUS · polígono: IBGE CD2022</span>
          </div>
          <div class="card-body" style="padding:0"><div id="rt-mapa" style="height:340px"></div></div>
          <div class="card-body" style="font-size:10px;color:var(--text-3);border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-outline" style="font-size:10px;padding:2px 8px" id="rt-btn-abrigos" onclick="RestingaPage.toggleAbrigos()">🏠 Abrigos potenciais (OSM)</button>
            <span>Somente coordenadas OFICIAIS no mapa (CNES/DataSUS, validadas no polígono IBGE). CRAS, Brigada Militar, Bombeiros e Terminal ainda sem pino — endereço na tabela abaixo.</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🧭 Cenários e orientações — <span id="rt-visao-rotulo">visão do cidadão</span></div>
            <span class="pill pill-gray" id="rt-hora">—</span>
          </div>
          <div class="card-body" id="rt-cenarios" style="padding:10px 14px">Carregando cenários…</div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">🛟 Rede de apoio no bairro (fontes oficiais)</div></div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table">
              <thead><tr><th>Tipo</th><th>Equipamento</th><th>Endereço</th><th>Telefone</th><th>Fonte · verificação</th></tr></thead>
              <tbody id="rt-equip"><tr><td colspan="5" style="padding:16px;color:var(--text-3)">Carregando…</td></tr></tbody>
            </table>
          </div>
          <div class="card-body" id="rt-abrigos-resumo" style="font-size:11px;color:var(--text-3);border-top:1px solid var(--border)">
            Carregando abrigos potenciais (base OSM do SGA)…
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ Setores de risco oficiais (SGB/CPRM · dez/2022)</div></div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table">
              <thead><tr><th>Setor</th><th>Tipologia</th><th>Grau</th><th>Pop. estimada</th><th>Observação</th></tr></thead>
              <tbody id="rt-setores"><tr><td colspan="5" style="padding:16px;color:var(--text-3)">Carregando…</td></tr></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">🚌 Eixos de saída do bairro</div></div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table">
              <thead><tr><th>Eixo</th><th>Papel</th><th>Status</th><th>Nota</th></tr></thead>
              <tbody id="rt-eixos"></tbody>
            </table>
          </div>
          <div class="card-body" style="font-size:11px;color:var(--text-3);border-top:1px solid var(--border)">
            Status operacional manual — a integração com ocorrências EPTC ainda não existe; quando houver aviso
            INMET vigente para Porto Alegre os eixos entram em <b>atenção</b> automaticamente.
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📊 Linha de base verificada (indicador · fonte · status)</div></div>
          <div class="card-body" style="padding:0;overflow:auto">
            <table class="data-table">
              <thead><tr><th>Indicador</th><th>Valor</th><th>Referência</th><th>Fonte</th><th>Status</th></tr></thead>
              <tbody id="rt-baseline"><tr><td colspan="5" style="padding:16px;color:var(--text-3)">Carregando…</td></tr></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="font-size:11px;color:var(--text-3);line-height:1.7;padding:10px 14px">
            <b style="color:var(--text-2)">Método e fontes:</b> população e polígono do bairro vêm do IBGE
            (Malha de Bairros CD2022 + Agregados do Censo 2022, já carregados no SGA) e do caderno ObservaPOA;
            setores de risco do relatório SGB/CPRM publicado pela Defesa Civil de POA (dez/2022 — recorte espacial
            a confirmar no GeoSGB); rede de apoio confirmada em páginas oficiais (SMS, FASC, Brigada Militar,
            CBMRS, hospital), com coordenadas dos equipamentos de saúde vindas do CNES/DataSUS e validadas por
            point-in-polygon no polígono IBGE do bairro; chuva ao vivo do CEMADEN e avisos do INMET via API do SGA. Indicadores marcados como
            <b>histórico (2010)</b> aguardam os recortes 2022 do IBGE/ObservaPOA. Valores reportados na imprensa e
            ainda não confirmados na fonte primária aparecem como <b>não confirmado</b> e ficam fora dos KPIs.
            Detalhes: <span class="mono">docs/modulo-restinga.md</span>.
          </div>
        </div>

      </div>
    </div>`;
  },

  /* ── infra ──────────────────────────────────────────────────────────── */
  _api() {
    return (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
  },

  async _json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url.split('/').pop() + ' HTTP ' + r.status);
    return r.json();
  },

  iniciar() {
    this.carregar();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      const pg = document.getElementById('p-restinga');
      if (pg && pg.classList.contains('active')) this._aoVivo();
    }, 5 * 60 * 1000);
  },

  setVisao(v) {
    this._visao = v;
    const rot = document.getElementById('rt-visao-rotulo');
    if (rot) rot.textContent = v === 'gestor' ? 'visão do gestor' : 'visão do cidadão';
    this._marcarBotoes();
    this._renderCenarios();
  },

  _marcarBotoes() {
    const bc = document.getElementById('rt-btn-cidadao');
    const bg = document.getElementById('rt-btn-gestor');
    if (bc) bc.className = 'btn ' + (this._visao === 'cidadao' ? 'btn-primary' : 'btn-outline');
    if (bg) bg.className = 'btn ' + (this._visao === 'gestor' ? 'btn-primary' : 'btn-outline');
  },

  /* ── carga principal ────────────────────────────────────────────────── */
  async carregar(manual) {
    if (this._carregado && !manual) {
      this._aoVivo();
      setTimeout(() => this._initMapa(), 150);
      return;
    }
    this._marcarBotoes();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };

    // 1) dados estáticos do módulo (verificados, com fonte por linha)
    try {
      const [base, cen, equip, setores] = await Promise.all([
        this._json('/data/restinga/baseline.json'),
        this._json('/data/restinga/cenarios.json'),
        this._json('/data/restinga/equipamentos.geojson'),
        this._json('/data/restinga/setores_risco.json'),
      ]);
      this._base = base; this._cen = cen; this._equip = equip; this._setores = setores;
      this._renderBaseline();
      this._renderCenarios();
      this._renderEquip();
      this._renderSetores();
      this._renderEixos(false);
      this._carregado = true;
    } catch (e) {
      set('rt-cenarios', '<span style="color:var(--amber)">Falha ao carregar dados do módulo: ' + e.message + '</span>');
    }

    // 2) polígono IBGE + população oficial (camada já existente no SGA)
    this._popOficial();

    // 3) abrigos OSM dentro do bairro (base estadual já em produção)
    this._abrigosNoBairro();

    // 3b) mapa do bairro (polígono IBGE + pinos oficiais CNES)
    setTimeout(() => this._initMapa(), 250);

    // 4) recorte ao vivo (CEMADEN/INMET)
    this._aoVivo();
  },

  /* ── população/polígono IBGE ────────────────────────────────────────── */
  async _feature() {
    if (this._feat) return this._feat;
    const gj = await GeoOficial.dados('bairros');
    this._feat = gj.features.find(f =>
      String(f.properties.CD_MUN) === this.IBGE_POA &&
      String(f.properties.NM_BAIRRO).trim().toLowerCase() === 'restinga') || null;
    return this._feat;
  },

  async _popOficial() {
    const el = document.getElementById('rt-k-pop');
    if (!el) return;
    try {
      const f = await this._feature();
      const p = f && f.properties.pessoas != null ? +f.properties.pessoas : null;
      if (p != null) {
        el.textContent = p.toLocaleString('pt-BR');
        el.title = 'IBGE · Agregados por bairros do Censo 2022 (camada oficial do SGA)';
      } else {
        // fallback: caderno ObservaPOA registrado na baseline
        const b = this._base && this._base.indicadores.find(i => i.codigo === 'POP_TOTAL');
        el.textContent = b ? (+b.valor).toLocaleString('pt-BR') : '—';
        el.title = b ? b.fonte : '';
      }
    } catch (_) { el.textContent = '—'; }
  },

  /* ── abrigos OSM (point-in-polygon no polígono IBGE) ────────────────── */
  async _abrigosNoBairro() {
    const el = document.getElementById('rt-abrigos-resumo');
    if (!el) return;
    try {
      const f = await this._feature();
      if (!f || !window.turf) throw new Error('polígono do bairro indisponível');
      if (!this._abrigos) {
        const gj = await this._json('/data/geo/abrigos_rs.geojson');
        const doMun = gj.features.filter(x => String(x.properties.ibge) === this.IBGE_POA);
        this._abrigos = doMun.filter(x => {
          try { return turf.booleanPointInPolygon(x, f); } catch (_) { return false; }
        });
      }
      const porTipo = {};
      this._abrigos.forEach(x => {
        const t = x.properties.tipo || x.properties.amenity || 'outro';
        porTipo[t] = (porTipo[t] || 0) + 1;
      });
      const resumo = Object.entries(porTipo).sort((a, b) => b[1] - a[1])
        .map(([t, n]) => n + ' ' + t).join(' · ');
      el.innerHTML = '<b style="color:var(--text-2)">Abrigos potenciais no polígono do bairro (base OSM estadual do SGA):</b> ' +
        (this._abrigos.length
          ? this._abrigos.length + ' locais nomeados — ' + resumo +
            '. São candidatos físicos (escolas, ginásios, centros comunitários) — o acionamento como abrigo é decisão ' +
            'da Defesa Civil municipal. Página <b>Abrigos e Rotas</b> lista com distâncias e mapa.'
          : 'nenhum local da base OSM caiu dentro do polígono — usar a página Abrigos e Rotas (raio municipal).');
    } catch (e) {
      el.innerHTML = 'Base de abrigos indisponível agora (' + e.message + ') — a página Abrigos e Rotas segue funcionando.';
    }
  },

  /* ── mapa do bairro (Leaflet) ───────────────────────────────────────── */
  async _initMapa() {
    const el = document.getElementById('rt-mapa');
    if (!el || !window.L) return;
    if (this._mapaL) { setTimeout(() => this._mapaL.invalidateSize(), 100); return; }
    try {
      const f = await this._feature();
      this._mapaL = L.map('rt-mapa', { scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(this._mapaL);
      if (f) {
        const pol = L.geoJSON(f, { style: { color: '#E8A23A', weight: 2, fillOpacity: 0.06, fillColor: '#E8A23A' } })
          .bindTooltip('Bairro Restinga — IBGE CD2022', { sticky: true }).addTo(this._mapaL);
        this._mapaL.fitBounds(pol.getBounds(), { padding: [14, 14] });
      } else {
        this._mapaL.setView([-30.152, -51.137], 13);
      }
      const COR = { hospital: '#B83A2E', ubs: '#2D7A5C', caps: '#7B5EA7' };
      ((this._equip && this._equip.features) || []).forEach(q => {
        if (!q.geometry) return;
        const lon = q.geometry.coordinates[0], lat = q.geometry.coordinates[1];
        const p = q.properties;
        L.circleMarker([lat, lon], { radius: 8, color: '#fff', weight: 2, fillColor: COR[p.tipo] || '#2D7A5C', fillOpacity: 0.95 })
          .bindPopup('<b>' + p.nome + '</b><br>' + (p.endereco || '') +
            (p.telefone ? '<br>☎ ' + p.telefone : '') +
            (p.codigo_cnes ? '<br>CNES ' + p.codigo_cnes : '') +
            '<br><span style="opacity:.65">Coordenada oficial CNES/DataSUS · validada no polígono IBGE</span>')
          .addTo(this._mapaL);
      });
      setTimeout(() => this._mapaL.invalidateSize(), 300);
    } catch (e) { console.warn('[Restinga] mapa:', e.message); }
  },

  toggleAbrigos() {
    const m = this._mapaL;
    const btn = document.getElementById('rt-btn-abrigos');
    if (!m) return;
    if (this._abrigosLayer) {
      m.removeLayer(this._abrigosLayer);
      this._abrigosLayer = null;
      if (btn) btn.className = 'btn btn-outline';
      return;
    }
    if (!this._abrigos || !this._abrigos.length) return;
    this._abrigosLayer = L.layerGroup(this._abrigos.map(x => {
      const lon = x.geometry.coordinates[0], lat = x.geometry.coordinates[1];
      return L.circleMarker([lat, lon], { radius: 4, color: '#3C8DBC', weight: 1, fillColor: '#3C8DBC', fillOpacity: 0.7 })
        .bindTooltip((x.properties.nome || '—') + ' · ' + (x.properties.tipo || ''), { sticky: true });
    })).addTo(m);
    if (btn) btn.className = 'btn btn-primary';
  },

  focar(lat, lon, nome) {
    const el = document.getElementById('rt-mapa');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (this._mapaL) {
      this._mapaL.setView([lat, lon], 16);
      L.popup().setLatLng([lat, lon]).setContent('<b>' + nome + '</b>').openOn(this._mapaL);
    }
  },

  /* ── tempo real: CEMADEN + INMET ────────────────────────────────────── */
  async _aoVivo() {
    const set = (id, v, title) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = v; if (title) el.title = title; }
    };
    const hora = document.getElementById('rt-hora');
    if (hora) hora.textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // INMET — avisos ativos recortados para POA (geocode 4314902)
    let avisosPOA = [];
    try {
      const d = await this._json(this._api() + '/api/inmet/avisos');
      if (d && d.disponivel === false) {
        set('rt-k-inmet', '—', d.motivo || 'INMET indisponível');
      } else {
        avisosPOA = (d.avisos || []).filter(a => JSON.stringify(a).indexOf(this.IBGE_POA) !== -1);
        set('rt-k-inmet', String(avisosPOA.length), 'Avisos INMET vigentes que incluem Porto Alegre');
      }
    } catch (e) { set('rt-k-inmet', '—', 'INMET: ' + e.message); }

    // CEMADEN — chuva acumulada das estações de Porto Alegre (recorte Restinga quando nomeada)
    try {
      const d = await this._json(this._api() + '/api/cemaden/acumulados?ibge=' + this.IBGE_POA);
      const arr = Array.isArray(d) ? d : (d && (d.itens || d.items || d.dados)) || [];
      const daRestinga = arr.filter(x => /restinga/i.test(JSON.stringify(x)));
      const fonte = daRestinga.length ? daRestinga : arr;
      let melhor = null;
      fonte.forEach(x => {
        const v = parseFloat(x.acc24hr != null ? x.acc24hr : (x.chuva_24h != null ? x.chuva_24h : x.valor));
        if (Number.isFinite(v) && (melhor == null || v > melhor)) melhor = v;
      });
      set('rt-k-chuva', melhor != null ? melhor.toFixed(1) + ' mm' : '—',
        melhor != null
          ? (daRestinga.length ? 'Estação CEMADEN do próprio bairro (nome contém "Restinga")'
                               : 'Máximo entre as estações CEMADEN de Porto Alegre')
          : 'CEMADEN sem leitura de acumulado agora');
    } catch (e) { set('rt-k-chuva', '—', 'CEMADEN: ' + e.message); }

    // banner de alertas + eixos em atenção
    const box = document.getElementById('rt-alertas');
    if (box) {
      box.innerHTML = avisosPOA.length ? `
        <div class="card" style="border-left:4px solid var(--red)">
          <div class="card-body" style="padding:10px 14px">
            <b style="color:var(--red)">⚠ ${avisosPOA.length} aviso(s) INMET vigente(s) incluem Porto Alegre</b>
            <div style="font-size:11px;color:var(--text-2);margin-top:4px">
              ${avisosPOA.slice(0, 4).map(a =>
                '• ' + (a.descricao || a.aviso || a.severidade || 'aviso meteorológico') +
                (a.severidade ? ' · <b>' + a.severidade + '</b>' : '')).join('<br>')}
            </div>
            <div style="font-size:10px;color:var(--text-3);margin-top:4px">
              Recorte municipal (o INMET não publica aviso por bairro). Fonte: INMET · apiprevmet3, via API do SGA.
            </div>
          </div>
        </div>` : '';
    }
    this._renderEixos(avisosPOA.length > 0);
  },

  /* ── seções estáticas ───────────────────────────────────────────────── */
  _selo(status) {
    if (status === 'confirmado') return '<span class="pill" style="background:#E4F2EB;color:var(--green-mid);font-size:9px">✔ confirmado</span>';
    if (status === 'ressalva' || status === 'confirmado_com_ressalva')
      return '<span class="pill pill-amber" style="font-size:9px">⚠ com ressalva</span>';
    return '<span class="pill pill-gray" style="font-size:9px">? não confirmado</span>';
  },

  _renderBaseline() {
    const tb = document.getElementById('rt-baseline');
    if (!tb || !this._base) return;
    tb.innerHTML = this._base.indicadores.map(i => `
      <tr>
        <td><b>${i.nome}</b>${i.aviso_vintage ? '<div style="font-size:10px;color:var(--amber)">⚠ ' + i.aviso_vintage + '</div>' : ''}</td>
        <td class="mono">${i.valor != null ? (+i.valor).toLocaleString('pt-BR') + (i.unidade === '%' ? '%' : '') : '—'}
          ${i.unidade && i.unidade !== '%' ? '<div style="font-size:9px;color:var(--text-3)">' + i.unidade + '</div>' : ''}</td>
        <td style="font-size:11px">${i.data_ref || '—'}</td>
        <td style="font-size:10px;color:var(--text-3)">${i.fonte}</td>
        <td>${this._selo(i.status_verificacao)}</td>
      </tr>`).join('');
  },

  _renderCenarios() {
    const el = document.getElementById('rt-cenarios');
    if (!el || !this._cen) return;
    const visao = this._visao;
    el.innerHTML = this._cen.cenarios.map(c => {
      const imp = (c.impactos || []).filter(i => i.publico === visao || !i.publico);
      if (!imp.length) return '';
      const cor = c.tipo === 'climatico' ? 'var(--blue)' : c.tipo === 'climatico_social' ? 'var(--amber)' : 'var(--green-mid)';
      return `
      <div style="border:1px solid var(--border);border-left:4px solid ${cor};border-radius:8px;padding:10px 12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b style="font-size:12px">${c.codigo} · ${c.nome}</b>
          <span style="font-size:9px;color:var(--text-3)">${c.tipo === 'climatico' ? 'gatilho automático (CEMADEN/INMET)' : c.tipo === 'climatico_social' ? 'gatilho operacional' : 'horizonte de gestão'}</span>
        </div>
        ${c.populacao_alvo ? '<div style="font-size:10px;color:var(--text-3);margin-top:2px">População-alvo: ' + c.populacao_alvo + '</div>' : ''}
        ${imp.map(i => `
          <div style="margin-top:6px;font-size:11px">
            <span class="pill pill-gray" style="font-size:9px">${i.dimensao}</span>
            ${i.severidade ? '<span class="mono" style="font-size:10px;color:' + (i.severidade >= 4 ? 'var(--red)' : i.severidade >= 3 ? 'var(--amber)' : 'var(--text-3)') + '"> sev. ' + i.severidade + '/5</span>' : ''}
            ${i.descricao}
            ${(i.acoes && i.acoes.length) ? '<div style="font-size:10px;color:var(--text-2);margin-top:2px">→ ' + i.acoes.join(' · ') + '</div>' : ''}
          </div>`).join('')}
        ${c.base_verificada ? '<div style="font-size:9px;color:var(--text-3);margin-top:6px">Base: ' + c.base_verificada + '</div>' : ''}
      </div>`;
    }).join('') || '<span style="color:var(--text-3)">Sem cenários para esta visão.</span>';
  },

  _renderEquip() {
    const tb = document.getElementById('rt-equip');
    if (!tb || !this._equip) return;
    const ICON = { hospital: '🏥', ubs: '🩺', caps: '🧠', cras: '🤝', brigada_militar: '🛡', bombeiros: '🚒', terminal: '🚌', abrigo: '🏠' };
    tb.innerHTML = this._equip.features.map(f => {
      const p = f.properties;
      const btnMapa = f.geometry
        ? ' <button class="btn btn-outline" style="font-size:9px;padding:1px 6px" onclick="RestingaPage.focar(' +
          f.geometry.coordinates[1] + ',' + f.geometry.coordinates[0] + ",'" + String(p.nome).replace(/'/g, '') + "')\">🗺</button>"
        : '';
      return `
      <tr>
        <td>${ICON[p.tipo] || '📍'} <span style="font-size:10px">${(p.tipo || '').replace('_', ' ')}</span></td>
        <td><b>${p.nome}</b>${btnMapa}${p.observacao ? '<div style="font-size:9px;color:var(--amber)">⚠ ' + p.observacao + '</div>' : ''}</td>
        <td style="font-size:11px">${p.endereco || '—'}${p.bairro ? ' · ' + p.bairro : ''}</td>
        <td class="mono" style="font-size:11px">${p.telefone || '—'}</td>
        <td style="font-size:10px;color:var(--text-3)">${p.fonte}${p.codigo_cnes ? ' · CNES ' + p.codigo_cnes : ''}<br>${this._selo(p.status_verificacao)}</td>
      </tr>`;
    }).join('');
  },

  _renderSetores() {
    const tb = document.getElementById('rt-setores');
    if (!tb || !this._setores) return;
    let pop = 0;
    tb.innerHTML = this._setores.setores.map(s => {
      pop += (+s.pop_estimada || 0);
      const r4 = /muito alto/i.test(s.grau);
      return `
      <tr>
        <td class="mono" style="font-size:10px">${s.codigo_sgb}</td>
        <td style="font-size:11px">${s.tipologia}</td>
        <td><b style="color:${r4 ? 'var(--red)' : 'var(--amber)'}">${s.grau}</b></td>
        <td class="mono">~${(+s.pop_estimada).toLocaleString('pt-BR')}</td>
        <td style="font-size:10px;color:var(--text-3)">${s.observacao || ''}</td>
      </tr>`;
    }).join('') + `
      <tr><td colspan="3" style="font-size:11px"><b>Total mapeado na região</b></td>
      <td class="mono"><b>~${pop.toLocaleString('pt-BR')}</b></td>
      <td style="font-size:10px;color:var(--text-3)">${this._setores.fonte || ''}</td></tr>`;
    const k = document.getElementById('rt-k-setores');
    if (k) { k.textContent = this._setores.setores.length + ' · ~' + pop.toLocaleString('pt-BR') + ' pes.'; k.title = this._setores.fonte || ''; }
  },

  _renderEixos(atencao) {
    const tb = document.getElementById('rt-eixos');
    if (!tb) return;
    const eixos = [
      { via: 'Av. Edgar Pires de Castro', papel: 'Eixo interno/saída leste', nota: 'Alargamento em 2 trechos de 700 m (2025-26, SMSURB) — fase final em fev/2026' },
      { via: 'Av. Juca Batista', papel: 'Saída norte (Zona Sul)', nota: 'Gargalo apontado no diagnóstico do Plano de Mobilidade Urbana' },
      { via: 'Estrada João Antônio da Silveira', papel: 'Eixo interno · acesso ao Hospital', nota: '' },
      { via: 'Av. Cavalhada / eixos da Zona Sul', papel: 'Escoamento ao Centro', nota: 'Fora do bairro, mas crítico ao pendular' },
    ];
    tb.innerHTML = eixos.map(e => `
      <tr>
        <td><b>${e.via}</b></td>
        <td style="font-size:11px">${e.papel}</td>
        <td>${atencao
          ? '<span class="pill pill-amber" style="font-size:9px">⚠ atenção (aviso INMET vigente)</span>'
          : '<span class="pill" style="background:#E4F2EB;color:var(--green-mid);font-size:9px">sem ocorrência registrada</span>'}</td>
        <td style="font-size:10px;color:var(--text-3)">${e.nota}</td>
      </tr>`).join('');
  },

  /* ── mapa ───────────────────────────────────────────────────────────── */
  async verNoMapa() {
    try {
      const f = await this._feature();
      if (!f) return;
      if (window.Router) Router.go('mapa');
      setTimeout(async () => {
        const mapa = GeoOficial._mapa(); if (!mapa) return;
        if (!GeoOficial._layers.bairros || !mapa.hasLayer(GeoOficial._layers.bairros)) await GeoOficial.toggle('bairros');
        try { mapa.fitBounds(L.geoJSON(f).getBounds(), { padding: [30, 30] }); } catch (_) {}
      }, 500);
    } catch (_) {}
  },
};
window.RestingaPage = RestingaPage;
