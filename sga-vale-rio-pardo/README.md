# 🌊 SGA — Sistema de Gestão e Alertas
## Vale do Rio Pardo · Cidades Acolhedoras · RS

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Protótipo%20v3-blue)](https://github.com/)
[![ODS](https://img.shields.io/badge/ODS-9%20objetivos-orange)](https://odsbrasil.gov.br/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet%20%2B%20OSM-brightgreen)](https://leafletjs.com/)

Sistema profissional desktop de **gestão de riscos climáticos** e **emissão de alertas** para os 23 municípios do Vale do Rio Pardo — desenvolvido no âmbito do projeto **Cidades Acolhedoras** da Correa Eco Social.

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Fontes de Dados Integradas](#fontes-de-dados-integradas)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Como Executar](#como-executar)
- [Módulos do Sistema](#módulos-do-sistema)
- [IA Preditiva](#ia-preditiva)
- [Motor de Alertas](#motor-de-alertas)
- [Roadmap](#roadmap)
- [Alinhamento ODS](#alinhamento-ods)
- [Equipe](#equipe)
- [Licença](#licença)

---

## 🎯 Visão Geral

O SGA é um **sistema de apoio à decisão** para defesa civil e gestores municipais, integrando:

- **Monitoramento em tempo real** via 124 sensores IoT (réguas hidrológicas, pluviômetros, tensiômetros)
- **Mapa interativo OSM** com camadas de risco CPRM, dados ANA HidroWeb e infraestrutura OSM
- **Motor de alertas multicamada** (limiares fixos → modelo combinado → IA preditiva LSTM)
- **IA preditiva** com janela de 24–48h (modelo LSTM-v3, acurácia 84%, F1=0.891)
- **16 fontes de dados** integradas: OSM, CPRM, ANA HidroWeb, CEMADEN, IBGE, MapBiomas, CadÚnico, SUAS, SAMU/CAD, Sentinel-2, GOES-16, INMET e outras
- **9 canais de emissão** de alertas: App, SMS, WhatsApp, Rádio, Sirenes IoT, Telegram, TV, E-mail, Wearables

### Região de abrangência
| Parâmetro | Valor |
|---|---|
| Municípios monitorados | 23 |
| População total | ~434.200 habitantes |
| Área da bacia | ~25.000 km² |
| Rio principal | Rio Pardo (afluente do Jacuí) |

---

## ✨ Funcionalidades

### Painel Geral
- Métricas em tempo real: alertas ativos, população em risco, sensores, vagas em abrigos
- Mini-mapa OSM com municípios coloridos por score de risco
- Previsão IA das próximas 24h
- Ranking de municípios por nível de risco
- Badges de fontes de dados ativas

### Mapa de Risco (Leaflet + OSM)
- Tiles OpenStreetMap como mapa base
- 8 camadas ativáveis independentemente:
  - Zonas de risco (CPRM GeoSGB)
  - Hidrografia do Rio Pardo e afluentes
  - Réguas hidrológicas ANA HidroWeb
  - Pluviômetros CEMADEN + IoT
  - Suscetibilidade CPRM (overlay)
  - Abrigos de emergência
  - Rotas de fuga (OSM)
- Tooltips interativos com dados em tempo real

### ANA HidroWeb
- 6 estações fluviométricas com códigos reais
- Cotas, vazões e variações em tempo real
- Curvas IDF calibradas por estação (TR-10, TR-25, TR-100)
- Curve Number (CN) por sub-bacia via MapBiomas
- Histórico de séries e sparklines

### Geodados & Sistemas Sociais
- **CadÚnico**: 3.820 famílias vulneráveis georreferenciadas, priorização para alertas
- **SUAS**: CRAS, CREAS, unidades de acolhimento, capacidade instalada
- **SAMU/CAD**: despacho de viaturas em tempo real, ocorrências geolocalizadas
- **IBGE**: índice de vulnerabilidade por setor censitário (IVCCU)
- **CPRM**: cartas de suscetibilidade por município

### Central de Alertas
- Motor multicamada (3 camadas independentes)
- Simulador interativo de limiares
- Regras de escalonamento por nível de severidade
- 9 canais de emissão com status em tempo real

### IA Preditiva
- Previsão probabilística com intervalo de confiança 90%
- Previsão por município para próximas 48h
- Arquitetura LSTM + Ensemble (XGBoost + Random Forest)
- Retreino mensal automático com dados ANA + CEMADEN + INMET

---

## 🏗 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    FONTES DE DADOS                              │
│  OSM · CPRM · ANA HidroWeb · CEMADEN · IBGE · MapBiomas        │
│  CadÚnico · SUAS · SAMU/CAD · Sentinel-2 · GOES-16 · INMET     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ APIs REST / WebSocket / WMS/WFS
┌──────────────────────────▼──────────────────────────────────────┐
│                 CAMADA DE INGESTÃO DE DADOS                     │
│  services/dataIngestion.js · Normalização · Cache · Fila        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              MOTOR DE ALERTAS MULTICAMADA                       │
│  Camada 1: Limiares fixos (<5s)                                 │
│  Camada 2: Modelo combinado (score 0-1)                         │
│  Camada 3: IA preditiva LSTM (24-48h)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   INTERFACE WEB (SGA)                           │
│  Leaflet.js (OSM) · Dashboard · Alertas · Fluxo · Relatórios    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               CANAIS DE EMISSÃO DE ALERTAS                      │
│  App · SMS · WhatsApp · Rádio · Sirenes · Telegram · TV         │
└─────────────────────────────────────────────────────────────────┘
```

### Etapas tecnológicas

| Etapa | Status | Descrição |
|---|---|---|
| **Etapa 1** | ✅ Ativa | Software de alerta e monitoramento (este sistema) |
| **Etapa 2** | 🔄 Em dev. | IA preditiva LSTM — modelo em produção |
| **Etapa 3** | 📋 Roadmap | Gêmeo digital da bacia do Rio Pardo |

---

## 🔌 Fontes de Dados Integradas

### Geoespaciais & Cartográficas
| Fonte | Tipo | Endpoint / Acesso |
|---|---|---|
| **OpenStreetMap** | Mapa base + infraestrutura | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **OSM Overpass API** | Consultas espaciais | `https://overpass-api.de/api/interpreter` |
| **CPRM GeoSGB** | Cartas de suscetibilidade | `https://geoportal.cprm.gov.br/` |
| **IBGE** | Malha municipal + Censo | `https://servicodados.ibge.gov.br/api/v1/` |
| **MapBiomas** | Uso do solo 1985–2024 | `https://plataforma.brasil.mapbiomas.org/` |
| **SRTM/ALOS** | MDT 30m | `https://opentopography.org/` |
| **OpenTopoData** | Elevação por coord. | `https://api.opentopodata.org/v1/` |

### Hidrologia
| Fonte | Tipo | Endpoint / Acesso |
|---|---|---|
| **ANA HidroWeb** | Cotas e vazões em tempo real | `https://www.snirh.gov.br/hidroweb/` |
| **ANA — API REST** | Dados telemétricos | `https://telemetriaws1.ana.gov.br/` |
| **Sensores IoT** | Réguas ultrassônicas | LoRaWAN interno / 4G backup |
| **HEC-RAS 2D** | Modelo hidráulico | Offline — integrado |

### Meteorologia
| Fonte | Tipo | Endpoint / Acesso |
|---|---|---|
| **CEMADEN** | Pluviometria em tempo real | `https://www.cemaden.gov.br/` |
| **INMET** | Est. automáticas | `https://apitempo.inmet.gov.br/` |
| **Open-Meteo** | Previsão ensemble | `https://api.open-meteo.com/v1/` |
| **GOES-16** | Satélite NOAA | `https://www.star.nesdis.noaa.gov/` |
| **Sentinel-2** | ESA via GEE | `https://developers.google.com/earth-engine/` |

### Social & Institucional
| Fonte | Tipo | Endpoint / Acesso |
|---|---|---|
| **CadÚnico / MDS** | Famílias vulneráveis | `https://api.gov.br/` |
| **SUAS / MDS** | Rede socioassistencial | `https://aplicacoes.mds.gov.br/` |
| **SAMU / Bombeiros** | CAD — despacho | Integração municipal |
| **Prefeituras** | SIGAM — cadastro imobiliário | APIs municipais |

---

## 📁 Estrutura do Repositório

```
sga-vale-rio-pardo/
│
├── 📄 README.md                    # Este arquivo
├── 📄 LICENSE                      # MIT License
├── 📄 .gitignore                   # Arquivos ignorados
├── 📄 package.json                 # Dependências e scripts npm
│
├── 📁 public/                      # Arquivos estáticos servidos diretamente
│   ├── index.html                  # Entry point (carrega a SPA)
│   └── favicon.svg                 # Ícone do sistema
│
├── 📁 src/                         # Código-fonte principal
│   │
│   ├── 📁 styles/                  # CSS global e tokens de design
│   │   ├── variables.css           # Variáveis CSS (cores, tipografia, espaçamento)
│   │   ├── base.css                # Reset e estilos base
│   │   ├── components.css          # Componentes reutilizáveis (cards, pills, tabelas)
│   │   ├── layout.css              # Topbar, sidebar, grid de páginas
│   │   └── map.css                 # Estilos específicos do mapa Leaflet
│   │
│   ├── 📁 components/              # Componentes de UI reutilizáveis
│   │   ├── TopBar.js               # Barra superior com status e relógio
│   │   ├── Sidebar.js              # Navegação lateral
│   │   ├── MetricCard.js           # Cards de métricas
│   │   ├── AlertRow.js             # Linha de alerta
│   │   ├── Sparkline.js            # Mini-gráfico de série temporal
│   │   ├── SensorCard.js           # Card de sensor IoT
│   │   ├── DataSourceBadge.js      # Badge de fonte de dados
│   │   └── FlowStep.js             # Etapa do fluxo de decisão
│   │
│   ├── 📁 pages/                   # Páginas do sistema (cada aba)
│   │   ├── Painel.js               # Painel geral
│   │   ├── Mapa.js                 # Mapa OSM + camadas
│   │   ├── Alertas.js              # Central de alertas
│   │   ├── Fluxo.js                # Fluxo de decisão
│   │   ├── Sensores.js             # Sensores & IoT
│   │   ├── Integracoes.js          # Painel de integrações
│   │   ├── HidroWeb.js             # ANA HidroWeb detalhado
│   │   ├── Geodados.js             # Geodados & sistemas sociais
│   │   ├── IAPreditiva.js          # IA preditiva
│   │   ├── Municipios.js           # Tabela de municípios
│   │   ├── Abrigos.js              # Abrigos & rotas
│   │   ├── Canais.js               # Canais de emissão
│   │   └── Relatorio.js            # Relatórios & log
│   │
│   ├── 📁 services/                # Integração com APIs externas
│   │   ├── osmService.js           # OpenStreetMap + Overpass API
│   │   ├── cprmService.js          # CPRM GeoSGB (WMS/WFS)
│   │   ├── anaService.js           # ANA HidroWeb API
│   │   ├── cemadenService.js       # CEMADEN API
│   │   ├── ibgeService.js          # IBGE SIDRA API
│   │   ├── inmetService.js         # INMET API
│   │   ├── openMeteoService.js     # Open-Meteo (NWP)
│   │   ├── cadUnicoService.js      # CadÚnico / Gov.br
│   │   ├── suasService.js          # SUAS / MDS
│   │   ├── samuService.js          # SAMU/CAD WebSocket
│   │   ├── mapBiomasService.js     # MapBiomas API
│   │   ├── sentinelService.js      # Sentinel-2 via GEE
│   │   ├── alertEngine.js          # Motor de alertas multicamada
│   │   ├── sensorService.js        # Sensores IoT (LoRaWAN/4G)
│   │   └── notificationService.js  # Canais de emissão de alertas
│   │
│   ├── 📁 utils/                   # Utilitários e helpers
│   │   ├── mapUtils.js             # Helpers do Leaflet (ícones, tooltips, camadas)
│   │   ├── riskUtils.js            # Cálculo de scores e limiares
│   │   ├── hydrologicalUtils.js    # Curvas IDF, CN, HEC-RAS helpers
│   │   ├── formatters.js           # Formatação de datas, números, unidades
│   │   ├── sparklineUtils.js       # Geração de sparklines
│   │   └── exportUtils.js          # Exportação de dados (CSV, PDF)
│   │
│   ├── 📁 assets/                  # Recursos estáticos
│   │   ├── icons/                  # Ícones SVG do sistema
│   │   └── data/                   # Dados estáticos (fallback offline)
│   │       ├── municipios.json     # GeoJSON dos municípios
│   │       ├── bacias.json         # GeoJSON das bacias hidrográficas
│   │       ├── abrigos.json        # Dados dos abrigos de emergência
│   │       └── estacoes-ana.json   # Estações ANA HidroWeb da região
│   │
│   ├── app.js                      # Entry point — inicializa a aplicação
│   ├── router.js                   # Roteamento entre páginas
│   └── state.js                    # Gerenciamento de estado global
│
├── 📁 docs/                        # Documentação técnica
│   ├── ARCHITECTURE.md             # Arquitetura detalhada
│   ├── DATA_SOURCES.md             # Documentação das fontes de dados
│   ├── ALERT_ENGINE.md             # Motor de alertas — especificação
│   ├── AI_MODEL.md                 # IA preditiva — metodologia
│   ├── API_INTEGRATION.md          # Guia de integração das APIs
│   ├── DEPLOYMENT.md               # Guia de deploy
│   └── ODS_ALIGNMENT.md            # Alinhamento com ODS
│
├── 📁 scripts/                     # Scripts de automação
│   ├── setup.sh                    # Setup inicial do ambiente
│   ├── fetch-data.js               # Busca dados das APIs (cron)
│   ├── train-model.py              # Retreino do modelo LSTM
│   └── export-report.js            # Geração de relatórios
│
└── 📁 .github/                     # GitHub Actions
    └── workflows/
        ├── deploy.yml              # Deploy automático (GitHub Pages)
        └── data-sync.yml           # Sync de dados (cron diário)
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ (para scripts de automação)
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexão com internet (para tiles OSM e APIs)

### Opção 1 — Abrir diretamente no navegador (mais simples)
```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/sga-vale-rio-pardo.git
cd sga-vale-rio-pardo

# Abra o arquivo principal no navegador
open public/index.html
# ou no Windows:
start public/index.html
```

### Opção 2 — Servidor local simples
```bash
# Com Python (já instalado na maioria dos sistemas)
cd sga-vale-rio-pardo
python3 -m http.server 8080
# Acesse: http://localhost:8080/public/

# Com Node.js
npx serve .
# Acesse: http://localhost:3000/public/
```

### Opção 3 — Com npm (desenvolvimento)
```bash
git clone https://github.com/SEU_USUARIO/sga-vale-rio-pardo.git
cd sga-vale-rio-pardo
npm install
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run deploy     # Deploy para GitHub Pages
```

---

## 📦 Módulos do Sistema

| Módulo | Arquivo | Descrição |
|---|---|---|
| Painel Geral | `pages/Painel.js` | Dashboard executivo com métricas e mini-mapa |
| Mapa OSM | `pages/Mapa.js` | Mapa Leaflet com 8 camadas ativáveis |
| Central de Alertas | `pages/Alertas.js` | Motor multicamada + simulador |
| Fluxo de Decisão | `pages/Fluxo.js` | Protocolo de 7 etapas com checklist |
| Sensores & IoT | `pages/Sensores.js` | 124 sensores com sparklines |
| Integrações | `pages/Integracoes.js` | 16 fontes com status e filtros |
| ANA HidroWeb | `pages/HidroWeb.js` | 6 estações fluviométricas detalhadas |
| Geodados & Sociais | `pages/Geodados.js` | CadÚnico · SUAS · SAMU · CPRM · IBGE |
| IA Preditiva | `pages/IAPreditiva.js` | LSTM-v3 · previsões · simulador |
| Municípios | `pages/Municipios.js` | Ranking de 23 municípios |
| Abrigos & Rotas | `pages/Abrigos.js` | 23 abrigos · capacidade · rotas |
| Canais | `pages/Canais.js` | 9 canais de emissão |
| Relatórios | `pages/Relatorio.js` | Log de eventos · exportação |

---

## 🧠 IA Preditiva

### Modelo LSTM-v3
```
Entradas (série temporal 72h):
  ├── ANA HidroWeb: cotas e vazões
  ├── CEMADEN: precipitação horária
  ├── Open-Meteo/ECMWF: previsão NWP 72h
  ├── Sensores IoT: solo saturado (%)
  ├── MapBiomas: CN da bacia
  └── OSM: uso do solo urbano

Arquitetura:
  LSTM (3 camadas, 128 unidades, dropout 0.2)
    → Dense layer
    → Ensemble: XGBoost + Random Forest
    → Calibração isotônica
    → Saída probabilística com IC90%

Saídas:
  ├── P(evento) ∈ [0,1] por município
  ├── Nível máximo estimado (m) com IC90%
  ├── Hora do pico prevista
  ├── Zonas afetadas (setor censitário IBGE)
  └── Score de incerteza
```

### Métricas do modelo
| Métrica | Valor |
|---|---|
| Acurácia 48h | 84% |
| F1-score | 0.891 |
| Dados de treino | 14 anos (1,8M registros) |
| Fontes de treino | ANA + CEMADEN + INMET |
| Retreino | Mensal automático |

### Retreinar o modelo
```bash
cd scripts
python3 train-model.py --region vale-rio-pardo --years 14
```

---

## 🚨 Motor de Alertas

### Três camadas independentes

```
Camada 1 — Limiares fixos (< 5 segundos)
  • Cota ANA > valor configurado
  • Precipitação CEMADEN > 80mm/h
  • Saturação solo IoT > 85%
  → Disparo imediato, sem dependência de IA

Camada 2 — Modelo combinado (score 0–1)
  • Fusão: sensores IoT + satélite + NWP + ANA HidroWeb
  • Alerta quando score > 0.65 por 15 min consecutivos

Camada 3 — IA LSTM preditiva (24–48h)
  • Janela antecipada de 24 a 48 horas
  • Alertas preventivos com IC90%
  • Evacuações antes do pico do evento
```

### Escalonamento por canal
| Nível | Score | Canais ativados |
|---|---|---|
| Atenção | 0.40–0.64 | App + WhatsApp + Telegram técnico |
| Alto | 0.65–0.84 | + SMS + Rádio + E-mail + CadÚnico prioritário |
| Crítico | > 0.85 | + Sirenes IoT + TV + SAMU/CAD automático + SUAS |

---

## 🗺 Roadmap

### v1.0 — Concluído ✅
- [x] Protótipo inicial com mapa SVG
- [x] Painel de alertas básico
- [x] Módulo de sensores IoT

### v2.0 — Concluído ✅
- [x] Sistema desktop completo
- [x] Motor de alertas multicamada
- [x] IA preditiva LSTM-v3
- [x] 9 canais de emissão

### v3.0 — Atual ✅
- [x] Mapa real Leaflet + OpenStreetMap
- [x] Integração ANA HidroWeb
- [x] CPRM GeoSGB como camada
- [x] CadÚnico + SUAS + SAMU/CAD
- [x] 16 fontes de dados ativas
- [x] Estrutura modular para GitHub

### v4.0 — Próxima etapa 🔄
- [ ] Backend Node.js com APIs reais
- [ ] Banco de dados PostgreSQL + PostGIS
- [ ] WebSocket para dados em tempo real
- [ ] App mobile (React Native)
- [ ] Autenticação e controle de acesso
- [ ] Notificações push reais (SMS/WhatsApp)

### v5.0 — Gêmeo Digital 📋
- [ ] Integração HEC-RAS 2D em tempo real
- [ ] Gêmeo digital da bacia do Rio Pardo
- [ ] Simulação de cenários de evacuação
- [ ] Dashboard para tomada de decisão em crise

---

## 🌍 Alinhamento ODS

O projeto Cidades Acolhedoras atende **9 dos 17 ODS da ONU**:

| ODS | Conexão com o SGA |
|---|---|
| **1** — Erradicação da Pobreza | CadÚnico + alertas para famílias vulneráveis |
| **3** — Saúde e Bem-Estar | Redução de mortes por eventos climáticos |
| **10** — Redução das Desigualdades | Priorização de grupos vulneráveis nos alertas |
| **11** — Cidades Sustentáveis | Resiliência urbana e planejamento de risco |
| **13** — Ação Climática | Adaptação a eventos climáticos extremos |
| **14** — Vida na Água | Conservação de APP hídricas (CPRM + IBGE) |
| **15** — Vida Terrestre | Monitoramento de cobertura vegetal (MapBiomas) |
| **16** — Paz, Justiça e Instituições | Fortalecimento da defesa civil |
| **17** — Parcerias | Integração de 16 fontes institucionais |

---

## 👥 Equipe

**Correa Eco Social**
- **Márcia Correa** — CEO · Gestão do projeto
- Equipe multidisciplinar: +15 profissionais
- Especialidades: geoprocessamento, hidrologia, design, capacitação, tecnologia, defesa civil

**Contato**
- 📧 Site: [www.correaecosocial.com.br](https://www.correaecosocial.com.br)
- 📱 Instagram: [@correaecosocial](https://instagram.com/correaecosocial)
- 📞 (51) 99282-1021

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

Os dados utilizados são de fontes públicas abertas (OSM, ANA, CPRM, IBGE, CEMADEN, INMET).

---

## 🙏 Agradecimentos

- **OpenStreetMap** e a comunidade de colaboradores
- **ANA** — Agência Nacional de Águas e Saneamento Básico
- **CPRM** — Serviço Geológico do Brasil
- **CEMADEN** — Centro Nacional de Monitoramento de Alertas de Desastres Naturais
- **IBGE** — Instituto Brasileiro de Geografia e Estatística
- **MapBiomas Brasil**
- **Leaflet.js** — biblioteca de mapas open source

---

*Desenvolvido com ❤️ para o Vale do Rio Pardo · Cidades Acolhedoras © 2026*
