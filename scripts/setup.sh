#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SGA — Setup do Ambiente de Desenvolvimento
# Vale do Rio Pardo · Cidades Acolhedoras
# ═══════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════╗"
echo "║  SGA v3 — Sistema de Gestão e Alertas        ║"
echo "║  Vale do Rio Pardo · Cidades Acolhedoras      ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Verifica Node.js
echo -e "${YELLOW}[1/5] Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo "Node.js não encontrado. Instale em: https://nodejs.org/"
  exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Cria diretório de dados
echo -e "${YELLOW}[2/5] Criando diretório de dados...${NC}"
mkdir -p public/data
echo -e "${GREEN}✓ public/data criado${NC}"

# Instala dependências
echo -e "${YELLOW}[3/5] Instalando dependências npm...${NC}"
npm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"

# Busca dados iniciais (Open-Meteo é gratuito, sem chave)
echo -e "${YELLOW}[4/5] Buscando dados iniciais (Open-Meteo)...${NC}"
node scripts/fetch-data.js --source meteo || echo "Aviso: fetch falhou, usando dados mock"
echo -e "${GREEN}✓ Dados iniciais carregados${NC}"

# Instruções finais
echo -e "${YELLOW}[5/5] Setup concluído!${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ SGA pronto para desenvolvimento${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "  Para iniciar o servidor de desenvolvimento:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "  O sistema estará disponível em:"
echo -e "  ${BLUE}http://localhost:8080${NC}"
echo ""
echo "  Para buscar dados das APIs:"
echo -e "  ${BLUE}node scripts/fetch-data.js --all${NC}"
echo ""
echo "  Para fazer deploy no GitHub Pages:"
echo -e "  ${BLUE}npm run deploy${NC}"
echo ""
echo "  Configure as chaves de API no arquivo .env:"
echo "    ANA_API_KEY=sua_chave"
echo "    CEMADEN_API_KEY=sua_chave"
echo ""
