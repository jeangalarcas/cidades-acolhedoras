/**
 * SGA — Relatos do Cidadão (public/src/pages/Relatos.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel gerencial dos relatos enviados pela população via app SGA Cidadão
 * (/app). Fontes no backend:
 *   GET   /api/cidadao/relatos?chave=&status=&ibge=&limite=   (prefeitura)
 *   PATCH /api/cidadao/relato/:id/status?chave=  {status,obs} (prefeitura)
 *   GET   /api/cidadao/tipos e /api/cidadao/municipios        (públicas)
 * Os relatos contêm dados pessoais (LGPD): as rotas exigem a chave de
 * operação (ANA_SYNC_TOKEN), guardada apenas no navegador do operador
 * (localStorage 'sga_relatos_chave'). Se o servidor recusar (403), a chave
 * é descartada e o painel volta a pedir.
 * Auto-refresh a cada 2 min enquanto a página estiver aberta.
 */
const RelatosPage = {
  _timer: null,
  _dados: [],
  _tipos: {},        // chave do fenômeno -> { rotulo, icone, campos: {id: rotulo} }
  _municipios: [],
  _aberto: null,     // id do relato com detalhe expandido

  STATUS: {
    recebido:       ['Recebido',       'pill-blue'],
    em_analise:     ['Em análise',     'pill-amber'],
    em_atendimento: ['Em atendimento', 'pill-purple'],
    resolvido:      ['Resolvido',      'pill-green'],
    improcedente:   ['Improcedente',   'pill-gray'],
  },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  },

  render() {
    return `
    <div class="page" id="p-relatos">
      <div class="page-header">
        <div>
          <div class="page-title">Relatos do Cidadão</div>
          <div class="page-sub">Ocorrências relatadas pela população via app SGA Cidadão · protocolo oficial · fotos com GPS do momento</div>
        </div>
        <div class="page-actions">
          <span class="pill pill-gray" id="rc-hora">—</span>
          <button class="btn btn-outline" onclick="RelatosPage.carregar(true)">↺ Atualizar</button>
        </div>
      </div>
      <div class="page-body">

        <!-- chave de operação (LGPD) -->
        <div class="card" id="rc-auth" style="display:none">
          <div class="card-body" style="padding:14px">
            <b>Chave de operação da prefeitura</b>
            <div style="font-size:11px;color:var(--text-3);margin:6px 0 10px;line-height:1.5">
              Os relatos contêm dados pessoais do cidadão (LGPD). Informe a chave de
              operação configurada no servidor para visualizar e atender.
            </div>
            <div style="display:flex;gap:8px;max-width:420px">
              <input type="password" id="rc-chave" placeholder="chave de operação"
                onkeydown="if(event.key==='Enter')RelatosPage.salvarChave()"
                style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-2);color:var(--text-1)">
              <button class="btn btn-outline" onclick="RelatosPage.salvarChave()">Entrar</button>
            </div>
            <div style="font-size:11px;color:var(--red);margin-top:8px;display:none" id="rc-auth-erro">
              Chave recusada pelo servidor — confira e tente novamente.</div>
          </div>
        </div>

        <div id="rc-painel" style="display:none">
          <div class="metric-grid cols-4">
            <div class="mc neutral"><div class="mc-label">Relatos (filtro atual)</div><div class="mc-value" id="rc-k-tot">—</div></div>
            <div class="mc error"><div class="mc-label">Recebidos (novos)</div><div class="mc-value" style="color:var(--red)" id="rc-k-nov">—</div></div>
            <div class="mc warn"><div class="mc-label">Em análise / atendimento</div><div class="mc-value" style="color:var(--amber)" id="rc-k-and">—</div></div>
            <div class="mc ok"><div class="mc-label">Resolvidos</div><div class="mc-value" style="color:var(--green-mid)" id="rc-k-res">—</div></div>
          </div>

          <div class="card">
            <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px">
              <select id="rc-f-status" onchange="RelatosPage.carregar()" style="padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--bg-2);color:var(--text-1)">
                <option value="">Todos os status</option>
                <option value="recebido">Recebido</option>
                <option value="em_analise">Em análise</option>
                <option value="em_atendimento">Em atendimento</option>
                <option value="resolvido">Resolvido</option>
                <option value="improcedente">Improcedente</option>
              </select>
              <select id="rc-f-mun" onchange="RelatosPage.carregar()" style="padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--bg-2);color:var(--text-1);max-width:220px">
                <option value="">Todos os municípios</option>
              </select>
              <select id="rc-f-tipo" onchange="RelatosPage.carregar()" style="padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--bg-2);color:var(--text-1)">
                <option value="">Todos os fenômenos</option>
              </select>
              <span style="flex:1"></span>
              <button class="btn btn-outline" style="font-size:10px" onclick="RelatosPage.trocarChave()">Trocar chave</button>
            </div>
          </div>

          <div class="card">
            <table class="data-table">
              <thead><tr>
                <th>Protocolo</th><th>Quando</th><th>Fenômeno</th><th>Município</th>
                <th>Cidadão</th><th>Fotos</th><th>Status</th><th></th>
              </tr></thead>
              <tbody id="rc-tbody">
                <tr><td colspan="8" style="padding:18px;text-align:center;color:var(--text-3)">Carregando…</td></tr>
              </tbody>
            </table>
          </div>

          <div class="card">
            <div class="card-body" style="font-size:11px;color:var(--text-3);line-height:1.7;padding:10px 14px">
              <b style="color:var(--text-2)">Fluxo de atendimento:</b> Recebido → Em análise → Em atendimento →
              Resolvido (ou Improcedente). Cada mudança fica registrada no histórico com data/hora e observação,
              e o cidadão acompanha pelo protocolo no próprio app. O tipo de fenômeno segue a classificação
              COBRADE oficial. Fotos carregam a localização capturada no momento do clique.
            </div>
          </div>
        </div>

      </div>
    </div>`;
  },

  chave() { return localStorage.getItem('sga_relatos_chave') || ''; },

  salvarChave() {
    var v = (document.getElementById('rc-chave').value || '').trim();
    if (!v) return;
    localStorage.setItem('sga_relatos_chave', v);
    this.carregar(true);
  },

  trocarChave() {
    localStorage.removeItem('sga_relatos_chave');
    this._mostrarAuth(false);
  },

  _mostrarAuth(erro) {
    var a = document.getElementById('rc-auth'), p = document.getElementById('rc-painel');
    if (a) a.style.display = 'block';
    if (p) p.style.display = 'none';
    var e = document.getElementById('rc-auth-erro');
    if (e) e.style.display = erro ? 'block' : 'none';
  },

  iniciar() {
    var self = this;
    var api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';

    // apoio (rotas públicas): rótulos dos fenômenos e lista de municípios
    fetch(api + '/api/cidadao/tipos').then(function(r){ return r.json(); }).then(function(d) {
      (d.tipos || []).forEach(function(t) {
        var campos = {};
        (t.campos || []).forEach(function(c) { campos[c.id] = c.rotulo; });
        self._tipos[t.chave] = { rotulo: t.rotulo, icone: t.icone, campos: campos };
      });
      var sel = document.getElementById('rc-f-tipo');
      if (sel) sel.innerHTML = '<option value="">Todos os fenômenos</option>' +
        (d.tipos || []).map(function(t) {
          return '<option value="' + t.chave + '">' + t.icone + ' ' + self.esc(t.rotulo) + '</option>';
        }).join('');
    }).catch(function(){});

    fetch(api + '/api/cidadao/municipios').then(function(r){ return r.json(); }).then(function(d) {
      self._municipios = d.municipios || [];
      var sel = document.getElementById('rc-f-mun');
      if (sel) sel.innerHTML = '<option value="">Todos os municípios</option>' +
        self._municipios.map(function(m) {
          return '<option value="' + m.cod_ibge + '">' + self.esc(m.nome) + '</option>';
        }).join('');
    }).catch(function(){});

    this.carregar();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function() {
      var pg = document.getElementById('p-relatos');
      if (pg && pg.classList.contains('active') && self.chave()) self.carregar();
    }, 2 * 60 * 1000);
  },

  async carregar(manual) {
    var tbody = document.getElementById('rc-tbody');
    if (!tbody) return;
    if (!this.chave()) return this._mostrarAuth(false);

    var a = document.getElementById('rc-auth'), p = document.getElementById('rc-painel');
    if (a) a.style.display = 'none';
    if (p) p.style.display = 'block';

    var api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
    var st  = (document.getElementById('rc-f-status') || {}).value || '';
    var mun = (document.getElementById('rc-f-mun') || {}).value || '';
    var tp  = (document.getElementById('rc-f-tipo') || {}).value || '';

    try {
      if (manual) tbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--text-3)">Atualizando…</td></tr>';
      var url = api + '/api/cidadao/relatos?chave=' + encodeURIComponent(this.chave()) + '&limite=300';
      if (st)  url += '&status=' + encodeURIComponent(st);
      if (mun) url += '&ibge=' + encodeURIComponent(mun);
      var resp = await fetch(url);
      if (resp.status === 403) { localStorage.removeItem('sga_relatos_chave'); return this._mostrarAuth(true); }
      var d = await resp.json();
      if (!resp.ok) throw new Error(d.erro || 'HTTP ' + resp.status);

      var lista = d.relatos || [];
      if (tp) lista = lista.filter(function(r) { return r.tipo === tp; });  // filtro client-side
      this._dados = lista;

      // KPIs (sobre o filtro atual)
      var n = function(s) { return lista.filter(function(r){ return r.status === s; }).length; };
      var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
      set('rc-k-tot', lista.length);
      set('rc-k-nov', n('recebido'));
      set('rc-k-and', n('em_analise') + n('em_atendimento'));
      set('rc-k-res', n('resolvido'));
      set('rc-hora', 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

      this._renderTabela();
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--amber)">Falha ao carregar relatos: ' + this.esc(e.message) + '</td></tr>';
    }
  },

  _renderTabela() {
    var tbody = document.getElementById('rc-tbody');
    if (!tbody) return;
    var self = this;
    if (!this._dados.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--text-3)">Nenhum relato para o filtro atual.</td></tr>';
      return;
    }
    tbody.innerHTML = this._dados.map(function(r) {
      var t   = self._tipos[r.tipo] || { rotulo: r.tipo, icone: '•' };
      var s   = self.STATUS[r.status] || [r.status, 'pill-gray'];
      var dt  = r.criado_em ? new Date(r.criado_em) : null;
      var qdo = dt ? ('0'+dt.getDate()).slice(-2)+'/'+('0'+(dt.getMonth()+1)).slice(-2)+' '+
                     ('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2) : '—';
      var nf  = Array.isArray(r.fotos) ? r.fotos.length : 0;
      var linha = `
      <tr style="cursor:pointer" onclick="RelatosPage.abrir(${r.id})">
        <td class="mono"><b>${self.esc(r.protocolo)}</b></td>
        <td class="mono" style="font-size:11px;color:var(--text-3)">${qdo}</td>
        <td style="font-size:11px">${t.icone} ${self.esc(t.rotulo)}</td>
        <td style="font-size:11px">${self.esc(r.municipio_nome || '—')}</td>
        <td style="font-size:11px">${self.esc(r.nome || '—')}<div style="font-size:10px;color:var(--text-3)">${self.esc(r.telefone || '')}</div></td>
        <td style="font-size:11px">${nf ? '📷 ' + nf : '—'}</td>
        <td><span class="pill ${s[1]}">${s[0]}</span></td>
        <td style="font-size:10px;color:var(--text-3)">${self._aberto === r.id ? '▲' : '▼'}</td>
      </tr>`;
      if (self._aberto === r.id) linha += self._detalhe(r);
      return linha;
    }).join('');
  },

  abrir(id) {
    this._aberto = this._aberto === id ? null : id;
    this._renderTabela();
  },

  _detalhe(r) {
    var self = this;
    var t = this._tipos[r.tipo] || { campos: {} };

    var respostas = '';
    if (r.respostas && typeof r.respostas === 'object') {
      respostas = Object.keys(r.respostas).map(function(k) {
        return '<div style="font-size:11px;margin:2px 0"><span style="color:var(--text-3)">' +
          self.esc(t.campos[k] || k) + ':</span> <b>' + self.esc(r.respostas[k]) + '</b></div>';
      }).join('');
    }

    var fotos = '';
    if (Array.isArray(r.fotos) && r.fotos.length) {
      fotos = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        r.fotos.map(function(f, i) {
          var gps = (f.lat != null && f.lng != null)
            ? '<a href="https://www.google.com/maps?q=' + f.lat + ',' + f.lng + '" target="_blank" rel="noopener" ' +
              'style="display:block;font-size:9px;text-align:center;color:var(--blue)">📍 GPS foto ' + (i+1) + '</a>'
            : '<div style="font-size:9px;text-align:center;color:var(--text-3)">sem GPS</div>';
          return '<div><a href="' + self.esc(f.url) + '" target="_blank" rel="noopener">' +
            '<img src="' + self.esc(f.url) + '" alt="foto ' + (i+1) + '" ' +
            'style="width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"></a>' + gps + '</div>';
        }).join('') + '</div>';
    }

    var hist = '';
    if (Array.isArray(r.historico) && r.historico.length) {
      hist = r.historico.map(function(h) {
        var d = h.em ? new Date(h.em).toLocaleString('pt-BR') : '—';
        var rot = (self.STATUS[h.para] || [h.para])[0];
        return '<div style="font-size:11px;border-left:2px solid var(--border);padding-left:8px;margin:4px 0;color:var(--text-3)">' +
          d + ' → <b style="color:var(--text-2)">' + self.esc(rot) + '</b>' +
          (h.obs ? '<br>' + self.esc(h.obs) : '') + '</div>';
      }).join('');
    }

    var mapa = (r.lat != null && r.lng != null)
      ? '<button class="btn btn-outline" style="font-size:10px;padding:3px 10px" ' +
        'onclick="event.stopPropagation();RelatosPage.verNoMapa(' + r.lat + ',' + r.lng + ',\'' +
        String(r.protocolo || '').replace(/'/g, '') + '\')">🗺 Ver no mapa</button> ' +
        '<a class="mono" style="font-size:10px;color:var(--blue)" target="_blank" rel="noopener" ' +
        'href="https://www.google.com/maps?q=' + r.lat + ',' + r.lng + '">' + r.lat + ', ' + r.lng + '</a>'
      : '<span style="font-size:11px;color:var(--text-3)">sem coordenadas</span>';

    var opcoes = Object.keys(this.STATUS).map(function(k) {
      return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' +
        self.STATUS[k][0] + '</option>';
    }).join('');

    return `
    <tr><td colspan="8" style="background:var(--bg-2);padding:14px 18px" onclick="event.stopPropagation()">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-size:11px;color:var(--text-3);margin-bottom:2px">Descrição do cidadão</div>
          <div style="font-size:12px;line-height:1.5">${self.esc(r.descricao || '—')}</div>
          ${r.endereco ? '<div style="font-size:11px;margin-top:6px"><span style="color:var(--text-3)">Endereço/referência:</span> ' + self.esc(r.endereco) + '</div>' : ''}
          ${respostas ? '<div style="margin-top:8px">' + respostas + '</div>' : ''}
          <div style="margin-top:8px;font-size:11px">
            <span style="color:var(--text-3)">Contato:</span> ${self.esc(r.nome || '—')} · ${self.esc(r.telefone || '—')}
            ${r.email ? ' · ' + self.esc(r.email) : ''}
          </div>
          <div style="margin-top:8px">${mapa}</div>
          <div style="margin-top:6px;font-size:10px;color:var(--text-3)">COBRADE ${self.esc(r.cobrade || '—')}${r.cobrade_nome ? ' — ' + self.esc(r.cobrade_nome) : ''}</div>
          ${fotos}
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Histórico</div>
          ${hist || '<div style="font-size:11px;color:var(--text-3)">—</div>'}
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Atualizar status</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <select id="rc-st-${r.id}" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text-1)">${opcoes}</select>
              <input id="rc-obs-${r.id}" placeholder="observação (opcional)"
                style="flex:1;min-width:160px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text-1)">
              <button class="btn btn-outline" style="font-size:11px" onclick="RelatosPage.mudarStatus(${r.id})">Aplicar</button>
            </div>
            <div style="font-size:10px;color:var(--text-3);margin-top:6px">
              A mudança entra no histórico e o cidadão vê pelo protocolo no app.</div>
          </div>
        </div>
      </div>
    </td></tr>`;
  },

  async mudarStatus(id) {
    var st  = (document.getElementById('rc-st-' + id) || {}).value;
    var obs = (document.getElementById('rc-obs-' + id) || {}).value || '';
    if (!st) return;
    var api = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
    try {
      var resp = await fetch(api + '/api/cidadao/relato/' + id + '/status?chave=' +
        encodeURIComponent(this.chave()), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: st, obs: obs || null }),
      });
      var d = await resp.json();
      if (!resp.ok || !d.ok) throw new Error(d.erro || 'HTTP ' + resp.status);
      this.carregar();
    } catch (e) { alert('Não foi possível atualizar: ' + e.message); }
  },

  verNoMapa(lat, lng, titulo) {
    if (window.Router) Router.go('mapa');
    setTimeout(function() {
      var mapa = (window.SGA_MAPAS || []).find(function(m) {
        return m._container && m._container.id === 'leaflet-map';
      });
      if (mapa && lat != null) {
        mapa.setView([lat, lng], 15);
        L.popup().setLatLng([lat, lng]).setContent('<b>Relato ' + titulo + '</b>').openOn(mapa);
      }
    }, 400);
  },
};
window.RelatosPage = RelatosPage;
