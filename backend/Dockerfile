FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências (apenas produção)
RUN npm ci --only=production

# Criar pasta para uploads
RUN mkdir -p /app/uploads

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["node", "server.js"]