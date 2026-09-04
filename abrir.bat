@echo off
title Fichamentos STF - PGE/AL
cd /d "%~dp0"
echo Subindo o servidor local...
start "" http://localhost:8899/
python -m http.server 8899
