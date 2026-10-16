#!/bin/sh
# usage: ./bump.sh 1.3.0  — cache-busts every module/css url and sets the title version
V=$1
sed -i -E "s#(from '[^']+\.js)(\?v=[^']*)?'#\1?v=$V'#g" src/*.js
sed -i -E "s#(src/main\.js|style\.css|vendor/three\.module\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g" index.html
sed -i -E "s#<p class=\"small\" id=\"ver\">[^<]*</p>##; s#(<p class=\"small\" id=\"tMem\">)#<p class=\"small\" id=\"ver\">versione $V</p>\1#" index.html
