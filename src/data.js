// S1 · Dati autorizzati (GDD §03, §05-07). ID non localizzati, testo in italiano.
export const SLOTS = {
  state: { baseline: 'state.intact', values: ['state.intact', 'state.fragile'] },
  temperament: { baseline: 'temperament.vigilant', values: ['temperament.vigilant', 'temperament.cautious'] },
  element: { baseline: 'element.insulating', values: ['element.insulating', 'element.conductive'] },
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
// Combinazioni valide fra slot diversi sulla stessa entità (non sempre superiori).
export const COMBOS = [
  { id: 'combo.retreat_vulnerable', a: 'state.fragile', b: 'temperament.cautious',
    text: 'Arretra e la corazza diventa vulnerabile, ma ti caricherà meno: dovrai avvicinarti per il colpo impegnato' },
  { id: 'combo.shatter_pulse', a: 'state.fragile', b: 'element.conductive',
    text: "Il prossimo impulso attraversa la corazza e la incrina dall'interno, ma la scossa colpisce anche chi è vicino" },
];
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
  bridge:     { name: 'Ponte conduttivo', supports: ['element.conductive'], durations: { 'element.conductive': 12 } },
};
