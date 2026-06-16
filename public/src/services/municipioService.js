/**
 * SGA RS — Servico de Municipios
 */
const MunicipioService = {
  _todos: null,
  _ativo: null,

  async carregarTodos() {
    if (this._todos) return this._todos;
    try {
      const resp = await fetch('/src/assets/data/municipios_rs.json');
      if (resp.ok) {
        this._todos = await resp.json();
        console.log('[MunicipioService] ' + this._todos.length + ' municipios carregados');
        return this._todos;
      }
    } catch(e) {
      console.warn('[MunicipioService] Erro ao carregar JSON:', e.message);
    }
    this._todos = [];
    return this._todos;
  },

  async ativar(id) {
    const todos = await this.carregarTodos();
    const m = todos.find(function(m){ return m.id === id; });
    if (!m) { console.warn('[MunicipioService] Nao encontrado: ' + id); return null; }
    return this._setAtivo(m);
  },

  async ativarPorIBGE(cod) {
    const todos = await this.carregarTodos();
    const m = todos.find(function(m){ return m.cod_ibge === cod; });
    if (!m) { console.warn('[MunicipioService] IBGE nao encontrado: ' + cod); return null; }
    return this._setAtivo(m);
  },

  async ativarPorNome(nome) {
    const todos = await this.carregarTodos();
    const q = nome.toLowerCase();
    const m = todos.find(function(m){ return m.nome.toLowerCase().includes(q); });
    if (!m) return null;
    return this._setAtivo(m);
  },

  _setAtivo(m) {
    this._ativo = m;
    if (typeof SGA !== 'undefined') {
      SGA.config.municipioAtivo = m;
      SGA.config.region         = m.nome;
      SGA.config.mapCenter      = [m.lat, m.lng];
      SGA.config.mapZoom        = 12;
      SGA.config.codIBGE        = m.cod_ibge;
    }
    console.log('[MunicipioService] Ativo: ' + m.nome + ' — ' + m.risco.nivel_str);
    return m;
  },

  getAtivo() { return this._ativo; },

  async getTodos() { return this.carregarTodos(); },

  async filtrarPorRisco(nivel) {
    const todos = await this.carregarTodos();
    return todos.filter(function(m){ return m.risco.nivel === nivel; });
  },

  async filtrarPorBacia(bacia) {
    const todos = await this.carregarTodos();
    return todos.filter(function(m){ return m.bacia_hidrografica.toLowerCase().includes(bacia.toLowerCase()); });
  },

  async buscar(query) {
    const todos = await this.carregarTodos();
    const q = query.toLowerCase();
    return todos.filter(function(m){
      return m.nome.toLowerCase().includes(q) ||
             m.mesorregiao.toLowerCase().includes(q) ||
             m.microrregiao.toLowerCase().includes(q);
    }).slice(0, 20);
  },

  async topRisco(n) {
    n = n || 10;
    const todos = await this.carregarTodos();
    return todos.slice().sort(function(a,b){ return b.risco.score_ia - a.risco.score_ia; }).slice(0, n);
  },
};

window.MunicipioService = MunicipioService;
