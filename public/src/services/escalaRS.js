/**
 * SGA — Escala de severidade alinhada ao protocolo de cores da Defesa Civil RS
 * (amarelo · laranja · vermelho · roxo), com orientação objetiva por nível.
 * Textos de orientação: padrão protetivo geral; ajuste fino conforme o
 * protocolo municipal (PLANCON) de cada ente.
 */
const EscalaRS = {
  niveis: {
    amarelo:  { rotulo: 'Amarelo — Fique atento', cor: '#E6C229', prioridade: 1,
      orientacao: 'Acompanhe os avisos oficiais. Revise seu plano familiar e evite áreas alagáveis.' },
    laranja:  { rotulo: 'Laranja — Prepare-se',   cor: '#E8842C', prioridade: 2,
      orientacao: 'Separe documentos e medicamentos. Se mora em área de risco, organize a saída antecipada.' },
    vermelho: { rotulo: 'Vermelho — Aja agora',   cor: '#C0392B', prioridade: 3,
      orientacao: 'Saia de áreas de risco. Não atravesse áreas alagadas. Siga as rotas e abrigos indicados.' },
    roxo:     { rotulo: 'Roxo — Ação imediata',   cor: '#7D3C98', prioridade: 4,
      orientacao: 'Perigo extremo em curso. Proteja a vida imediatamente e siga as ordens da Defesa Civil.' },
  },

  /* Converte a escala interna do motor para a escala oficial */
  doMotor(nivelInterno) {
    const mapa = { 'Atenção': 'amarelo', 'Alto': 'laranja', 'Alerta': 'laranja',
                   'Crítico': 'vermelho', 'Emergência': 'roxo' };
    return mapa[nivelInterno] || 'amarelo';
  },

  info(nivel) { return this.niveis[nivel] || this.niveis.amarelo; },

  badge(nivel) {
    const n = this.info(nivel);
    return '<span style="background:' + n.cor + ';color:#fff;font-size:10px;font-weight:800;' +
           'padding:3px 10px;border-radius:12px;letter-spacing:.3px">' + n.rotulo + '</span>';
  },
};
window.EscalaRS = EscalaRS;