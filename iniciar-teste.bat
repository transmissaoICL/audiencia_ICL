@echo off
cd /d "%~dp0"

echo --- INICIANDO AMBIENTE DE TESTES (STAGING) ---

:: 1. Verifica se o Docker Desktop está aberto
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

:: 2. Derruba o ambiente de teste antigo (sem tocar no oficial)
echo [INFO] Limpando ambiente de teste...
docker-compose -f docker-compose.dev.yml down --remove-orphans

:: 3. Sobe o app de teste com build forçado
:: Usamos --build para garantir que suas mudanças no Socket.io e SQL entrem em vigor
echo [INFO] Reconstruindo e subindo container de teste (Porta 3001)...
docker-compose -f docker-compose.dev.yml up --build -d

:: 4. Ngrok para Testes (Porta 3001)
:: Nota: Se você usa o Ngrok gratuito, lembre-se de fechar o túnel da porta 3000 antes!
echo [INFO] Iniciando Ngrok na porta de testes (3001)...
start cmd /k "ngrok http 3001"

echo [SUCCESS] Ambiente de TESTE rodando na porta 3001! [cite: 2026-03-27]
echo Conectando aos logs do servidor de teste (server_icl_dev)...
echo Pressione Ctrl+C para sair dos logs.
echo ------------------------------------------------------

:: Conecta ao log do container de dev
docker logs -f server_icl_dev