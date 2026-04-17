@echo off
chcp 65001 > nul
echo.
echo  ==========================================
echo    TallerPro - Modo Demo
echo  ==========================================
echo.

echo  [1/4] Iniciando backend en puerto 3001...
start "TallerPro - Backend" cmd /k "cd /d "%~dp0backend" && npm run start"

echo  [2/4] Iniciando frontend en puerto 5173...
start "TallerPro - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo  [3/4] Esperando que los servicios levanten (5 segundos)...
timeout /t 5 /nobreak > nul

echo.
echo  [4/4] Abriendo tunel Cloudflare...
echo  ==========================================
echo   La URL publica aparece abajo con "trycloudflare.com"
echo   Copiala y enviasela al cliente.
echo  ==========================================
echo.
cloudflared tunnel --url http://localhost:5173

pause
