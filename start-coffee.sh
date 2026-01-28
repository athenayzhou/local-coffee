#!/bin/bash

cd ~/code/mini/local-coffee

pkill -f 'node server.js' 2>/dev/null

nohup node server.js > coffee.log 2>&1 &

echo "local coffee open for business"