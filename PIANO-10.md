# PALIMPSEST — Piano per arrivare al 10

Ramo di lavoro: `claude/capolavoro` (main non si tocca, il merge lo decide Joseph).
Data della valutazione: 23 ottobre 2026, versione di partenza 1.9.0.
Legenda della sicurezza: **[certo]** = visto giocando o misurato · **[probabile]** = dedotto dal codice · **[ipotesi]** = da verificare sull'iPad vero.

> Limite dichiarato: ho giocato il Capitolo 1 con un browser automatico (Chromium, formato iPad 1366×1024 e 1024×1366, rendering software a ~11 fps). Fluidità, sensazione del tocco e audio reale **non li posso sentire**: per questi il voto è dedotto dal codice e va confermato sull'iPad.

---

## FASE 1 · Valutazione (prima delle modifiche)

| # | Categoria | Voto | Perché (motivi concreti) | Cosa serve per il 10 |
|---|---|---|---|---|
| 1 | Primi 5 minuti | **5** | La caduta + PONTE prima del titolo è un'ottima idea [certo]. Ma durante la "scena" si vedono barra inchiostro, vita e tutti i pulsanti touch, quindi non sembra un film [certo]; il viaggiatore è minuscolo su una pagina enorme e si perde [certo]; il primo fotogramma è un rettangolo nero granuloso [certo]; poi arrivano 2 righe del Libro + 8 passi di tutorial + una scheda comandi: troppo testo [certo]; in verticale il riquadro del tutorial copre il titolo della stanza [certo]. | Prologo pulito senza HUD, camera vicina al personaggio, tutorial ridotto e mostrato solo quando serve, nessun testo sovrapposto. |
| 2 | Meccanica delle parole | **7** | Il cuore è forte: anteprima visiva e sonora, slot, combinazioni (FRAGILE+CAUTO, FRAGILE+CONDUTTIVO, FRAGILE+PESANTE), riapplica veloce, Sbiadito [certo]. Però una combinazione scoperta è solo una scritta in alto (nessun "momento") [certo]; le combinazioni sono bloccate dietro l'acquisto del Pennino d'acciaio e un giocatore può non capirlo [probabile]. | Momento speciale alla prima scoperta di ogni combinazione, raccolta delle combinazioni nel Diario, suono dedicato. |
| 3 | Combattimento | **4** | Ci sono pausa sul colpo, scossa, numeri di danno e schivata con invulnerabilità [certo]. Ma il colpo rapido è sempre la stessa animazione (niente catena di colpi) [certo]; la scossa della camera è casuale e non nella direzione del colpo [certo]; le macchie muoiono in un frame con un piccolo sbuffo [certo]; la schivata non lascia scia [certo]; "PARATO" compare spesso e frustra [probabile]; nemici del Cap. 1 quasi tutti varianti della macchia [certo]. | Catena di 3 colpi con chiusura, lampo sul nemico colpito, schizzo d'inchiostro nella direzione del colpo, camera che "spinge" nel verso del colpo, scia della schivata, morte dei nemici in inchiostro, un nemico nuovo a distanza. |
| 4 | Boss (Copista, Custode) | **5** | Il Custode ha 3 fasi e la fase "ti ho letto" (diventa immune alla parola che usi di più) è un'idea eccellente [certo]. Ma i passaggi di fase sono solo una scritta [certo]; i segnali d'attacco sono anelli rossi generici [certo]. Il Copista è una macchia ingrandita che evoca altre macchie e scrive LENTO: non ha un attacco suo [certo]. | Copista con attacchi propri (riga d'inchiostro che spazza, pozze), due fasi; Custode con passaggi di fase messi in scena (rallentatore, camera, ruggito, scritta). |
| 5 | Level design | **6** | Stanze compatte e dense, strade alternative (sostegno del Caricatore), zone facoltative (archivio, cripta), labirinto con 4 pagine [certo]. Nel labirinto non c'è nessun modo di orientarsi: niente mappa, pochi punti di riferimento [certo]. | Mappa disegnata a mano che si riempie mentre esplori (alla Hollow Knight) + punti di riferimento nel labirinto. |
| 6 | Puzzle | **6** | Il verdetto di Elara (trovare la prova falsa) è un vero momento "aha" [certo]; la campana dei tre rintocchi e le botole della cripta sono belle [certo]. Ma molti suggerimenti dicono subito la soluzione ("Scrivi PESANTE sui pesi") [certo]. | Indizi a gradini: prima vago, dopo un po' più chiaro, solo alla fine esplicito. |
| 7 | Storia e personaggi | **6** | Mistero buono (Ilde, LIBERA sotto il calamaio, Lumi che nasce dagli errori, il Custode che "ti legge") [certo]. Ma tutto passa da riquadri di testo senza volti [certo]; Elara in 3D è ferma [certo]. | Ritratti a inchiostro nei dialoghi, piccole messe in scena nei momenti chiave. |
| 8 | Grafica e stile | **5** | Shader carta/inchiostro coerente: tratteggio, contorni tremolanti, macchie che si asciugano [certo]. Ma l'immagine è marrone e fangosa, poco contrasto tra carta e inchiostro [certo]; molti oggetti sono cubi e cilindri lisci che sembrano "3D generico" [certo]. | Regolazione colore (carta più chiara, inchiostro più nero, meno nebbia marrone), nemici più leggibili, effetti d'inchiostro più ricchi. |
| 9 | Audio | **3** | Effetti sonori generati e diversi per ogni parola [certo]. La "musica" è un accordo fisso di 4 note che non cambia mai, né in combattimento né col boss [certo]. | Musica generata con melodia, che cambia per esplorazione / combattimento / labirinto / boss, e piccoli "accordi" quando scrivi una parola o scopri una combinazione. |
| 10 | Comandi | **6** | Touch con stick virtuale e ventaglio, controller e tastiera tutti presenti; mira assistita [certo]. In verticale il riquadro del dialogo copre i pulsanti touch [certo]; nessuna personalizzazione [certo]. | Nessuna sovrapposizione, mira assistita regolabile, feedback dei pulsanti più chiaro. |
| 11 | Interfaccia e menu | **5** | Pausa, opzioni, salvataggio automatico, Continua, Capitoli [certo]. Testi sovrapposti (titolo stanza + tutorial + obiettivo + avvisi) [certo]; la barra del boss in verticale non si vede [certo]. | HUD più pulito, un solo messaggio alla volta, barra del boss sempre leggibile. |
| 12 | Difficoltà e progressione | **5** | Pennino con 4 abilità, gocce, gommino, pagine maledette rischio/ricompensa (bella idea) [certo]. Niente scelta di difficoltà (il piano la prevedeva) [certo]; poche abilità [certo]. | Scelta Storia / Normale / Inchiostro secco; qualche abilità di combattimento in più. |
| 13 | Prestazioni | **5** | Triangoli bassi (60–75 mila) [certo]. Draw call 95–305 nelle stanze e 405 durante il film del labirinto, contro un obiettivo di 120 [certo]. Lo shader calcola 12 luci per ogni pixel + rumore + tratteggio, con MSAA 4x e bloom a risoluzione 2x: sull'iPad è il rischio più grande [ipotesi]. | Meno draw call (oggetti fermi uniti), luci per pixel ridotte, risoluzione partenza più prudente con adattamento automatico. |
| 14 | Accessibilità | **6** | Riduci movimento, alto contrasto, testo grande, meno danni, pausa completa, sottotitoli sempre [certo]. Molti segnali sono solo rosso/blu (difficili per daltonici) [certo]; niente intensità della scossa, niente velocità del testo [certo]. | Forme oltre ai colori, intensità scossa, velocità testo, mira assistita on/off. |
| 15 | Bug e stabilità | **4** | Partita intera senza errori in console [certo]. Ma il test `systems.mjs` fallisce già su main (3 controlli rossi + blocco) [certo]; testi che si sovrappongono [certo]; codice morto (`if (false)`) [certo]. | Test tutti verdi, nessuna sovrapposizione, codice morto rimosso. |
| 16 | Rifinitura generale | **4** | Oggi sembra un prototipo avanzato e ambizioso, non ancora un gioco finito [certo]. | La somma dei punti sopra. |

**VOTO TOTALE PRIMA: 5,1 / 10** (media semplice).

### Confronto con giochi simili (come sensazione)
- **Hades (combattimento).** Ogni colpo ha peso: catena di colpi diversi, nemico che lampeggia, piccola pausa, scossa *nella direzione* del colpo, suono stratificato. La schivata lascia una scia e si sente. *Da copiare come idea:* catena di 3 colpi con chiusura, lampo bianco sul nemico, camera che spinge nella direzione del colpo, scia della schivata, morte dei nemici "spettacolare" ma breve.
- **Scribblenauts / Baba Is You (parole).** In Baba la regola cambiata si *vede* subito e la soluzione nasce da te, non da un suggerimento. *Da copiare:* indizi a gradini invece di soluzioni scritte; una "scoperta" di combinazione deve essere un momento (suono, scritta grande, voce nel Diario).
- **Hollow Knight (esplorazione).** La mappa si disegna man mano e ti fa sentire padrone del luogo; ogni zona ha musica e suono propri. *Da copiare:* mappa a mano del labirinto che si riempie esplorando; musica diversa per zona e per il boss.

---

## FASE 2 · Piano (ordinato per impatto sul divertimento)

| # | Miglioria | Categoria | Cosa cambia | Difficoltà | Stato |
|---|---|---|---|---|---|
| 0 | Test stabili | Bug | `systems.mjs` reso affidabile (oggi fallisce già su main); test di base verdi prima di cambiare il gioco | facile | fatto |
| 1 | Colpi che pesano | Combattimento | Catena di 3 colpi (il terzo spinge via), lampo bianco + schiacciamento su ogni nemico colpito (anche le macchie), schizzi d'inchiostro nella direzione del colpo, camera che spinge nel verso del colpo, pausa sul colpo proporzionata, scia della schivata, macchie che esplodono in inchiostro | media | fatto |
| 2 | Primi 5 minuti puliti | Primi 5 minuti / UI | Prologo senza HUD (solo ✎ quando serve), camera vicina al personaggio durante la caduta, niente fotogramma nero, tutorial più corto e senza sovrapposizioni | media | fatto |
| 3 | Musica che cambia | Audio | Musica generata con melodia e livelli: esplorazione, combattimento, labirinto, boss; accordo quando scrivi una parola, fanfara breve per combinazioni e fasi del boss | media | fatto |
| 4 | Il Copista diventa un boss | Boss | Attacco proprio (riga d'inchiostro che spazza la radura, con segnale), pozze d'inchiostro, fase 2 sotto metà vita, ingresso messo in scena | media | fatto |
| 5 | Custode messo in scena | Boss | Passaggi di fase con rallentatore, camera che si avvicina, scritta grande, suono; segnali d'attacco più leggibili (forma + colore) | media | fatto |
| 6 | HUD senza sovrapposizioni | UI / Comandi | Un messaggio alla volta in alto, dialogo che non copre i pulsanti in verticale, barra del boss visibile, ritratti nei dialoghi | facile | fatto |
| 7 | Colore e leggibilità | Grafica | Carta più chiara, inchiostro più nero, meno nebbia marrone, nemici con contorno più netto, morte dei nemici che si scioglie in inchiostro | media | in parte (colore fatto; morte dei nemici in inchiostro da fare) |
| 8 | Mappa del labirinto | Level design | Pagina-mappa disegnata a mano che si riempie esplorando (nel Diario), segna lampade, pagine trovate e Copista | media | fatto |
| 9 | Prestazioni iPad | Prestazioni | Oggetti fermi uniti (meno draw call), luci per pixel da 12 a 8, partenza a risoluzione prudente con adattamento | difficile | in parte (luci 12→8, macchie unite, risoluzione adattiva su e giù, fps misurati bene; unione degli oggetti fermi da fare) |
| 10 | Indizi a gradini | Puzzle | Prima un indizio vago, dopo ~45 s uno più chiaro, solo dopo ~90 s la soluzione | facile | fatto (obiettivo: prima cosa fare, dopo 45 s anche come) |
| 11 | Scelta della difficoltà | Difficoltà | Storia / Normale / Inchiostro secco all'inizio e nelle opzioni | facile | fatto (nelle opzioni di pausa) |
| 12 | Accessibilità in più | Accessibilità | Intensità scossa, velocità del testo, mira assistita on/off, simboli oltre ai colori nei segnali | facile | fatto |
| 13 | Momento delle combinazioni | Parole | Prima scoperta di ogni combinazione: rallentatore breve, scritta grande, suono; elenco combinazioni nel Diario | facile | fatto |
| 14 | Nemico nuovo: lo Sputacchio | Combattimento | Nemico che tira gocce d'inchiostro da lontano (con segnale), si nasconde dietro i ripari: obbliga a muoversi | media | fatto |
| 15 | Ritratti e messa in scena | Storia | Ritratti a inchiostro per Il Libro, Ilde, Elara, Lumi, Custode; Elara che si gira nei momenti chiave | media | fatto (ritratti; Elara ti guarda; camera sui momenti chiave) |
| 16 | Pennino più ricco | Progressione | 2–3 abilità di combattimento (affondo dopo la schivata, colpo forte caricato, recupero inchiostro alla chiusura della catena) | media | fatto (Affondo d'ombra, Svolazzo, Boccetta di riserva) |
| 17 | Pulizia codice morto | Bug | Rimozione di `if (false)` e righe inutili | facile | fatto |

Regola di lavoro: dopo ogni voce → provo il pezzo cambiato, lancio `node tests/s1.mjs`, `s3.mjs`, `systems.mjs`, `play.mjs`, `perf.mjs`, aggiungo un test per la cosa nuova, commit su `claude/capolavoro`, aggiorno la colonna Stato qui sopra.

---

## FASE 3 · Diario dei lavori
(si aggiorna a ogni commit)

### Giro 1 — versione 2.0.0
- **Test.** `systems.mjs` falliva già su main: aspettava tempi fissi in un browser lento. Ora aspetta che le cose succedano (28/28). Nuovo comando `sh tests/all.sh` che lancia tutto in fila. Test nuovi: `combat.mjs`, `music.mjs`, `boss.mjs`, `map.mjs`, `enemies.mjs`.
- **Combattimento.** Catena di 3 colpi (destra, sinistra, affondo che spinge via). Ogni nemico colpito lampeggia e si schiaccia; schizzi d'inchiostro nella direzione del colpo; la camera dà una piccola spinta nel verso del colpo; pausa sul colpo proporzionata al peso; la schivata lascia sagome d'inchiostro; l'ultimo nemico di un incontro cade al rallentatore. "PARATO" non riempie più lo schermo di scritte.
- **Primi 5 minuti.** Durante la caduta non si vede l'HUD (solo ✎ quando serve scrivere PONTE); la camera è vicina e il viaggiatore *resta sulla pagina* che si inclina (prima finiva sotto e spariva); niente più fotogramma nero iniziale.
- **Musica.** Partitura generata in re minore con livelli: calma, esplorazione, labirinto (carillon), combattimento (basso e percussioni), boss (ottoni). Accordi brevi quando scrivi una parola, scopri una combinazione, trovi una pagina, cambi fase del boss, vinci. Passi sulla carta.
- **Boss.** Il Copista ora attacca davvero: riga d'inchiostro che spazza la radura (corsia a righe che avvisa prima), poi resta *stanco* e prende più danni; lancia macchie che lasciano pozze che rallentano; fase 2 sotto metà vita con tre righe a ventaglio. Il Custode e il Caricatore disegnano a terra la corsia della carica. Fasi annunciate con scritta grande, rallentatore, camera sul boss e accordo.
- **Interfaccia.** Colonna in alto senza sovrapposizioni (stanza → obiettivo → annuncio → tutorial/boss); il dialogo non copre più i pulsanti touch; ritratti a inchiostro nei dialoghi.
- **Colore.** Meno seppia, curva a S (carta più chiara, inchiostro più nero), pozza di luce più ampia.
- **Stanze.** La pressa diventa una tipografia (casse di caratteri, pile di carta, barili, fogli stesi lungo le pareti); la porta che giudica diventa un tribunale con banchi e una giuria di figure di carta che ti guarda.
- **Mappa del labirinto.** Tasto M / pulsante ⌗: pagina disegnata a mano che mostra solo ciò che hai esplorato, con lampade, note di Ilde, Copista e piastra.
- **Nemico nuovo.** Lo Sputacchio resta a distanza, mira (corsia) e sputa gocce: si schivano o si rimandano indietro con un colpo.
- **Pennino.** +3 abilità: Affondo d'ombra, Svolazzo, Boccetta di riserva.
- **Opzioni.** Difficoltà (Storia / Normale / Inchiostro secco), intensità scossa, velocità del testo, mira assistita on/off, indizi a gradini o completi.
- **Prestazioni.** Luci per pixel da 12 a 8; le macchie passano da ~23 a ~5 draw call; la risoluzione parte a 1,5x e sale da sola se il gioco è fluido; il contatore degli fps ora misura il tempo vero (prima, sotto i 10 fps, credeva di andare a 10). Nel browser dei test un fotogramma costa il 19% in meno di main.
- **Pulizia.** Rimosso codice morto; `CREDITS.md` con la licenza di three.js (MIT) e la dichiarazione che tutto il resto è generato.

## FASE 4 · Report (aggiornato al giro 2, versione 2.1)
Voti "dopo" = mia valutazione giocando nel browser dei test; quelli marcati [ipotesi] vanno confermati sull'iPad e con persone vere.

| # | Categoria | Prima | Dopo | Cosa è cambiato | Cosa manca per il 10 |
|---|---|---|---|---|---|
| 1 | Primi 5 minuti | 5 | 7,5 | prologo come un film, niente HUD, viaggiatore visibile, niente testi sovrapposti | tutorial ancora a 8 passi: ridurlo a 4-5 e insegnare più col mondo che con le schede |
| 2 | Parole | 7 | 8 | momento della combinazione, CONDUTTIVO contro il Ladro, parole usate contro di te | più enigmi che chiedono due/tre parole insieme; CONDUTTIVO a catena tra oggetti |
| 3 | Combattimento | 4 | 7,5 | catena di 3 colpi, lampo/schiacciamento, spinta camera, schivata con scia, contrattacco, Sputacchio, Risguardo con scudo, morte in inchiostro [ipotesi sulla sensazione al tocco] | animazioni del personaggio più ricche, 1-2 nemici in più, provare sull'iPad la durata delle pause sul colpo |
| 4 | Boss | 5 | 8 | Copista (riga, macchie, stanchezza), Ladro d'inchiostro (ruba l'inchiostro e le parole), Custode (corsia, onda, fasi in scena, sale dal pavimento) | un boss finale del capitolo con una fase "a scelta morale"; rifinire i tempi con playtest |
| 5 | Level design | 6 | 7,5 | labirinto 23×23 con fuga, mappa, vicoli ciechi con premi, stanze più piene, fondali illustrati | punti di riferimento unici nel labirinto (statue, alberi di carta), scorciatoie che si aprono |
| 6 | Puzzle | 6 | 6,5 | indizi a gradini | 2-3 enigmi nuovi con un vero "aha" (circuiti CONDUTTIVO, specchi, ordine delle parole) |
| 7 | Storia | 6 | 8 | Ilde madre di Elara, lettera della madre, LIBERA sotto COLPEVOLE, il giurato pentito, il Tipografo e il nome raschiato, ritratti | doppiaggio/voce, una scena finale del capitolo più forte, Lumi più presente |
| 8 | Grafica | 5 | 6,5 | colore più pulito, tavole illustrate sui pavimenti, tribunale e tipografia arredati, scene | il salto vero richiede un generatore (Meshy/SpriteCook) per personaggi e boss; animazioni |
| 9 | Audio | 3 | 6,5 | musica generata a livelli, accordi narrativi, passi, gocce [ipotesi: da ascoltare in cuffia] | temi musicali riconoscibili per Elara/Ilde/Custode; ambiente per stanza |
| 10 | Comandi | 6 | 7 | nessuna sovrapposizione, mira assistita regolabile (e ora conosce i boss), mappa con M | provare sull'iPad la zona del pollice e i pulsanti nuovi (◈, ⌗) |
| 11 | Interfaccia | 5 | 7 | colonna in alto ordinata, borsa, mappa, scritte dei boss, ritratti | menu di pausa più bello, salvataggi in 3 slot |
| 12 | Difficoltà e progressione | 5 | 7,5 | 3 difficoltà, 7 abilità del Pennino, 4 oggetti dalle commissioni | più scelte che cambiano lo stile (oggetti alternativi tra cui scegliere) |
| 13 | Prestazioni | 5 | 6 [ipotesi] | luci 12→8, macchie 23→5 draw call, risoluzione adattiva su/giù, fps misurati bene; −19% di tempo per fotogramma nei test | misurare sull'iPad; unire gli oggetti fermi |
| 14 | Accessibilità | 6 | 7,5 | scossa, velocità testo, mira, indizi, corsie a righe (non solo colore) | rimappatura dei tasti, sottotitoli più grandi nei film |
| 15 | Bug e stabilità | 4 | 7 | test affidabili (15 file di test), 6 difetti veri trovati e corretti | una partita intera fatta da una persona |
| 16 | Rifinitura | 4 | 6,5 | sembra un gioco con un'identità, non più un prototipo grezzo | arte vera, playtest, ritmo finale |
| | **Totale** | **5,1** | **≈7,2** | | |

**Da provare a mano sull'iPad**: fluidità nel labirinto e durante la fuga (tanti muri che crollano), musica e accordi in cuffia, la catena di 3 colpi col pulsante colpo (ritmo dei tocchi), la schivata perfetta per il contrattacco, il filo del Ladro (si capisce che bisogna schivare?), la mappa ⌗ e la borsa ◈, l'orientamento verticale con il dialogo sopra i pulsanti.

---

## GIRO 2 · La visione di Joseph (24 ottobre 2026)
Decisioni (risposte di Joseph):
- **Grafica**: entrambe le strade. Subito uno stile più forte fatto col codice (pagine illustrate, fondali dipinti a inchiostro, scene come tavole di un libro). Quando Joseph installerà un generatore (Meshy per il 3D, SpriteCook per immagini/texture; si installano da claude.ai e servono chiavi), sostituisco Elara, boss e fondali più importanti. Ogni immagine generata va dichiarata in `CREDITS.md`.
- **Priorità**: Capitolo 1 a **40+ minuti veri**, senza stanze vuote. Il Capitolo 2 solo dopo.
- **Novità per prime**: boss **Ladro d'inchiostro**, **quest secondarie con oggetti**, **scene spettacolari**.
- **Tono della storia**: toccante e malinconico (madre e figlia, colpa e perdono).

### La storia del Capitolo 1 (bibbia breve)
- **Ilde** è la madre di **Elara**. La notte del fiume Elara, bambina, cadde in acqua; Ilde la salvò, ma per farlo riscrisse il fiume e aprì la Fenditura.
- Per non perdere la figlia (chi apre una Fenditura viene cancellata), Ilde scrisse **COLPEVOLE** sulla pagina di Elara: un verdetto falso, perché nessuno cercasse lei. Elara crebbe dentro un verdetto, senza ricordare.
- **Ilde** è la voce che ti guida nel labirinto. Il colpo di scena di fine capitolo: alla porta Elara riconosce la voce della guida. «Quella voce… è mia madre.» E sotto il suo verdetto, grattando l'inchiostro, c'è la parola che Ilde avrebbe voluto scrivere: **LIBERA**.
- **Lumi** nasce dai tuoi errori; è la memoria dei tentativi. **Il Custode** è la promessa di Ilde di non cambiare mai più la storia.

### Lavori del giro 2 (in ordine)
| # | Cosa | Stato |
|---|---|---|
| G1 | Borsa e oggetti (inventario con descrizioni, oggetti passivi che cambiano come combatti) | fatto |
| G2 | Quest «Il Tipografo e le lettere»: un personaggio di carta nella pressa ha perso 4 caratteri nel labirinto; ritrovarli compone un nome (ILDE). Premio: Pennino a punta larga | fatto |
| G3 | Labirinto più grande e più denso (più celle, più stretto, più angoli con cose da trovare) | fatto (23×23, corridoi 3,7 m) |
| G4 | Boss **Ladro d'inchiostro** nell'archivio: ti succhia l'Inchiostro Vivo con un filo, lo usa per scriverti addosso le tue parole; per riaverlo colpisci la sacca piena quando è gonfia. Quest «La giuria senza volto» | fatto (+ quest «La giuria senza volto» e «La lettera di Ilde») |
| G5 | Scene: il labirinto che crolla mentre scappi; l'arena che si compone dalle pagine; la rivelazione di Elara e Ilde; pagine illustrate dei ricordi (lettera di Ilde) | fatto (fuga dal labirinto, LIBERA, il Custode che sale, pagina della lettera) |
| G6 | Fondali dipinti a inchiostro per ogni stanza (niente pavimenti vuoti) | fatto (una tavola illustrata per stanza) |
| G7 | Durata: stima per stanza e verifica che il percorso principale superi i 40 minuti | stima fatta (sotto); da verificare con una persona vera |


### Diario del giro 2 — versione 2.1
- **Borsa (◈)** con oggetti e commissioni. Quattro oggetti che cambiano come giochi: Pennino a punta larga (colpi più ampi, l'affondo gira tutto intorno), Inchiostro di seppia (ricarica lenta sotto metà), Segnalibro di Ilde (ti rialzi una volta per stanza), Sacca del Ladro (i colpi rubano inchiostro).
- **Tre commissioni**: *Il Tipografo e le lettere* (4 caratteri nei vicoli ciechi del labirinto → compone ILDE); *La giuria senza volto* (il Ladro ha bevuto la faccia di un giurato: riportargliela; il giurato confessa di aver votato COLPEVOLE senza guardare Elara); *La lettera di Ilde* (3 pezzi: labirinto, cripta, sacca del Ladro → la lettera della madre, letta su una pagina illustrata con le lacrime sulla carta).
- **Labirinto** da 17×17 a 23×23, corridoi più stretti (3,7 m), più lampade, fiale, Sputacchi e macchie.
- **Boss Ladro d'inchiostro** nell'archivio: filo che beve l'Inchiostro Vivo, ti scrive addosso la parola che usi di più e ti ruba l'ultima, sacca gonfia da colpire, CONDUTTIVO risale il filo, FRAGILE fa scoppiare la sacca, fase 2.
- **Scene**: fuga dal labirinto (l'inchiostro sale da nord, i muri crollano, la scala è all'ingresso: bisogna tornare indietro); alla porta Elara riconosce la voce di Ilde e sotto COLPEVOLE appare LIBERA; il Custode sale dal pavimento tra le pagine.
- **Fondali dipinti**: ogni stanza ha una tavola a inchiostro sul pavimento (libro aperto, bestiario del Caricatore, disegno tecnico della pressa, bilancia della giustizia, rosa dei venti, onde dell'archivio, il fiume e LIBERA alla fine).
- **Difetti trovati e corretti**: la mira assistita ignorava il Ladro; la camera dei momenti lunghi volava via (formula sbagliata per durate >1,4 s); la goccia rimandata attraversava il bersaglio quando il gioco rallenta.

### Durata stimata del Capitolo 1 (prima partita, difficoltà Normale) [ipotesi: da misurare con una persona]
| Parte | Minuti |
|---|---|
| Prologo (caduta, PONTE, titolo) | 2 |
| I · La tavola (tutorial, 2 pagine nascoste) | 4–5 |
| II · Il Caricatore (+ sostegno, Sputacchio, pagina maledetta) | 4–6 |
| III · La pressa + Tipografo | 2–3 |
| Labirinto 23×23 (note di Ilde, 4 caratteri, 4 pagine, Copista, fuga) | 15–22 |
| IV · Tribunale (verdetto o difesa o prova, giurato, scena di Elara) | 5–7 |
| V · Custode (3 fasi, onda) | 6–10 |
| VI · Conseguenza e pagina finale | 2–3 |
| **Percorso principale** | **≈ 40–58** |
| Facoltativo: archivio + Ladro (8–12), cripta (4–6) | +12–18 |
