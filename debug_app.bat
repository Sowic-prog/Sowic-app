@echo off
echo ========================================================
echo SOWIC MODALIDAD DEBUG - DIAGNOSTICO FINAL
echo ========================================================
echo.
echo [1/3] Limpiando cache ligero (Vite)...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
echo.

echo [2/3] Verificando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Iniciando Servidor de Desarrollo (Dev Mode)...
echo.
echo POR FAVOR, NO CIERRES ESTA VENTANA.
echo Si se cierra, la aplicacion dejara de funcionar.
echo.
echo El navegador deberia abrirse en: http://localhost:5173
echo (Si falla, revisa la consola para ver el puerto real)
echo.

call npm run dev
pause
