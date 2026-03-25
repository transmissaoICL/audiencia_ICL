@echo off
:: Garante que o script rode a partir da pasta onde ele está salvo
cd /d "%~dp0"

echo --- INICIANDO AMBIENTE DE TESTE (PORTA 3001) ---

echo --- VERIFICANDO DOCKER DESKTOP ---

:: 1. Tenta abrir o Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Aguardando o Docker iniciar...

:: 2. Loop de espera pelo Docker
:wait_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 5 /nobreak >nul
    goto wait_docker
)

echo.
echo [OK] Docker esta pronto!
echo ---------------------------------------

:: 1. Reconstruir a imagem (Ambiente de teste costuma ter mudanças frequentes no código)
echo Gerando imagem Docker...
docker build -t bot-audiencia-prod .

:: 2. Limpar apenas o container de TESTE
echo Limpando container de teste antigo...
docker stop bot-teste >nul 2>&1
docker rm bot-teste >nul 2>&1

:: 3. Iniciar o container de TESTE
:: Mudamos a porta para 3001 e a pasta de sessao para nao deslogar a producao
echo Lancando versao de TESTE...
docker run -d ^
  --name bot-teste ^
  -p 3001:3000 ^
  --shm-size=2gb ^
  -e SESSION_PATH=./.wwebjs_auth_teste ^
  -v "%cd%\.wwebjs_auth_teste:/app/.wwebjs_auth_teste" ^
  bot-audiencia-prod

:: 4. Iniciar o ngrok na porta de teste
echo Iniciando tunnel de teste (3001)...
start cmd /k "ngrok http 3001"

echo.
echo Teste rodando em: http://localhost:3001
echo QR Code de teste em: http://localhost:3001/qr
echo.

docker logs -f bot-teste