@echo off
cd /d "C:\Users\ICLli\OneDrive\projeto-audiencia"

echo --- ATUALIZANDO AMBIENTE DE PRODUCAO ---

@echo off
cd /d "%~dp0"

echo --- VERIFICANDO DOCKER DESKTOP ---

:: 1. Tenta abrir o Docker Desktop (o caminho padrao no Windows e este)
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Aguardando o Docker iniciar (isso pode levar uns 2 minutos)...

:: 2. Loop de espera: Tenta rodar 'docker info' ate que ele responda sem erro
:wait_docker
docker info >nul 2>&1

timeout /t 5 /nobreak >nul


echo.
echo [OK] Docker esta pronto!
echo ---------------------------------------

:: 1. Reconstruir a imagem para garantir que o código novo seja carregado
echo Gerando nova imagem Docker...
docker build -t bot-audiencia-prod .

:: 2. Parar e remover o container atual (se ele existir)
echo Limpando container antigo...
docker stop bot-producao >nul 2>&1
docker rm bot-producao >nul 2>&1

:: 3. Iniciar o novo container com o código atualizado
echo Lancando nova versao...
docker run -d ^
  --name bot-producao ^
  -p 3000:3000 ^
  --shm-size=2gb ^
  -v "%cd%\.wwebjs_auth:/app/.wwebjs_auth" ^
  bot-audiencia-prod

:: 4. Iniciar o ngrok
echo Iniciando tunnel...
start cmd /k "ngrok http 3000"

docker logs -f bot-producao

echo Pronto! O bot esta atualizado e rodando.

