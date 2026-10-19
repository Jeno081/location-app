@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js est introuvable sur cet ordinateur.
  echo Installez-le depuis https://nodejs.org puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

rem Serveur deja lance ? On ouvre simplement l'application.
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo Location App est deja demarree : http://localhost:3000
  start "" http://localhost:3000
  exit /b 0
)

echo.
echo   Location App
echo   Demarrage du serveur sur http://localhost:3000
echo   Laissez cette fenetre ouverte. Ctrl+C pour arreter.
echo.

rem Ouvre le navigateur une fois le serveur pret.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:3000"

node backend\server.js
if errorlevel 1 (
  echo.
  echo Le serveur s'est arrete avec une erreur. Lisez le message ci-dessus.
  pause
)
