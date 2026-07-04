/**
 * SGA RS — Inicialização por Município
 * Lê o município selecionado (URL, sessionStorage ou padrão)
 * e configura todo o SGA para ele.
 *
 * Adicionar ANTES de app.js no index.html:
 *   <script src="../src/utils/municipioInit.js"></script>
 */

const MunicipioInit = {

  // Base do backend que fornece dados em tempo real (cota, social, etc.)
  API_BASE: 'https://sga-api-1705.onrender.com',

  /**
   * Detecta qual município deve ser carregado e
   * configura o SGA antes da inicialização.
   *
   * Ordem de prioridade:
   * 1. ?municipio= na URL
   * 2. sessionStorage (seleção na tela de escalamento)
   * 3. Município padrão (configurável)
   */
  async init(defaultId = null) {
    // 1. URL
    const params = new URLSearchParams(window.location.search);
    const urlId  = params.get('municipio') || params.get('ibge');

    // 2. SessionStorage
    const ssJson = sessionStorage.getItem('sga_municipio_json');
    const ssId   = sessionStorage.getItem('sga_municipio_id');

    let municipio = null;

    if (urlId) {
      // Tenta por slug, depois por IBGE
      if (/^\d+$/.test(urlId)) {
        municipio = await MunicipioService.ativarPorIBGE(parseInt(urlId));
      } else {
        municipio = await MunicipioService.ativar(urlId);
      }
    } else if (ssJson) {
      try {
        const m = JSON.parse(ssJson);
        municipio = await MunicipioService.ativarPorIBGE(m.cod_ibge);
      } catch(e) {
        municipio = await MunicipioService.ativar(ssId || defaultId);
      }
    } else if (defaultId) {
      municipio = await MunicipioService.ativar(defaultId);
    }

    if (!municipio) {
      console.warn('[MunicipioInit] Nenhum municipio ativo — aguardando selecao');
      return null;
    }

    console.log(`[MunicipioInit] Sistema configurado para: ${municipio.nome}`);
    this.aplicarAoSGA(municipio);

    // Busca dados sociais no backend (assíncrono, não bloqueia a renderização).
    // Se falhar ou demorar, SGA.social permanece vazio e o painel mostra "—".
    this.carregarSocial(municipio.cod_ibge);
    if (window.AnaSensores) AnaSensores.carregar(SGA.config.codIBGE);

    return municipio;
  },

  /**
   * Aplica os dados do município ao estado global do SGA.
   */
  aplicarAoSGA(m) {
    if (typeof SGA === 'undefined') return;

    // Região e mapa
    SGA.config.region    = m.nome;
    SGA.config.mapCenter = [m.lat, m.lng];
    SGA.config.mapZoom   = 12;

    // Limiares padrão por tipo de risco
    if (m.risco.tipo === 'inundacao' || m.risco.tipo === 'misto') {
      SGA.config.alertThresholds.cota  = 3.5;
      SGA.config.alertThresholds.chuva = 80;
    }
    if (m.risco.tipo === 'deslizamento') {
      SGA.config.alertThresholds.solo  = 80;
      SGA.config.alertThresholds.chuva = 60;
    }

    // Atualiza estações para as do município
    SGA.config.estacaoANA     = m.estacoes.ana_cod;
    SGA.config.estaçãoCEMADEN = m.estacoes.cemaden_id;
    SGA.config.codIBGE        = m.cod_ibge;

    // Município ativo
    SGA.config.municipioAtivo = m;

    // ---- Dados sociais (CadÚnico · SUAS · SAMU) ----
    // Inicializa com objetos vazios para garantir que SGA.social sempre exista.
    // O preenchimento real vem de carregarSocial() (backend), de forma assíncrona.
    // Se o município já trouxer m.social no cadastro, usa-o como valor inicial.
    const s = m.social || {};
    SGA.social = {
      cadunico: s.cadunico || {},
      suas:     s.suas     || {},
      samu:     s.samu     || {},
    };
  },

  /**
   * Busca os dados sociais (CadÚnico, SUAS, SAMU) no backend e grava em SGA.social.
   * Tolerante a falha: qualquer erro é registrado e o painel segue exibindo "—".
   *
   * Espera uma resposta JSON no formato:
   * {
   *   "cadunico": { "familias_risco": 0, "bolsa_familia": 0, "pcds_idosos": 0, "criancas": 0 },
   *   "suas":     { "cras": 0, "creas": 0, "acolhimento": 0, "vagas": 0, "assistentes": 0 },
   *   "samu":     { "viaturas": 0, "equipes_bombeiros": 0, "ocorrencias": 0, "tmr_min": 0, "resgates_24h": 0 }
   * }
   * Aceita também a resposta "achatada" (todos os campos no nível raiz) por robustez.
   */
  async carregarSocial(codIBGE) {
    if (typeof SGA === 'undefined' || !codIBGE) return;
    const url = `${this.API_BASE}/api/municipio/${codIBGE}/social`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('[MunicipioInit] /social respondeu ' + resp.status + ' para ' + codIBGE);
        return;
      }
      const data = await resp.json();

      // Normaliza: aceita tanto {cadunico,suas,samu} quanto campos achatados.
      const cadunico = data.cadunico || {
        familias_risco: data.familias_risco,
        bolsa_familia:  data.bolsa_familia,
        pcds_idosos:    data.pcds_idosos,
        criancas:       data.criancas,
      };
      const suas = data.suas || {
        cras:        data.cras,
        creas:       data.creas,
        acolhimento: data.acolhimento,
        vagas:       data.vagas,
        assistentes: data.assistentes,
      };
      const samu = data.samu || {
        viaturas:          data.viaturas,
        equipes_bombeiros: data.equipes_bombeiros,
        ocorrencias:       data.ocorrencias,
        tmr_min:           data.tmr_min,
        resgates_24h:      data.resgates_24h,
      };

      SGA.social = { cadunico, suas, samu };
      console.log('[MunicipioInit] Dados sociais carregados para ' + codIBGE);

      // Se a página de Geodados já estiver aberta, re-renderiza para refletir os dados.
      this._refreshGeodados();
    } catch (e) {
      console.warn('[MunicipioInit] Falha ao buscar dados sociais:', e.message);
      // SGA.social permanece com objetos vazios — GeodadosPage exibe "—".
    }
  },

  /**
   * Re-renderiza a página Geodados se ela estiver visível no momento em que
   * os dados sociais chegarem do backend. Defensivo: só age se as peças existirem.
   */
  _refreshGeodados() {
    try {
      const ativo = document.querySelector('#p-geodados');
      if (ativo && typeof GeodadosPage !== 'undefined' && ativo.parentElement) {
        ativo.outerHTML = GeodadosPage.render();
      }
    } catch (e) {
      // silencioso: refresh é um luxo, não pode quebrar nada
    }
  },

  /**
   * Muda de município sem recarregar a página.
   * Útil para trocar o município diretamente dentro do SGA.
   */
  async trocar(id) {
    const m = await MunicipioService.ativar(id);
    if (!m) return;

    this.aplicarAoSGA(m);
    this.carregarSocial(m.cod_ibge);
    if (window.AnaSensores) AnaSensores.carregar(SGA.config.codIBGE);

    // Atualiza URL
    const url = new URL(window.location.href);
    url.searchParams.set('municipio', id);
    window.history.pushState({}, '', url);

    // Re-inicializa o mapa no novo centro
    if (SGA.maps.main) {
      SGA.maps.main.setView([m.lat, m.lng], 12);
    }
    if (SGA.maps.mini) {
      SGA.maps.mini.setView([m.lat, m.lng], 10);
    }

    console.log(`[MunicipioInit] Município trocado para: ${m.nome}`);
    return m;
  },
};

window.MunicipioInit = MunicipioInit;