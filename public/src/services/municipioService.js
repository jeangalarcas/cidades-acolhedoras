/**
 * SGA RS â€” ServiÃ§o de MunicÃ­pios
 * Carrega, filtra e configura o sistema para qualquer
 * um dos 497 municÃ­pios do Rio Grande do Sul.
 *
 * USO RÃPIDO:
 *   await MunicipioService.ativar("canoas");
 *   await MunicipioService.ativarPorIBGE(4304606);
 *   await MunicipioService.ativarPorNome("Santa Cruz do Sul");
 */

const MunicipioService = {

  // Dataset completo â€” carregado uma vez
  _todos: null,

  // MunicÃ­pio atualmente ativo
  _ativo: null,

  // â”€â”€ CARREGAMENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Carrega o JSON completo dos 497 municÃ­pios.
   * Usa cache apÃ³s o primeiro carregamento.
   */
  async carregarTodos() {
    if (this._todos) return this._todos;

    try {
      const resp = await fetch('/src/data/municipios_rs.json');
      this._todos = await resp.json();
      console.log(`[MunicipioService] ${this._todos.length} municÃ­pios carregados`);
      return this._todos;
    } catch (e) {
      console.error('[MunicipioService] Erro ao carregar JSON:', e);
      return [];
    }
  },

  // â”€â”€ SELEÃ‡ÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Ativa um municÃ­pio pelo slug (id).
   * @param {string} id - ex: "canoas", "santa-cruz-do-sul"
   */
  async ativar(id) {
    const todos = await this.carregarTodos();
    const m = todos.find(m => m.id === id);
    if (!m) { console.warn(`[MunicipioService] MunicÃ­pio nÃ£o encontrado: ${id}`); return null; }
    return this._setAtivo(m);
  },

  /**
   * Ativa pelo cÃ³digo IBGE.
   * @param {number} cod - ex: 4304606
   */
  async ativarPorIBGE(cod) {
    const todos = await this.carregarTodos();
    const m = todos.find(m => m.cod_ibge === cod);
    if (!m) { console.warn(`[MunicipioService] CÃ³digo IBGE nÃ£o encontrado: ${cod}`); return null; }
    return this._setAtivo(m);
  },

  /**
   * Ativa pelo nome (busca parcial, case-insensitive).
   * @param {string} nome - ex: "Santa Cruz do Sul"
   */
  async ativarPorNome(nome) {
    const todos = await this.carregarTodos();
    const q = nome.toLowerCase();
    const m = todos.find(m => m.nome.toLowerCase().includes(q));
    if (!m) { console.warn(`[MunicipioService] MunicÃ­pio nÃ£o encontrado por nome: ${nome}`); return null; }
    return this._setAtivo(m);
  },

  /**
   * Define o municÃ­pio ativo e atualiza o estado global do SGA.
   */
  _setAtivo(m) {
    this._ativo = m;

    // Atualiza estado global se o SGA estiver inicializado
    if (typeof SGA !== 'undefined') {
      SGA.config.municipioAtivo = m;
      SGA.config.region = m.nome;
      SGA.config.mapCenter = [m.lat, m.lng];
      SGA.config.mapZoom = 12;
      SGA.config.codIBGE = m.cod_ibge;
      SGA.config.risco = m.risco;
    }

    console.log(`[MunicipioService] Ativo: ${m.nome} (${m.cod_ibge}) â€” Risco ${m.risco.nivel_str}`);
    return m;
  },

  // â”€â”€ GETTERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Retorna o municÃ­pio atualmente ativo. */
  getAtivo() { return this._ativo; },

  /** Retorna todos os municÃ­pios carregados. */
  async getTodos() { return this.carregarTodos(); },

  // â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** MunicÃ­pios por nÃ­vel de risco (1â€“5). */
  async filtrarPorRisco(nivel) {
    const todos = await this.carregarTodos();
    return todos.filter(m => m.risco.nivel === nivel);
  },

  /** MunicÃ­pios por mesorregiÃ£o. */
  async filtrarPorMesorregiao(meso) {
    const todos = await this.carregarTodos();
    return todos.filter(m => m.mesorregiao.toLowerCase().includes(meso.toLowerCase()));
  },

  /** MunicÃ­pios por bacia hidrogrÃ¡fica. */
  async filtrarPorBacia(bacia) {
    const todos = await this.carregarTodos();
    return todos.filter(m => m.bacia_hidrografica.toLowerCase().includes(bacia.toLowerCase()));
  },

  /** Busca por nome (para campo de busca). */
  async buscar(query) {
    const todos = await this.carregarTodos();
    const q = query.toLowerCase();
    return todos.filter(m =>
      m.nome.toLowerCase().includes(q) ||
      m.mesorregiao.toLowerCase().includes(q) ||
      m.microrregiao.toLowerCase().includes(q)
    ).slice(0, 20);
  },

  // â”€â”€ ESTATÃSTICAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Resumo por nÃ­vel de risco. */
  async resumoPorRisco() {
    const todos = await this.carregarTodos();
    const resumo = { CrÃ­tico:[], Alto:[], 'MÃ©dio-Alto':[], MÃ©dio:[], Baixo:[] };
    todos.forEach(m => {
      if (resumo[m.risco.nivel_str]) resumo[m.risco.nivel_str].push(m);
    });
    return resumo;
  },

  /** Top N municÃ­pios com maior score de risco. */
  async topRisco(n = 10) {
    const todos = await this.carregarTodos();
    return [...todos]
      .sort((a,b) => b.risco.score_ia - a.risco.score_ia)
      .slice(0, n);
  },

  // â”€â”€ EXPORTAÃ‡ÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Retorna o municÃ­pio ativo como config pronta para o SGA. */
  getConfigAtivo() {
    const m = this._ativo;
    if (!m) return null;
    return {
      municipio:        m.nome,
      cod_ibge:         m.cod_ibge,
      lat:              m.lat,
      lng:              m.lng,
      populacao:        m.populacao,
      mesorregiao:      m.mesorregiao,
      bacia:            m.bacia_hidrografica,
      risco_nivel:      m.risco.nivel,
      risco_tipo:       m.risco.tipo,
      score_ia:         m.risco.score_ia,
      ana_cod:          m.estacoes.ana_cod,
      cemaden_id:       m.estacoes.cemaden_id,
    };
  },
};

window.MunicipioService = MunicipioService;


