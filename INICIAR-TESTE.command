#!/bin/zsh
cd -- "${0:A:h}" || exit 1
echo 'CARLA 2.0 — teste local neste Mac'
echo 'Abre no Safari: http://127.0.0.1:8876/site/'
echo 'Para terminar o servidor, carrega em Control+C.'
python3 -m http.server 8876 --bind 127.0.0.1 --directory .
