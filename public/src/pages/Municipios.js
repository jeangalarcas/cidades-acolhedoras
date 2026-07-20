/**
 * SGA — Página de Municípios RS (497)
 * Tabela interativa com busca, filtros por risco/bacia/mesorregião
 */
const MunicipiosPage = {
  _master:   [],   // lista completa (497) — nunca filtrada
  _todos:    [],   // universo visível (= _master, ou só membros da bacia ativa)
  _filtrado: [],
  _pagina:   0,
  _porPagina: 50,

  render() {
    return `
    <div class="page" id="p-municipios">
      <div class="page-header">
        <div>
          <div class="page-title">Municípios — Rio Grande do Sul</div>
          <div class="page-sub">497 municípios monitoráveis · Clique para ativar no SGA</div>
        </div>
        <div class="page-actions">
          <a href="escalador.html" class="btn btn-primary">🗺 Abrir Escalador</a>
        </div>
      </div>
      <div class="page-body">

        <!-- RESUMO POR RISCO -->
        <div class="metric-grid cols-5" id="mun-resumo">
          <div class="mc error">
            <div class="mc-label">Crítico (5)</div>
            <div class="mc-value" style="color:#7B0000" id="mun-cnt-5">—</div>
          </div>
          <div class="mc error">
            <div class="mc-label">Alto (4)</div>
            <div class="mc-value" style="color:#B83A2E" id="mun-cnt-4">—</div>
          </div>
          <div class="mc warn">
            <div class="mc-label">Médio-Alto (3)</div>
            <div class="mc-value" style="color:#E8A23A" id="mun-cnt-3">—</div>
          </div>
          <div class="mc neutral">
            <div class="mc-label">Médio (2)</div>
            <div class="mc-value" id="mun-cnt-2">—</div>
          </div>
          <div class="mc ok">
            <div class="mc-label">Baixo (1)</div>
            <div class="mc-value" style="color:#4BAF82" id="mun-cnt-1">—</div>
          </div>
        </div>

        <!-- FILTROS -->
        <div class="card">
          <div class="card-body" style="padding:10px 14px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <input id="mun-search" type="text" placeholder="🔍 Buscar município..."
                style="padding:6px 10px;border:1px solid var(--border);border-radius:7px;
                       font-size:12px;font-family:var(--font);width:220px"
                oninput="MunicipiosPage._filtrar()">
              <select id="mun-frisco" class="msel-select" style="width:150px" onchange="MunicipiosPage._filtrar()">
                <option value="">Todos os riscos</option>
                <option value="5">🔴 Crítico</option>
                <option value="4">🟠 Alto</option>
                <option value="3">🟡 Médio-Alto</option>
                <option value="2">🟢 Médio</option>
                <option value="1">⚪ Baixo</option>
              </select>
              <select id="mun-fbacia" class="msel-select" style="width:180px" onchange="MunicipiosPage._filtrar()">
                <option value="">Todas as bacias</option>
                <option value="Gravataí-Jacuí">Gravataí-Jacuí</option>
                <option value="Taquari-Antas">Taquari-Antas</option>
                <option value="Ibicuí">Ibicuí</option>
                <option value="Pelotas">Pelotas</option>
                <option value="Guaíba">Guaíba</option>
                <option value="Mirim-São Gonçalo">Mirim-São Gonçalo</option>
                <option value="Jaguarão">Jaguarão</option>
                <option value="Litoral">Litoral</option>
                <option value="Camaquã">Camaquã</option>
                <option value="Vacacaí">Vacacaí</option>
                <option value="Ijuí">Ijuí</option>
              </select>
              <span id="mun-total-label" style="font-size:11px;color:var(--text-3)">497 municípios</span>
              <button class="btn btn-outline" onclick="MunicipiosPage._limpar()">✕ Limpar</button>
            </div>
          </div>
        </div>

        <!-- TABELA -->
        <div class="card">
          <table class="data-table" id="mun-tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Município</th>
                <th>IBGE</th>
                <th>Mesorregião</th>
                <th>Bacia</th>
                <th>Pop.</th>
                <th>Risco</th>
                <th>Score IA</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody id="mun-tbody">
              <tr><td colspan="9" style="padding:20px;text-align:center;color:var(--text-3)">
                Carregando 497 municípios...
              </td></tr>
            </tbody>
          </table>
          <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border)">
            <button class="btn btn-outline" id="mun-prev" onclick="MunicipiosPage._paginaAnterior()">← Anterior</button>
            <span id="mun-paginfo" style="font-size:11px;color:var(--text-3)">Pág. 1</span>
            <button class="btn btn-outline" id="mun-next" onclick="MunicipiosPage._proximaPagina()">Próxima →</button>
          </div>
        </div>

      </div>
    </div>`;
  },

  // Chamado após renderização
  async iniciar() {
    if (!window.MunicipioService) return;
    this._master = await MunicipioService.carregarTodos();
    this.aplicarBacia();   // aplica (ou não) o recorte da bacia ativa
  },

  /* Modo bacia (Fase 2): restringe o universo aos municípios membros da bacia
     ativa (SGA.config.baciaAtiva, códigos oficiais SEMA). Chamado pelo iniciar()
     e também pelo BaciaMode ao ativar — cobre as duas ordens de carregamento. */
  aplicarBacia() {
    if (!this._master.length) return;               // ainda não carregou
    const b = window.SGA?.config?.baciaAtiva;
    this._todos = b ? this._master.filter(m => b.temMunicipio(m.cod_ibge))
                    : [...this._master];
    this._filtrado = [...this._todos];
    this._pagina = 0;

    // Cabeçalho + filtro de bacia (redundante no modo bacia — nomes informais)
    const sub = document.querySelector('#p-municipios .page-sub');
    if (sub) sub.textContent = b
      ? `Bacia ${b.nome} (${b.codigo}) · ${this._todos.length} municípios membros · Clique para ativar no SGA`
      : '497 municípios monitoráveis · Clique para ativar no SGA';
    const fb = document.getElementById('mun-fbacia');
    if (fb) { fb.style.display = b ? 'none' : ''; if (b) fb.value = ''; }

    this._renderResumo();
    this._renderTabela();
  },

  _renderResumo() {
    const c = {1:0,2:0,3:0,4:0,5:0};
    this._todos.forEach(m => c[m.risco.nivel]++);
    [1,2,3,4,5].forEach(n => {
      const el = document.getElementById(`mun-cnt-${n}`);
      if (el) el.textContent = c[n];
    });
  },

  _renderTabela() {
    const start = this._pagina * this._porPagina;
    const slice = this._filtrado.slice(start, start + this._porPagina);
    const tbody = document.getElementById('mun-tbody');
    if (!tbody) return;

    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="padding:16px;text-align:center;color:var(--text-3)">Nenhum município encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = slice.map((m, idx) => `
      <tr style="cursor:pointer" onclick="MunicipiosPage._ativar('${m.id}')">
        <td style="color:var(--text-3)">${start + idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${m.risco.cor};flex-shrink:0;display:inline-block"></span>
            <strong>${m.nome}</strong>
          </div>
        </td>
        <td class="mono" style="color:var(--text-3)">${m.cod_ibge}</td>
        <td style="font-size:11px">${m.mesorregiao}</td>
        <td style="font-size:11px;color:var(--blue)">${m.bacia_hidrografica}</td>
        <td class="mono">${(m.populacao/1000).toFixed(0)}k</td>
        <td><span class="pill ${this._pillClass(m.risco.nivel)}">${m.risco.nivel_str}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="mono" style="color:${m.risco.cor}">${m.risco.score_ia.toFixed(3)}</span>
            <div style="width:40px;height:4px;background:var(--bg-2);border-radius:2px;overflow:hidden">
              <div style="height:4px;width:${m.risco.score_ia*100}%;background:${m.risco.cor};border-radius:2px"></div>
            </div>
          </div>
        </td>
        <td>
          <button class="btn btn-outline" style="font-size:10px;padding:3px 8px"
            onclick="event.stopPropagation();MunicipiosPage._abrirSGA('${m.id}')">
            ▶ SGA
          </button>
        </td>
      </tr>
    `).join('');

    // Paginação
    const total = this._filtrado.length;
    const totalPags = Math.ceil(total / this._porPagina);
    const label = document.getElementById('mun-paginfo');
    if (label) label.textContent = `Pág. ${this._pagina+1} de ${totalPags} · ${total} municípios`;

    const prev = document.getElementById('mun-prev');
    const next = document.getElementById('mun-next');
    if (prev) prev.disabled = this._pagina === 0;
    if (next) next.disabled = this._pagina >= totalPags - 1;

    const lbl = document.getElementById('mun-total-label');
    if (lbl) lbl.textContent = `${total} município${total!==1?'s':''}`;
  },

  _filtrar() {
    const q     = (document.getElementById('mun-search')?.value || '').toLowerCase();
    const risco = document.getElementById('mun-frisco')?.value;
    const bacia = document.getElementById('mun-fbacia')?.value;

    this._filtrado = this._todos.filter(m => {
      const q_ok = !q || m.nome.toLowerCase().includes(q) ||
                        m.mesorregiao.toLowerCase().includes(q) ||
                        String(m.cod_ibge).includes(q);
      const r_ok = !risco || m.risco.nivel === parseInt(risco);
      const b_ok = !bacia || m.bacia_hidrografica === bacia;
      return q_ok && r_ok && b_ok;
    });
    this._pagina = 0;
    this._renderTabela();
  },

  _limpar() {
    ['mun-search','mun-frisco','mun-fbacia'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this._filtrado = [...this._todos];
    this._pagina = 0;
    this._renderTabela();
  },

  _proximaPagina()  { this._pagina++; this._renderTabela(); },
  _paginaAnterior() { if (this._pagina > 0) { this._pagina--; this._renderTabela(); } },

  async _ativar(id) {
    if (!window.MunicipioService) return;
    const m = await MunicipioService.ativar(id);
    if (m) {
      const el = document.getElementById('sb-municipio-nome');
      if (el) el.textContent = m.nome;
    }
  },

  _abrirSGA(id) {
    sessionStorage.setItem('sga_municipio_id', id);
    window.location.href = 'index.html?municipio=' + id;
  },

  _pillClass(nivel) {
    return {5:'pill-red',4:'pill-red',3:'pill-amber',2:'pill-green',1:'pill-gray'}[nivel]||'pill-gray';
  },
};
window.MunicipiosPage = MunicipiosPage;
