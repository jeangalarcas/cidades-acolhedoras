-- SGA — Módulo Restinga (2026-08-31)
-- Esquema APLICADO no Supabase (migração modulo_restinga_v01) — paridade com produção.
-- Diferenças sobre a v0.1 do documento: colunas codigo_cnes e fonte_coordenadas em equipamentos;
-- tipo 'climatico_social' em cenarios (usado pelo CLI-5); RLS habilitado com leitura pública
-- (escrita apenas via service role, padrão do projeto).

create table territorios (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('bairro','regiao_observapoa','regiao_planejamento','setor_risco_sgb','municipio')),
  codigo text,
  nome text not null,
  parent_id bigint references territorios(id),
  geom_ref text,
  fonte text not null,
  atualizado_em timestamptz default now()
);

create table indicadores (
  id bigint generated always as identity primary key,
  codigo text unique not null,
  nome text not null,
  unidade text not null,
  fonte text not null,
  url_fonte text,
  metodologia text
);

create table indicador_valores (
  id bigint generated always as identity primary key,
  territorio_id bigint not null references territorios(id),
  indicador_id bigint not null references indicadores(id),
  valor numeric,
  valor_texto text,
  data_ref text not null,
  status_verificacao text not null check (status_verificacao in ('confirmado','ressalva','nao_confirmado')),
  fonte_url text,
  verificado_em date,
  unique (territorio_id, indicador_id, data_ref)
);

create table equipamentos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('hospital','ubs','caps','cras','creas','abrigo','brigada_militar','bombeiros','terminal','escola','centro_comunitario','outro')),
  nome text not null,
  endereco text,
  bairro text,
  territorio_id bigint references territorios(id),
  lat double precision,
  lon double precision,
  telefone text,
  capacidade int,
  operacional boolean default true,
  codigo_cnes text,
  fonte_coordenadas text,
  fonte text not null,
  fonte_url text,
  verificado_em date,
  atualizado_em timestamptz default now()
);

create table cenarios (
  id bigint generated always as identity primary key,
  codigo text unique not null,
  tipo text not null check (tipo in ('climatico','climatico_social','estrutural_social')),
  nome text not null,
  descricao text,
  gatilho jsonb
);

create table cenario_parametros (
  cenario_id bigint references cenarios(id),
  parametro text not null,
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
  acoes jsonb
);

create table alertas_territorio (
  id bigint generated always as identity primary key,
  territorio_id bigint references territorios(id),
  cenario_id bigint references cenarios(id),
  origem text not null,
  nivel text not null,
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
  vias text[] not null,
  status text not null default 'livre' check (status in ('livre','restrita','bloqueada')),
  observacao text,
  fonte text,
  atualizado_em timestamptz default now()
);

-- RLS no padrão do projeto: habilitado, leitura pública; escrita só via service role
alter table territorios enable row level security;
alter table indicadores enable row level security;
alter table indicador_valores enable row level security;
alter table equipamentos enable row level security;
alter table cenarios enable row level security;
alter table cenario_parametros enable row level security;
alter table cenario_impactos enable row level security;
alter table alertas_territorio enable row level security;
alter table rotas_alternativas enable row level security;

create policy leitura_publica on territorios for select using (true);
create policy leitura_publica on indicadores for select using (true);
create policy leitura_publica on indicador_valores for select using (true);
create policy leitura_publica on equipamentos for select using (true);
create policy leitura_publica on cenarios for select using (true);
create policy leitura_publica on cenario_parametros for select using (true);
create policy leitura_publica on cenario_impactos for select using (true);
create policy leitura_publica on alertas_territorio for select using (true);
create policy leitura_publica on rotas_alternativas for select using (true);

-- Estado do seed em 31/08/2026: 8 territorios (município, bairro, região ObservaPOA, RP8, 4 setores SGB),
-- 12 indicadores + 12 valores (com status de verificação), 8 cenarios + 18 impactos,
-- 14 equipamentos (8 com coordenada oficial CNES). cenario_parametros e rotas_alternativas
-- ficam para a Fase 4 (valores numéricos recomputados do aopdata/GTFS).
