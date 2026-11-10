# PALIMPSEST — istruzioni per Claude

Prima di tutto leggi **`CHECKLIST.md`**: dice cosa è fatto, cosa resta e le regole fisse. Poi `PIANO-10.md` (valutazione, diario, voti).

Leggi `docs/concept-art/LEGGIMI.md` e usa le tavole in `docs/concept-art` come riferimento visivo per grafica, personaggi e colori.

In breve:
- Ramo di lavoro: `claude/capolavoro`. Mai toccare `main`, mai fare merge.
- Rispondi a Joseph in italiano semplice; non è un programmatore.
- Gioco web (three.js, `src/`), deve girare fluido su iPad con Safari.
- Dopo ogni modifica: test verdi (`sh tests/all.sh`), commit chiaro, aggiorna `CHECKLIST.md`.
