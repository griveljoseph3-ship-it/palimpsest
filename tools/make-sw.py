#!/usr/bin/env python3
"""Scrive sw.js: il «service worker» che salva sull'iPad tutti i file del gioco, così si gioca anche senza internet.
Si rigenera da solo con bump.sh (la versione nuova cancella la copia vecchia e scarica quella nuova).
Uso: python3 tools/make-sw.py 2.5.0"""
import os, re, sys, json
V = sys.argv[1] if len(sys.argv) > 1 else '0'
files = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png']
html = open('index.html').read()
files += re.findall(r'(?:href|src)="([^"#]+\?v=[^"]+)"', html)  # style.css?v=, src/main.js?v=
for d in ['src', 'vendor']:
    for f in sorted(os.listdir(d)):
        if f.endswith('.js'): files += [f'{d}/{f}?v={V}', f'{d}/{f}']  # importati con ?v= (e qualcuno senza)
gv = (re.findall(r"\.glb\?v=([0-9.]+)'", open('src/modelli.js').read()) or [V])[0]  # i modelli si chiedono con la loro ?v=
for root, _, fs in os.walk('assets'):
    for f in sorted(fs): files.append(os.path.join(root, f).replace(os.sep, '/') + ('?v=' + gv if f.endswith('.glb') else ''))
files = list(dict.fromkeys(files))
js = f"""// Generato da tools/make-sw.py: non modificare a mano. Versione {V}: tutti i file del gioco salvati per giocare offline.
const CACHE = 'palimpsest-{V}';
const FILES = {json.dumps(files, ensure_ascii=False)};
self.addEventListener('install', (e) => {{ e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))).then(() => self.skipWaiting())); }});
self.addEventListener('activate', (e) => {{ e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('palimpsest-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', (e) => {{ const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, {{ ignoreSearch: false }}).then((hit) => hit || fetch(r).then((res) => {{ if (res.ok) {{ const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); }} return res; }}).catch(() => caches.match('index.html')))); }});
"""
open('sw.js', 'w').write(js)
print('sw.js:', len(files), 'file, versione', V)
