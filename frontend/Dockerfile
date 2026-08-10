# frontend/Dockerfile

# 🔥 USAR NODE.JS 22
FROM node:22-alpine AS build

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# 🔥 FORÇAR NODE_VERSION E IGNORAR ERROS
ENV NODE_VERSION=22
ENV CI=false

# Build da aplicação
RUN npm run build

# Segunda etapa - Servir com nginx
FROM nginx:alpine

# Copiar os arquivos buildados para o nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 🔥 CONFIGURAÇÃO DO NGINX
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass ${VITE_API_URL}; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
