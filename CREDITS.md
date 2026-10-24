# PALIMPSEST — Crediti e licenze

## Materiale esterno usato
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| three.js r160 (motore 3D) | `vendor/three.module.js` | Three.js Authors (2010–2023) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |

Il testo della licenza MIT richiede solo di conservare l'avviso di copyright, che resta in testa al file `vendor/three.module.js`.

## Tavole di concept art di Joseph (dalla versione 2.2)
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| 72 tavole di concept art (personaggi, nemici, ambienti, texture, oggetti) | `docs/concept-art/` (originali) e `assets/` (versioni ridotte e ritagliate per il gioco) | Joseph, autore del progetto, con strumenti di generazione di immagini | Di proprietà del progetto, usate con il permesso di Joseph |

`assets/` è generata in modo riproducibile da `tools/make-assets.py` partendo da `docs/concept-art/immagini/` (ritratti, pavimenti, scene, icone, texture, figure scontornate).
**Da completare (Joseph):** scrivere qui quale strumento ha creato le tavole e con quale piano/licenza, perché alcuni servizi pongono condizioni sull'uso commerciale delle immagini.

## Tutto il resto è generato dal codice del gioco
Non ci sono altre immagini, modelli 3D, suoni, musiche, font o voci presi da altre opere.
- **Grafica 3D**: il giocatore, Elara, i boss, le stanze, la carta, il tratteggio e le macchie sono costruiti con forme geometriche e shader scritti in `src/art.js`, `src/world.js`, `src/main.js`.
- **Ritratti dei dialoghi**: dalle tavole di Joseph; quelli disegnati con il canvas del browser (`drawnFace()` in `src/main.js`) restano solo come riserva.
- **Effetti sonori e musica**: sintetizzati in tempo reale con la Web Audio API (`src/audio.js`). La musica (re minore, livelli per esplorazione/labirinto/combattimento/boss) è composta da regole nel codice, non campionata.
- **Voce del prologo**: la sintesi vocale di sistema del dispositivo (Web Speech API); non viene distribuito nessun file audio.
- **Font**: si usano i font di sistema (Georgia, serif).
- **Testi e storia**: originali di questo progetto.
