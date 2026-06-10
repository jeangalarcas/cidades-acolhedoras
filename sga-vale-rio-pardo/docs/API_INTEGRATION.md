# 🔌 Guia de Integração de APIs
## SGA — Vale do Rio Pardo

---

## 1. ANA HidroWeb

**URL base:** `https://telemetriaws1.ana.gov.br/ServiceANA.asmx`

**Endpoints principais:**
```
GET /DadosHidrometeorologicos
  ?codEstacao=87480000
  &dataInicio=2026-06-01
  &dataFim=2026-06-09

GET /ListaEstacoesTelemetricas
  ?codEstacao=87480000
  &statusEstacao=1
```

**Estações do Vale do Rio Pardo:**
| Código | Nome | Rio |
|---|---|---|
| 87480000 | Rio Pardo — Ponte Nova | Rio Pardo |
| 87600000 | Santa Cruz — Ponte | Rio Pardinho |
| 87620000 | Venâncio Aires | Rio Pardo |
| 87400000 | Cachoeira do Sul | Rio Jacuí |
| 87520000 | Candelária | Rio Pardo |
| 87540000 | Encruzilhada | Rio Camaquã |

**Integração em `anaService.js`** — substituir mocks pelos endpoints acima.

---

## 2. CEMADEN

**URL:** `https://www.cemaden.gov.br/mapainterativo/load/carregaEstacoes.php`

**Parâmetros:**
```
?uf=RS
&municipio=431210
&tipo=1  (1=pluviômetro, 2=fluviômetro)
```

**Autenticação:** Solicitar chave em cemaden.gov.br/acesso-api

---

## 3. OpenStreetMap / Overpass API

**URL:** `https://overpass-api.de/api/interpreter`  
**Gratuito, sem chave necessária.**

**Query para equipamentos de emergência no Vale:**
```
[out:json][timeout:30];
area["name"="Vale do Rio Pardo"]->.vale;
(
  node["amenity"~"hospital|fire_station|police"](area.vale);
  node["emergency"~"assembly_point|shelter"](area.vale);
);
out body; >; out skel qt;
```

---

## 4. CPRM GeoSGB (WMS)

**URL WMS:** `https://geoportal.cprm.gov.br/geoserver/wms`

**Integração com Leaflet:**
```javascript
L.tileLayer.wms('https://geoportal.cprm.gov.br/geoserver/wms', {
  layers: 'geoportal:suscetibilidade_inundacao',
  format: 'image/png',
  transparent: true,
  attribution: '© CPRM GeoSGB'
}).addTo(map);
```

**Camadas disponíveis:**
- `geoportal:suscetibilidade_inundacao`
- `geoportal:suscetibilidade_deslizamento`
- `geoportal:geologia_250k`

---

## 5. IBGE — API SIDRA v3

**URL:** `https://servicodados.ibge.gov.br/api/v3/`

**Endpoints:**
```
# Malha municipal (GeoJSON)
GET /malhas/municipios/{codigo}?formato=application/vnd.geo+json

# População (Censo 2022)
GET /agregados/6579/variaveis/93?localidades=N6[{codigo_municipio}]

# Setores censitários
GET /malhas/municipios/{codigo}/submalhas/setores-censitarios
```

**Sem autenticação necessária.**

---

## 6. Open-Meteo (Previsão NWP)

**URL:** `https://api.open-meteo.com/v1/forecast`  
**Gratuito, sem chave necessária.**

```javascript
const url = 'https://api.open-meteo.com/v1/forecast' +
  '?latitude=-29.85&longitude=-52.45' +
  '&hourly=precipitation,precipitation_probability,temperature_2m,windspeed_10m' +
  '&forecast_days=3&timezone=America%2FSao_Paulo';
```

---

## 7. CadÚnico / Gov.br

**Requer credenciais OAuth2 do Gov.br.**

```
POST https://sso.acesso.gov.br/auth/realms/acesso-cidadao/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

**Após autenticação:**
```
GET https://api.gov.br/cadunico/familias?municipio={codigo_ibge}&em_area_risco=true
Authorization: Bearer {token}
```

---

## 8. Sentinel-2 via Google Earth Engine

**Requer conta Google Earth Engine (gratuita para pesquisa).**

```javascript
// GEE Code Editor
var regiao = ee.Geometry.Rectangle([-53.2, -30.7, -51.7, -29.3]);
var colecao = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(regiao)
  .filterDate('2026-06-01', '2026-06-09')
  .select(['B3', 'B8']); // Verde + NIR para NDWI

var ndwi = colecao.median().normalizedDifference(['B3', 'B8']);
```

---

## Variáveis de Ambiente (.env)

```bash
# APIs que requerem autenticação
ANA_API_KEY=
CEMADEN_API_KEY=
GOVBR_CLIENT_ID=
GOVBR_CLIENT_SECRET=
INMET_TOKEN=

# Notificações
TWILIO_ACCOUNT_SID=       # SMS
TWILIO_AUTH_TOKEN=
WHATSAPP_API_TOKEN=        # WhatsApp Business
TELEGRAM_BOT_TOKEN=        # Telegram
FCM_SERVER_KEY=            # Firebase (App push)
SENDGRID_API_KEY=          # E-mail

# Banco de dados (produção)
DATABASE_URL=postgresql://...

# MQTT (sirenes IoT)
MQTT_BROKER_URL=mqtt://...
MQTT_USERNAME=
MQTT_PASSWORD=
```

**⚠️ NUNCA commitar o arquivo `.env` no Git!** O `.gitignore` já exclui este arquivo.
