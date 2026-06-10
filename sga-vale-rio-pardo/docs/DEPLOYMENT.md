# 🚀 Guia de Deploy
## SGA — Vale do Rio Pardo

---

## Deploy no GitHub Pages (recomendado para protótipo)

### 1. Criar repositório no GitHub

```bash
# No GitHub: criar repositório público ou privado
# Nome sugerido: sga-vale-rio-pardo
```

### 2. Inicializar Git e enviar o código

```bash
cd sga-vale-rio-pardo

git init
git add .
git commit -m "feat: SGA v3 — sistema inicial com OSM, CPRM e ANA HidroWeb"

git remote add origin https://github.com/SEU_USUARIO/sga-vale-rio-pardo.git
git branch -M main
git push -u origin main
```

### 3. Ativar GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em **Source**, selecione **Deploy from a branch**
3. Branch: `main`, pasta: `/ (root)`
4. Salvar

**Ou usar GitHub Actions (automático):**
1. Settings → Pages → Source: **GitHub Actions**
2. O workflow `.github/workflows/deploy.yml` cuida do resto

**URL do sistema:** `https://SEU_USUARIO.github.io/sga-vale-rio-pardo`

---

## Deploy com servidor próprio (produção)

### Nginx (recomendado)

```nginx
server {
    listen 80;
    server_name sga.seudominio.com.br;

    root /var/www/sga-vale-rio-pardo;
    index public/index.html;

    location / {
        try_files $uri $uri/ /public/index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|svg|ico)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
}
```

### Docker (opcional)

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker build -t sga-vale-rio-pardo .
docker run -d -p 8080:80 --name sga sga-vale-rio-pardo
```

---

## Variáveis de ambiente para produção

Criar arquivo `.env` (não commitado) baseado no `.env.example`:

```bash
cp .env.example .env
# Editar .env com as chaves reais
```

No GitHub Actions, adicionar em **Settings → Secrets and variables → Actions**:
- `ANA_API_KEY`
- `CEMADEN_API_KEY`
- (demais chaves conforme `docs/API_INTEGRATION.md`)

---

## Checklist pré-deploy

- [ ] `.env` não está commitado (verificar `.gitignore`)
- [ ] Chaves de API configuradas nos Secrets do GitHub
- [ ] `public/data/` tem dados iniciais (executar `npm run fetch-data`)
- [ ] Mapa Leaflet apontando para o tile server correto (OSM ou custom)
- [ ] HTTPS configurado (obrigatório para Geolocation API no app mobile)
