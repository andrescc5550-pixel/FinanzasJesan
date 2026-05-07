@echo off
title FinanzasPro - Sistema de Contabilidad
color 0A
cls
echo.
echo  ==========================================
echo        FinanzasPro - Iniciando sistema
echo  ==========================================
echo.

:: Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js no está instalado.
  echo.
  echo  Por favor descárgalo de: https://nodejs.org
  echo  Instálalo y luego vuelve a abrir este archivo.
  echo.
  pause
  exit
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
  echo  Instalando componentes por primera vez...
  echo  (Esto solo ocurre la primera vez, puede tardar 1-2 minutos)
  echo.
  npm install
  echo.
)

echo  Iniciando FinanzasPro...
echo  El sistema se abrirá en tu navegador automáticamente.
echo.
echo  IMPORTANTE: No cierres esta ventana mientras uses el sistema.
echo  Para cerrar el sistema, presiona Ctrl + C en esta ventana.
echo.

node server.js
pause
