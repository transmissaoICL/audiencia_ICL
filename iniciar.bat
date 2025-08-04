@echo off
cd /d C:\Users\ICLli\OneDrive\projeto-audiencia

:: 1. Iniciar o servidor Node.js
start cmd /k "node server.js"

:: 2. Ativar o venv e iniciar o servidor FastAPI (whatsapp)
start cmd /k "call venv\Scripts\activate && uvicorn scripts.utils.whatsapp:app --reload --port 8000"

:: 3. Abrir o arquivo HTML da audiência no navegador padrão
start "" "C:\Users\ICLli\OneDrive\projeto-audiencia\audiencia.html"