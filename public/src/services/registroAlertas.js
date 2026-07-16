/**
 * SGA — Sincroniza os alertas do motor local com a trilha de auditoria no banco.
 * Dedup no backend (6h). Falha em silêncio: registrar nunca pode travar a operação.
 */
const RegistroAlertas = {
  _API: (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com',

  sincronizar(alertas, municipio) {
    if (!Array.isArray(alertas) || !alertas.length) return;
    alertas.forEach((a) => {
      const nivel = window.EscalaRS ? EscalaRS.doMotor(a.nivel || a.tipo) : 'amarelo';
      fetch(this._API + '/api/registro/alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_ibge: municipio && municipio.cod_ibge,
          municipio_nome: municipio && municipio.nome,
          nivel,
          cobrade: a.cobrade || '1.2.1.0.0',
          titulo: a.titulo || a.msg || 'Alerta do motor SGA',
          descricao: a.descricao || a.detalhe || null,
          gatilho: a,
          fonte_dados: a.fonte || 'motor SGA (limiares + acumulados + previsão)',
        }),
      }).catch(function(){});
    });
  },
};
window.RegistroAlertas = RegistroAlertas;