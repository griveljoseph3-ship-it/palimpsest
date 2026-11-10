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
- Suite: `sh tests/all.sh` (+ `EXTRA="plates.mjs music.mjs boss.mjs map.mjs enemies.mjs quest.mjs ladro.mjs scenes.mjs shield.mjs archive.mjs crypt.mjs maze.mjs grafica2.mjs"`).
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

## Giro 3 · Grafica dalle tavole di Joseph (fatto, v2.2.0)
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
- [x] R8 · Giocatore 3D ricolorato come le tavole (mantello sfrangiato nero, sciarpa rossa lunga, occhi dorati) — fatto: makePlayer in world.js (mantello più nero, orlo sfrangiato irregolare, occhi dorati con bagliore, sciarpa in 5 tratti snodati animata in main.js: si gonfia quando corri/schivi)
- [x] R9 · Misura prestazioni (draw call, memoria texture) e test; `CREDITS.md` aggiornato (tavole di Joseph) — fatto: suite completa verde (v2.2.0); ladro.mjs: attesa a condizione per la seppia; boss.mjs: scelta «macchie» forzata; CREDITS aggiornato (manca solo il nome dello strumento usato da Joseph)
- [x] R10 · Report a Joseph con schermate prima/dopo — fatto: `docs/report-v2.2/confronto-*.jpg`, diario in PIANO-10.md

Note del giro 3 per chi riprende:
- `/tmp/claude-0/snap.sh` (se lo si ricrea) deve copiare anche `assets/`.
- Le tavole sono in fusione «moltiplica» (pavimenti) e le figure sono ShaderMaterial con `userData.ink` (così `matsOf`/`setU` le trattano come i corpi 3D). Una sagoma specchiata va disegnata DoubleSide (altrimenti sparisce).
- Memoria grafica stimata: pavimenti ≈ 26 MB, figure ≈ 8 MB, mattoni ≈ 1,4 MB (si caricano sulla scheda grafica solo quando la stanza viene vista). Draw call uguali o minori (una sagoma = 1 draw call contro 2 del corpo 3D con contorno); nel labirinto il test misura 2,2 fps contro 1,7 prima (rendering software).
- Prossimi passi grafici: figure anche per Ladro (tavole 059/047), Custode (040/049), Caricatore (002), Elara (071) mantenendo le parti che si rompono; animare le sagome (respiro, inclinazione quando attaccano); tavole 001/024/010/016/027 ancora da usare (chiedere a Joseph chi è la maschera a becco).

## Giro 4 · Personaggi 3D dai modelli di Joseph (v2.3.0)
I modelli erano sul ramo `grok/personaggi-3d` (costruito sulla vecchia v1.9: NON unito). Presi solo `assets/modelli/*.glb` e i loader in `vendor/`.
- [x] Caricamento e pulizia (`src/modelli.js`): pezzetti staccati via, pozza sotto la creatura con le spine via, piedi a y=0, altezza 1
- [x] Movimento senza scheletro (`ANIM_GLSL` in art.js, `animateModels` in modelli.js, chiamato una volta per fotogramma dopo `visualUpdate`): passi legati ai metri percorsi (i piedi non scivolano), gambe a forbice, braccia, bacino; zampe a onda (Caricatore); salti con schiacciamento (macchie, Lumi, Ladro); mantello/piume/spine/colature che restano indietro e tremano a ogni passo; respiro da fermi; mai fluttuare (la base è riportata sul pavimento)
- [x] Chi è chi: correttore = giocatore (penna vecchia nascosta, il busto gira nei colpi) · macchia = acari, bruto, Sputacchio (tiene becco 3D), Risguardo (tiene lo scudo) · creatura_spine = Copista · caricatore · custode (nucleo davanti al petto, si torce nella carica) · rilegatore = Ladro (si gonfia con la sacca) · elara (porta e finale) · figura_velata = giurato senza volto · blob_tentacoli = Lumi (rimbalza a terra accanto a te)
- [x] Test `tests/modelli.mjs`; strumenti `tools/studio.html` + `tools/studio.mjs` (4 lati) e `tools/passi.html` + `tools/passi.mjs` (5 momenti del passo)
- [ ] Da decidere con Joseph: Tipografo senza modello (resta di carta); robot, Ilde, Elara bambina non ancora in scena
- [ ] Poi: animazioni d'attacco dedicate per i boss (oggi: torsione e inclinazione), panche del tribunale con giurati 3D

## Giro 5 · Richieste di Joseph (novembre): ordine deciso con lui = regia+PONTE → riscrittura → boss → stanza CONDUTTIVO
Regole: dopo OGNI parte mandargli schermate prima/dopo e ASPETTARE il suo ok prima della parte successiva. Non unire a main, non pubblicare.
- [x] P2 · Regia (`regia()`, `regiaApply`, `trackSide`, `twoShot`, `orbitLow` in main.js; bande nere `#regiaBars`): PONTE dell'apertura e del labirinto ripresi di lato sulle assi scritte (`plankWords`); LIBERA in inquadratura a due. Strumenti: `tools/ponte-shots.mjs`, `tools/libera-shot.mjs`
- [x] P3 · Riscrittura «alla Light Yagami»: `scrittura()` in main.js (canvas 2D `#scrivi`: occhi dorati dal ritratto «you», pagina, nome del bersaglio, parola scritta lettera per lettera dal pennino con suono 'scratch' (audio.js), parola che si accende del suo colore, lampo, stacco `regia('stacco')` dal basso). `confirmWord` → `canWrite` → scena → `applyWord` alla fine. Lunga la prima volta per parola e su boss/ponti, breve (0,85 s) dopo, un tocco la salta, opzione «Scena di scrittura» (auto/lunga/spenta). Saltata con ?fast (PAL.SCR.force per provarla). Test `tests/scrittura.mjs`; strumento `tools/scrittura-shots.mjs`. Nota: `tests/tutorial.mjs` fallisce già da prima (cerca un pulsante che non c'è più)
- [x] P4 · Presentazione dei boss: `bossIntro(k, get, done)` + `LORE` in main.js (ripresa larga dal basso → primo piano, 3 frasi in `#bossLore` guidate dal tempo della ripresa, nome con `bossBeat`, 1,5 s di pausa prima del dialogo). Caricatore (entrata stanza), Copista (si accorge di te), Ladro (appena uscito dalle pozze), Custode (dopo la salita). LORE del Compositore pronta per P6. Prima volta sola, un tocco salta, ?fast = solo nome. Caricatore più leggibile: contorno 0.03, pavimento 'charger' 0.45, ombra a terra sotto tutti i modelli (modelli.js). Test `tests/intro.mjs`; strumento `tools/intro-shots.mjs`
- [x] P6 · Stanza CONDUTTIVO (blocco «v2.4 · Stanza CONDUTTIVO» in main.js): botola di servizio `TD` (telaio, ante, serratura di rame, targhetta «si apre con la corrente», buio sotto) collegata alla piastra dal filo `wireT`; il Compositore `CP` (modello robot, ENTITY_DEFS.compositore) caccia, carica pugni con corsia d'avviso, e quando la piastra è CONDUTTIVO ci sale e la rimette ISOLANTE; i colpi lo spingono ma non lo feriscono; con CONDUTTIVO addosso, sul filo o sulla piastra al battito della pressa va in corto (`compoPulse`, 3 volte → `compoDown`, PROG.compoDone). Poi l'impulso apre la botola (`mazeHintPulse` + ripresa `trapdoorShot`) e si cade (`fallInto`, ripresa dall'alto, poi `enterMaze`). Vortice e pagina piegata nascosti. Obiettivi a passi. Test `tests/conduttivo.mjs` (maze.mjs aggiornato); strumento `tools/conduttivo-shots.mjs`
- [x] Tutorial (richiesta di Joseph): manichino d'inchiostro `DUMMY` nella prima stanza (blocco «v2.5 · Tutorial» in main.js), passi nuovi «attack» (catena di 3 colpi) e «dodge» (goccia lenta, nessun danno) in `TUT` (ora 10 passi); parte a ogni nuova partita (`opts.tut`, opzione «Tutorial a ogni nuova partita»), pulsante «Salta il tutorial» `#tutSkip`; obiettivo «allenati col manichino». Test `tests/tutorial2.mjs` (il vecchio `tutorial.mjs` era già rotto)
- [x] Colpi che si sentono: `impactAt`/`impactsUpdate` (macchia a stella, rossa nei colpi forti), schizzi `traces` a ogni colpo, segni «−1/−2/−3/✕» (`.dn.ink`), hitstop e scossa più forti, suono a strati in `hitFx`. `window.__fxSlow` solo per le foto (`tools/colpi-shots.mjs`)
- [x] Storia più chiara: inizio in 4 frasi (story.js `introLines`), Elara alla porta più chiara, «Persone» nella borsa (`PEOPLE`, `meet`, `PROG.people`, si aggiornano dopo LIBERA e la lettera). Test `tests/persone.mjs`
- [x] Installabile: `sw.js` generato da `tools/make-sw.py` (anche da bump.sh), registrato fuori da ?fast, cache per versione; meta iOS; consiglio «Aggiungi alla schermata Home» sul titolo (`#a2hs`). Serve un indirizzo https (o localhost). Test `tests/offline.mjs`
- [x] Animazioni con scheletro (senza Mixamo): `autoRig` + `makeSkeleton` + `walkPose` in modelli.js (12 ossa messe dalle proporzioni, pesi morbidi), shader con `skinning_*` in art.js, `uKind 3` = niente gambe finte; pose d'azione `POSES` in main.js (protagonista: rapido, chiusura, forte, ferita, schivata, morte; Custode: carica/manata/stordito; Compositore: carica/pugno/timbra; Copista). Rigging su: correttore, elara, custode, robot, creatura_spine. Sfera di culling ×1,6 (senza, i triangoli raddoppiavano). Strumento `tools/pose-shots.mjs`. Upgrade possibile: Mixamo (Joseph) per animazioni da attore vero
- [x] Giro grafico v2.6 (parte 1): titolo «ufficiale» (copertina intera, logo in alto, pulsanti in basso: CSS in fondo a style.css); buio fuori dalla lampada meno fangoso (art.js: .47/.41/.4); legno della tavola 062 su casse, panche e banconi (`inkMasterLike(color, wood)`, `WOOD`); giuria del tribunale = figure del giurato (tavola 026). Strumento `tools/giro-shots.mjs`. systems.mjs: attese dell'apertura più lunghe e a condizione (la macchina di prova può essere più lenta)
- [x] Giro grafico v2.6 (parte 2): fatto sul ramo `grok/grafica-2` (v2.6.0-prova), vedi sezione «Giro grafico parte 2» qui sotto. Resta: icona dell'app dalla copertina
- Idee già decise per dopo: Ilde = ricordo d'inchiostro nelle scene della lettera e nell'archivio; Elara bambina = flashback giocabile della notte del fiume prima del finale
- Restano dalla lista di Joseph (non scelti ora): colpi che si sentono, nemici più vari, storia più chiara, più enigmi

## Giro grafico parte 2 (v2.6.0-prova, ramo `grok/grafica-2`, non unito a main)
Richieste di Joseph: oggetti di scena ancora lisci, HUD e menu nello stile del nuovo titolo, atmosfera, caricamento e titoli di coda.
- [x] Oggetti di scena «a penna» (art.js `penMat`/`penned`/`roughen`/`plateTex`, uniform `uPen` in inkMaster): tratteggio che segue la forma (intorno ai cilindri, sulle facce delle scatole), più fitto nell'ombra; bordi e cerchi d'inchiostro irregolari; contorno più grosso e più fine come un tratto vero (`uWV` in outlineMat, che ora funziona anche con InstancedMesh); vertici spostati da un rumore fisso (bordi storti, costo zero a fotogramma)
  - pilastri (Caricatore, arena) e sostegno: carta-mattoni (tavola 023), base e capitello (`makePillarGeo`)
  - pressa (`makePress`, stanza III e arena): telaio di legno (tavola 062) con montanti, traversa, manovella; piano + vite in un pezzo. 4 draw call invece di 8
  - barili della tipografia (`barrelGeo`): doghe, 3 cerchi di ferro, inchiostro dentro; tutti e 3 in 2 draw call con contorno
  - casse del Caricatore e legno di casse/panche/banconi (`inkMasterLike` con `uPen 2`)
- [x] HUD, pausa e opzioni come il titolo (fondo di style.css, blocco «v2.6 · giro grafico parte 2»): inchiostro `rgba(22,17,13,.82)`, bordo crema sottile, rosso `#8a1a10` per ciò che conta, Georgia spaziata, riga rossa sotto i titoli. Pausa a tutto schermo con la copertina scurita e colonna di pulsanti; Opzioni = pagina a parte (`#pOpts`, `pauseOpts()`) con 3 schede (Suono, Gioco, Vista e accessibilità), cursori e caselle disegnati. Stessi id di prima (nessun test toccato). Pannelli (borsa, diario, mappa, abilità): carta invecchiata con cornice d'inchiostro
- [x] Atmosfera (`src/atmosfera.js`): `Dust` = 170 granelli di pulviscolo mossi solo nello shader, fermi nel mondo, accesi dalla lampada e dalle candele vicine (1 draw call); `Halos` = alone con raggi a penna nell'aria + pozza calda a terra per le 7 luci più vicine (1 draw call per tutti), tremolano con la fiamma, spenti se la luce è spenta/nascosta, fermi con «Riduci movimento»
- [x] Schermata di caricamento (index.html `#loading` + script in linea): carta, goccia d'inchiostro che cade e si apre, il pennino scrive PALIMPSEST, barra d'inchiostro con percentuale e frasi; avanzamento vero da `THREE.DefaultLoadingManager` (tavole, texture, modelli) in main.js (`LOADUI`); se ne va dopo il 4º fotogramma (shader pronti), almeno 3 s, al massimo 25 s; non blocca i tocchi; con ?fast non c'è
- [x] Titoli di coda (`credits(done, force)`, `CREDITS` in main.js, `#credits`): dopo la pagina finale (poi «Fine del frammento»), dal titolo («Titoli di coda») e dalla pausa. Testi da CREDITS.md: Joseph Grivel autore del gioco, delle 72 tavole e dei modelli; personaggi; codice/musica generati; licenze MIT. 6 tavole di Joseph incorniciate che scorrono; tieni premuto = più veloce; «Salta ▸▸»; con ?fast saltati (se non forzati)
- [x] Test `tests/grafica2.mjs` (22 controlli); strumento `tools/grafica2-shots.mjs` (foto prima/dopo)
- [x] Verifica (10 novembre): suite `sh tests/all.sh` + EXTRA verde tranne `enemies.mjs` e `archive.mjs`, che falliscono solo a volte con la macchina carica (rilanciati da soli: PASS, come su main). Verdi anche scrittura, intro, conduttivo, tutorial2, persone, offline, modelli. Già rotti prima (anche su main 62f774c): `tutorial.mjs`, `filmend.mjs` (`__film` non esiste più)
- [x] Prestazioni (rendering software, camera ferma, mediana di 6 letture): draw call in apertura 108→104, corridoio 82→88, Caricatore 89→87, pressa 87→88, tipografia 87→89 (tutte sotto 120). Triangoli +0–35 mila nelle stanze con pilastri (base e capitello). Nessuna immagine nuova: le texture sono le tavole già caricate (mattoni, legno). `tests/perf.mjs` legge un solo fotogramma mentre la camera si muove e dà numeri più alti e ballerini (anche su main)
- Foto prima/dopo: `/workspace/grafica2/prima-*.png` e `dopo-*.png` (`node tools/grafica2-shots.mjs <url> <cartella> <prefisso>`)
- [ ] Da provare sull'iPad vero: fluidità con pulviscolo/aloni (sono leggeri, ma vanno visti), leggibilità dei pulsanti HUD sopra la carta chiara, durata giusta dei titoli di coda

## Giro 2.6.1-prova (ramo `grok/grafica-2`, non unito a main)
Richiesta di Joseph: troppe scene quando si scrive; le presentazioni dei boss solo per quelli più importanti, e quelli devono essere molto più grossi.
- [x] Scena di scrittura: piena solo la prima volta in tutta la partita, e la prima volta su PONTE (momento della storia). Le altre volte: lampo breve (0,4 s) senza ripresa della camera. Opzione «Sempre lunga» e salto con un tocco restano. Test `tests/scrittura.mjs`
- [x] Presentazione lunga solo per **Il Copista** (boss del labirinto) e **Il Custode della Fenditura** (boss finale del capitolo 1), come in PIANO-10 («Boss: Copista, Custode»). Caricatore, Compositore (mini-boss) e Ladro d'inchiostro (archivio facoltativo): solo il nome. Test `tests/intro.mjs` (ora sul Custode)
- [x] Scala: Custode ×2,3 (altezza 7,8; raggio 2,1; manata 4,0; ombra e salita dal pavimento adeguate; camera dell'arena più indietro). Copista ×2,2 (scala 6,82, fase 2: 7,48; raggio 1,7). Barre vita più grandi. La ripresa di presentazione non si allontana in proporzione, così si vedono davvero più grossi e restano nella stanza
- [ ] Da provare sull'iPad: se il lampo breve della scrittura si capisce, se Custode e Copista stanno nella stanza e si combattono bene

## Dopo il giro 3 (da fare, in ordine di impatto)
- [ ] Enigmi nuovi con vero «aha» (circuiti CONDUTTIVO a catena, specchi, ordine delle parole)
- [ ] Tutorial più corto (8 → 4-5 passi, insegnare col mondo)
- [ ] Animazioni del giocatore più ricche
- [ ] Temi musicali per Elara/Ilde/Custode
- [ ] Punti di riferimento unici nel labirinto, scorciatoie
- [ ] Salvataggi in 3 slot, menu di pausa più bello
- [ ] Misurare la durata del Capitolo 1 con una persona vera (stima: 40–58 min percorso principale)
- [ ] Solo dopo: Capitolo 2
