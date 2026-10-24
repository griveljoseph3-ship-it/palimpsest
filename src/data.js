// S1 · Dati autorizzati (GDD §03, §05-07). ID non localizzati, testo in italiano.
export const SLOTS = {
  state: { baseline: 'state.intact', values: ['state.intact', 'state.fragile'] },
  temperament: { baseline: 'temperament.vigilant', values: ['temperament.vigilant', 'temperament.cautious'] },
  element: { baseline: 'element.insulating', values: ['element.insulating', 'element.conductive'] },
  weight: { baseline: 'weight.normal', values: ['weight.normal', 'weight.heavy', 'weight.light'] },
};
export const EFFECTS = {
  'state.fragile': {
    slot: 'state', word: 'FRAGILE', sound: 'glass',
    preview: 'Un impatto forte rompe la protezione; allontanati dai frammenti',
    contract: { cambia: 'un componente dichiarato diventa rompibile', azione: 'rompere con un impatto forte', costo: 'frammenti con raggio 1,5 m', verifica: 'contorno tratteggiato e crepe visibili' },
  },
  'temperament.cautious': {
    slot: 'temperament', word: 'CAUTO', sound: 'breath',
    preview: 'Arretra alla prossima decisione; non ferma un colpo già partito',
    contract: { cambia: 'il nemico cerca posizioni a 3–4 m', azione: 'aprire un varco', costo: 'meno occasioni di contrattacco', verifica: 'arretramento visibile' },
  },
  'element.conductive': {
    slot: 'element', word: 'CONDUTTIVO', sound: 'electric',
    preview: 'Trasporta un impulso esistente; illumina il prossimo tratto e i rami noti',
    contract: { cambia: 'il componente trasporta un impulso esistente', azione: 'alimentare un dispositivo o spingere', costo: 'il ramo secondario alimenta un pericolo', verifica: 'linea di propagazione' },
  },
};
EFFECTS['weight.heavy'] = { slot: 'weight', word: 'PESANTE', sound: 'heavy', preview: 'Diventa pesante: cade, preme piastre, sfonda; un nemico rallenta' };
EFFECTS['weight.light'] = { slot: 'weight', word: 'LEGGERO', sound: 'breath', preview: 'Diventa leggero: galleggia, si solleva, il vento lo sposta' };
// Combinazioni valide fra slot diversi sulla stessa entità (non sempre superiori).
export const COMBOS = [
  { id: 'combo.retreat_vulnerable', a: 'state.fragile', b: 'temperament.cautious',
    text: 'Arretra e la corazza diventa vulnerabile, ma ti caricherà meno: dovrai avvicinarti per il colpo impegnato' },
  { id: 'combo.shatter_pulse', a: 'state.fragile', b: 'element.conductive',
    text: "Il prossimo impulso attraversa la corazza e la incrina dall'interno, ma la scossa colpisce anche chi è vicino" },
];
COMBOS.push({ id: 'combo.collapse', a: 'state.fragile', b: 'weight.heavy', text: 'Crolla sotto il proprio peso: non serve colpirlo, ma i pezzi cadono intorno' });
export const ENEMY_DURATION = 8; // secondi di simulazione (§05, §06)
// Durata per effetto per entità: numero = secondi simulati, null = finché non si esce/ricompone.
export const ENTITY_DEFS = {
  board:      { name: 'Tavola di prova', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true },
  charger:    { name: 'Caricatore', supports: ['state.fragile', 'temperament.cautious'], durations: { 'state.fragile': 8, 'temperament.cautious': 8 } },
  plate:      { name: 'Piastra di rame', supports: ['element.conductive'], durations: { 'element.conductive': null }, safe: true },
  relay:      { name: 'Supporto del relè', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true },
  evplate:    { name: 'Piastra del lettore', supports: ['element.conductive'], durations: { 'element.conductive': null }, safe: true },
  seam:       { name: 'Cucitura di carta', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true },
  custode:    { name: 'Custode della Fenditura', supports: ['state.fragile', 'temperament.cautious', 'element.conductive'], durations: { 'state.fragile': 8, 'temperament.cautious': 8, 'element.conductive': 8 } },
  well:       { name: 'Calamaio di Ilde', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true },
  apipe:      { name: 'Tubo dell\'archivio', supports: ['element.conductive'], durations: { 'element.conductive': null }, safe: true },
  shelf:      { name: 'Scaffale marcio', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true },
  crate:      { name: 'Cassa bagnata', supports: ['weight.heavy', 'weight.light'], durations: { 'weight.heavy': null, 'weight.light': null }, safe: true },
  raft:       { name: 'Zattera di carta', supports: ['weight.light', 'weight.heavy'], durations: { 'weight.light': null, 'weight.heavy': null }, safe: true },
  lockw:      { name: 'Contrappeso della chiusa', supports: ['weight.heavy'], durations: { 'weight.heavy': null }, safe: true },
  rileg:      { name: 'Il Rilegatore', supports: ['state.fragile', 'temperament.cautious', 'weight.heavy'], durations: { 'state.fragile': 8, 'temperament.cautious': 8, 'weight.heavy': 8 } },
  pile:       { name: 'Pila di libri', supports: ['state.fragile', 'weight.heavy'], durations: { 'state.fragile': null, 'weight.heavy': null }, safe: true },
  stone:      { name: 'Sasso sulla pagina', supports: ['weight.light'], durations: { 'weight.light': null }, safe: true },
  dweight:    { name: 'Peso della diga', supports: ['weight.heavy'], durations: { 'weight.heavy': null } },
  dam:        { name: 'Cuore della Diga', supports: ['state.fragile', 'element.conductive'], durations: { 'state.fragile': 8, 'element.conductive': 8 } },
  ladro:      { name: 'Il Ladro d\'inchiostro', supports: ['state.fragile', 'temperament.cautious', 'element.conductive'], durations: { 'state.fragile': 8, 'temperament.cautious': 8, 'element.conductive': 8 } },
  bridge:     { name: 'Ponte conduttivo', supports: ['element.conductive'], durations: { 'element.conductive': 12 } },
};
// v1.5 · Capitolo 1 ridisegnato: parole sull'ambiente
SLOTS.shape = { baseline: 'shape.plain', values: ['shape.plain', 'shape.bridge'] };
SLOTS.light = { baseline: 'light.lit', values: ['light.lit', 'light.dark'] };
EFFECTS['shape.bridge'] = { slot: 'shape', word: 'PONTE', sound: 'heavy', preview: 'Il vuoto diventa un ponte di righe: si può attraversare' };
EFFECTS['light.dark'] = { slot: 'light', word: 'BUIO', sound: 'breath', preview: 'La lampada si spegne: le macchie vicine non ti vedono più' };
ENTITY_DEFS.mzbridge = { name: 'Fenditura d\'inchiostro', supports: ['shape.bridge'], durations: { 'shape.bridge': null }, safe: true };
ENTITY_DEFS.mzplate = { name: 'Piastra del filo', supports: ['element.conductive'], durations: { 'element.conductive': null }, safe: true };
ENTITY_DEFS.mzlamp = { name: 'Lampada sentinella', supports: ['light.dark'], durations: { 'light.dark': 20 }, safe: true };
ENTITY_DEFS.opbridge = { name: 'Le due sponde', supports: ['shape.bridge'], durations: { 'shape.bridge': null }, safe: true };
ENTITY_DEFS.mzstack = { name: 'Pila di registri', supports: ['state.fragile', 'weight.heavy'], durations: { 'state.fragile': null, 'weight.heavy': null }, safe: true };
ENTITY_DEFS.mzreliq = { name: 'Reliquiario di carta', supports: ['state.fragile'], durations: { 'state.fragile': null }, safe: true };
ENTITY_DEFS.mzcrystal = { name: 'Cristallo d\'inchiostro', supports: ['state.fragile', 'element.conductive'], durations: { 'state.fragile': null, 'element.conductive': null }, safe: true };
