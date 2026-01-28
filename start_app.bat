@echo off
echo ========================================================
echo SOWIC - INICIANDO APLICACION
echo ========================================================

echo [1/3] Verificando e instalando librerias necesarias...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar librerias. Revisa tu conexion.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Generando version optimizada (Build)...
call npm run build
if %errorlevel% neq 0 (
    echo Error al compilar la aplicacion.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Lanzando Servidor...
echo La aplicacion se abrira en tu navegador automaticamente.
echo NO CIERRES ESTA VENTANA.
echo.

call npm run preview
pause
