# PALIMPSEST — Prompt per le immagini

Come usare questo file:
1. **Prima i fogli dei personaggi (sezione A).** Servono a fissare l'aspetto di ognuno. Quando ne ottieni uno che ti piace, usalo come *immagine di riferimento* in tutte le immagini successive con quel personaggio (quasi tutti i generatori hanno un'opzione "image reference" o "character reference").
2. Ogni prompt = **STILE BASE** + il testo della singola immagine. Copiali in quest'ordine.
3. Se il generatore ha un campo "negative prompt", incolla lì il **DA EVITARE**.
4. Salva con il **nome file** indicato e caricalo su GitHub, ramo `claude/capolavoro`, nella cartella indicata.
5. I generatori sbagliano le scritte: ogni prompt chiede *nessun testo*. Le parole (COLPEVOLE, LIBERA…) le aggiungo io nel gioco.

---

## STILE BASE (va all'inizio di ogni prompt)
```
Hand-drawn ink illustration on aged cream paper, confident black ink linework with fine cross-hatching, limited palette of ink black, warm cream paper and deep crimson red (#8a2416) with rare touches of muted ink blue, visible paper grain, soft ink bleeds and small splatters, melancholic storybook atmosphere like an illustrated antique book, painterly but clean, no text, no letters, no watermark.
```

## DA EVITARE (negative prompt)
```
photorealistic, 3D render, CGI, glossy plastic, anime, manga, chibi, neon colors, saturated colors, gradient background, text, letters, words, captions, watermark, signature, logo, frame border, blurry, extra fingers, deformed hands, modern clothing
```

---

## A · Fogli dei personaggi (formato 3:2, sfondo carta chiara uniforme)
Cartella: `arte/personaggi/`

**A1 · Il viaggiatore** — `viaggiatore.png`
```
Character design sheet of a mysterious traveler, front view, side view and back view on the same page. A hooded figure in a long ink-black cloak whose hem frays into dripping ink, the face hidden in shadow except two small warm golden points of light for eyes, a deep red scarf with one long tail, a leather belt with small pouches and a tiny ink bottle, holding an oversized antique fountain pen as a weapon, black barrel with gold bands and a glowing red nib. Neutral pose, full body, plain cream paper background.
```

**A2 · Elara (17 anni)** — `elara.png`
```
Character design sheet of Elara, a 17-year-old young woman, front view, side view and three facial expressions (sad, surprised, a small hopeful smile). Straight black bob haircut with a blunt fringe, pale round face, soft rosy cheeks, dark calm eyes, simple long cream dress with a red ribbon at the collar, ink stains on her fingertips, a folded paper page pinned to her chest. Full body, plain cream paper background.
```

**A3 · Elara bambina (6 anni)** — `elara-bambina.png`
```
Character design sheet of Elara as a 6-year-old girl, same black bob haircut with blunt fringe as her older self, round face, rosy cheeks, oversized cream nightdress, barefoot, wet hair, front and side view, plus one expression crying and one smiling. Plain cream paper background.
```

**A4 · Ilde (la madre)** — `ilde.png`
```
Character design sheet of Ilde, a woman about 50 years old, front view, side view and three expressions (tired kindness, guilt, quiet tears). Grey hair gathered in a loose bun with a pencil stuck in it, small round wire glasses, tired gentle eyes, long dark shawl over a grey dress, hands stained with black ink, holding an old quill pen. Full body, plain cream paper background.
```

**A5 · Lumi** — `lumi.png`
```
Character design sheet of Lumi, a small floating creature made of a single drop of black ink, round body with tiny drips falling from the bottom, two large pale glowing eyes, no mouth, childlike and shy, several poses: floating, hiding, pointing with a thin ink tendril, growing bigger. Plain cream paper background.
```

**A6 · Il Custode della Fenditura** — `custode.png`
```
Character design sheet of a towering guardian made of stacked antique book covers and iron clasps like armor plates, a crown of sharp fountain-pen nibs, a single horizontal glowing red eye slit, broad paper shoulders, heavy hands like closed books, a thick ink chain tied from his back to a dark stone core on the ground. Front view and side view, imposing and sad, plain cream paper background.
```

**A7 · Il Tipografo** — `tipografo.png`
```
Character design sheet of an old typesetter, thin elderly man with round glasses, flat cap, rolled sleeves, a dark leather apron with lead type letters in the pocket, holding a small composing stick, ink on his fingers, kind fussy expression. Front and side view, plain cream paper background.
```

**A8 · Il Giurato senza volto** — `giurato.png`
```
Character design sheet of a faceless juror made of cut paper, wearing a long dark juror's robe with a red sash, where the face should be there is only a blank oval outlined with a dashed ink line, hands folded in shame. Second version on the same sheet: the same juror with a simple drawn face, eyes wet with a single blue tear. Plain cream paper background.
```

**A9 · Il Ladro d'inchiostro (boss)** — `ladro.png`
```
Creature design sheet of the Ink Thief, a bloated round sack creature filled with dark blue-black ink, glossy taut skin with stitches, four thin spindly legs made of rolled paper, a white paper mask with sad hollow eyes over its face, a long thin quill-like proboscis, a thin black thread trailing from the proboscis. Front view, side view, and a second state where the sack is swollen and glowing blue. Plain cream paper background.
```

**A10 · Il Copista (mini boss)** — `copista.png`
```
Creature design sheet of the Copyist, a large round spiky creature made of scribbled black ink, two glowing red eyes, two horn-like quills on its head, carrying a heavy open ledger, little ink mites hatching from its pages. Front and side view, plain cream paper background.
```

**A11 · Il Caricatore** — `caricatore.png`
```
Creature design sheet of the Charger, a large armored beetle whose shell is made of overlapping paper plates with red ink margins, small red eyes, short powerful legs, a dark red glowing core visible between the plates, shown idle and charging. Top view and side view, plain cream paper background.
```

**A12 · Le macchie (nemici piccoli)** — `macchie.png`
```
Creature design sheet of small enemies made of ink: a spiky ink mite with red eyes and tiny legs, a bigger brute version, a spitter version with a pale beak that spits ink drops, and a shield version carrying a small book cover as a shield. All on one page, top view and side view, plain cream paper background.
```

---

## B · Ritratti per i dialoghi (quadrati 1:1, busto, sfondo carta chiara uniforme)
Cartella: `arte/ritratti/` — usa come riferimento il foglio del personaggio della sezione A.

| File | Prompt (dopo lo STILE BASE) |
|---|---|
| `elara.png` | `Bust portrait of Elara (black bob haircut, blunt fringe, pale round face, cream dress with red ribbon), looking slightly to the side with quiet sadness, plain cream paper background.` |
| `elara-sorriso.png` | `Bust portrait of Elara, the same girl, a small relieved smile with wet eyes, plain cream paper background.` |
| `ilde.png` | `Bust portrait of Ilde (grey bun with a pencil, round wire glasses, dark shawl), tired and kind, looking at the viewer, plain cream paper background.` |
| `ilde-lacrime.png` | `Bust portrait of Ilde with tears behind her glasses, hand over her mouth, plain cream paper background.` |
| `lumi.png` | `Close portrait of Lumi, a floating ink drop with two big pale eyes, slightly tilted, curious, plain cream paper background.` |
| `custode.png` | `Bust portrait of the Guardian made of book covers, crown of pen nibs, single red eye slit glowing, menacing, plain cream paper background.` |
| `tipografo.png` | `Bust portrait of the old typesetter with round glasses and flat cap, raising a lead type letter to the light, plain cream paper background.` |
| `giurato.png` | `Bust portrait of the faceless paper juror, blank dashed oval face, dark robe, plain cream paper background.` |
| `ladro.png` | `Bust portrait of the Ink Thief, white paper mask with sad hollow eyes over a swollen ink sack, long quill proboscis, plain cream paper background.` |
| `viaggiatore.png` | `Bust portrait of the hooded traveler, face in shadow with two golden points of light, red scarf, fountain pen over the shoulder, plain cream paper background.` |
| `libro.png` | `An open antique book seen from the front, pages slightly lifting as if breathing, a single drop of ink falling onto the page, plain cream paper background.` |

---

## C · Tavole delle scene (16:9, almeno 1920 px di larghezza)
Cartella: `arte/scene/` — sono le scene della storia del Capitolo 1, in ordine.

**C01 · Copertina** — `copertina.png`
```
Book cover illustration: a giant antique book lying open in the dark, from its pages rises a small hooded traveler with a red scarf holding a glowing red fountain pen, ink rivers flowing from the book like waterfalls, a tiny girl silhouette standing on a page far away, dramatic composition, empty space at the top for a title.
```

**C02 · La caduta** — `prologo-caduta.png`
```
A tiny hooded traveler with a red scarf falling through the air toward an enormous open page that fills the whole frame, handwritten lines on the page curve like landscape, torn paper fragments falling around him, dizzying view from above.
```

**C03 · Il ponte di righe** — `prologo-ponte.png`
```
A deep black chasm torn across a giant page, jagged paper edges like teeth, a bridge made of lines of handwriting forming plank by plank across the void, the small hooded traveler raising his glowing red pen as the bridge writes itself.
```

**C04 · La notte del fiume** — `fiume.png`
```
Night, a black river made of flowing ink under a pale moon, a woman with grey bun and round glasses waist-deep in the river pulling a small girl with a black bob haircut out of the water, the girl's nightdress soaked, the woman's hand leaving trails of ink on the surface, desperate and tender.
```

**C05 · Ilde riscrive il fiume** — `fenditura.png`
```
The same woman kneeling on the riverbank holding the small girl wrapped in her shawl, with her other hand she writes in the air with a quill, the black river splits open in a huge glowing red crack, pages tearing apart around them, awe and fear.
```

**C06 · Il verdetto scritto di notte** — `verdetto.png`
```
Night interior, a small desk lit by a single candle, the grey-haired woman with round glasses writing a large word on a page with a trembling quill, tears falling on the paper, a little girl with black bob hair asleep in the background, heavy shadows.
```

**C07 · Il tribunale di carta** — `tribunale.png`
```
A courtroom made of paper: rows of benches with cut-out paper jurors with blank faces, a tall judge's bench made of stacked books, in the middle a small soaked girl with a black bob haircut standing alone, a giant red seal hanging above her, oppressive and sad.
```

**C08 · Elara dentro il verdetto** — `elara-pagina.png`
```
A young woman with a black bob haircut drawn as a portrait on a hanging page, the page held to the wall by red threads like a prison, a large blank red banner across the bottom of the page, her eyes looking out at the viewer, loneliness.
```

**C09 · Il labirinto delle pagine** — `labirinto.png`
```
Bird's-eye view of a vast labyrinth whose walls are made of standing book pages, sheets of paper still flying in from the sky and folding into walls, small lamps glowing inside the corridors, a tiny hooded traveler at the entrance, epic scale.
```

**C10 · La fuga** — `fuga.png`
```
A wave of black ink rising and pouring through a labyrinth of paper walls, the walls crumbling into flying pages behind, the small hooded traveler with a red scarf running toward a staircase made of lines of text, dynamic diagonal composition, urgency.
```

**C11 · Il Ladro nell'archivio** — `archivio.png`
```
A flooded underground archive, shelves of rotting books half under black ink water, a bloated ink-sack creature with a white paper mask drinking from the water through a long quill proboscis, a single bell hanging from the ceiling, eerie silence.
```

**C12 · LIBERA** — `libera.png`
```
Close view of a hanging portrait page of a young woman with a black bob haircut, the red paint of a large word across the bottom flaking away like old varnish, red flakes floating in the air, underneath a hidden word in blue ink starts to appear as a blank glowing blue banner, the young woman smiling with wet eyes.
```

**C13 · Il Custode sorge** — `custode-sorge.png`
```
A circular stone arena drawn like a compass rose with cracks, the towering guardian made of book covers rising from the floor among swirling pages, his single red eye slit lighting up, a thick ink chain binding him to a dark stone core, the small hooded traveler facing him, epic low angle.
```

**C14 · La lettera** — `lettera.png`
```
An old handwritten letter on yellowed paper seen from above, lines of illegible handwriting, three round tear stains in muted blue, a dried lavender sprig and a small ink-stained quill resting on it, intimate and heartbreaking.
```

**C15 · Finale del capitolo** — `finale.png`
```
A quiet riverbank at dawn drawn in ink, the young woman with a black bob haircut and the hooded traveler sitting far apart looking at the calm water, a tiny floating ink drop with two pale eyes between them, broken paper chains on the ground, hope after sorrow.
```

**C16 · La pagina vuota (per il capitolo 2)** — `capitolo2.png`
```
A river made of soaked paper pages flowing between cliffs of stacked books, a paper raft half sunk, a tall figure made of threads and glue standing on the far shore, mysterious, invitation to the next chapter.
```

---

## D · Fondali per i pavimenti (quadrati 1:1, almeno 2048 px, VISTI DALL'ALTO, piatti)
Cartella: `arte/fondali/` — devono sembrare una pagina illustrata vista da sopra, **senza prospettiva e senza ombre di oggetti**, con il centro abbastanza tranquillo (lì passa il giocatore).

Aggiungi sempre: `flat top-down view, seen exactly from above, no perspective, no cast shadows, calm center area, decorative details concentrated near the edges`.

| File | Prompt (dopo lo STILE BASE) |
|---|---|
| `prologo.png` | `A giant page of an old book seen from above, faint handwritten lines across it, a long ragged tear running across the middle like a chasm, small ink splatters.` |
| `tavola.png` | `A wooden reading table seen from above covered by an open manuscript, a large decorated initial letter in red in one corner, an inkwell stain, scattered quills and paper scraps along the edges.` |
| `caricatore.png` | `A bestiary page seen from above: a large anatomical sketch of an armored paper beetle drawn in the center with annotations arrows and measurement marks, margins full of small doodles.` |
| `pressa.png` | `A printer's workshop floor seen from above: technical drawings of gears and a printing press drawn on the paper, rulers and scale marks along the border, scattered lead type letters near the edges.` |
| `labirinto.png` | `A seamless tileable texture of worn paper floor with faint maze-like pencil lines and small ink drops, very subtle, repeating pattern.` |
| `archivio.png` | `A flooded archive floor seen from above: wavy lines of ink water across the paper, a small paper boat sinking, rotten book pages floating near the edges.` |
| `cripta.png` | `A crypt floor seen from above with three large symbols drawn in ink in a row: an eye, a padlock, an open hand, cracked stone texture drawn with hatching.` |
| `tribunale.png` | `A courtroom floor seen from above with a huge drawing of the scales of justice, a small girl silhouette sketched on one side, scattered juror papers near the edges.` |
| `arena.png` | `A circular arena floor seen from above drawn as an ancient compass rose, with long cracks spreading from a dark center, ink stains along the cracks.` |
| `fine.png` | `A riverbank page seen from above: gentle ink waves across the middle, two small human silhouettes on opposite sides, a broken chain drawn in red near the water.` |

---

## E · Texture ripetibili (quadrate 1:1, 1024 px, SEAMLESS / tileable)
Cartella: `arte/texture/` — aggiungi sempre: `seamless tileable texture, uniform lighting, no objects, no shadows`.

| File | Prompt (dopo lo STILE BASE) |
|---|---|
| `carta.png` | `Aged cream paper with subtle fibers and light stains.` |
| `muro-pagine.png` | `Wall made of stacked old book pages with fine handwriting lines, side view.` |
| `legno.png` | `Dark old wood planks drawn in ink with cross-hatching.` |
| `pietra.png` | `Old stone blocks drawn in ink with cross-hatching and small cracks.` |
| `acqua-inchiostro.png` | `Dark ink water surface with soft ripples, blue-black.` |

---

## F · Icone degli oggetti (quadrate 1:1, 512 px, oggetto al centro su carta chiara)
Cartella: `arte/icone/`

| File | Prompt (dopo lo STILE BASE) |
|---|---|
| `pennino-largo.png` | `A single wide antique fountain pen nib, gold and black, centered, plain cream paper background.` |
| `seppia.png` | `A small glass jar of dark blue sepia ink with a cork stopper, centered, plain cream paper background.` |
| `segnalibro.png` | `A red silk bookmark with a frayed end and a small embroidered letter-like flourish, centered, plain cream paper background.` |
| `sacca.png` | `A small leather pouch full of black ink, tied with a thread, a drop leaking from the seam, centered, plain cream paper background.` |
| `fiala.png` | `A small glass vial of glowing blue ink, centered, plain cream paper background.` |
| `pagina-nascosta.png` | `A single folded old page with a red wax seal, centered, plain cream paper background.` |

---

## Ordine consigliato
1. A1, A2, A4, A5 (i personaggi principali): scegli quelli giusti e tienili come riferimento.
2. B (ritratti): li uso subito nei dialoghi.
3. C04, C06, C12, C14 (le scene della storia di Ilde ed Elara): sono il cuore emotivo.
4. D (fondali): tolgono l'effetto stanze vuote.
5. Il resto.

Quando ne carichi un gruppo, scrivimi quale strumento hai usato e con quale piano, così lo dichiaro in `CREDITS.md`.
