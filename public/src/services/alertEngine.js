/**
 * SGA — Alert Engine
 * Motor de alertas multicamada:
 *   Camada 1: Limiares fixos (<5s)
 *   Camada 2: Modelo combinado (score 0-1)
 *   Camada 3: IA preditiva LSTM (24-48h)
 */

const AlertEngine = {

  /** Avalia todas as camadas para um conjunto de leituras */
  avaliar(leituras) {
    const alertas = [];

    leituras.forEach(l => {
      // Camada 1 — limiares fixos
      const c1 = this.camada1(l);
      if (c1) alertas.push(c1);

      // Camada 2 — modelo combinado
      const score = this.calcScore(l);
      if (score >= SGA.config.alertThresholds.scoreAlert) {
        alertas.push(this.criarAlerta(l, score, 2));
      }
    });

    // Camada 3 — IA (rodada periodicamente, não por evento)
    // IAService.predict().then(preds => preds.forEach(p => ...))

    return alertas;
  },

  /** Camada 1: limiares fixos determinísticos */
  camada1(l) {
    const t = SGA.config.alertThresholds;
    if (l.cota  && l.cota  > t.cota)  return this.criarAlerta(l, 1.0, 1, 'cota');
    if (l.mmh   && l.mmh   > t.chuva) return this.criarAlerta(l, 0.9, 1, 'chuva');
    if (l.saturacao && l.saturacao > t.solo) return this.criarAlerta(l, 0.85, 1, 'solo');
    return null;
  },

  /** Calcula score combinado (0-1) */
  calcScore(l) {
    const cotaScore  = l.cota   ? Math.min((l.cota  - (l.normal || 2)) / 3, 1) : 0;
    const chuvaScore = l.mmh    ? Math.min(l.mmh    / 150, 1)                  : 0;
    const soloScore  = l.saturacao ? Math.min(l.saturacao / 100, 1)            : 0;
    return Math.round(Math.max(cotaScore * .45 + chuvaScore * .35 + soloScore * .20, 0) * 100) / 100;
  },

  /** Cria objeto de alerta padronizado */
  criarAlerta(leitura, score, camada, tipo) {
    const nivel = score >= .85 ? 'Crítico' : score >= .65 ? 'Alto' : 'Atenção';
    return {
      id:        Date.now() + '_' + (leitura.id || ''),
      nivel,
      score,
      camada,
      tipo:      tipo || 'combinado',
      local:     leitura.local || leitura.nome || '',
      municipio: leitura.municipio || '',
      timestamp: new Date().toISOString(),
      dados:     leitura,
    };
  },

  /** Processa evento recebido da ANA HidroWeb */
  processarEventoANA(estacao) {
    const alerta = this.criarAlerta(
      { ...estacao, cota: estacao.cota, normal: 2.4 },
      RiskUtils.calcScore(estacao.cota, 2.4, 0, 0),
      1, 'cota'
    );
    this.emitir(alerta);
  },

  /** Emite o alerta pelos canais configurados */
  emitir(alerta) {
    console.log(`[AlertEngine] Alerta ${alerta.nivel} emitido:`, alerta);
    NotificationService.enviar(alerta);
    // Em produção: gravar no banco, atualizar UI, webhooks...
  },
};

window.AlertEngine = AlertEngine;
