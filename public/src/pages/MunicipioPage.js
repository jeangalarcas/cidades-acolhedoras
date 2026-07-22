/**
 * SGA v3 — MunicipioPage Universal
 * Funciona para QUALQUER um dos 497 municípios do RS
 */
const MunicipioPage = {
  _dados:null, _mapa:null, _timer:null, _municipio:null,

  render(){
    return `<div class="page" id="p-municipio">
      <div class="page-header" id="mun-header" style="display:none">
        <div>
          <div class="page-title" id="mun-titulo">Municipio</div>
          <div class="page-sub" id="mun-sub">Monitoramento em tempo real</div>
        </div>
        <div class="page-actions">
          <span class="ds-badge ds-ana">Open-Meteo</span>
          <span class="ds-badge ds-cem">ANA</span>
          <span class="ds-badge ds-cad">INMET</span>
          <button class="btn btn-outline" onclick="MunicipioPage.atualizar()">Atualizar</button>
          <a href="escalador.html" class="btn btn-outline">Trocar municipio</a>
        </div>
      </div>
      <div class="page-body" id="mun-body">
        <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px;color:var(--text-3)">
          <div style="font-size:40px">&#127759;</div>
          <div style="font-size:14px;font-weight:600">Nenhum municipio selecionado</div>
          <div style="font-size:12px">Use o Escalador para selecionar um municipio do RS</div>
          <a href="escalador.html" style="background:var(--green-mid);color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">Selecionar Municipio</a>
        </div>
      </div>
    </div>`;
  },

  async iniciar(municipio){
    if(!municipio){
      const j=sessionStorage.getItem('sga_municipio_json');
      if(j){try{municipio=JSON.parse(j);}catch(e){}}
    }
    if(!municipio) return;
    this._municipio=municipio;
    const header=document.getElementById('mun-header');
    const titulo=document.getElementById('mun-titulo');
    const sub=document.getElementById('mun-sub');
    if(header) header.style.display='flex';
    if(titulo) titulo.textContent=`${municipio.nome} / RS`;
    if(sub) sub.textContent=`${municipio.microrregiao||''} - ${municipio.bacia_hidrografica||''} - IBGE: ${municipio.cod_ibge}`;
    const sbNome=document.getElementById('sb-municipio-nome');
    if(sbNome) sbNome.textContent=municipio.nome;
    await this.atualizar();
    if(this._timer) clearInterval(this._timer);
    this._timer=setInterval(()=>this.atualizar(),5*60*1000);
  },

  async atualizar(){
    const body=document.getElementById('mun-body');
    if(!body||!this._municipio) return;
    body.innerHTML=`<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-3)">Buscando dados para <strong>${this._municipio.nome}</strong>...</div>`;
    const dados=await DataService.buscarTudo(this._municipio);
    SGA.alertasAtivos = (dados && dados.alertas) || [];
    if (window.RegistroAlertas) RegistroAlertas.sincronizar(SGA.alertasAtivos, SGA.municipioAtivo || {});
    if (window.TopBar && TopBar.atualizarAlertas) TopBar.atualizarAlertas();
    if(!dados) return;
    this._dados=dados;
    this._renderDados(body,dados);
  },

  _renderDados(body,d){
    const m=d.municipio,p=d.previsao,c=d.cota,al=d.alertas,sc=d.score,ri=d.risco,est=d.estacao_inmet;
    const agora=p?.agora||{},prox6=p?.proximas6h||{},prox24=p?.proximas24h||{},dias=p?.previsao_dias||[],serie=p?.serie_horaria||[];
    const corScore=ri?.cor||'#4BAF82';
    const corCota=c?.cor_nivel||(c?.status==='Emergencia'?'var(--red)':c?.status==='Alerta'?'var(--amber)':'var(--green-mid)');
    const REFC=c?.referencia||null;
    const NIVROT={normalidade:'NORMALIDADE',atencao:'ATEN\u00c7\u00c3O',alerta:'ALERTA',inundacao:'INUNDA\u00c7\u00c3O'};
    const seloCota=(c&&c.nivel_referencia&&NIVROT[c.nivel_referencia])
      ?`<span style="background:${c.cor_nivel};color:#fff;font-weight:800;font-size:9px;padding:2px 7px;border-radius:9px;letter-spacing:.4px" title="Fonte: ${REFC&&REFC.fonte?REFC.fonte:'SGB/SACE'}">${NIVROT[c.nivel_referencia]}</span> <span style="opacity:.75">${REFC&&REFC.alerta_m!=null?`alerta ${REFC.alerta_m}m \u00b7 `:''}inund. ${REFC&&REFC.inundacao_m!=null?REFC.inundacao_m+'m':'\u2014'}</span>`
      :null;
    const maxMmh=Math.max(...serie.map(h=>h.precip_mmh),1);
    const pts=serie.slice(0,12).map((h,i)=>`${i*(100/11)},${100-(h.precip_mmh/maxMmh*85)}`).join(' ');

    body.innerHTML=`
      <div class="metric-grid cols-5" style="margin-bottom:14px">
        <div class="mc" style="border-top:3px solid ${corScore}">
          <div class="mc-label">Score Risco IA</div>
          <div class="mc-value" style="color:${corScore}">${sc.toFixed(2)}</div>
          <div class="mc-sub">${ri.str}</div>
        </div>
        <div class="mc ${al.length>0?'error':'ok'}">
          <div class="mc-label">Alertas</div>
          <div class="mc-value" style="color:${al.length>0?'var(--red)':'var(--green-mid)'}">${al.length}</div>
          <div class="mc-sub">${al.length>0?al[0].nivel:'Normal'}</div>
        </div>
        <div class="mc blue">
          <div class="mc-label">Chuva agora</div>
          <div class="mc-value" style="color:var(--blue)">${(agora.precipitacao_mmh||0).toFixed(1)}</div>
          <div class="mc-sub">mm/h</div>
        </div>
        <div class="mc ${prox6.precip_acum_mm>30?'warn':'ok'}">
          <div class="mc-label">Acum 6h</div>
          <div class="mc-value" style="color:${prox6.precip_acum_mm>30?'var(--amber)':'var(--green-mid)'}">${(prox6.precip_acum_mm||0).toFixed(0)}</div>
          <div class="mc-sub">mm</div>
        </div>
        <div class="mc">
          <div class="mc-label">Rio / Cota</div>
          <div class="mc-value" style="color:${corCota}">${c?.cota_m??'N/D'}</div>
          <div class="mc-sub">${seloCota||c?.status||'N/D'}</div>
        </div>
      </div>
      <div class="g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Alertas - ${m.nome}</div>
            <span class="pill ${al.length>0?'pill-red':'pill-green'}">${al.length} ${al.length===1?'alerta':'alertas'}</span>
          </div>
          ${al.length===0
            ?`<div style="padding:20px;text-align:center;color:var(--green-mid);font-size:13px;font-weight:600">Situacao normal - sem alertas</div>`
            :al.map(a=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
              <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:${a.nivel==='Critico'?'var(--red)':a.nivel==='Alto'?'var(--amber)':'#C9B830'};display:inline-block"></span>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:700">${a.titulo}</div>
                <div style="font-size:11px;color:var(--text-2);margin-top:2px">${a.desc}</div>
                <div style="font-size:9px;color:var(--text-3);margin-top:2px">${a.fontes.join(' - ')} - ${a.hora}</div>
              </div>
              <span class="pill ${a.nivel==='Critico'?'pill-red':a.nivel==='Alto'?'pill-amber':'pill-green'}" style="flex-shrink:0">${a.nivel}</span>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Previsao 3 dias</div>
            <span style="font-size:9px;color:var(--text-3)">Open-Meteo${p?.online===false?' (offline)':''}</span>
          </div>
          ${dias.slice(0,3).map(dia=>{
            const dt=new Date(dia.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
            const cor=dia.precip_mm>30?'var(--red)':dia.precip_mm>10?'var(--amber)':'var(--green-mid)';
            return `<div style="display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);gap:10px">
              <div style="font-size:11px;font-weight:700;min-width:80px;color:var(--text-2)">${dt}</div>
              <div style="flex:1;background:var(--border);border-radius:3px;height:5px;overflow:hidden">
                <div style="height:5px;border-radius:3px;background:${cor};width:${Math.min(dia.precip_mm/60*100,100)}%"></div>
              </div>
              <div style="font-size:11px;font-weight:700;color:${cor};min-width:45px;text-align:right">${dia.precip_mm.toFixed(1)}mm</div>
              <div style="font-size:10px;color:var(--text-3);min-width:30px">${dia.prob_max_pct}%</div>
              <div style="font-size:10px;color:var(--text-3)">${(dia.temp_max_c||0).toFixed(0)}/${(dia.temp_min_c||0).toFixed(0)}deg</div>
            </div>`;
          }).join('')}
          <div style="padding:10px 14px 8px">
            <div style="font-size:9px;color:var(--text-3);margin-bottom:4px">Precipitacao horaria (12h)</div>
            <svg viewBox="0 0 100 40" style="width:100%;height:36px">
              <polyline points="${pts}" fill="none" stroke="var(--blue)" stroke-width="1.5" opacity="0.8"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="card" id="card-cameras" style="display:none;margin-bottom:14px">
        <div class="card-header">
          <div class="card-title">📹 Câmeras ao vivo — Nível do Rio</div>
          <span style="font-size:9px;color:var(--text-3)">niveldorio.com · Infotec (leitura por IA)</span>
        </div>
        <div id="cameras-lista" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px"></div>
      </div>
      <div class="g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Condicoes Meteorologicas</div>
            ${est?`<span style="font-size:9px;color:var(--text-3)">INMET ${est.codigo} (${est.dist_km}km)</span>`:''}
          </div>
          ${[
            ['Temperatura',(agora.temperatura_c||0).toFixed(1)+'C',''],
            ['Umidade relativa',(agora.umidade_pct||0).toFixed(0)+'%',''],
            ['Vento',(agora.vento_kmh||0).toFixed(0)+' km/h',''],
            ['Rajada max',(agora.rajada_kmh||0).toFixed(0)+' km/h',(agora.rajada_kmh||0)>60?'color:var(--amber)':''],
            ['CAPE convectivo',Math.round(agora.cape_jkg||0)+' J/kg',(agora.cape_jkg||0)>1000?'color:var(--red)':''],
            ['Umidade solo',((agora.umidade_solo||0)*100).toFixed(0)+'%',(agora.umidade_solo||0)>0.45?'color:var(--amber)':''],
            ['Prob chuva 6h',(prox6.prob_max_pct||0)+'%',(prox6.prob_max_pct||0)>70?'color:var(--amber)':''],
            ['Acum 24h',(prox24.precip_acum_mm||0).toFixed(0)+' mm',(prox24.precip_acum_mm||0)>50?'color:var(--amber)':''],
          ].map(([l,v,s])=>`<div style="display:flex;justify-content:space-between;padding:6px 14px;border-bottom:1px solid var(--border);font-size:12px">
            <span style="color:var(--text-2)">${l}</span>
            <span style="font-weight:700;font-family:var(--mono);${s}">${v}</span>
          </div>`).join('')}
          ${agora.risco_convectivo?`<div style="background:#FFF0EE;padding:8px 14px;font-size:11px;color:var(--red);font-weight:600">Risco convectivo elevado (CAPE > 1000 J/kg)</div>`:''}
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Dados do Municipio</div>
            <span style="font-size:9px;color:var(--text-3)">IBGE Censo 2022</span>
          </div>
          ${[
            ['Codigo IBGE',m.cod_ibge,''],
            ['Mesorregiao',m.mesorregiao||'--',''],
            ['Microrregiao',m.microrregiao||'--',''],
            ['Bacia hidrografica',m.bacia_hidrografica||'--',''],
            ['Populacao',(m.populacao||0).toLocaleString('pt-BR')+' hab.',''],
            ['Risco base',m.risco?.nivel_str||'--',`color:${m.risco?.cor||'inherit'}`],
            ['Score base',(m.risco?.score_ia||0).toFixed(3),''],
          ].map(([l,v,s])=>`<div style="display:flex;justify-content:space-between;padding:6px 14px;border-bottom:1px solid var(--border);font-size:12px">
            <span style="color:var(--text-2)">${l}</span>
            <span style="font-weight:700;${s}">${v}</span>
          </div>`).join('')}
          <div style="padding:10px 14px">
            <div style="font-size:9px;color:var(--text-3);margin-bottom:4px">Score de risco atual</div>
            <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
              <div style="height:8px;border-radius:4px;background:${corScore};width:${sc*100}%;transition:width .5s"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Mapa - ${m.nome}</div>
          <span style="font-size:9px;color:var(--text-3)">OpenStreetMap</span>
        </div>
        <div id="mun-mapa" style="height:360px;border-radius:0 0 10px 10px"></div>
      </div>
    `;
    setTimeout(()=>this._initMapa(m),150);
    this.carregarCameras(m.cod_ibge);
  },

  async carregarCameras(ibge){
    const card=document.getElementById('card-cameras');
    const lista=document.getElementById('cameras-lista');
    if(!card||!lista) return;
    try{
      const api=(window.MunicipioInit&&MunicipioInit.API_BASE)||'https://sga-api-1705.onrender.com';
      const d=await (await fetch(api+'/api/cameras/'+ibge)).json();
      if(!d.total){ card.style.display='none'; return; }
      lista.innerHTML=d.cameras.map(c=>`
        <div style="border:1px solid var(--border);border-radius:10px;padding:10px 12px">
          <div style="font-size:11px;font-weight:800;color:var(--text-1)">${c.nome}</div>
          <div style="font-size:10px;color:var(--text-3)">${c.rio_nome||''}</div>
          <div style="font-size:22px;font-weight:900;color:${c.nivel_m!=null?'var(--green-light)':'var(--text-3)'};margin:4px 0">
            ${c.nivel_m!=null?c.nivel_m.toFixed(2)+' m':'—'}</div>
          <div style="font-size:9px;color:var(--text-3)">${c.medido_em?('medido '+c.medido_em):(d.aviso||'sem leitura')}</div>
          <button class="btn btn-outline" style="margin-top:8px;width:100%;font-size:11px"
            onclick="window.open('${c.url_pagina}','_blank')">📹 Ver câmera ao vivo</button>
        </div>`).join('');
      card.style.display='block';
    }catch(e){ card.style.display='none'; }
  },

  _initMapa(m){
    if(this._mapa){this._mapa.remove();this._mapa=null;}
    const el=document.getElementById('mun-mapa');
    if(!el||typeof L==='undefined') return;
    this._mapa=L.map('mun-mapa').setView([m.lat,m.lng],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'(c) OSM',maxZoom:18}).addTo(this._mapa);
    const cor=this._dados?.risco?.cor||'#4BAF82';
    const icon=L.divIcon({className:'',html:`<div style="width:18px;height:18px;border-radius:50%;background:${cor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
    L.marker([m.lat,m.lng],{icon})
      .bindPopup(`<b>${m.nome}</b><br>Risco: ${this._dados?.risco?.str||'N/D'}<br>Score: ${this._dados?.score?.toFixed(3)||'N/D'}<br>Pop: ${(m.populacao||0).toLocaleString('pt-BR')}`)
      .addTo(this._mapa).openPopup();
    const raios={5:15000,4:12000,3:9000,2:6000,1:4000};
    L.circle([m.lat,m.lng],{radius:raios[this._dados?.risco?.nivel||1],color:cor,fillColor:cor,fillOpacity:0.08,weight:1.5,dashArray:'4,4'}).addTo(this._mapa);
  },
};
window.MunicipioPage=MunicipioPage;