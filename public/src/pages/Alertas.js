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
                { n:'Camada 1', label:'Limiares Fixos', tempo:'< 5s', status:'Ativo', col:'green',
                  desc:'Cota ANA > 3,5m · Chuva > 80mm/h · Solo > 85%' },
                { n:'Camada 2', label:'Modelo Combinado', tempo:'< 15min', status:'Ativo', col:'green',
                  desc:'Score 0–1 · Fusão sensores IoT + satélite + NWP' },
                { n:'Camada 3', label:'IA LSTM-v3', tempo:'24–48h', status:'Online', col:'green',
                  desc:'F1=0.891 · Acurácia 84% · Retreino mensal' },
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
};
window.AlertasPage = AlertasPage;
