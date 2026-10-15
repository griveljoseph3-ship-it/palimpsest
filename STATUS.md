# PALIMPSEST · Stato del vertical slice

Live: https://griveljoseph3-ship-it.github.io/palimpsest/
Base: GDD integrato v7.0 (16 ottobre 2026) + Visione di Joseph (vincolante: inchiostro e carta, controller e touch, il mondo-libro che ricorda).
Legenda: **Fatto** = implementato e provato con test automatici · **In corso** = c'è ma va rifinito · **Da fare** = non ancora fatto.

## Settori
| Settore | Stato | Note |
|---|---|---|
| S1 Dati + resolver | Fatto | 3 effetti (state.fragile, temperament.cautious, element.conductive), slot con un valore, combinazioni, Ripristina frase, Ricomponi prova. Test: `node tests/s1.mjs` |
| S2 Kit del giocatore | Fatto | movimento, schivata con i-frame, colpo rapido e impegnato, interazione, riscrittura, riapplica veloce; camera semi-isometrica stabile; Gamepad API, touch col pollice, tastiera/mouse |
| S3 Parole Fluttuanti + Inchiostro Vivo | Fatto | numeri esatti del §04, Sbiadito, recuperi 12/18/25, costo zero in zona sicura, preview visiva e sonora, combinazioni, pannello laterale come opzione. Vibrazione: controller (dual-rumble) e Android; **iPad Safari non vibra** |
| S4 Contenuti | Fatto | tavola, Caricatore, pressa/piastra, porta di Elara con 3 vie + door_route + diario, arena 16×14 con 4 piani, scena di conseguenza, Lumi (Visione dopo 3 morti), memoria delle versioni |
| S5 Arte NPR + audio + accessibilità | In corso | InkMaster con DissolveAmount/ColorShift/TextureBlend, eco 0 / 0,12 / 0,35 s, tracce persistenti che si asciugano, gocce, strappi, lampada da lettura, post-processing; suoni generati unici per parola; opzioni di accessibilità. Rifinitura grafica continua |
| S6 Rifinitura + prestazioni + telemetria | In corso | telemetria solo locale (§15) esportabile; risoluzione adattiva; ≤120 draw call. 60 fps su iPad **da verificare sul dispositivo vero** |

## Mappa delle sezioni del GDD
| § | Titolo | Stato | Dove / note |
|---|---|---|---|
| 01 | Autorità e metodo | Fatto | La Visione di Joseph prevale dove diverge |
| 02 | Visione, pubblico, contratto | Fatto | Ogni parola ha il contratto (cambia/azione/costo/verifica) in `src/data.js` |
| 03 | Grammatica + Parole Fluttuanti | Fatto | `src/data.js`, `src/resolver.js`, bolle con forma per slot (tratteggio/oscillazione/linea) |
| 04 | Inchiostro Vivo e Sbiadito | Fatto | `src/ink.js` (100 u, 0,3x, 3 u/s, 1,5 u/s per 4 s, <25 Sbiadito, chiusura 2,5 s, +12/+18/+25, zero in zona sicura, pieno a fine incontro). Costo di conferma = 8 u (il GDD non lo fissa: valore iniziale) |
| 05 | FRAGILE | Fatto | componente dichiarato, 8 s sui nemici, frammenti 1,5 m con segnale 0,5 s, nucleo esposto 3 s |
| 06 | CAUTO | Fatto | posizioni a 3–4 m, 8 s, non interrompe un colpo già partito, legame allentato a >2,5 m per 0,4 s; combinazione con FRAGILE non sempre migliore (carica meno) |
| 07 | CONDUTTIVO | Fatto | trasporta un impulso esistente (pressa ogni 4 s, anticipo 1 s), due rami visibili in preview, piega che sposta il Custode e ramo secondario pericoloso |
| 08 | Arena del Custode | Fatto | 16×14 m, ingresso sud, nucleo, 2 pilastri, ponte nord; piani Controllo/Rottura/Ambiente/Azione pura tutti provati |
| 09 | Porta di Elara | Fatto | Forzare il relè / Conservare la prova / Affidarsi a Elara (30 s), `door_route` unica e permanente, diario, conseguenze diverse nella scena finale |
| 10 | Due reset e snapshot | Fatto | Ripristina frase non tocca salute/rotture/posizione/Inchiostro; Ricomponi prova solo in zona sicura |
| 11 | Combattimento e progressione | Fatto | nessun albero statistiche; recupero Inchiostro legato a colpi e schivate |
| 12 | Arte, audio, camera, accessibilità | In corso | eco di riscrittura, suoni unici, aptica dove supportata, camera stabile; opzioni: pausa completa, riduci movimento, alto contrasto, testo grande, pannello laterale, aiuto danni |
| 13 | InkMaster e LOD | In corso | un solo shader master con i 3 parametri e attributo InkMask (vertex color). Simulazione fluida completa e sequenze pre-renderizzate per mobile: sostituite da dissolvenza procedurale (stesso parametro) |
| 14 | Vertical slice 20 min | Fatto | 6 sezioni nell'ordine del GDD; prima riscrittura su oggetto passivo in zona sicura, poi trasferita al Caricatore |
| 15 | Telemetria e playtest | Fatto (solo locale) | eventi in localStorage, anche Sbiadito e riscrittura veloce; esportazione JSON da Pausa. Variante A/B "pausa completa" disponibile come opzione |
| 16 | Monetizzazione | Escluso per scelta | Nessuna monetizzazione nel prototipo |
| 17 | Backlog P0 | Fatto | dati+resolver, arena, UI, snapshot, porta, InkMaster, Parole Fluttuanti. Seconda Lettura in backlog |
| 18–19 | Sostituzioni e greenlight | Da fare | servono playtest veri con persone (il greenlight non si può dimostrare da soli) |

## Test (Playwright, viewport iPad 1366×1024 e 1024×1366)
- `node tests/s1.mjs`, `node tests/s3.mjs`: logica pura.
- `node tests/play.mjs <forced|evidence|trust> <controllo|rottura|ambiente|azione>`: partita intera scriptata dall'inizio ai titoli di coda. Il bot si teletrasporta tra i punti e mantiene la salute piena per provare la logica, non l'abilità.
- `node tests/systems.mjs`: input reale da tastiera e touch, Sbiadito, riscrittura veloce, reset, ricomponi, Lumi, memoria tra versioni (28 controlli).
- `node tests/perf.mjs`: draw call e triangoli per stanza.

## Limiti noti
- iPad: Safari non permette la vibrazione dal web; si usano luce e suono.
- Il rendering nei test gira in software (circa 10 fps): la fluidità reale va provata sull'iPad.
- I nomi, le voci e la musica sono generati; niente doppiaggio.

## Ultimo giro di test (16 ottobre, ~02:45 ora di Parigi)
- Partite intere: forced+controllo, evidence+rottura, trust+ambiente, evidence+azione: PASS, 0 errori in console. Nella stessa notte sono passate anche forced+rottura, forced+azione, trust+controllo, trust+rottura, evidence+controllo.
- Sistemi (tastiera, touch, Sbiadito, riscrittura veloce, Lumi, memoria): 28/28. Controller simulato: 8/8. S1 e S3: OK.
- Aiuti usati dal bot nei test: teletrasporto, salute piena e Inchiostro ricaricato quando serve. Servono a provare la logica, non dicono niente sulla difficoltà.
