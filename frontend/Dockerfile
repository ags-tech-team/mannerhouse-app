# frontend/Dockerfile

# 🔥 PRIMEIRO: Definir a imagem base
FROM node:22-alpine AS build

# 🔥 SEGUNDO: Definir o diretório de trabalho
WORKDIR /app

# 🔥 TERCEIRO: Copiar os arquivos de dependência (package.json e package-lock.json)
COPY package*.json ./

# 🔥 QUARTO: Instalar as dependências (AQUI O npm ESTÁ DISPONÍVEL)
RUN npm install

# 🔥 QUINTO: Copiar o resto do código
COPY . .

# 🔥 SEXTO: Build da aplicação
RUN npm run build

# 🔥 SÉTIMO: Servir com Nginx (imagem separada)
FROM nginx:alpine

# 🔥 OITAVO: Copiar os arquivos buildados
COPY --from=build /app/dist /usr/share/nginx/html

# 🔥 NONO: Configurar Nginx
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass https://elegant-possibility-production-be71.up.railway.app; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

# 🔥 DÉCIMO: Expor a porta
EXPOSE 80

# 🔥 DÉCIMO PRIMEIRO: Iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
