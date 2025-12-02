@echo off
cd /d C:\Users\ICLli\OneDrive\projeto-audiencia

:: 1. Iniciar o servidor Node.js
start /min cmd /k "node server.js"

:: 2. Ativar o venv e iniciar o servidor FastAPI (whatsapp)
:: start /min cmd /k "call venv\Scripts\activate && uvicorn scripts.utils.whatsapp:app --reload --port 8000"

:: 3. Ativar o ngrok
start cmd /k "ngrok http 3000"