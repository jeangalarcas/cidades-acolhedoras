/**
 * SGA — Painel Geral
 */
const PainelPage = {
  render() {
    const alertasCriticos = SGA.alertas.filter(a => a.nivel === 'Crítico').length;
    const alertasAlto     = SGA.alertas.filter(a => a.nivel === 'Alto').length;
    const popRisco        = SGA.municipios.filter(m => m.score >= 0.65).reduce((s,m) => s + m.pop, 0);
    const sensoresTotal   = SGA.sensoresHidro.length + SGA.sensoresPluvio.length + SGA.sensoresSolo.length;
    const abrigosVagas    = SGA.abrigos.reduce((s,a) => s + Math.round(a.cap*(1-a.ocup/100)), 0);

    return `
    <div class="page" id="p-painel">
      <div class="page-header">
        <div>
          <div class="page-title">Painel Geral</div>
          <div class="page-sub">Vale do Rio Pardo · Atualizado em tempo real</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ana">ANA HidroWeb</span>
          <span class="ds-badge ds-cem">CEMADEN</span>
          <span class="ds-badge ds-cprm">CPRM</span>
          <span class="ds-badge ds-ai">IA LSTM-v3</span>
        </div>
      </div>
      <div class="page-body">

        <!-- MÉTRICAS PRINCIPAIS -->
        <div class="metric-grid cols-5">
          <div class="mc error">
            <div class="mc-label">Alertas Críticos</div>
            <div class="mc-value" style="color:#B83A2E">${alertasCriticos}</div>
            <div class="mc-sub error">Ação imediata</div>
          </div>
          <div class="mc warn">
            <div class="mc-label">Alertas Altos</div>
            <div class="mc-value" style="color:#C17D2A">${alertasAlto}</div>
            <div class="mc-sub warn">Monitoramento intensivo</div>
          </div>
          <div class="mc blue">
            <div class="mc-label">Sensores Ativos</div>
            <div class="mc-value" style="color:#2A5A8C">${sensoresTotal - 1}</div>
            <div class="mc-sub blue">1 offline</div>
          </div>
          <div class="mc ok">
            <div class="mc-label">Vagas em Abrigos</div>
            <div class="mc-value" style="color:#2D7A5C">${abrigosVagas.toLocaleString('pt-BR')}</div>
            <div class="mc-sub ok">4 abrigos ativos</div>
          </div>
          <div class="mc error">
            <div class="mc-label">Pop. em Risco</div>
            <div class="mc-value" style="color:#B83A2E">${(popRisco/1000).toFixed(0)}k</div>
            <div class="mc-sub error">Score IA > 0.65</div>
          </div>
        </div>

        <div class="g2">
          <!-- ALERTAS ATIVOS -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🔔 Alertas Ativos</div>
              <button class="btn btn-outline" onclick="go('alertas')">Ver todos</button>
            </div>
            ${SGA.alertas.map(a => `
              <div class="alert-row">
                <span class="ar-dot ${a.nivel==='Crítico'?'red':'amber'}"></span>
                <div class="ar-body">
                  <div class="ar-title">${a.titulo}</div>
                  <div class="ar-sub">${a.local} · ${a.desc}</div>
                </div>
                <div class="ar-meta">
                  <span class="pill ${a.nivel==='Crítico'?'pill-red':'pill-amber'}">${a.nivel}</span>
                  <div class="ar-time">${a.hora}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- IA PREDITIVA -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🧠 IA Preditiva — Próximas 24h</div>
              <button class="btn btn-outline" onclick="go('ia')">Detalhes</button>
            </div>
            <div class="card-body">
              ${[
                { nome:'Rio Pardo',       pct:94, classe:'high',   detalhe:'Cota 4,8m · Pico 16h' },
                { nome:'Santa Cruz do Sul',pct:72, classe:'medium', detalhe:'Pardinho 3,9m · TR 25a' },
                { nome:'Venâncio Aires',  pct:64, classe:'medium', detalhe:'Rio Pardo subindo' },
                { nome:'General Câmara',  pct:55, classe:'low',    detalhe:'Atenção — Jacuí' },
              ].map(p => `
                <div class="ia-pred ${p.classe}">
                  <div class="ia-pct ${p.classe}">${p.pct}%</div>
                  <div>
                    <div class="ia-name">${p.nome}</div>
                    <div class="ia-detail">${p.detalhe}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="g2">
          <!-- MINI MAPA -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🗺 Mapa de Risco — Vale do Rio Pardo</div>
              <button class="btn btn-outline" onclick="go('mapa')">Mapa completo</button>
            </div>
            <div id="mini-map" style="height:260px;border-radius:0 0 10px 10px"></div>
          </div>

          <!-- RANKING MUNICÍPIOS -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🏙 Municípios por Risco</div>
              <button class="btn btn-outline" onclick="go('municipios')">Ver 497 municípios</button>
            </div>
            <div class="card-body" style="padding:8px 0">
              ${SGA.municipios.slice(0,8).map((m,i) => `
                <div class="muni-row">
                  <span class="muni-rank">${i+1}</span>
                  <span class="muni-name">${m.name}</span>
                  <span class="muni-pop">${(m.pop/1000).toFixed(0)}k</span>
                  <span class="muni-score" style="color:${m.col}">${m.score.toFixed(2)}</span>
                  <div class="muni-bar-wrap">
                    <div class="muni-bar-bg">
                      <div class="muni-bar-fill" style="width:${m.score*100}%;background:${m.col}"></div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- FLUXO DE DECISÃO -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚙ Fluxo de Decisão — Status Atual</div>
            <button class="btn btn-outline" onclick="go('fluxo')">Detalhes</button>
          </div>
          <div class="flow-steps">
            ${[
              { label:'Detecção\nSensor', status:'done' },
              { label:'Validação\nIA', status:'done' },
              { label:'Alerta\nEmitido', status:'active' },
              { label:'Notif.\nPopulação', status:'active' },
              { label:'Defesa\nCivil', status:'pending' },
              { label:'Evacuação\nAssistida', status:'pending' },
              { label:'Abrigo\nAtivado', status:'pending' },
            ].map(s => `
              <div class="flow-step">
                <div class="flow-connector ${s.status}"></div>
                <div class="flow-circle ${s.status}">${s.status==='done'?'✓':s.status==='active'?'⚡':'○'}</div>
                <div class="flow-label ${s.status}" style="white-space:pre-line;font-size:9px">${s.label}</div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>`;
  },
};
window.PainelPage = PainelPage;
