#!/bin/sh
# Lancia la suite richiesta in sequenza (mai in parallelo: il rendering software è lento). Server: npx http-server -p 8941 -c-1
cd "$(dirname "$0")/.." || exit 1; fail=0
run() { echo "== $*"; out=$(timeout 1500 node "$@" 2>&1); code=$?; echo "$out" | grep -E "^(OK|XX)|PASS|FAIL|RISULTATO|ERROR|S1|S3|calls" | tail -40; [ $code -eq 0 ] || { echo "!! FALLITO: $*"; fail=1; }; }
run tests/s1.mjs; run tests/s3.mjs; run tests/systems.mjs; run tests/combat.mjs
for t in ${EXTRA:-}; do run tests/$t; done
run tests/play.mjs ${ROUTE:-forced} ${PLAN:-controllo}; run tests/perf.mjs
[ $fail -eq 0 ] && echo "TUTTO VERDE" || echo "QUALCOSA È ROSSO"; exit $fail
