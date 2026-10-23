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
| 0 | Test stabili | Bug | `systems.mjs` reso affidabile (oggi fallisce già su main); test di base verdi prima di cambiare il gioco | facile | da fare |
| 1 | Colpi che pesano | Combattimento | Catena di 3 colpi (il terzo spinge via), lampo bianco + schiacciamento su ogni nemico colpito (anche le macchie), schizzi d'inchiostro nella direzione del colpo, camera che spinge nel verso del colpo, pausa sul colpo proporzionata, scia della schivata, macchie che esplodono in inchiostro | media | da fare |
| 2 | Primi 5 minuti puliti | Primi 5 minuti / UI | Prologo senza HUD (solo ✎ quando serve), camera vicina al personaggio durante la caduta, niente fotogramma nero, tutorial più corto e senza sovrapposizioni | media | da fare |
| 3 | Musica che cambia | Audio | Musica generata con melodia e livelli: esplorazione, combattimento, labirinto, boss; accordo quando scrivi una parola, fanfara breve per combinazioni e fasi del boss | media | da fare |
| 4 | Il Copista diventa un boss | Boss | Attacco proprio (riga d'inchiostro che spazza la radura, con segnale), pozze d'inchiostro, fase 2 sotto metà vita, ingresso messo in scena | media | da fare |
| 5 | Custode messo in scena | Boss | Passaggi di fase con rallentatore, camera che si avvicina, scritta grande, suono; segnali d'attacco più leggibili (forma + colore) | media | da fare |
| 6 | HUD senza sovrapposizioni | UI / Comandi | Un messaggio alla volta in alto, dialogo che non copre i pulsanti in verticale, barra del boss visibile, ritratti nei dialoghi | facile | da fare |
| 7 | Colore e leggibilità | Grafica | Carta più chiara, inchiostro più nero, meno nebbia marrone, nemici con contorno più netto, morte dei nemici che si scioglie in inchiostro | media | da fare |
| 8 | Mappa del labirinto | Level design | Pagina-mappa disegnata a mano che si riempie esplorando (nel Diario), segna lampade, pagine trovate e Copista | media | da fare |
| 9 | Prestazioni iPad | Prestazioni | Oggetti fermi uniti (meno draw call), luci per pixel da 12 a 8, partenza a risoluzione prudente con adattamento | difficile | da fare |
| 10 | Indizi a gradini | Puzzle | Prima un indizio vago, dopo ~45 s uno più chiaro, solo dopo ~90 s la soluzione | facile | da fare |
| 11 | Scelta della difficoltà | Difficoltà | Storia / Normale / Inchiostro secco all'inizio e nelle opzioni | facile | da fare |
| 12 | Accessibilità in più | Accessibilità | Intensità scossa, velocità del testo, mira assistita on/off, simboli oltre ai colori nei segnali | facile | da fare |
| 13 | Momento delle combinazioni | Parole | Prima scoperta di ogni combinazione: rallentatore breve, scritta grande, suono; elenco combinazioni nel Diario | facile | da fare |
| 14 | Nemico nuovo: lo Sputacchio | Combattimento | Nemico che tira gocce d'inchiostro da lontano (con segnale), si nasconde dietro i ripari: obbliga a muoversi | media | da fare |
| 15 | Ritratti e messa in scena | Storia | Ritratti a inchiostro per Il Libro, Ilde, Elara, Lumi, Custode; Elara che si gira nei momenti chiave | media | da fare |
| 16 | Pennino più ricco | Progressione | 2–3 abilità di combattimento (affondo dopo la schivata, colpo forte caricato, recupero inchiostro alla chiusura della catena) | media | da fare |
| 17 | Pulizia codice morto | Bug | Rimozione di `if (false)` e righe inutili | facile | da fare |

Regola di lavoro: dopo ogni voce → provo il pezzo cambiato, lancio `node tests/s1.mjs`, `s3.mjs`, `systems.mjs`, `play.mjs`, `perf.mjs`, aggiungo un test per la cosa nuova, commit su `claude/capolavoro`, aggiorno la colonna Stato qui sopra.

---

## FASE 3 · Diario dei lavori
(si aggiorna a ogni commit)

## FASE 4 · Report finale
(da compilare alla fine)
