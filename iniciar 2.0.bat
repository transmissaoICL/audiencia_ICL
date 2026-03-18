@echo off
cd /d "%~dp0"

echo --- INICIANDO PRODUCAO (IMAGEM EXISTENTE) ---

:: 1. Verifica se o Docker Desktop esta aberto
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Abrindo Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Aguardando o Docker iniciar...
    :wait_docker
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 5 /nobreak >nul
        goto wait_docker
    )
)

echo [OK] Docker pronto!

:: 2. Limpa o container anterior se ele existir
echo Reiniciando container de producao...
docker stop bot-producao >nul 2>&1
docker rm bot-producao >nul 2>&1

:: 3. Roda a imagem ja existente
docker run -d ^
  --name bot-producao ^
  -p 3000:3000 ^
  --shm-size=2gb ^
  -e SESSION_PATH=./.wwebjs_auth_docker ^
  -e DOCKER_SESSION=./.docker_session_prod ^
  -v "%cd%\.wwebjs_auth_docker:/app/.wwebjs_auth_docker" ^
  -v "%cd%\tmp/session:/app/tmp/session" ^
  bot-audiencia-prod

:: 4. Ngrok
start cmd /k "ngrok http 3000"

echo Producao rodando na porta 3000!
docker logs -f bot-producao