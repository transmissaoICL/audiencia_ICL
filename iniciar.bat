@echo off
cd /d C:\Users\ICLli\OneDrive\projeto-audiencia

:: 1. Iniciar o servidor Node.js
start /min cmd /k "node server.js"

::start /min cmd /k "node scripts/graficoServer.js"

:: 3. Ativar o ngrok
start cmd /k "ngrok http 3000"