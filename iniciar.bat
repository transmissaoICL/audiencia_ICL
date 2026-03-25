@echo off
cd /d "%~dp0"

echo --- INICIANDO ECOSSISTEMA ICL (DOCKER COMPOSE) ---

:: 1. Verifica se o Docker Desktop esta aberto
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Abrindo Docker Desktop...
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

:: 2. Derruba o ambiente antigo (App e Banco) e limpa orfaos
echo [INFO] Resetando ambiente com Docker Compose...
docker-compose down --remove-orphans

:: 3. Sobe o banco e o app com build forçado
:: O Compose ja usa as variaveis do seu .env automaticamente
echo [INFO] Construindo imagem e subindo containers...
docker-compose up --build -d

:: 4. Ngrok (Inicia em uma nova janela como voce ja fazia)
echo [INFO] Iniciando Ngrok...
start cmd /k "ngrok http 3000"

echo [SUCCESS] Ecossistema rodando na porta 3000!
echo Conectando aos logs do servidor (server_icl)...
echo Pressione Ctrl+C para sair dos logs (os containers continuarao rodando).
echo ------------------------------------------------------

:: Conecta ao log do container do bot (nome definido no compose)
docker logs -f server_icl