#!/usr/bin/env python3
"""Genera le immagini del gioco (cartella assets/) a partire dalle tavole di Joseph in docs/concept-art/immagini.
Riproducibile: python3 tools/make-assets.py  (serve: pip install pillow numpy scipy)
Ogni voce dice da quale tavola viene e quale pezzo si ritaglia (frazioni della tavola: x0, y0, x1, y1)."""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = 'docs/concept-art/immagini/tavola-{}.jpg'
OUT = 'assets'

def load(n): return Image.open(SRC.format(n)).convert('RGB')
def crop(im, box): w, h = im.size; x0, y0, x1, y1 = box; return im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
def save_jpg(im, path, q=84): os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)

# ---- ritratti dei dialoghi: quadrato centrato (cx, cy in frazioni, lato in frazione della larghezza) ----
RITRATTI = {
    'elara': ('005', 0.50, 0.37, 0.36), 'elara-sorriso': ('052', 0.48, 0.34, 0.36), 'elara-bambina': ('015', 0.47, 0.30, 0.62),
    'ilde': ('009', 0.50, 0.36, 0.62), 'ilde-lacrime': ('066', 0.47, 0.33, 0.66), 'lumi': ('048', 0.48, 0.42, 0.72),
    'custode': ('037', 0.50, 0.33, 0.74), 'tipo': ('018', 0.45, 0.32, 0.66), 'giurato': ('026', 0.21, 0.24, 0.27),
    'ladro': ('059', 0.17, 0.40, 0.38), 'you': ('038', 0.50, 0.34, 0.72), 'narr': ('029', 0.50, 0.60, 0.90),
}
def ritratto(n, cx, cy, side):
    im = load(n); w, h = im.size; s = side * w; x0 = max(0, min(w - s, cx * w - s / 2)); y0 = max(0, min(h - s, cy * h - s / 2))
    return im.crop((int(x0), int(y0), int(x0 + s), int(y0 + s))).resize((256, 256), Image.LANCZOS)

# ---- pavimenti delle stanze (rot: gradi, per le stanze più lunghe che larghe) ----
PAVIMENTI = {'intro': ('033', 90), 'charger': ('022', 0), 'conduct': ('064', 0), 'door': ('061', 0), 'arena': ('030', 0),
             'archive': ('043', 0), 'crypt': ('046', 0), 'end': ('007', 0)}
# ---- scene a tutto schermo ----
SCENE = {'copertina': '042', 'copertina2': '050', 'caduta': '053', 'ponte': '056', 'fiume': '025', 'fenditura': '041', 'verdetto': '044',
         'tribunale': '013', 'elara-verdetto': '005', 'labirinto': '011', 'fuga': '063', 'archivio': '034', 'libera': '052',
         'custode': '055', 'lettera': '012', 'finale': '021', 'capitolo2': '014', 'ponte2': '017'}
# ---- icone (riquadro centrale) ----
ICONE = {'nib': ('006', (0.18, 0.08, 0.92, 0.92)), 'jar': ('000', (0.22, 0.02, 0.78, 0.98)), 'mark': ('054', (0.42, 0.0, 0.58, 0.62)),
         'sack': ('067', (0.25, 0.1, 0.75, 0.95)), 'vial': ('032', (0.28, 0.05, 0.72, 0.98)), 'letter': ('020', (0.1, 0.05, 0.9, 0.95))}
# ---- texture ripetibili (riquadro e lato in px) ----
TEXTURE = {'mattoni': ('023', (0.0, 0.0, 1.0, 1.0)), 'carta-testo': ('003', (0.0, 0.0, 1.0, 1.0)), 'legno': ('062', (0.0, 0.0, 1.0, 1.0)),
           'acqua': ('004', (0.0, 0.0, 1.0, 1.0)), 'labirinto': ('060', (0.0, 0.0, 1.0, 1.0))}
# ---- figure di carta da scontornare ----
FIGURE = {
    'elara': ('071', (0.0, 0.0, 0.18, 1.0)), 'ilde': ('045', (0.0, 0.0, 0.25, 1.0)), 'tipo': ('069', (0.0, 0.0, 0.5, 1.0)),
    'giurato': ('026', (0.0, 0.0, 0.48, 1.0)), 'giurato-volto': ('026', (0.52, 0.0, 1.0, 1.0)), 'lumi': ('048', (0.0, 0.0, 1.0, 1.0)),
    'acaro': ('065', (0.15, 0.02, 0.44, 0.27)), 'acaro-bruto': ('065', (0.15, 0.24, 0.44, 0.50)), 'acaro-scudo': ('065', (0.15, 0.73, 0.44, 1.0)),
    'acaro-sputo': ('065', (0.15, 0.48, 0.44, 0.74)), 'macchia': ('019', (0.0, 0.0, 0.28, 0.45)),
    'ladro': ('059', (0.0, 0.0, 0.36, 1.0)), 'copista': ('068', (0.0, 0.0, 0.5, 1.0)), 'custode': ('040', (0.0, 0.0, 0.52, 1.0)),
    'caricatore': ('002', (0.5, 0.5, 1.0, 1.0)), 'elara-bambina': ('057', (0.0, 0.0, 0.3, 0.55)),
}

def cutout(im, max_side=512):
    """Sfondo di carta → trasparente: si riempie dai bordi tutto ciò che somiglia alla carta; l'interno chiaro della figura resta pieno."""
    a = np.asarray(im).astype(np.float32); h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); paper = np.median(border, axis=0)
    # carta che varia piano (macchie, vignetta): stima locale con un filtro mediano largo sul colore
    local = np.stack([ndimage.median_filter(a[..., c], size=31) for c in range(3)], -1)
    dist = np.sqrt(((a - local) ** 2).sum(-1)); dpaper = np.sqrt(((a - paper) ** 2).sum(-1)); lum = a.mean(-1)
    bg_like = ((dist < 30) & (lum > paper.mean() - 55)) | (dpaper < 26)
    lab, n = ndimage.label(bg_like); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge)); fg = ~bg
    # via la polvere: tieni il pezzo più grande e quelli abbastanza grandi
    fl, fn = ndimage.label(fg)
    if fn:
        sizes = ndimage.sum(fg, fl, range(1, fn + 1)); keep = np.zeros(fn + 1, bool); big = sizes.max()
        for i, s in enumerate(sizes, 1): keep[i] = s >= max(120, big * 0.015)
        fg = keep[fl]
    fg = ndimage.binary_closing(fg, iterations=2); fg = ndimage.binary_fill_holes(fg) | fg
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    rgba = im.copy(); rgba.putalpha(alpha); bbox = alpha.getbbox()
    if bbox: rgba = rgba.crop(bbox)
    rgba.thumbnail((max_side, max_side), Image.LANCZOS); return rgba

def main():
    for k, (n, cx, cy, s) in RITRATTI.items(): save_jpg(ritratto(n, cx, cy, s), f'{OUT}/ritratti/{k}.jpg')
    for k, (n, rot) in PAVIMENTI.items(): im = load(n); save_jpg(im.rotate(rot, expand=True) if rot else im, f'{OUT}/pavimenti/{k}.jpg', 82)
    for k, n in SCENE.items(): save_jpg(load(n), f'{OUT}/scene/{k}.jpg', 82)
    for k, (n, box) in ICONE.items(): ic = crop(load(n), box); ic.thumbnail((160, 160), Image.LANCZOS); bg = Image.new('RGB', (160, 160), (236, 226, 204)); bg.paste(ic, ((160 - ic.width) // 2, (160 - ic.height) // 2)); save_jpg(bg, f'{OUT}/icone/{k}.jpg', 86)
    for k, (n, box) in TEXTURE.items(): t = crop(load(n), box).resize((512, 512), Image.LANCZOS); save_jpg(t, f'{OUT}/texture/{k}.jpg', 82)
    os.makedirs(f'{OUT}/figure', exist_ok=True)
    for k, (n, box) in FIGURE.items():
        f = cutout(crop(load(n), box)); f.save(f'{OUT}/figure/{k}.webp', 'WEBP', quality=82, method=6); print('figura', k, f.size)  # webp con trasparenza: Safari iPad da iOS 14
    tot = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(OUT) for x in fs); print('totale assets: %.1f MB' % (tot / 1e6))

if __name__ == '__main__': main()
