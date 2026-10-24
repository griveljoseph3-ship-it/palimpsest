# PALIMPSEST — Crediti e licenze

## Materiale esterno usato
| Cosa | Dove | Autore | Licenza |
|---|---|---|---|
| three.js r160 (motore 3D) | `vendor/three.module.js` | Three.js Authors (2010–2023) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |

Il testo della licenza MIT richiede solo di conservare l'avviso di copyright, che resta in testa al file `vendor/three.module.js`.

## Tutto il resto è generato dal codice del gioco
Non ci sono immagini, modelli 3D, suoni, musiche, font o voci presi da altre opere.
- **Grafica**: personaggi, nemici, stanze, carta, tratteggio e macchie sono costruiti con forme geometriche e shader scritti in `src/art.js`, `src/world.js`, `src/main.js`.
- **Ritratti dei dialoghi**: disegnati a inchiostro con il canvas del browser (`portrait()` in `src/main.js`).
- **Effetti sonori e musica**: sintetizzati in tempo reale con la Web Audio API (`src/audio.js`). La musica (re minore, livelli per esplorazione/labirinto/combattimento/boss) è composta da regole nel codice, non campionata.
- **Voce del prologo**: la sintesi vocale di sistema del dispositivo (Web Speech API); non viene distribuito nessun file audio.
- **Font**: si usano i font di sistema (Georgia, serif).
- **Testi e storia**: originali di questo progetto.
