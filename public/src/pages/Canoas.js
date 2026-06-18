const CanoasPage = {
  _mapa: null,
  _api: window.SGA_API_URL || 'https://sga-api-1705.onrender.com',

  render() {
    return `<div class="page" id="p-canoas">
      <div class="page-header">
        <div>
          <div class="page-title">Canoas RS — Tempo Real</div>
          <div class="page-sub">ANA HidroWeb · CEMADEN · CadUnico · Bairros</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ana">ANA</span>
          <span class="ds-badge ds-cem">CEMADEN</span>
          <span class="ds-badge ds-cad">CadUnico</span>
          <button class="btn btn-outline" onclick="CanoasPage.atualizar()">Atualizar</button>
        </div>
      </div>
      <div class="page-body" id="canoas-body">
        <div style="padding:40px;text-align:center;color:var(--text-3)">
          <div style="font-size:24px;margin-bottom:8px">Carregando dados de Canoas...</div>
        </div>
      </div>
    </div>`;
  },

  async atualizar() {
    const body = document.getElementById('canoas-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-3)">Buscando dados...</div>';
    try {
      const [sRes, bRes, aRes] = await Promise.all([
        fetch(this._api + '/api/canoas/status'),
        fetch(this._api + '/api/canoas/bairros'),
        fetch(this._api + '/api/canoas/abrigos'),
      ]);
      const status  = sRes.ok ? await sRes.json() : {};
      const bairros = bRes.ok ? await bRes.json() : [];
      const abrigos = aRes.ok ? await aRes.json() : [];
      this._render(body, status, bairros, abrigos);
    } catch(e) {
      this._renderOffline(body);
    }
  },

  _render(body, s, bairros, abrigos) {
    const cota    = s.cota    || { cota_m: '--', status: 'Normal' };
    const alertas = s.alertas || [];
    const score   = s.score_atual || 0;
    const vagas   = abrigos.reduce((t,a) => t + Math.round((a.capacidade||0)*.7), 0);
    const corCota = cota.status === 'Emergencia'?'var(--red)':cota.status==='Alerta'?'var(--amber)':'var(--green-mid)';

    body.innerHTML = `
      <div class="metric-grid cols-5" style="margin-bottom:12px">
        <div class="mc" style="border-top:3px solid ${corCota}">
          <div class="mc-label">Rio Gravataí</div>
          <div class="mc-value" style="color:${corCota}">${cota.cota_m}m</div>
          <div class="mc-sub">${cota.status||'Normal'}</div>
        </div>
        <div class="mc ${alertas.length>0?'error':'ok'}">
          <div class="mc-label">Alertas</div>
          <div class="mc-value" style="color:${alertas.length>0?'var(--red)':'var(--green-mid)'}">${alertas.length}</div>
          <div class="mc-sub">${alertas.length>0?alertas[0].nivel:'Normal'}</div>
        </div>
        <div class="mc blue">
          <div class="mc-label">Bairros</div>
          <div class="mc-value" style="color:var(--blue)">${bairros.length}</div>
          <div class="mc-sub">Monitorados</div>
        </div>
        <div class="mc ok">
          <div class="mc-label">Vagas Abrigos</div>
          <div class="mc-value" style="color:var(--green-mid)">${vagas.toLocaleString('pt-BR')}</div>
          <div class="mc-sub">${abrigos.length} abrigos</div>
        </div>
        <div class="mc ${score>=.65?'error':score>=.40?'warn':'ok'}">
          <div class="mc-label">Score Risco</div>
          <div class="mc-value" style="color:${score>=.65?'var(--red)':score>=.40?'var(--amber)':'var(--green-mid)'}">${score.toFixed(2)}</div>
          <div class="mc-sub">Indice IA</div>
        </div>
      </div>
      <div class="g2">
        <div class="card">
          <div class="card-header"><div class="card-title">Alertas — Canoas</div>
            <span class="pill ${alertas.length>0?'pill-red':'pill-green'}">${alertas.length} alertas</span>
          </div>
          ${alertas.length===0
            ? '<div style="padding:20px;text-align:center;color:var(--green-mid);font-size:13px">Situacao normal — sem alertas</div>'
            : alertas.map(a=>`<div class="alert-row">
                <span class="ar-dot ${a.nivel==='Critico'?'red':'amber'}"></span>
                <div class="ar-body"><div class="ar-title">${a.titulo}</div><div class="ar-sub">${a.desc}</div></div>
                <span class="pill ${a.nivel==='Critico'?'pill-red':'pill-amber'}">${a.nivel}</span>
              </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Bairros por Risco</div></div>
          <div style="overflow-y:auto;max-height:280px">
            ${bairros.map(b=>{
              const cor=b.risco===4?'#7B0000':b.risco===3?'#B83A2E':b.risco===2?'#E8A23A':'#4BAF82';
              return `<div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:1px solid var(--border)">
                <span style="width:8px;height:8px;border-radius:50%;background:${cor};flex-shrink:0"></span>
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:700">${b.nome}</div>
                  <div style="font-size:10px;color:var(--text-3)">${(b.populacao||0).toLocaleString('pt-BR')} hab · ${(b.familias_cadunico||0).toLocaleString('pt-BR')} fam. CadUnico</div>
                </div>
                <span class="pill ${b.risco>=4?'pill-red':b.risco===3?'pill-amber':'pill-green'}">${b.risco_str}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="g2" style="margin-top:12px">
        <div class="card">
          <div class="card-header"><div class="card-title">Abrigos de Emergencia</div></div>
          <div class="card-body">
            ${abrigos.map(a=>`<div style="background:var(--bg);border-radius:8px;padding:10px 12px;margin-bottom:8px">
              <div style="font-size:12px;font-weight:700;margin-bottom:2px">${a.nome}</div>
              <div style="font-size:10px;color:var(--text-3)">${a.endereco}</div>
              <div style="display:flex;gap:12px;margin-top:5px;font-size:11px">
                <span>Cap: <b>${(a.capacidade||0).toLocaleString('pt-BR')}</b></span>
                <span>PCD: <b>${a.acessivel_pcd?'Sim':'Nao'}</b></span>
                <span>Cota: <b>${a.cota_seguranca_m}m</b></span>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Mapa — Bairros e Abrigos</div></div>
          <div id="mapa-canoas" style="height:320px;border-radius:0 0 10px 10px"></div>
        </div>
      </div>`;

    setTimeout(() => this._mapa_init(bairros, abrigos), 100);
  },

  _mapa_init(bairros, abrigos) {
    if (this._mapa) { this._mapa.remove(); this._mapa = null; }
    const el = document.getElementById('mapa-canoas');
    if (!el || typeof L === 'undefined') return;
    this._mapa = L.map('mapa-canoas').setView([-29.9178,-51.1836], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'(c) OSM',maxZoom:18}).addTo(this._mapa);
    bairros.forEach(b => {
      const cor = b.risco===4?'#7B0000':b.risco===3?'#B83A2E':b.risco===2?'#E8A23A':'#4BAF82';
      L.marker([b.lat,b.lng],{icon:L.divIcon({className:'',html:`<div style="width:12px;height:12px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,iconSize:[12,12]})})
        .bindPopup(`<b>${b.nome}</b><br>Risco: ${b.risco_str}<br>Pop: ${(b.populacao||0).toLocaleString('pt-BR')}`)
        .addTo(this._mapa);
    });
    abrigos.forEach(a => {
      L.marker([a.lat,a.lng],{icon:L.divIcon({className:'',html:`<div style="width:16px;height:16px;border-radius:3px;background:#2D7A5C;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">A</div>`,iconSize:[16,16]})})
        .bindPopup(`<b>${a.nome}</b><br>Cap: ${(a.capacidade||0).toLocaleString('pt-BR')}`)
        .addTo(this._mapa);
    });
  },

  _renderOffline(body) {
    fetch('/src/assets/data/canoas_dados.json')
      .then(r=>r.json())
      .then(d=>this._render(body,{cota:{cota_m:2.1,status:'Normal'},alertas:[],score_atual:0.21},d.bairros||[],d.abrigos||[]))
      .catch(()=>{ body.innerHTML='<div style="padding:20px;color:var(--text-3)">Dados de Canoas indisponiveis no momento.</div>'; });
  },
};
window.CanoasPage = CanoasPage;