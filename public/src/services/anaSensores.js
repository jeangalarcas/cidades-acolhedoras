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

      // 2) Universo de estações:
      //    • MODO BACIA (Fase 2): membros de SGA.config.baciaAtiva.estacoes
      //      (estações dentro do polígono oficial SEMA — vindas da API);
      //    • senão: estações do município; se não houver, as mais próximas.
      const bacia = (window.SGA && SGA.config && SGA.config.baciaAtiva) || null;
      let doMunicipio, aproximadas = false;
      if (bacia) {
        doMunicipio = todas.filter(e => bacia.temEstacao
          ? bacia.temEstacao(e.codigo) : bacia.estacoes.has(String(e.codigo)));
        // Ordem oficial da bacia: a API lista primeiro as réguas com limiar
        // SGB (Encantado, Estrela, Muçum…) — o Set preserva essa inserção.
        const pos = new Map(); let i = 0;
        bacia.estacoes.forEach(c => pos.set(String(c), i++));
        doMunicipio.sort((a, b) => (pos.get(String(a.codigo)) ?? 1e9)
                                 - (pos.get(String(b.codigo)) ?? 1e9));
      } else {
        doMunicipio = todas.filter(e => e.cod_ibge === codIBGE);
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
      }

      // Limite de consultas ao vivo por aba (bacia pode ter dezenas de estações)
      const cap = bacia ? 12 : this.MAX_POR_ABA;
      const fluTodas = doMunicipio.filter(e => e.tipo === 'Fluviometrica');
      const pluTodas = doMunicipio.filter(e => e.tipo === 'Pluviometrica' && e.operadora_sigla !== 'CEMADEN');
      const flu = fluTodas.slice(0, cap);
      const plu = pluTodas.slice(0, cap);
      SGA.sensoresInfo = {
        bacia: bacia ? bacia.nome : null,
        totalFlu: fluTodas.length, exibFlu: flu.length,
        totalPlu: pluTodas.length, exibPlu: plu.length,
      };
      if (bacia && (fluTodas.length > flu.length || pluTodas.length > plu.length))
        console.log('[AnaSensores] bacia', bacia.codigo, '— exibindo', flu.length + '/' + fluTodas.length,
                    'réguas e', plu.length + '/' + pluTodas.length, 'pluviômetros (limite de consultas ao vivo)');

      // 3) Leituras ao vivo (paralelo, tolerante a falha individual)
      const buscarSerie = async (e) => {
        try {
          const r = await fetch(`${api}/api/ana/serie/${e.codigo}?range=HORA_6`);
          if (!r.ok) return { e, leituras: [] };
          const d = await r.json();
          return { e, leituras: d.leituras || [] };
        } catch (_) { return { e, leituras: [] }; }
      };
      // Em LOTES de 4: 24 consultas simultâneas estouram o fail-fast de 6s
      // (Render free + ANA) e devolvem {"erro":"timeout"} — tudo virava Offline.
      const emLotes = async (arr, n) => {
        const out = [];
        for (let i = 0; i < arr.length; i += n)
          out.push(...await Promise.all(arr.slice(i, i + n).map(buscarSerie)));
        return out;
      };
      // 2ª chance só para as que falharam (token/rota já aquecidos na 1ª onda)
      const comRetry = async (res) => {
        const falhas = res.filter(r => !r.leituras.length).map(r => r.e);
        if (!falhas.length) return res;
        const seg = await emLotes(falhas, 4);
        const porCod = new Map(seg.map(r => [String(r.e.codigo), r]));
        return res.map(r => r.leituras.length ? r
                          : (porCod.get(String(r.e.codigo)) || r));
      };
      let resFlu = await emLotes(flu, 4);
      let resPlu = await emLotes(plu, 4);
      resFlu = await comRetry(resFlu);
      resPlu = await comRetry(resPlu);

      const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
      const rotulo = (e) => {
        let l = e.nome || e.codigo;
        if (e.rio_nome) l += ' · ' + e.rio_nome;
        // bacia atravessa vários municípios → sempre rotular a cidade da estação
        if ((aproximadas || bacia) && e.municipio_nome) l += ' (' + e.municipio_nome + ')';
        return l;
      };

      // Tendência do rio na janela (Δ cota em m entre 1ª e última leitura).
      // Honesta: só existe com ≥2 leituras válidas; |Δ| < 2 cm conta como estável.
      const tendencia = (leituras) => {
        if (leituras.length < 2) return null;
        const ult = leituras[leituras.length - 1];
        const p = num(leituras[0].Cota_Adotada), u = num(ult.Cota_Adotada);
        if (p == null || u == null) return null;
        const horas = Math.max((new Date(ult.Data_Hora_Medicao) -
                                new Date(leituras[0].Data_Hora_Medicao)) / 36e5, 0.1);
        const d = (u - p) / 100;                       // cm → m
        const dir = Math.abs(d) < 0.02 ? 'flat' : (d > 0 ? 'up' : 'down');
        return {
          dir,
          delta: (d > 0 ? '+' : '') + d.toFixed(2) + ' m',
          taxa: ((u - p) / 100 / horas).toFixed(2).replace('-0.00', '0.00') + ' m/h',
          horas: +horas.toFixed(1),
          // rio subindo = atenção (âmbar); descendo = alívio (verde); estável = neutro
          seta: dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→',
          cor:  dir === 'up' ? 'var(--amber)' : dir === 'down' ? 'var(--green-mid)' : 'var(--text-3)',
        };
      };

      // 4) Réguas → SGA.sensoresHidro (cota em m; taxa real = Δ na janela, m/h)
      SGA.sensoresHidro = resFlu.map(({ e, leituras }) => {
        const ult = leituras[leituras.length - 1];
        const cotaCm = ult ? num(ult.Cota_Adotada) : null;
        const t = tendencia(leituras);
        return {
          id: e.codigo, local: rotulo(e),
          lat: e.latitude, lng: e.longitude,        // ← ADICIONE ESTA LINHA
          cota: cotaCm != null ? +(cotaCm / 100).toFixed(2) : null,  // cm → m
          normal: '—',           // nível de referência por estação: não publicado pela ANA
          taxa: t ? t.taxa : '—',
          tend: t,               // {dir, delta, seta, cor, horas} ou null
          status: cotaCm != null ? 'Ativo' : 'Offline',
          col: cotaCm != null ? 'var(--green-mid)' : 'var(--border)',
        };
      })
      // réguas com leitura primeiro; sem transmissão vão para o fim da lista
      .sort((a, b) => (b.cota != null) - (a.cota != null));
// alimenta a página ANA HidroWeb com as mesmas réguas reais
      SGA.estacoesANA = resFlu.map(({ e, leituras }) => {
        const ult = leituras[leituras.length-1];
        const c = ult ? parseFloat(ult.Cota_Adotada) : null;
        const t = tendencia(leituras);
        return { nome: e.nome, rio: e.rio_nome || '—', cod: e.codigo,
                 cota: c != null ? (c/100).toFixed(2) : '—', normal: '—',
                 variacao: t ? t.delta + ' ' + t.seta : '—',
                 janela: t ? t.horas + 'h' : null,
                 vazao: ult && ult.Vazao_Adotada != null ? ult.Vazao_Adotada : '—',
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
      // No modo bacia, só se o município ativo pertence à bacia (senão a lista
      // misturaria pluviômetros de fora do recorte).
      if (bacia && !bacia.temMunicipio(codIBGE)) { /* pula CEMADEN */ } else
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
          // datahora da PED vem em UTC sem o "Z" — anexar p/ parse e exibição corretos
          const utc = (dh) => new Date(dh && !String(dh).endsWith('Z') ? dh + 'Z' : dh);
          const quando = (dh) => {
            try {
              return utc(dh).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch (_) { return String(dh); }
          };
          const munNome = (SGA.config.municipioAtivo && SGA.config.municipioAtivo.nome) || '';
          (Array.isArray(acum) ? acum : []).forEach(a => {
            const fresco = a.datahora && (Date.now() - utc(a.datahora).getTime()) <= 6 * 3600e3;
            SGA.sensoresPluvio.push({
              id: a.codestacao,
              // sem nome no cadastro → não repetir o código (o card já mostra o id)
              local: (nomes[a.codestacao] ? nomes[a.codestacao] + ' · ' : '')
                   + (munNome ? munNome + ' · ' : '') + 'CEMADEN',
              mmh:     a.acc1hr  != null ? a.acc1hr  : '—',
              acum6h:  a.acc6hr  != null ? a.acc6hr  : '—',
              acum24h: a.acc24hr != null ? a.acc24hr : null,
              medidoEm: a.datahora ? quando(a.datahora) : null,
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