@echo off
setlocal
title Publicar no GitHub Pages
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Git nao encontrado. Instale em https://git-scm.com/download/win
  echo  Depois feche e abra este arquivo de novo.
  echo.
  pause & exit /b 1
)

echo.
echo  ==============================================================
echo   Publicar a aplicacao no GitHub Pages
echo  ==============================================================
echo.
echo   Antes de continuar, crie um repositorio VAZIO e PUBLICO em
echo   https://github.com/new  -- sem README, sem .gitignore.
echo.
set /p USUARIO="  Seu usuario do GitHub: "
set /p REPO="  Nome do repositorio criado: "
if "%USUARIO%"=="" goto :faltou
if "%REPO%"=="" goto :faltou

echo.
echo  Preparando...
if not exist .git git init -q
git config user.name "%USUARIO%"
git config user.email "%USUARIO%@users.noreply.github.com"
git add -A
git commit -q -m "Fichamentos STF - PGE/AL" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/%USUARIO%/%REPO%.git

echo.
echo  Enviando. Se abrir uma janela do navegador, entre na sua conta do GitHub.
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo  O envio falhou. Confira se o repositorio existe, esta vazio e o nome esta certo.
  echo.
  pause & exit /b 1
)

echo.
echo  ==============================================================
echo   Enviado. Falta ligar o Pages:
echo.
echo   1. Abra https://github.com/%USUARIO%/%REPO%/settings/pages
echo   2. Em "Source", escolha "Deploy from a branch"
echo   3. Branch: main / (root) -- depois Save
echo   4. Espere 1 a 2 minutos e acesse:
echo.
echo      https://%USUARIO%.github.io/%REPO%/
echo  ==============================================================
echo.
start "" https://github.com/%USUARIO%/%REPO%/settings/pages
pause
exit /b 0

:faltou
echo.
echo  Usuario e nome do repositorio sao obrigatorios.
pause
