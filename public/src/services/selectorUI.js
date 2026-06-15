/**
 * SGA RS — Selector UI
 * Interface visual para selecionar qualquer município do RS.
 * Inclui: busca por nome, mapa miniatura, filtros por região/risco.
 *
 * Uso:
 *   SelectorUI.montar('#container');   // renderiza o seletor
 *   SelectorUI.aoSelecionar(fn);       // callback quando usuário escolhe
 */

const SelectorUI = {

  _container: null,
  _onSelect:  null,
  _todos:     [],

  // ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────

  async montar(selectorOuEl) {
    this._container = typeof selectorOuEl === 'string'
      ? document.querySelector(selectorOuEl)
      : selectorOuEl;

    if (!this._container) return;

    this._todos = await MunicipioService.carregarTodos();
    this._render();
    this._bindEvents();
  },

  aoSelecionar(fn) { this._onSelect = fn; },

  // ── RENDER ────────────────────────────────────────────────────────────────

  _render() {
    const resumo = this._resumo();
    this._container.innerHTML = `
      <div class="msel-wrap">
        <div class="msel-header">
          <div class="msel-title">🗺 Selecionar Município</div>
          <div class="msel-stats">
            <span class="msel-stat" style="color:#7B0000">● ${resumo[5]} Crítico</span>
            <span class="msel-stat" style="color:#B83A2E">● ${resumo[4]} Alto</span>
            <span class="msel-stat" style="color:#E8A23A">● ${resumo[3]} Médio-Alto</span>
            <span class="msel-stat" style="color:#888">● ${resumo[2]+resumo[1]} Médio/Baixo</span>
          </div>
        </div>

        <div class="msel-search-row">
          <input
            id="msel-input"
            class="msel-input"
            type="text"
            placeholder="🔍  Buscar município..."
            autocomplete="off"
          />
          <select id="msel-filtro-risco" class="msel-select">
            <option value="">Todos os riscos</option>
            <option value="5">🔴 Crítico</option>
            <option value="4">🟠 Alto</option>
            <option value="3">🟡 Médio-Alto</option>
            <option value="2">🟢 Médio</option>
            <option value="1">⚪ Baixo</option>
          </select>
          <select id="msel-filtro-meso" class="msel-select">
            <option value="">Todas as regiões</option>
            ${this._mesorregioes().map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>

        <div id="msel-results" class="msel-results">
          ${this._renderLista(this._todos.slice(0,50))}
        </div>

        <div class="msel-footer">
          <span id="msel-count">${this._todos.length} municípios disponíveis</span>
        </div>
      </div>
    `;
  },

  _renderLista(municipios) {
    if (!municipios.length) return '<div class="msel-empty">Nenhum município encontrado</div>';
    return municipios.map(m => `
      <div class="msel-item" data-id="${m.id}" data-ibge="${m.cod_ibge}">
        <span class="msel-dot" style="background:${m.risco.cor}"></span>
        <div class="msel-info">
          <div class="msel-nome">${m.nome}</div>
          <div class="msel-sub">${m.microrregiao} · ${m.bacia_hidrografica} · ${m.populacao.toLocaleString('pt-BR')} hab.</div>
        </div>
        <span class="msel-nivel" style="color:${m.risco.cor}">${m.risco.nivel_str}</span>
      </div>
    `).join('');
  },

  // ── EVENTOS ───────────────────────────────────────────────────────────────

  _bindEvents() {
    const input = document.getElementById('msel-input');
    const filtroRisco = document.getElementById('msel-filtro-risco');
    const filtroMeso  = document.getElementById('msel-filtro-meso');
    const results = document.getElementById('msel-results');

    const atualizar = () => {
      const q      = input.value.toLowerCase().trim();
      const risco  = filtroRisco.value ? parseInt(filtroRisco.value) : null;
      const meso   = filtroMeso.value;

      let lista = this._todos;
      if (q)     lista = lista.filter(m =>
        m.nome.toLowerCase().includes(q) ||
        m.microrregiao.toLowerCase().includes(q)
      );
      if (risco) lista = lista.filter(m => m.risco.nivel === risco);
      if (meso)  lista = lista.filter(m => m.mesorregiao === meso);

      const exibir = lista.slice(0, 100);
      results.innerHTML = this._renderLista(exibir);
      document.getElementById('msel-count').textContent =
        `${lista.length} município${lista.length!==1?'s':''} encontrado${lista.length!==1?'s':''}`;

      // Re-bind cliques
      results.querySelectorAll('.msel-item').forEach(el => {
        el.addEventListener('click', () => this._selecionar(el.dataset.id));
      });
    };

    input.addEventListener('input', atualizar);
    filtroRisco.addEventListener('change', atualizar);
    filtroMeso.addEventListener('change', atualizar);

    // Bind cliques iniciais
    results.querySelectorAll('.msel-item').forEach(el => {
      el.addEventListener('click', () => this._selecionar(el.dataset.id));
    });
  },

  async _selecionar(id) {
    const m = await MunicipioService.ativar(id);
    if (!m) return;

    // Destaca item selecionado
    document.querySelectorAll('.msel-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.msel-item[data-id="${id}"]`);
    if (el) el.classList.add('active');

    // Chama callback
    if (this._onSelect) this._onSelect(m);
  },

  // ── HELPERS ───────────────────────────────────────────────────────────────

  _resumo() {
    const r = {1:0,2:0,3:0,4:0,5:0};
    this._todos.forEach(m => r[m.risco.nivel]++);
    return r;
  },

  _mesorregioes() {
    return [...new Set(this._todos.map(m => m.mesorregiao))].sort();
  },
};

window.SelectorUI = SelectorUI;
