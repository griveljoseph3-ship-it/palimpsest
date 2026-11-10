# PALIMPSEST — Crediti e licenze

## Materiale esterno usato
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| three.js r160 (motore 3D) | `vendor/three.module.js` | Three.js Authors (2010–2023) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |
| GLTFLoader, BufferGeometryUtils (caricano i modelli 3D) | `vendor/GLTFLoader.js`, `vendor/BufferGeometryUtils.js` | Three.js Authors | MIT (come sopra) |
| meshoptimizer 0.22 (decompressione e semplificazione dei modelli) | `vendor/meshopt_decoder.module.js`, `vendor/meshopt_simplifier.module.js` | Arseny Kapoulkine | MIT — https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md |

Il testo della licenza MIT richiede solo di conservare l'avviso di copyright, che resta in testa al file `vendor/three.module.js`.

## Tavole di concept art di Joseph (dalla versione 2.2)
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| 72 tavole di concept art (personaggi, nemici, ambienti, texture, oggetti) | `docs/concept-art/` (originali) e `assets/` (versioni ridotte e ritagliate per il gioco) | Joseph, autore del progetto, con strumenti di generazione di immagini | Di proprietà del progetto, usate con il permesso di Joseph |

`assets/` è generata in modo riproducibile da `tools/make-assets.py` partendo da `docs/concept-art/immagini/` (ritratti, pavimenti, scene, icone, texture, figure scontornate).
**Da completare (Joseph):** scrivere qui quale strumento ha creato le tavole e con quale piano/licenza, perché alcuni servizi pongono condizioni sull'uso commerciale delle immagini.

## Modelli 3D dei personaggi (dalla versione 2.3)
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| 12 modelli 3D (Correttore, Elara, Elara bambina, Ilde, Custode, Caricatore, Rilegatore, macchia, creatura con le spine, blob con i tentacoli, figura velata, robot) | `assets/modelli/*.glb` | Joseph, dai fogli delle sue tavole, con strumenti di generazione 3D | Di proprietà del progetto, usati con il permesso di Joseph |

**Da completare (Joseph):** quale strumento ha creato i modelli e con quale piano/licenza (come per le tavole).
I movimenti (passi, rimbalzi, mantello e piume che restano indietro) non vengono dai file: sono calcolati dal gioco (`src/modelli.js`, `ANIM_GLSL` in `src/art.js`).

## Tutto il resto è generato dal codice del gioco
Non ci sono altre immagini, modelli 3D, suoni, musiche, font o voci presi da altre opere.
- **Grafica 3D**: il giocatore, Elara, i boss, le stanze, la carta, il tratteggio e le macchie sono costruiti con forme geometriche e shader scritti in `src/art.js`, `src/world.js`, `src/main.js`.
- **Ritratti dei dialoghi**: dalle tavole di Joseph; quelli disegnati con il canvas del browser (`drawnFace()` in `src/main.js`) restano solo come riserva.
- **Effetti sonori e musica**: sintetizzati in tempo reale con la Web Audio API (`src/audio.js`). La musica (re minore, livelli per esplorazione/labirinto/combattimento/boss) è composta da regole nel codice, non campionata.
- **Voce del prologo**: la sintesi vocale di sistema del dispositivo (Web Speech API); non viene distribuito nessun file audio.
- **Font**: si usano i font di sistema (Georgia, serif).
- **Atmosfera, caricamento e titoli di coda (v2.6)**: pulviscolo, aloni, tratteggio a penna degli oggetti, goccia e pennino del caricamento sono disegnati dal codice (`src/atmosfera.js`, `src/art.js`, `index.html`); le texture degli oggetti e le immagini dei titoli di coda sono le tavole di Joseph.
- **Testi e storia**: originali di questo progetto.
