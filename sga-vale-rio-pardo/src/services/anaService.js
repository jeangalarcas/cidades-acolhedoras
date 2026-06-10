/**
 * SGA — ANA HidroWeb Service
 * Agência Nacional de Águas e Saneamento Básico
 *
 * API: https://telemetriaws1.ana.gov.br/ServiceANA.asmx
 * Documentação: https://www.snirh.gov.br/hidroweb/
 *
 * PRODUÇÃO: substituir os dados mock pelos retornos reais da API
 */

const ANAService = {

  BASE_URL: 'https://telemetriaws1.ana.gov.br/ServiceANA.asmx',

  // Códigos das estações no Vale do Rio Pardo
  ESTACOES: ['87480000','87600000','87620000','87400000','87520000','87540000'],

  /**
   * Busca dados de cota em tempo real para todas as estações do vale
   * Em produção: chamar a API REST real
   */
  async fetchCotas() {
    try {
      // PRODUÇÃO — descomentar e substituir pelo endpoint real:
      // const url = `${this.BASE_URL}/DadosHidrometeorologicos?codEstacao=${this.ESTACOES.join(',')}&dataInicio=${this._hoje()}&dataFim=${this._hoje()}`;
      // const response = await fetch(url);
      // const data = await response.json();
      // return this._parseCotas(data);

      // MOCK — retorna dados simulados baseados no estado atual
      return SGA.estacoesANA.map(e => ({
        codigo: e.cod,
        nome:   e.nome,
        rio:    e.rio,
        cota:   e.cota,
        vazao:  e.vazao,
        status: e.status,
        timestamp: new Date().toISOString(),
      }));

    } catch (err) {
      console.error('[ANAService] Erro ao buscar cotas:', err);
      return [];
    }
  },

  /**
   * Busca série histórica de uma estação (últimas 72h)
   * @param {string} codigo - Código da estação ANA
   */
  async fetchSerie(codigo) {
    try {
      // PRODUÇÃO:
      // const url = `${this.BASE_URL}/DadosHidrometeorologicos?codEstacao=${codigo}&dataInicio=${this._diasAtras(3)}&dataFim=${this._hoje()}`;
      // const response = await fetch(url);
      // return await response.json();

      // MOCK
      const estacao = SGA.estacoesANA.find(e => e.cod === codigo);
      if (!estacao) return [];
      return Array.from({ length: 72 }, (_, i) => ({
        hora: i,
        cota: +(estacao.cota * (0.6 + (i/72) * 0.8) + Math.random() * 0.1).toFixed(2),
      }));

    } catch (err) {
      console.error('[ANAService] Erro ao buscar série:', err, codigo);
      return [];
    }
  },

  /**
   * Verifica cotas críticas e dispara alertas se necessário
   */
  async checkAlertas() {
    const cotas = await this.fetchCotas();
    cotas.forEach(c => {
      if (c.status === 'Crítico' || c.status === 'Alto') {
        AlertEngine.processarEventoANA(c);
      }
    });
  },

  _hoje() {
    return new Date().toISOString().slice(0,10);
  },

  _diasAtras(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0,10);
  },
};

window.ANAService = ANAService;
