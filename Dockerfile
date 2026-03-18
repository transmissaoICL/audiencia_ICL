# 1. Usar a imagem oficial do Node.js
FROM node:20-slim

# Variáveis para o Puppeteer e localização
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    LANG=pt_BR.UTF-8 \
    LANGUAGE=pt_BR:pt \
    LC_ALL=pt_BR.UTF-8

# 2. Instalar dependências e Google Chrome Stable (Método Moderno)
RUN apt-get update && apt-get install -y wget gnupg ca-certificates curl --no-install-recommends \
    && install -d /usr/share/keyrings \
    && curl -fSsL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Definir a pasta de trabalho
WORKDIR /app

# 4. Copiar arquivos e instalar dependências
COPY package*.json ./
RUN npm install

# 5. Copiar o resto do código
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]