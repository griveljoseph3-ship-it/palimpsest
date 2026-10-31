# Versione di prova 1.9.0-prova3d — personaggi 3D

Ramo `grok/personaggi-3d`. **Non è online sul sito pubblico**: si gioca solo dal link di anteprima.

- Modelli: `assets/modelli/*.glb` (dai fogli di Joseph, ridotti a 6–16 mila triangoli, texture 512–1024 webp, compressione meshopt; ~3,7 MB in tutto).
- Caricamento: `src/modelli.js` (GLTFLoader + decoder meshopt in `vendor/`, niente CDN esterni). Se un modello non arriva resta il personaggio disegnato a mano.
- Sostituzioni: `src/chars3d.js` (stessi agganci di gioco: corazza, nucleo, penna, colpi, dissoluzione, crepe).
- `?3d=0` nell'indirizzo = gioco con i vecchi personaggi, per confronto.

| Personaggio | Modello | Dove |
|---|---|---|
| Correttore (giocatore) | correttore.glb | ovunque; la penna rossa che colpisce resta quella vecchia e compare solo durante i colpi |
| Elara | elara.glb (= elara_v2) | stanza della porta e finale |
| Ilde | ilde.glb | film del prologo |
| Custode della Fenditura | custode.glb | arena (e film) |
| Macchie / acari d'inchiostro | macchia.glb | tutti gli sciami, Copista |
| Caricatore (**da confermare**) | caricatore.glb (foglio "acaro_inchiostro") | stanza II |
| Rilegatore (**da confermare**) | rilegatore.glb (foglio "blob con maschera a becco") | Capitolo 2, la chiusa |
| Robot, figura velata, Elara bambina, creatura con le spine, blob coi tentacoli | | solo statue nella prima stanza (galleria) |

Limiti: i modelli non hanno scheletro né animazioni (solo ondeggio/respiro/inclinazione finti); Lumi resta quello vecchio.
