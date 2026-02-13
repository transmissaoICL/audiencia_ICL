# 1. Usar a imagem oficial do Node.js (versão estável)
FROM node:20-slim

# 2. Instalar dependências necessárias para o Chromium rodar no Linux
# Sem isso, o seu Puppeteer/Cluster vai dar erro de 'shared libraries'
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
	libdrm2 \
libxkbcommon0 \
libgbm1 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
	gnupg \
	ca-certificates \
    procps \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Definir a pasta de trabalho dentro do Docker
WORKDIR /app

# 4. Copiar o package.json e instalar as dependências
COPY package*.json ./
RUN npm install

# 5. Copiar o resto do seu código
COPY . .

# 6. Expor a porta 3000 (que você definiu no server.js)
EXPOSE 3000

# 7. Comando para iniciar o bot
CMD ["node", "server.js"]