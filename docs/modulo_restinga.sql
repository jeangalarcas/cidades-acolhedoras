-- SGA — Módulo Restinga v0.1 (2026-08-31)
-- Esquema extraído de MODULO_RESTINGA_modelagem.md §7

-- Territórios (bairro, região ObservaPOA, RP do PDUS, setor SGB…)
create table territorios (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('bairro','regiao_observapoa','regiao_planejamento','setor_risco_sgb','municipio')),
  codigo text,                -- ex.: IBGE 4314902, RS_PORTOAL_SR_08_CPRM
  nome text not null,
  parent_id bigint references territorios(id),
  geom_ref text,              -- caminho da geometria (geojson em public/data/geo)
  fonte text not null,
  atualizado_em timestamptz default now()
);

-- Catálogo de indicadores (nada entra sem fonte + vintage)
create table indicadores (
  id bigint generated always as identity primary key,
  codigo text unique not null,      -- POP_TOTAL, CMATT30, RENDA_RESP_SM, IDH_UDH, POP_NEGRA_PCT…
  nome text not null,
  unidade text not null,
  fonte text not null,              -- ObservaPOA/IBGE, IPEA-AOP, SGB, EPTC/GTFS…
  url_fonte text,
  metodologia text
);

create table indicador_valores (
  id bigint generated always as identity primary key,
  territorio_id bigint not null references territorios(id),
  indicador_id bigint not null references indicadores(id),
  valor numeric,
  valor_texto text,
  data_ref text not null,           -- 'Censo 2022', '2010', '2019', ISO date…
  status_verificacao text not null check (status_verificacao in ('confirmado','ressalva','nao_confirmado')),
  fonte_url text,
  verificado_em date,
  unique (territorio_id, indicador_id, data_ref)
);

-- Rede de apoio
create table equipamentos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('hospital','ubs','caps','cras','creas','abrigo','brigada_militar','bombeiros','terminal','escola','centro_comunitario','outro')),
  nome text not null,
  endereco text,
  bairro text,
  territorio_id bigint references territorios(id),
  lat double precision,             -- NULL até geocodificação pelo pipeline OSM
  lon double precision,
  telefone text,
  capacidade int,                   -- abrigos: vagas (quando oficial)
  operacional boolean default true,
  fonte text not null,
  fonte_url text,
  verificado_em date,
  atualizado_em timestamptz default now()
);

-- Cenários e matriz de impacto
create table cenarios (
  id bigint generated always as identity primary key,
  codigo text unique not null,      -- CLI-1..5, SOC-A..C
  tipo text not null check (tipo in ('climatico','estrutural_social')),
  nome text not null,
  descricao text,
  gatilho jsonb                     -- {origem:'CEMADEN', metrica:'chuva_1h', operador:'>=', limiar:…}
);

create table cenario_parametros (
  cenario_id bigint references cenarios(id),
  parametro text not null,          -- delta_tempo_viagem_min, pop_exposta, cmatt30_pct…
  valor_base numeric, valor_min numeric, valor_max numeric,
  unidade text, fonte text,
  primary key (cenario_id, parametro)
);

create table cenario_impactos (
  id bigint generated always as identity primary key,
  cenario_id bigint references cenarios(id),
  dimensao text not null check (dimensao in ('mobilidade','saude','assistencia','habitacao','economia','operacao_gestao')),
  publico text not null check (publico in ('cidadao','gestor')),
  severidade int check (severidade between 1 and 5),
  descricao text not null,
  acoes jsonb                       -- ["evitar deslocamento eixo X", "acionar abrigo Y"…]
);

-- Tempo real
create table alertas_territorio (
  id bigint generated always as identity primary key,
  territorio_id bigint references territorios(id),
  cenario_id bigint references cenarios(id),
  origem text not null,             -- CEMADEN | INMET | ANA_SGB | DEFESA_CIVIL | EPTC
  nivel text not null,              -- observacao | atencao | alerta | emergencia
  mensagem text not null,
  payload jsonb,
  valido_de timestamptz not null,
  valido_ate timestamptz,
  criado_em timestamptz default now()
);

create table rotas_alternativas (
  id bigint generated always as identity primary key,
  origem_territorio_id bigint references territorios(id),
  destino_tipo text not null check (destino_tipo in ('territorio','equipamento')),
  destino_id bigint not null,
  modo text not null check (modo in ('onibus','carro','a_pe','misto')),
  vias text[] not null,             -- ex.: {'Av. Edgar Pires de Castro','Estrada do Varejão',…}
  status text not null default 'livre' check (status in ('livre','restrita','bloqueada')),
  observacao text,
  fonte text,
  atualizado_em timestamptz default now()
);
