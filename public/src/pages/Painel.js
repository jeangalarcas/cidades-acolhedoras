/**
 * SGA v3 — Painel Geral
 * Exibe dados do municipio ou bacia ativa
 * Sem referencias hardcoded ao Vale do Rio Pardo
 */
const PainelPage = {
  render() {
    return `<div class="page" id="p-painel">
      <div class="page-header">
        <div>
          <div class="page-title">Painel Geral</div>
          <div class="page-sub" id="painel-sub">Selecione um municipio ou bacia para monitorar</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ana">ANA HidroWeb</span>
          <span class="ds-badge ds-cem">CEMADEN</span>
          <span class="ds-badge ds-cprm">CPRM</span>
          <span class="ds-badge ds-ai">IA LSTM-v3</span>
          <button class="btn btn-outline" onclick="PainelPage.atualizar()">Atualizar</button>
        </div>
      </div>
      <div class="page-body" id="painel-body">
        ${PainelPage._renderSemMunicipio()}
      </div>
    </div>`;
  },

  _renderSemMunicipio() {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px;color:var(--text-3)">
      <div style="font-size:40px">&#127759;</div>
      <div style="font-size:16px;font-weight:700;color:var(--text)">Nenhum municipio selecionado</div>
      <div style="font-size:13px;text-align:center;max-width:400px">
        Para visualizar o painel de monitoramento, selecione um municipio ou bacia hidrografica do Rio Grande do Sul.
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;justify-content:center">
        <a href="selecionar.html" style="background:var(--green-mid);color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">
          Selecionar Municipio / Bacia
        </a>
        <button onclick="go('municipios')" style="background:var(--white);color:var(--green-mid);border:2px solid var(--green-mid);padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">
          Ver 497 Municipios do RS
        </button>
      </div>
    </div>
    <!-- RESUMO GERAL DO ESTADO mesmo sem municipio ativo -->
    <div style="margin-top:16px">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Rio Grande do Sul — Situacao Geral</div>
          <span class="pill pill-green">Estavel</span>
        </div>
        <div class="metric-grid cols-5" style="padding:14px">
          <div class="mc ok">
            <div class="mc-label">Municipios RS</div>
            <div class="mc-value" style="color:var(--green-mid)">497</div>
            <div class="mc-sub">Monitorados</div>
          </div>
          <div class="mc blue">
            <div class="mc-label">Bacias Hidrografica</div>
            <div class="mc-value" style="color:var(--blue)">9</div>
            <div class="mc-sub">Mapeadas</div>
          </div>
          <div class="mc ok">
            <div class="mc-label">Populacao RS</div>
            <div class="mc-value" style="color:var(--green-mid)">10.8M</div>
            <div class="mc-sub">Censo 2022</div>
          </div>
          <div class="mc blue">
            <div class="mc-label">Estacoes ANA</div>
            <div class="mc-value" style="color:var(--blue)">85</div>
            <div class="mc-sub">INMET Operantes</div>
          </div>
          <div class="mc ok">
            <div class="mc-label">Dados Climaticos</div>
            <div class="mc-value" style="color:var(--green-mid)">72h</div>
            <div class="mc-sub">Previsao Open-Meteo</div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async atualizar() {
    var m = SGA.config.municipioAtivo;
    if (!m) return;

    var sub = document.getElementById('painel-sub');
    if (sub) sub.textContent = m.nome + ' / RS · Atualizado em tempo real';

    var body = document.getElementById('painel-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-3)">Buscando dados para '+m.nome+'...</div>';

    var dados = await DataService.buscarTudo(m);
    SGA.alertasAtivos = (dados && dados.alertas) || [];
    if (window.RegistroAlertas) RegistroAlertas.sincronizar(SGA.alertasAtivos, SGA.municipioAtivo || {});
    if (window.TopBar && TopBar.atualizarAlertas) TopBar.atualizarAlertas();
    if (!dados) { body.innerHTML = PainelPage._renderSemMunicipio(); return; }

    var p  = dados.previsao;
    var c  = dados.cota;
    var al = dados.alertas;
    var sc = dados.score;
    var ri = dados.risco;
    var agora = p?.agora || {};
    var prox6 = p?.proximas6h || {};
    var dias  = p?.previsao_dias || [];

    var corScore = ri?.cor || '#4BAF82';
    var corCota  = !c?.cota_m ? '#888' : c.status==='Emergencia'?'var(--red)':c.status==='Alerta'?'var(--amber)':'var(--green-mid)';

    body.innerHTML = `
      <!-- MÉTRICAS -->
      <div class="metric-grid cols-5" style="margin-bottom:14px">
        <div class="mc" style="border-top:3px solid ${corScore}">
          <div class="mc-label">Score Risco IA</div>
          <div class="mc-value" style="color:${corScore}">${sc.toFixed(2)}</div>
          <div class="mc-sub">${ri.str}</div>
        </div>
        <div class="mc ${al.length>0?'error':'ok'}">
          <div class="mc-label">Alertas Ativos</div>
          <div class="mc-value" style="color:${al.length>0?'var(--red)':'var(--green-mid)'}">${al.length}</div>
          <div class="mc-sub">${al.length>0?al[0].nivel:'Normal'}</div>
        </div>
        <div class="mc blue">
          <div class="mc-label">Chuva Agora</div>
          <div class="mc-value" style="color:var(--blue)">${(agora.precipitacao_mmh||0).toFixed(1)}</div>
          <div class="mc-sub">mm/h</div>
        </div>
        <div class="mc ${prox6.precip_acum_mm>30?'warn':'ok'}">
          <div class="mc-label">Acum 6h</div>
          <div class="mc-value" style="color:${prox6.precip_acum_mm>30?'var(--amber)':'var(--green-mid)'}">${(prox6.precip_acum_mm||0).toFixed(0)}</div>
          <div class="mc-sub">mm</div>
        </div>
        <div class="mc">
          <div class="mc-label">Rio / Cota</div>
          <div class="mc-value" style="color:${corCota}">${c?.cota_m ?? 'N/D'}</div>
          <div class="mc-sub">${c?.status||'N/D'}</div>
        </div>
      </div>

      <div class="g2" style="margin-bottom:14px">
        <!-- ALERTAS -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Alertas — ${m.nome}</div>
            <span class="pill ${al.length>0?'pill-red':'pill-green'}">${al.length} ${al.length===1?'alerta':'alertas'}</span>
          </div>
          ${al.length===0
            ?`<div style="padding:20px;text-align:center;color:var(--green-mid);font-size:13px;font-weight:600">Situacao normal — sem alertas ativos</div>`
            :al.map(function(a){ return `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
                <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:${a.nivel==='Critico'?'var(--red)':a.nivel==='Alto'?'var(--amber)':'#C9B830'};display:inline-block"></span>
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:700">${a.titulo}</div>
                  <div style="font-size:11px;color:var(--text-2);margin-top:2px">${a.desc}</div>
                  <div style="font-size:9px;color:var(--text-3);margin-top:2px">${a.fontes.join(' · ')} · ${a.hora}</div>
                </div>
                <span class="pill ${a.nivel==='Critico'?'pill-red':a.nivel==='Alto'?'pill-amber':'pill-green'}" style="flex-shrink:0">${a.nivel}</span>
              </div>`;}).join('')}
        </div>

        <!-- PREVISÃO 3 DIAS -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Previsao 3 dias — ${m.nome}</div>
            <span style="font-size:9px;color:var(--text-3)">Open-Meteo ECMWF</span>
          </div>
          ${dias.slice(0,3).map(function(dia){
            var dt = new Date(dia.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
            var cor = dia.precip_mm>30?'var(--red)':dia.precip_mm>10?'var(--amber)':'var(--green-mid)';
            return `<div style="display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);gap:10px">
              <div style="font-size:11px;font-weight:700;min-width:80px;color:var(--text-2)">${dt}</div>
              <div style="flex:1;background:var(--border);border-radius:3px;height:5px;overflow:hidden">
                <div style="height:5px;border-radius:3px;background:${cor};width:${Math.min(dia.precip_mm/60*100,100)}%"></div>
              </div>
              <div style="font-size:11px;font-weight:700;color:${cor};min-width:45px;text-align:right">${dia.precip_mm.toFixed(1)}mm</div>
              <div style="font-size:10px;color:var(--text-3)">${dia.prob_max_pct}%</div>
              <div style="font-size:10px;color:var(--text-3)">${(dia.temp_max_c||0).toFixed(0)}/${(dia.temp_min_c||0).toFixed(0)}C</div>
            </div>`;}).join('')}
        </div>
      </div>

      <!-- MINI-MAPA -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Mapa de Risco — ${m.nome}</div>
          <button class="btn btn-outline" onclick="go('mapa')">Mapa completo</button>
        </div>
        <div id="mini-map" style="height:300px;border-radius:0 0 10px 10px"></div>
      </div>
    `;

    // Re-inicializar mini-mapa centrado no município
    SGA.ui.miniMapInited = false;
    setTimeout(function() { MapUtils.initMiniMap(); }, 200);
  },
};

window.PainelPage = PainelPage;
