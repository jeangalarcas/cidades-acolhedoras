/**
 * SGA — Central de Alertas
 */
const AlertasPage = {
  _limiares: {
    cota:  SGA?.config?.alertThresholds?.cota  || 3.5,
    chuva: SGA?.config?.alertThresholds?.chuva || 80,
    solo:  SGA?.config?.alertThresholds?.solo  || 85,
  },

  render() {
    return `
    <div class="page" id="p-alertas">
      <div class="page-header">
        <div>
          <div class="page-title">Central de Alertas</div>
          <div class="page-sub">Motor multicamada · 3 camadas independentes</div>
        </div>
        <div class="page-actions">
          <span class="tb-alert-badge">⚠ ${SGA.alertas.length} ALERTAS ATIVOS</span>
        </div>
      </div>
      <div class="page-body">

        <!-- AVISOS OFICIAIS INMET -->
        <div class="card" id="card-inmet" style="margin-bottom:14px">
          <div class="card-header">
            <div class="card-title">📡 Avisos Oficiais — INMET</div>
            <span class="pill" id="inmet-pill">carregando…</span>
          </div>
          <div id="inmet-lista" style="font-size:12px;color:var(--text-2)">Consultando avisos vigentes para o RS…</div>
        </div>

        <div class="g2">
          <!-- ALERTAS ATIVOS -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🔔 Alertas em Curso</div>
              <span class="pill pill-red">${SGA.alertas.length} ativos</span>
            </div>
            ${SGA.alertas.map(a => `
              <div class="alert-row">
                <span class="ar-dot ${a.nivel==='Crítico'?'red':'amber'}"></span>
                <div class="ar-body">
                  <div class="ar-title">${a.titulo}</div>
                  <div class="ar-sub">${a.local} · Score IA: ${a.score} · Fontes: ${a.fontes.join(', ')}</div>
                  <div class="ar-sub" style="margin-top:2px">${a.desc}</div>
                </div>
                <div class="ar-meta">
                  <span class="pill ${a.nivel==='Crítico'?'pill-red':'pill-amber'}">${a.nivel}</span>
                  <div class="ar-time">${a.hora}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- MOTOR DE ALERTAS -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">⚙ Motor de Alertas — 3 Camadas</div>
            </div>
            <div class="card-body">
              ${[
                { n:'Camada 1', label:'Limiares Imediatos', tempo:'tempo real', status:'Ativo', col:'green',
                  desc:'Chuva (Open-Meteo), cota ANA, CAPE e umidade do solo vs limiares do município' },
                { n:'Camada 2', label:'Acumulados CEMADEN', tempo:'1h–24h', status:'Ativo', col:'green',
                  desc:'Chuva acumulada oficial (PED) por município · confirmação de evento em curso' },
                { n:'Camada 3', label:'Tendência 24–48h', tempo:'24–48h', status:'Ativo', col:'green',
                  desc:'Previsão horária Open-Meteo · sem modelos de IA em produção nesta versão' },
              ].map(c => `
                <div style="background:var(--bg);border-radius:8px;padding:10px 12px;margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:11px;font-weight:700">${c.n} — ${c.label}</span>
                    <span class="pill pill-green">${c.status}</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-3)">${c.desc}</div>
                  <div style="font-size:10px;color:var(--text-3);margin-top:2px">Janela: ${c.tempo}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- SIMULADOR DE LIMIARES -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🎚 Simulador de Limiares — Camada 1</div>
          </div>
          <div class="card-body">
            <div class="sim-row">
              <span class="sim-label">💧 Cota do Rio (m)</span>
              <input type="range" class="sim-slider" min="0" max="8" step="0.1"
                value="${this._limiares.cota}"
                oninput="AlertasPage._simUpdate('cota',this.value)">
              <span class="sim-value" id="sim-cota-val">${this._limiares.cota}m</span>
            </div>
            <div class="sim-row">
              <span class="sim-label">🌧 Precipitação (mm/h)</span>
              <input type="range" class="sim-slider" min="0" max="200" step="5"
                value="${this._limiares.chuva}"
                oninput="AlertasPage._simUpdate('chuva',this.value)">
              <span class="sim-value" id="sim-chuva-val">${this._limiares.chuva}mm/h</span>
            </div>
            <div class="sim-row">
              <span class="sim-label">🌱 Saturação do solo (%)</span>
              <input type="range" class="sim-slider" min="0" max="100" step="1"
                value="${this._limiares.solo}"
                oninput="AlertasPage._simUpdate('solo',this.value)">
              <span class="sim-value" id="sim-solo-val">${this._limiares.solo}%</span>
            </div>
            <div id="sim-result" class="sim-result inactive">
              ✅ Dentro dos limiares — nenhum alerta Camada 1
            </div>
          </div>
        </div>

        <!-- ESCALONAMENTO POR CANAL -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📣 Canais por Nível de Alerta</div>
          </div>
          <div class="card-body">
            <div class="data-table" style="font-size:11px">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nível</th><th>Score</th>
                    <th>App</th><th>WhatsApp</th><th>SMS</th>
                    <th>Rádio</th><th>Sirenes</th><th>TV</th>
                    <th>SAMU</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="pill pill-amber">Atenção</span></td>
                    <td class="mono">0.40</td>
                    <td>✅</td><td>✅</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
                  </tr>
                  <tr>
                    <td><span class="pill pill-red">Alto</span></td>
                    <td class="mono">0.65</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>—</td><td>—</td><td>—</td>
                  </tr>
                  <tr>
                    <td><span class="pill pill-red" style="background:#fde">Crítico</span></td>
                    <td class="mono">0.85</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>`;
  },

  _simUpdate(campo, valor) {
    this._limiares[campo] = parseFloat(valor);
    document.getElementById(`sim-${campo}-val`).textContent =
      campo === 'cota' ? `${valor}m` : campo === 'chuva' ? `${valor}mm/h` : `${valor}%`;
    this._simVerificar();
  },

  _simVerificar() {
    const t = SGA.config.alertThresholds;
    const l = this._limiares;
    const ativo = l.cota > t.cota || l.chuva > t.chuva || l.solo > t.solo;
    const el = document.getElementById('sim-result');
    if (!el) return;
    el.className = 'sim-result ' + (ativo ? 'active' : 'inactive');
    el.textContent = ativo
      ? `⚠ ALERTA CAMADA 1 DISPARADO — ${l.cota > t.cota ? 'Cota: '+l.cota+'m ' : ''}${l.chuva > t.chuva ? 'Chuva: '+l.chuva+'mm/h ' : ''}${l.solo > t.solo ? 'Solo: '+l.solo+'%' : ''}`
      : '✅ Dentro dos limiares — nenhum alerta Camada 1';
  },

  async carregarINMET() {
    const lista = document.getElementById('inmet-lista');
    const pill  = document.getElementById('inmet-pill');
    if (!lista || !pill) return;
    try {
      const api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
      const d = await (await fetch(api + '/api/inmet/avisos')).json();
      if (!d.disponivel) {
        pill.textContent = 'indisponível';
        lista.textContent = 'INMET fora do ar no momento — o card volta sozinho quando o serviço retornar.';
        return;
      }
      pill.textContent = d.total_rs + ' vigente(s) no RS';
      pill.className = 'pill ' + (d.total_rs ? 'pill-amber' : 'pill-green');
      if (!d.total_rs) { lista.textContent = 'Nenhum aviso meteorológico vigente para o RS.'; return; }
      lista.innerHTML = d.avisos.map(a => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="width:12px;height:12px;border-radius:3px;background:${a.aviso_cor || '#E6C229'};margin-top:2px;flex-shrink:0"></span>
          <div>
            <b>${a.descricao}</b> · ${a.severidade}
            <div style="font-size:11px;color:var(--text-3)">${a.inicio} → ${a.fim}</div>
            ${a.riscos && a.riscos[0] ? `<div style="font-size:11px;margin-top:2px">${a.riscos[0]}</div>` : ''}
            ${a.instrucoes && a.instrucoes[0] ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">→ ${String(a.instrucoes[0]).slice(0,160)}</div>` : ''}
          </div>
        </div>`).join('');
    } catch (e) {
      pill.textContent = 'erro';
      lista.textContent = 'Falha ao consultar o INMET.';
    }
  },
};
window.AlertasPage = AlertasPage;
setTimeout(() => AlertasPage.carregarINMET && AlertasPage.carregarINMET(), 1200);