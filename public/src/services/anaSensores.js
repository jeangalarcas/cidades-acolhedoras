/**
 * SGA — AnaSensores  (src/services/anaSensores.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Liga a página "Sensores & IoT" às estações REAIS da ANA:
 *   • Inventário: GET /api/ana/estacoes?telemetrica=1  (Supabase, 1.192 estações)
 *   • Leituras :  GET /api/ana/serie/:codigo?range=HORA_6 (ANA, tempo quase-real)
 *
 * Preenche SGA.sensoresHidro (réguas/fluviométricas) e SGA.sensoresPluvio
 * (pluviômetros) com os campos que a SensoresPage já renderiza, e re-renderiza
 * a página (mesmo padrão do carregarSocial → #p-geodados).
 *
 * Unidades (manual ANA HidroWebService): Cota_Adotada em cm (÷100 → m),
 * Chuva_Adotada em mm por intervalo de medição, Vazao_Adotada em m³/s.
 *
 * INSTALAÇÃO (3 toques):
 *   1. Salvar este arquivo em  public/src/services/anaSensores.js
 *   2. No index.html, junto dos outros <script> de services, adicionar:
 *        <script src="/src/services/anaSensores.js"></script>
 *   3. No src/utils/municipioInit.js, logo APÓS cada chamada
 *      `this.carregarSocial(...)` (há duas: no init e na troca de município),
 *      adicionar a linha:
 *        if (window.AnaSensores) AnaSensores.carregar(SGA.config.codIBGE);
 * ─────────────────────────────────────────────────────────────────────────────
 */

const AnaSensores = {

  MAX_POR_ABA: 6,        // limite de estações consultadas ao vivo por aba
  _cacheEstacoes: null,  // inventário é estável; busca 1x por sessão

  async carregar(codIBGE) {
    try {
      const api = (window.MunicipioInit && MunicipioInit.API_BASE) ||
                  'https://sga-api-1705.onrender.com';

      // 1) Inventário (cacheado na sessão)
      if (!this._cacheEstacoes) {
        const r = await fetch(`${api}/api/ana/estacoes?telemetrica=1`);
        if (!r.ok) throw new Error('estacoes HTTP ' + r.status);
        this._cacheEstacoes = (await r.json()).estacoes || [];
      }
      const todas = this._cacheEstacoes;

      // 2) Estações do município; se não houver, usa as mais próximas (rotulado)
      let doMunicipio = todas.filter(e => e.cod_ibge === codIBGE);
      let aproximadas = false;
      if (!doMunicipio.length) {
        const m = SGA.config.municipioAtivo || {};
        if (m.lat != null && m.lng != null) {
          doMunicipio = [...todas]
            .filter(e => e.latitude != null && e.longitude != null)
            .sort((a, b) => this._dist(m.lat, m.lng, a.latitude, a.longitude)
                          - this._dist(m.lat, m.lng, b.latitude, b.longitude))
            .slice(0, this.MAX_POR_ABA * 2);
          aproximadas = true;
        }
      }

      const flu = doMunicipio.filter(e => e.tipo === 'Fluviometrica').slice(0, this.MAX_POR_ABA);
      const plu = doMunicipio.filter(e => e.tipo === 'Pluviometrica' && e.operadora_sigla !== 'CEMADEN').slice(0, this.MAX_POR_ABA);

      // 3) Leituras ao vivo (paralelo, tolerante a falha individual)
      const buscarSerie = async (e) => {
        try {
          const r = await fetch(`${api}/api/ana/serie/${e.codigo}?range=HORA_6`);
          if (!r.ok) return { e, leituras: [] };
          const d = await r.json();
          return { e, leituras: d.leituras || [] };
        } catch (_) { return { e, leituras: [] }; }
      };
      const [resFlu, resPlu] = await Promise.all([
        Promise.all(flu.map(buscarSerie)),
        Promise.all(plu.map(buscarSerie)),
      ]);

      const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
      const rotulo = (e) => {
        let l = e.nome || e.codigo;
        if (e.rio_nome) l += ' · ' + e.rio_nome;
        if (aproximadas && e.municipio_nome) l += ' (' + e.municipio_nome + ')';
        return l;
      };

      // 4) Réguas → SGA.sensoresHidro (cota em m; taxa real = Δ na janela, m/h)
      SGA.sensoresHidro = resFlu.map(({ e, leituras }) => {
        const ult = leituras[leituras.length - 1];
        const cotaCm = ult ? num(ult.Cota_Adotada) : null;
        let taxa = '—';
        if (leituras.length >= 2) {
          const p = num(leituras[0].Cota_Adotada), u = num(ult.Cota_Adotada);
          const horas = Math.max((new Date(ult.Data_Hora_Medicao) -
                                  new Date(leituras[0].Data_Hora_Medicao)) / 36e5, 0.1);
          if (p != null && u != null)
            taxa = ((u - p) / 100 / horas).toFixed(2).replace('-0.00','0.00') + ' m/h';
        }
        return {
          id: e.codigo, local: rotulo(e),
          lat: e.latitude, lng: e.longitude,        // ← ADICIONE ESTA LINHA
          cota: cotaCm != null ? +(cotaCm / 100).toFixed(2) : null,  // cm → m
          normal: '—',           // nível de referência por estação: não publicado pela ANA
          taxa,
          status: cotaCm != null ? 'Ativo' : 'Offline',
          col: cotaCm != null ? 'var(--green-mid)' : 'var(--border)',
        };
      });
// alimenta a página ANA HidroWeb com as mesmas réguas reais
      SGA.estacoesANA = resFlu.map(({ e, leituras }) => {
        const ult = leituras[leituras.length-1];
        const c = ult ? parseFloat(ult.Cota_Adotada) : null;
        return { nome: e.nome, rio: e.rio_nome || '—', cod: e.codigo,
                 cota: c != null ? (c/100).toFixed(2) : '—', normal: '—',
                 variacao: '', vazao: ult && ult.Vazao_Adotada != null ? ult.Vazao_Adotada : '—',
                 status: c != null ? 'Ativo' : 'Offline' };
      });
      const hw = document.querySelector('#p-hidroweb');
      if (hw && window.HidroWebPage) hw.outerHTML = HidroWebPage.render();



      // 5) Pluviômetros → SGA.sensoresPluvio (mm última hora + acumulado 6h)
      SGA.sensoresPluvio = resPlu.map(({ e, leituras }) => {
        const soma = arr => arr.reduce((s, l) => s + (num(l.Chuva_Adotada) || 0), 0);
        const umaHora = leituras.filter(l =>
          (Date.now() - new Date(l.Data_Hora_Medicao)) <= 70 * 60 * 1000);
        const tem = leituras.length > 0;
        return {
          id: e.codigo, local: rotulo(e),
          lat: e.latitude, lng: e.longitude,        // ← AQUI TAMBÉM
          mmh:    tem ? +soma(umaHora).toFixed(1) : '—',
          acum6h: tem ? +soma(leituras).toFixed(1) : '—',
          status: tem ? 'Ativo' : 'Offline',
          col:    tem ? 'var(--green-mid)' : 'var(--border)',
        };
      });

// ── Pluviômetros CEMADEN (PED): acumulados oficiais por município ──
      try {
        const [rc, re] = await Promise.all([
          fetch(`${api}/api/cemaden/acumulados?ibge=${codIBGE}`),
          fetch(`${api}/api/cemaden/estacoes?ibge=${codIBGE}`),
        ]);
        if (rc.ok) {
          const acum  = await rc.json();
          const cad   = re.ok ? await re.json() : [];
          const nomes = {};
          (Array.isArray(cad) ? cad : []).forEach(c => { nomes[c.codestacao] = c.nome; });
          (Array.isArray(acum) ? acum : []).forEach(a => {
            const fresco = a.datahora && (Date.now() - new Date(a.datahora).getTime()) <= 6 * 3600e3;
            SGA.sensoresPluvio.push({
              id: a.codestacao,
              local: (nomes[a.codestacao] || a.codestacao) + ' · CEMADEN',
              mmh:    a.acc1hr != null ? a.acc1hr : '—',
              acum6h: a.acc6hr != null ? a.acc6hr : '—',
              status: fresco ? 'Ativo' : 'Offline',
              col:    fresco ? 'var(--green-mid)' : 'var(--border)',
            });
          });
        }
      } catch (_) {}

      // (Solo & Encostas: sem fonte ANA — permanece como está, sem inventar)

      // 6) Re-render (mesmo padrão do carregarSocial → Geodados)
      const el = document.querySelector('#p-sensores');
      if (el && window.SensoresPage) {
        const visivel = el.classList.contains('active') || el.style.display !== 'none';
        el.outerHTML = SensoresPage.render();
        const novo = document.querySelector('#p-sensores');
        if (novo && visivel) novo.style.display = '';
        if (window.SparklineUtils) setTimeout(() => { try { SparklineUtils.renderAll(); } catch(_){} }, 150);
      }
    } catch (e) {
      console.warn('[AnaSensores] falha ao carregar:', e.message);
    }
  },

  _dist(la1, lo1, la2, lo2) {
    const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
};

window.AnaSensores = AnaSensores;