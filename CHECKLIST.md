# PALIMPSEST — Checklist di lavoro (da leggere per prima)

Questo file dice **cosa è già fatto** e **cosa resta da fare**, in ordine. Chi riprende il lavoro (anche un altro modello) parte da qui, poi legge `PIANO-10.md` (valutazione, piano, diario, voti) e `docs/concept-art/LEGGIMI.md` (stile ufficiale).

## Regole fisse (decise da Joseph)
- Lavorare sul ramo **`claude/capolavoro`**. Non toccare `main`, non fare merge: decide Joseph.
- Spiegare tutto in **italiano semplice** (Joseph non è un programmatore).
- Stile **inchiostro e carta**, coerente con le 72 tavole in `docs/concept-art/` (lo stile ufficiale). Niente look 3D generico.
- Deve girare **fluido su iPad con Safari**: prima di aggiungere grafica pesante, pensare a memoria e fps.
- Dopo ogni modifica: test verdi (`node tests/s1.mjs`, `s3.mjs`, `systems.mjs`, `play.mjs`, `perf.mjs`) + test nuovi per le cose nuove; commit chiaro; aggiornare questa checklist.
- Niente materiale con copyright: tutto in `CREDITS.md` con la licenza.
- Parole proibite e «il libro che ricorda dove muori» sono rimandati a dopo il Capitolo 1.

## Come si lancia tutto
- Server: `npx http-server -p 8941 -c-1` dalla cartella del gioco (in questo ambiente servono il link `node_modules/playwright-core` → `/opt/node-tools/node_modules/playwright-core` e `/usr/bin/google-chrome` → `/opt/pw-browsers/chromium`).
- Suite: `sh tests/all.sh` (+ `EXTRA="plates.mjs music.mjs boss.mjs map.mjs enemies.mjs quest.mjs ladro.mjs scenes.mjs shield.mjs archive.mjs crypt.mjs maze.mjs"`).
- **Non lanciare altri browser mentre gira la suite**: il rendering software è lento (≈0,5 s a fotogramma) e i test con tempi falliscono. Trucco usato: copiare il gioco in una cartella ferma (`/tmp/claude-0/snap`) e servire quella sulla 8941 mentre si lavora sui file veri su un'altra porta (8942, con `BASE=http://localhost:8942/`).
- I comandi in background dell'ambiente si spengono dopo 2 ore: riavviare il server prima di una suite lunga.
- Versione: `sh bump.sh X.Y.Z` (aggiorna i `?v=` e il titolo).

## Già fatto (versioni 2.0 e 2.1, vedi diario in PIANO-10.md)
- [x] Test resi affidabili (systems.mjs falliva già su main), `tests/all.sh`, 15 file di test
- [x] Combattimento: catena di 3 colpi, lampo/schiacciamento, spinta camera, schivata con scia, contrattacco dopo schivata perfetta, morte in inchiostro
- [x] Nemici: Sputacchio (goccia rimandabile), Risguardo (scudo che para di fronte)
- [x] Boss: Copista (riga, macchie, stanchezza, fase 2), Ladro d'inchiostro (ruba inchiostro e parole), Custode (corsia, onda, fasi in scena, sale dal pavimento)
- [x] Prologo come un film, HUD senza sovrapposizioni, ritratti nei dialoghi (disegnati dal codice), borsa ◈, mappa del labirinto ⌗
- [x] Musica generata a livelli, accordi narrativi, passi, gocce
- [x] Storia: Ilde madre di Elara, LIBERA sotto COLPEVOLE, 3 commissioni (Tipografo, giurato, lettera di Ilde) con 4 oggetti
- [x] Labirinto 23×23 con fuga finale; tipografia e tribunale arredati; fondali disegnati dal codice
- [x] Opzioni: difficoltà, scossa, velocità testo, mira assistita, indizi a gradini
- [x] Prestazioni: luci 12→8, macchie unite, risoluzione adattiva, fps misurati sul tempo vero
- [x] `arte/PROMPT.md` (prompt per tutte le immagini)

## Giro 3 · Grafica dalle tavole di Joseph (in corso)
Idea: le tavole entrano nel gioco. I pavimenti diventano le tavole, i personaggi e i nemici diventano figure di carta ritagliate dalle tavole (paper-doll, piatte, sempre rivolte alla camera), le scene diventano tavole a schermo intero. Il giocatore resta in 3D (servono le animazioni dei colpi) ma con colori e sagoma come nelle tavole 036/038/058.

Mappa delle tavole → uso nel gioco (`docs/concept-art/immagini/tavola-NNN.jpg`):
| Uso | Tavole |
|---|---|
| Ritratti dialoghi | Elara 071/031, Elara bambina 015, Ilde 009 (lacrime 066), Lumi 048, Custode 037, Tipografo 018, Giurato 026, Ladro 059, viaggiatore 038, Il Libro 029 |
| Pavimenti stanze | prologo 035, tavola 033, Caricatore 022, pressa 064, tribunale 061, arena 030, archivio 043, cripta 046, fine 007, labirinto 060 (ripetuta) |
| Texture | muri di carta-mattoni 023/003, legno 062, acqua d'inchiostro 004, carta a fiori 027 |
| Figure di carta in gioco | Elara 071, Ilde 045/051, Tipografo 069, giurato 026, Lumi 048, macchie 019/028 e acari 065, Ladro 059/047, Copista 068/070, Custode 040/049, Caricatore 002 |
| Scene a tutto schermo | copertina 042/050, caduta 053, ponte 056/017, notte del fiume 025, Fenditura 041, verdetto 044, tribunale 013, Elara nel verdetto 005, labirinto 011, fuga 063, archivio/Ladro 034, LIBERA 052, Custode che sorge 055, lettera 012, finale 021, capitolo 2 014 |
| Icone oggetti | pennino 006, fiala 032, seppia 000, segnalibro 054, sacca 067, lettera 020 |
| Non ancora usate | 001/024 (figura velata), 010 (maschera a becco: personaggio da decidere con Joseph), 016 (Elara riccia?), 027 |

Passi (spuntare man mano, con commit):
- [x] R1 · Cartella `assets/` con le tavole ottimizzate per l'iPad (jpg ridotte, ritagli dei ritratti, figure scontornate in png) generate da `tools/make-assets.py` (riproducibile) — fatto: 5,1 MB in tutto (figure in WebP con trasparenza, 628 KB)
- [x] R2 · Ritratti dei dialoghi dalle tavole (al posto di quelli disegnati dal codice) — fatto: `portrait()` in main.js usa assets/ritratti, volti alternativi ilde-lacrime (lettera) ed elara-sorriso (LIBERA), riserva disegnata se l'immagine manca
- [x] R3 · Pavimenti delle stanze = tavole, con shader che tiene la luce della lampada e le candele — fatto: blocco «v2.2 · le tavole di Joseph diventano il pavimento» in main.js (fusione moltiplica, `PAL.PLATES`), anche prologo (035) e labirinto (060 ripetuta)
- [x] R4 · Muri con texture carta-mattoni (023) anche nel labirinto — fatto: uniform `uSkin` in inkMaster (art.js), caricata in buildWorld (world.js); libri ricolorati seppia
- [x] R5 · Scene a tutto schermo dalle tavole nei momenti della storia (prologo, labirinto, Ladro, tribunale, LIBERA, lettera, Custode, finale) + schermata del titolo con la copertina — fatto: `cinePlate(nome, didascalia, done)` (intermezzo, pausa, una volta per partita, saltato con ?fast) e `backPlate` (3º elemento delle righe di say) in main.js; agganciati: caduta, ponte, tribunale, Custode, labirinto, fuga, capitolo 2; sfondi: verdetto, LIBERA, Ladro, lettera (lettera/fiume/fenditura/verdetto), diario di Ilde, finale. Test `tests/plates.mjs`
- [x] R6 · Figure di carta: Elara, Ilde?, Tipografo, giurato, Lumi, macchie/acari, Ladro, Copista, Custode, Caricatore — fatto in parte: `paperSprite`/`figure`/`loadFigures` in art.js (sagoma sempre verso la camera, luce, lampo e dissoluzione come i corpi 3D); acari, bruto, Sputacchio, Risguardo (+ scudo 3D per leggere il fronte), Copista, Tipografo, giurato (volto restituito = giurato-volto), Lumi. Restano 3D: Elara, Ladro, Custode, Caricatore (hanno parti che si rompono o crescono: da fare con cura)
- [x] R7 · Icone degli oggetti nella borsa dalle tavole — fatto: `itemIcon()` usa assets/icone (pennino, seppia, segnalibro, sacca; fiala e lettera pronte), riserva disegnata
- [ ] R8 · Giocatore 3D ricolorato come le tavole (mantello sfrangiato nero, sciarpa rossa lunga, occhi dorati)
- [ ] R9 · Misura prestazioni (draw call, memoria texture) e test; `CREDITS.md` aggiornato (tavole di Joseph)
- [ ] R10 · Report a Joseph con schermate prima/dopo

## Dopo il giro 3 (da fare, in ordine di impatto)
- [ ] Enigmi nuovi con vero «aha» (circuiti CONDUTTIVO a catena, specchi, ordine delle parole)
- [ ] Tutorial più corto (8 → 4-5 passi, insegnare col mondo)
- [ ] Animazioni del giocatore più ricche
- [ ] Temi musicali per Elara/Ilde/Custode
- [ ] Punti di riferimento unici nel labirinto, scorciatoie
- [ ] Salvataggi in 3 slot, menu di pausa più bello
- [ ] Misurare la durata del Capitolo 1 con una persona vera (stima: 40–58 min percorso principale)
- [ ] Solo dopo: Capitolo 2
