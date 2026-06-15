/**
 * SGA RS — Inicialização por Município
 * Lê o município selecionado (URL, sessionStorage ou padrão)
 * e configura todo o SGA para ele.
 *
 * Adicionar ANTES de app.js no index.html:
 *   <script src="../src/utils/municipioInit.js"></script>
 */

const MunicipioInit = {

  /**
   * Detecta qual município deve ser carregado e
   * configura o SGA antes da inicialização.
   *
   * Ordem de prioridade:
   * 1. ?municipio= na URL
   * 2. sessionStorage (seleção na tela de escalamento)
   * 3. Município padrão (configurável)
   */
  async init(defaultId = 'canoas') {
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
    } else {
      municipio = await MunicipioService.ativar(defaultId);
    }

    if (!municipio) {
      console.warn('[MunicipioInit] Municipio não encontrado, usando padrão:', defaultId);
      municipio = await MunicipioService.ativar(defaultId);
    }

    console.log(`[MunicipioInit] Sistema configurado para: ${municipio.nome}`);
    this.aplicarAoSGA(municipio);
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
  },

  /**
   * Muda de município sem recarregar a página.
   * Útil para trocar o município diretamente dentro do SGA.
   */
  async trocar(id) {
    const m = await MunicipioService.ativar(id);
    if (!m) return;

    this.aplicarAoSGA(m);

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
