# SGA — Módulo Restinga (POA): Modelagem de Dados, Cenários e Impactos

**Versão:** 0.1 (base de modelagem) · **Data:** 31/08/2026 · **Autor:** sessão SGA (Jean Galarça)
**Escopo territorial:** bairro Restinga e Região de Planejamento 8 — Restinga e Extremo-Sul (PDUS), Porto Alegre/RS

---

## 1. Sumário executivo

Este documento estrutura a base técnica do novo módulo do SGA para a Restinga: linha de base
demográfica e socioeconômica **verificada em fonte oficial**, indicadores de mobilidade e
assimetria espacial, matriz de cenários climáticos e sociais com parâmetros de sensibilidade,
rede de apoio ao cidadão (saúde, assistência, segurança, transporte) com endereços confirmados,
modelo de dados (PostgreSQL/Supabase + contratos JSON de API no padrão SGA) e roadmap de
integração. Cada número traz fonte, data e **status de verificação** — o que não pôde ser
confirmado em fonte primária nesta sessão está explicitamente marcado, seguindo o princípio
do SGA de dado honesto e auditável.

**Duas visões de produto:**

- **Gestor municipal** — antecipação e orientação: população exposta por setor de risco oficial
  (SGB), gatilhos de alerta (CEMADEN/INMET/ANA já integrados ao SGA), matriz de impacto por
  cenário com dimensões de decisão (mobilidade, saúde, habitação, economia, operação).
- **Cidadão (APP)** — tempo real da sua região: alertas ativos, situação dos eixos de saída do
  bairro, rotas alternativas viáveis e rede de apoio mais próxima (hospital, UBS, CRAS, abrigos,
  Brigada Militar, Bombeiros), com honestidade sobre defasagem de cada dado.

---

## 2. Linha de base verificada (bairro Restinga / Região Restinga)

Legenda de status: ✅ confirmado em fonte oficial/primária · ⚠️ confirmado com ressalva
(vintage antigo ou fonte secundária) · ❓ não confirmado em fonte primária nesta sessão.

| Indicador | Valor | Referência temporal | Fonte | Status |
|---|---|---|---|---|
| População do bairro Restinga | **62.448 hab.** | Censo 2022 | ObservaPOA/SMPG — CSV oficial `Pop_Bairro_Censo_2022` | ✅ |
| Participação na população de POA | **4,69%** (de 1.332.845) | Censo 2022 | ObservaPOA/SMPG — mesmo CSV | ✅ |
| Bairro mais populoso de Porto Alegre | 1º (2º: Lomba do Pinheiro, 59.200) | Censo 2022 | ObservaPOA/SMPG — mesmo CSV | ✅ |
| "Mais populoso do RS; supera 462 dos 497 municípios (93%)" | consistente com o Censo | Censo 2022 | Reportado pela imprensa com base no IBGE; conferência exata recomendada via SIDRA (tab. 4709) | ⚠️ |
| Renda média dos responsáveis por domicílio | **2,10 salários mínimos** | **Censo 2010** (não é dado atual) | IBGE via Porto Alegre em Análise (Procempa) | ⚠️ |
| Responsáveis por domicílio com renda ≤ 2 SM | 70,16% | Censo 2010 | IBGE via Porto Alegre em Análise | ⚠️ |
| Domicílios com renda per capita ≤ ¼ SM | 6,05% | Censo 2010 | IBGE via Porto Alegre em Análise | ⚠️ |
| População negra (pretos + pardos) — Região Restinga | **38,50%** (23.382 pessoas) | Censo 2010 | IBGE via Porto Alegre em Análise | ⚠️ |
| Restinga com a maior proporção de população negra de POA | reportado (Censo 2022) | Censo 2022 | Imprensa (Sul21, dez/2025) com base no IBGE — página não acessível nesta sessão | ❓ |
| IDH da região Restinga | **0,593** (vs. Moinhos de Vento 0,958) | Censo 2010 / Atlas Brasil (nível UDH) | Augustin & Soares, *Cadernos Metrópole* v.23 n.52 (2021), citando Atlas Brasil | ⚠️ |
| IDH região Restinga (recorte OP) | 0,685 | Censo 2010 | Mesmo estudo (valor por região do Orçamento Participativo) | ⚠️ |
| Composição da Região Restinga (ObservaPOA) | bairros Restinga + Pitinga | vigente | ObservaPOA (página Região Restinga) | ✅ |
| Região de Planejamento 8 (PDUS) — Restinga e Extremo-Sul | 11 bairros: Restinga, Ponta Grossa, Belém Novo, Lageado, Lami, Chapéu do Sol, Extrema, Boa Vista do Sul, Pitinga, São Caetano, Hípica | vigente | Prefeitura POA — página RP8 do Plano Diretor | ✅ |

**Importante para a modelagem:** os dados de renda, cor/raça e IDH intraurbano disponíveis são
do **Censo 2010** — o IBGE ainda não liberou todos os recortes 2022 por bairro nessas variáveis.
O modelo deve tratá-los como *proxy histórico* com campo `vintage` explícito, e o pipeline deve
prever atualização automática quando o ObservaPOA publicar os cadernos 2022 completos.

## 3. Mobilidade e assimetria espacial

| Indicador | Valor | Fonte | Status |
|---|---|---|---|
| Distância ao Centro Histórico | ≈ 20 km | Referência amplamente citada (Wikipédia/estudos); distância viária varia por eixo | ⚠️ |
| Acesso a empregos em 30 min por transporte coletivo: Restinga ~0,5% vs. Moinhos de Vento ~43,4% | reportado | Reportagem piauí (2020) com base em estudo sobre dados do Projeto Acesso a Oportunidades (IPEA); **matéria inacessível nesta sessão** | ❓ |
| Indicador oficial correspondente | CMA-TT30 (acessibilidade cumulativa a empregos, 30 min, transporte público) | **Projeto Acesso a Oportunidades — IPEA** (dados por hexágono H3, POA 2017-2019, download aberto via `aopdata`) | ✅ (fonte para recomputar) |
| Tempo pendular em linhas troncais no pico: 1h–1h20 por perna | reportado | Mesma reportagem (inacessível); **recomputável** via GTFS + Tabela Horária STPoa (DataPOA) | ❓ |
| Gargalos estruturais: Av. Juca Batista, Av. Cavalhada, eixos da Zona Sul | qualitativo, plausível | Diagnóstico do Plano de Mobilidade Urbana de POA (PDF oficial, não lido integralmente nesta sessão) | ⚠️ |
| Obra recente no eixo interno: alargamento da Av. Edgar Pires de Castro (2 trechos de 700 m, Juca Batista ↔ Gedeon Leite ↔ Dr. Raphael Loro) | 2025–2026, fase final em fev/2026 | Mobilidade Porto Alegre (20/02/2026); obra da SMSURB | ✅ |
| Terminal Nilo Wulff (Restinga) revitalizado | entregue em 2023; revitalização iniciada pela SMMU | Prefeitura POA (notícias GP/SMMU) | ✅ |
| Operação das linhas Restinga | Consórcio **Viva Sul** (registro EPTC dez/2019, linha 110.2 Restinga Nova) | Prefeitura POA/EPTC | ⚠️ (conferir operador atual) |
| Dados abertos para cálculo de tempos | GTFS + STPoa (frota, tabela horária) publicados no DataPOA (`dadosabertos.poa.br`, org. EPTC) | DataPOA | ✅ |

### ⚠️ Divergências encontradas nos insumos fornecidos (correções obrigatórias)

1. **"Redução de 67% no tempo... 2,5–3 min... 60 mil usuários" NÃO se refere à Restinga.**
   A fonte citada (pauta da Prefeitura de 20/12/2019) atribui esses números à **faixa exclusiva
   da Av. Goethe** (bairro Rio Branco): trecho de 400 m, redução prevista de 67%, 2min50s a menos,
   ~62 mil usuários de 8 linhas. Não deve entrar no módulo como elasticidade da malha da Restinga.
   O que existe de oficial na malha interna da Restinga é o alargamento da Av. Edgar Pires de
   Castro (sem número oficial de redução de tempo publicado até 20/02/2026).
2. **Renda "2,10 SM" é Censo 2010**, não dado atual — usar como histórico com vintage declarado.
3. **IDH 0,593 é estimativa em nível de UDH (Atlas Brasil, dados 2010)** citada em estudo
   acadêmico revisado por pares — não é IDHM oficial de bairro (IDHM oficial existe só por
   município: POA = 0,805 em 2010). O mesmo estudo traz 0,685 para a região OP Restinga.
   Registrar as duas granularidades no modelo.
4. **Operadora "Tinga" não confirmada.** O registro oficial encontrado aponta Consórcio Viva Sul
   na bacia Sul (2019). Confirmar operador vigente junto à EPTC antes de nomear no app.
5. **Endereço do Hospital Restinga:** o site do próprio hospital grafa "Av. João Antonio da
   Silveira, 3700 — Bairro Lomba do Pinheiro", mas a via fica na Restinga (CEP 91796-000).
   Divergência de grafia do próprio site — validar no CNES antes de publicar no app.
6. **Painel Saneamento Brasil (Trata Brasil)** é painel de ONG que **reprocessa** dados oficiais
   do SNIS/SINISA (Ministério das Cidades). Usar como leitura complementar; a fonte primária
   para o modelo é SNIS/SINISA + DMAE.

## 4. Risco climático oficial e histórico recente

### 4.1 Setores de risco oficiais (SGB/CPRM)

Relatório "Setorização de Áreas de Risco Geológico — Atualização de Mapeamento" (SGB, dez/2022,
publicado pela Defesa Civil de POA): **142 setores** no município (91 alto risco, 51 muito alto).
Setores associados à região Restinga/Extremo-Sul na leitura desta sessão (⚠️ confirmar recorte
espacial pelas geometrias no GeoSGB antes de fixar no banco):

| Setor (código SGB) | Tipologia | Grau | Pop. estimada |
|---|---|---|---|
| RS_PORTOAL_SR_06_CPRM | Inundação | Alto (R3) | ~412 |
| RS_PORTOAL_SR_07_CPRM | Enxurrada, erosão, inundação | Alto (R3) | ~260 |
| RS_PORTOAL_SR_08_CPRM | Enxurrada, erosão | Muito Alto (R4) | ~404 |
| RS_PORTOAL_SR_59_CPRM | Deslizamento, queda de blocos | Alto (R3) | ~136 |

### 4.2 Evento de referência — maio/2024

- Na cheia de maio/2024, a imprensa registrou alagamentos em "várias partes da zona Sul, da
  Tristeza até Restinga, Belém Novo" (Extra Classe, 23/05/2024) — ou seja, a Restinga **não é
  imune** a eventos hidrológicos, sobretudo nas áreas baixas ligadas à bacia do Arroio do Salso,
  ainda que o bairro não seja atingido pela cota do Guaíba como o Centro/4º Distrito. ⚠️ Fonte
  jornalística; o recorte oficial de áreas atingidas está na plataforma da Smamus (storymap
  ArcGIS da enchente, 13/05/2024) e deve ser importado como camada.
- Gatilhos em tempo real já disponíveis no SGA: pluviometria CEMADEN, avisos INMET, telemetria
  ANA/réguas SGB — o módulo referencia essas integrações, sem duplicá-las.

## 5. Rede de apoio ao cidadão (verificada)

Equipamentos confirmados em fonte oficial nesta sessão (coordenadas: gerar pelo pipeline OSM
já usado no SGA — `scripts/gerar_geo_restinga.py`; **nenhuma coordenada foi inventada**):

| Tipo | Nome | Endereço | Fonte |
|---|---|---|---|
| Hospital (SUS) | Hospital Restinga e Extremo-Sul | Av. João Antonio da Silveira, 3700 (ver divergência §3.5) — (51) 3010-4700 | Site oficial do hospital |
| UBS/CF | CF Álvaro Difini | Rua Alvaro Difini, 520 — Restinga | Carta de Serviços — Prefeitura POA |
| UBS/CF | CF José Mauro Ceratti Lopes | Estrada João Antonio da Silveira, 3330 — Restinga | Carta de Serviços — Prefeitura POA |
| UBS | US Restinga | Rua Abolição, 850 — Restinga | Carta de Serviços — Prefeitura POA |
| UBS | US Macedônia | Av. Macedônia, 750 — Restinga | Carta de Serviços — Prefeitura POA |
| UBS | US Chácara do Banco | Trav. Jurandi Barrios Mathias, 20 — Restinga | Carta de Serviços — Prefeitura POA |
| UBS | US Núcleo Esperança | Rua 7114, 23 — Restinga | Carta de Serviços — Prefeitura POA |
| Saúde mental | CAPS AD III Girassol — Restinga e Extremo-Sul | (endereço a confirmar no CNES) | Carta de Serviços — Prefeitura POA |
| Assistência social | CRAS Restinga | Rua Economista Nilo Wulff, s/nº — (51) 3289-4788 | FASC — PDF oficial de endereços |
| Assistência social | CRAS 5ª Unidade | Rua N 2, 20 — Restinga — (51) 3289-4920 | FASC — PDF oficial |
| Assistência social | CRAS Extremo Sul | Rua Gumercindo Oliveira, 23 — Chapéu do Sol — (51) 3289-4784 | FASC — PDF oficial |
| Segurança (BM) | 21º BPM — policiamento do extremo-sul (13 bairros, ~48% do território de POA; origem: Destacamento Especial da Restinga, 1985) | Rua Gov. Walter Peracchi Barcelos (sede desde 1989) | Brigada Militar RS — página oficial |
| Bombeiros | Unidade CBMRS de referência da Zona Sul | a confirmar na página "Unidades de Atendimento" do CBMRS (indisponível nesta sessão) | CBMRS | 
| Transporte | Terminal Nilo Wulff (Restinga) | revitalizado, entrega 2023 | Prefeitura POA |
| Abrigos | Base estadual OSM do SGA (`abrigos_rs.geojson`, 4.751 locais nomeados) — filtrar `ibge=4314902` + recorte Restinga | já em produção no SGA | SGA/OSM |

## 6. Matriz de cenários e parâmetros de sensibilidade

### 6.1 Cenários climáticos (gatilhos em tempo real)

| Código | Cenário | Gatilho (fonte já no SGA) | População-alvo prioritária | Impactos diretos modelados |
|---|---|---|---|---|
| CLI-1 | Chuva intensa / enxurrada / alagamento (bacia Arroio do Salso) | CEMADEN mm/1h-24h ≥ limiares; aviso INMET laranja/vermelho | Setores SGB SR_06/07/08 (~1.076 pessoas mapeadas) + áreas baixas | Bloqueio de vias internas, suspensão de linhas, acionamento de abrigos, sobrecarga UBS |
| CLI-2 | Deslizamento / queda de blocos | Chuva acumulada 72h + setor SR_59 (R3, ~136 pessoas) | Setor SR_59 | Evacuação preventiva orientada, rota de fuga, abrigo mais próximo |
| CLI-3 | Calor extremo | Aviso INMET de onda de calor | Idosos, crianças, domicílios precários | Pontos de hidratação/climatização (UBS/CRAS), horários recomendados de deslocamento |
| CLI-4 | Vendaval/granizo | Aviso INMET | Todo o bairro | Queda de árvores/energia, bloqueio dos eixos, orientação de permanência |
| CLI-5 | Bloqueio dos eixos de saída (qualquer causa, incl. social) | Ocorrência EPTC/Defesa Civil nos eixos Juca Batista, Edgar Pires de Castro, Estrada João Antônio da Silveira | ~62 mil moradores + pendulares | Rotas alternativas, tempo adicional estimado, reprogramação de rotina |

**Parâmetros de sensibilidade (funções de custo):** Δ tempo de viagem por perna (min);
% de empregos acessíveis em 30/60/90 min (CMA-TT, recomputado do `aopdata`); população exposta
por setor SGB; nº de equipamentos de saúde operacionais; capacidade de abrigos ativados.
Pequenas variações no tempo de viagem multiplicam-se por ~62 mil habitantes — cada minuto/dia
economizado ≈ 1.040 horas/dia devolvidas à população do bairro (cálculo direto, declarar como
estimativa dasimétrica no padrão SGA).

### 6.2 Cenários estruturais/sociais (horizonte de gestão)

| Código | Cenário | Base normativa/fática verificada | Efeito modelado |
|---|---|---|---|
| SOC-A | Status quo (inércia estrutural) | Linha de base §2-3 | Alto custo de oportunidade pendular; pressão sobre subsídio tarifário; exposição prolongada em terminais/veículos |
| SOC-B | Policentralidade e qualificação periférica (PDUS) | Novo Plano Diretor sancionado em **14/07/2026** (vigência 180 dias após publicação; nº de LC citado como 1075/2026 em agregador — **confirmar no DOPA**) | Cada emprego gerado no bairro reduz km rodado e demanda de pico nos eixos troncais; metas de centralidade local |
| SOC-C | Eletrificação da frota | **Verificado:** autorização do Min. da Fazenda (27/05/2026) e contrato BNDES (10/07/2026) de **R$ 447 mi para 100 ônibus elétricos + estações de recarga** (Programa Mais Transporte); operação elétrica em POA desde 2024 | Redução de emissões na fase de uso; CapEx elevado; infraestrutura de recarga em terminais (candidato natural: Terminal Nilo Wulff — **hipótese de projeto, não compromisso oficial**) |

## 7. Modelo de dados (PostgreSQL/Supabase — padrão SGA)

Esquema completo em `docs/modulo_restinga.sql` (territorios, indicadores, indicador_valores,
equipamentos, cenarios, cenario_parametros, cenario_impactos, alertas_territorio,
rotas_alternativas — 9 tabelas, todas com fonte e status de verificação como colunas de
primeira classe).

### Contratos de API (padrão SGA `/api/...`)

- `GET /api/restinga/panorama` → `{territorio, baseline:[{indicador,valor,data_ref,fonte,status}], alertas_ativos[], eixos:[{via,status}], atualizado_em}`
- `GET /api/restinga/cenarios` e `GET /api/restinga/cenarios/:codigo` → cenário + parâmetros + matriz de impactos (filtro `?publico=cidadao|gestor`)
- `GET /api/restinga/equipamentos?tipo=ubs&operacional=true` → lista com distância ao ponto do usuário (`?lat&lon`), origem e data de verificação de cada registro
- `GET /api/restinga/rotas?destino=centro|equipamento:ID` → rotas com status e vias; em alerta ativo, rotas `bloqueada` vêm com alternativa
- `GET /api/restinga/alertas` → agrega os conectores CEMADEN/INMET/ANA-SGB existentes do SGA recortados pelo território (com horário de cada medição, no padrão de honestidade do Centro de Controle)

## 8. Fontes e pipelines de alimentação

| Fonte (oficial/primária) | O que alimenta | Acesso |
|---|---|---|
| ObservaPOA / SMPG — `Pop_Bairro_Censo_2022.csv` + cadernos por região | `indicador_valores` (população, % cidade) | CSV público (prefeitura.poa.br) |
| IBGE — SIDRA/Panorama Censo 2022 (agregados por bairro, à medida que publicados) | renda, cor/raça, domicílios 2022 | API SIDRA |
| IPEA — Projeto Acesso a Oportunidades (`aopdata`) | CMA-TT30/60/90 por hexágono H3 → agregação Restinga | pacote R/Python, download aberto |
| DataPOA/EPTC — GTFS + STPoa (frota, tabela horária) | tempos de ciclo, linhas, headways, tempo pendular recomputado | dadosabertos.poa.br |
| SGB/CPRM — Relatório de Setorização de Risco POA (dez/2022) + GeoSGB (geometrias) | `territorios(tipo=setor_risco_sgb)` + pop. exposta | PDF Defesa Civil POA + GeoSGB |
| Smamus — storymap oficial da enchente 05/2024 (ArcGIS) | camada histórica de área atingida | storymaps.arcgis.com (id 02d01e5f…) |
| CNES/DataSUS (API dados abertos da Saúde) | validação/enriquecimento de `equipamentos` (códigos CNES, lat/lon oficiais) | apidadosabertos.saude.gov.br |
| FASC + Carta de Serviços POA | CRAS/CREAS/UBS (endereços) | PDFs/páginas oficiais |
| Brigada Militar RS / CBMRS | unidades de segurança e bombeiros | páginas oficiais |
| PDUS (sancionado 14/07/2026) + LUOS | cenário SOC-B (policentralidade, resiliência) | DOPA/Câmara (confirmar nº LC) |
| BNDES/Prefeitura — financiamento 100 ônibus elétricos (R$ 447 mi, contrato 10/07/2026) | cenário SOC-C | notícias oficiais Prefeitura |
| SNIS/SINISA (+ leitura Trata Brasil) | saneamento/infraestrutura p/ impactos agregados | gov.br |
| OSM (pipeline pyosmium já em produção no SGA) | coordenadas de equipamentos + abrigos | Geofabrik sul-latest |

**Pipeline de geocodificação (sem inventar coordenada):** `scripts/gerar_geo_restinga.py`
reaproveita o fluxo do `abrigos_rs.geojson` (pyosmium + sjoin IBGE) e faz o *match* por nome
normalizado com o cadastro de equipamentos verificados; o que não casar fica `lat/lon = null` e
aparece no app sem pino no mapa (lista com endereço), até validação manual ou via CNES.

## 9. Roadmap de integração ao SGA

1. **Fase 1 — Base territorial e baseline (estático):** ENTREGUE nesta sessão — página
   "Restinga · Porto Alegre" (seção TERRITORIOS) com baseline + selo de status por indicador.
2. **Fase 2 — Tempo real:** recorte territorial dos conectores existentes (CEMADEN/INMET/ANA)
   — primeira versão na página (chuva CEMADEN POA/Restinga + avisos INMET recortados);
   evoluir para `alertas_territorio` + gatilhos por cenário; eixos viários com status manual
   até integração com ocorrências EPTC.
3. **Fase 3 — Cidadão (APP):** levar a visão cidadão da página para o PWA (`public/app`),
   com equipamentos por distância, rotas alternativas e notificações por região.
4. **Fase 4 — Modelagem socioeconômica:** recomputar CMA-TT com `aopdata` + GTFS vigente;
   funções de custo (Δtempo × população pendular); simulação de policentralidade (SOC-B);
   aplicar `docs/modulo_restinga.sql` no Supabase e migrar os JSON estáticos para o banco.
5. **Replicabilidade:** todo o esquema usa território genérico — o módulo "Restinga" é o
   piloto do padrão "módulo de bairro/região" para qualquer município do SGA.

## 10. Pendências de verificação (assumidas com transparência)

- Nº oficial da Lei Complementar do PDUS (citado como 1075/2026 em agregador) — conferir DOPA.
- Matéria piauí (0,5% vs 43,4%; 1h–1h20) — inacessível; recomputar do `aopdata`/GTFS.
- Recorte espacial exato dos setores SGB SR_06/07/08/59 — validar geometrias no GeoSGB.
- Operador atual das linhas da Restinga (Viva Sul em 2019) — confirmar na EPTC.
- Unidade CBMRS de referência da Zona Sul — página oficial fora do ar na sessão.
- % população negra por bairro no Censo 2022 (Restinga apontada como maior proporção) —
  aguardar caderno ObservaPOA/agregados IBGE.
- Endereço/CNES do Hospital Restinga e do CAPS AD III Girassol — validar via API CNES.
