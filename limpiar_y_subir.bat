@echo off
echo Sincronizando cambios con Git...
git add -A
git commit -m "Limpieza de archivos duplicados y reestructuracion final para Netlify"
git push origin main
echo.
echo !Hecho! Los archivos duplicados han sido eliminados de GitHub.
echo Netlify deberia empezar a construir la version correcta ahora.
pause
