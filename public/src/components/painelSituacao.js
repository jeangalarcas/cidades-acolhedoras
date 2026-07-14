/**
 * SGA — D2 · PAINEL DE SITUAÇÃO  (src/components/painelSituacao.js)
 * Faixa de KPIs estaduais em tempo real (padrão sala de situação).
 * Fontes 100% reais: /api/ana/resumo (banco) + SGA.alertasAtivos (motor local).
 */
const PainelSituacao = {
  _API: (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com',

  iniciar() {
    this._fixarAbaixoDaBarra();
    this.carregar();
    setInterval(() => this.carregar(), 5 * 60 * 1000);   // atualiza a cada 5 min
  },

  /* Painel em fluxo normal: rola com o conteúdo e NÃO cobre os
     cabeçalhos fixos das páginas (correção do texto oculto). */
  _fixarAbaixoDaBarra() {
    const el = document.getElementById('painel-situacao');
    if (el) el.style.cssText = '';
  },

  async carregar() {
    const el = document.getElementById('painel-situacao');
    if (!el) return;
    try {
      const r = await fetch(this._API + '/api/ana/resumo');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const alertas = Array.isArray(SGA.alertasAtivos) ? SGA.alertasAtivos.length : 0;
      const corAlerta = alertas > 0 ? 'var(--red)' : 'var(--green-light)';
      const kpi = (rotulo, valor, sub, cor) => `
        <div class="ps-kpi">
          <div style="font-size:9px;font-weight:700;letter-spacing:.8px;color:var(--text-3);
                      text-transform:uppercase">${rotulo}</div>
          <div style="font-size:24px;font-weight:800;font-family:var(--mono);
                      color:${cor || 'var(--text)'}">${valor}</div>
          <div style="font-size:10px;color:var(--text-2)">${sub || ''}</div>
        </div>`;
      el.innerHTML = `
        <div class="ps-linha">
          ${kpi('Alertas ativos', alertas, alertas ? 'município ativo' : 'nenhum alerta em curso', corAlerta)}
          ${kpi('Estações ativas', d.estacoes_ativas + '<span style="font-size:12px;color:var(--text-3)">/' + d.telemetricas + '</span>', 'transmitindo · últimas 12h', 'var(--green-light)')}
          ${kpi('Municípios monitorados', d.municipios_monitorados, 'com estação ativa agora')}
          ${kpi('Chuva máx (12h)', (d.chuva_max && d.chuva_max.mm != null ? d.chuva_max.mm : '—') + '<span style="font-size:12px"> mm</span>', 'maior leitura da rede ANA', 'var(--blue)')}
          ${kpi('Maior cota (rios)', (d.cota_max && d.cota_max.cota_m != null ? d.cota_max.cota_m : '—') + '<span style="font-size:12px"> m</span>',
                d.cota_max ? (d.cota_max.nome || '') + (d.cota_max.rio ? ' · ' + d.cota_max.rio : '') : '', 'var(--amber)')}
        </div>`;
    } catch (e) {
      el.innerHTML = '';   // painel some em falha — nunca mostra número inventado
      console.warn('[PainelSituacao]', e.message);
    }
  },
};
window.PainelSituacao = PainelSituacao;