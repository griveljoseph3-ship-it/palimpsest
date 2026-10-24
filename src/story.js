// Testi e memoria delle versioni precedenti. Il mondo è un libro che non vuole essere corretto.
const MK = 'pal.memory';
export function loadMem() { try { return JSON.parse(localStorage.getItem(MK)) || { runs: 0, deaths: 0, routes: [], plans: [], traces: [] }; } catch (e) { return { runs: 0, deaths: 0, routes: [], plans: [], traces: [] }; } }
export function saveMem(m) { try { localStorage.setItem(MK, JSON.stringify(m)); } catch (e) {} }

export const WHO = { ilde: 'Ilde', narr: 'Il Libro', elara: 'Elara', lumi: 'Lumi', custode: 'Il Custode', you: 'Tu', tipo: 'Il Tipografo', giurato: 'Il Giurato senza volto', ladro: 'Il Ladro d\'inchiostro' };

export function introLines(mem) {
  if (mem.runs === 0) return [
    ['narr', "C'era una volta una storia finita. Qualcuno l'ha riaperta."],
    ['narr', 'Le pagine non vogliono essere corrette. Ma una goccia è già caduta.'],
  ];
  return [
    ['narr', 'Di nuovo tu. Le cancellature della volta scorsa sono ancora qui.'],
    ['narr', `${mem.runs === 1 ? 'Una versione' : mem.runs + ' versioni'} di questa storia ${mem.runs === 1 ? 'è stata riscritta' : 'sono state riscritte'}. La carta ricorda.`],
  ];
}
export const HINTS = {
  look: 'Avvicinati alla tavola lacerata e guarda',
  firstRewrite: 'Scegli la parola. Poi colpisci forte',
  heavy: 'Colpo impegnato: carica e rompi',
  charger: 'Il Caricatore ti punta. Prova la stessa parola sulla sua corazza',
  pillar: 'Fallo caricare contro un pilastro',
  core: 'Il nucleo è esposto: colpiscilo!',
  press: 'La pressa batte ogni 4 secondi. Un impulso esiste già: dagli una strada',
  door: 'La porta giudica. Tre strade: forzare il relè, portare la prova (ma dov\'è?), oppure affidarti a Elara',
  arena: 'Interrompi il legame tra il Custode e il nucleo, poi tocca il sigillo',
  seal: 'Il legame si è allentato: tocca il sigillo!',
};
export function elaraDoor(mem) {
  const prev = mem.routes[mem.routes.length - 1];
  const base = [['elara', 'Mi stai leggendo. Lo sento dal margine.'], ['elara', 'La parola sopra di me non è mia. È il relè a dire COLPEVOLE. Io guardo solo come scrivi.']];
  if (prev === 'forced') base.unshift(['elara', "Tu. L'altra volta mi hai strappata. La cucitura si vede ancora, guarda."]);
  if (prev === 'evidence') base.unshift(['elara', "Hai ancora la prova dell'altra volta? No... quella versione è stata chiusa."]);
  if (prev === 'trust') base.unshift(['elara', "Ricordo una versione in cui ti sei fermato a difendermi. Era questa?"]);
  return base;
}
export const ROUTE_TEXT = {
  forced: 'Hai forzato il relè. La porta si è aperta strappandosi.',
  evidence: 'Hai portato la prova al lettore. Il verdetto si è spento da solo.',
  trust: 'Ti sei affidato a Elara e l\'hai difesa mentre si riscriveva.',
};
export const PLAN_TEXT = { controllo: 'Controllo (CAUTO)', rottura: 'Rottura (FRAGILE)', ambiente: 'Ambiente (CONDUTTIVO)', azione: 'Azione pura' };

export function custodeLines(deaths, mem) { return [['custode', 'Ti ho letto. Ogni parola che hai scritto per arrivare qui, l\'ho letta.']].concat(custodeLines0(deaths, mem)); }
function custodeLines0(deaths, mem) {
  if (deaths === 0 && mem.runs > 0) return [['custode', 'Ti conosco. Sei quello che cambia le cose finite.']];
  if (deaths === 0) return [['custode', 'Questa pagina è chiusa. Io sono ciò che resta quando una storia smette di cambiare.']];
  if (deaths === 1) return [['custode', 'Hai già perso qui. La pagina lo ha scritto.']];
  return [['custode', `${deaths} volte. Ogni volta lasci una macchia. Continua: più macchie, meno storia.`]];
}
export function consequence(st, mem) {
  const L = [];
  L.push(['narr', 'Il sigillo si spezza come una ceralacca. Il capitolo si riapre.']);
  if (st.doorRoute === 'evidence') { L.push(['elara', 'Ho confrontato il tuo documento con una nuova testimonianza. Coincide.']); L.push(['elara', 'Lo tengo io. Ti guiderò fuori: hai corretto senza strappare.']); }
  else if (st.doorRoute === 'forced') { L.push(['elara', 'C\'è una nuova testimonianza. Non te la do.']); L.push(['elara', 'Chi strappa una pagina può strapparne un\'altra. Il bordo di me è ancora sfilacciato.']); }
  else { L.push(['elara', 'Mi hai difesa trenta secondi. Non è tanto, per un libro.']); L.push(['elara', 'Ma ora ho una riga scritta da me. Ti racconterò cosa c\'era prima del verdetto.']); }
  const pt = { controllo: ['custode', 'Mi hai fatto avere paura. Non sapevo di poterla avere.'], rottura: ['custode', 'Mi hai incrinato. Le crepe resteranno nel margine.'], ambiente: ['custode', 'Hai usato la mia pagina contro di me. Era scritta male, forse.'], azione: ['custode', 'Niente parole. Solo colpi. Anche questa è una scrittura.'] };
  L.push(pt[st.plan] || pt.azione);
  if (st.deaths >= 3) L.push(['lumi', `Sono le ${st.deaths} macchie che hai lasciato. Non le cancellare. Sono io.`]);
  else if (st.deaths > 0) L.push(['lumi', 'Una piccola macchia, là in fondo. È così che nasco: quando sbagli e riprovi.']);
  else L.push(['lumi', 'Nessuna macchia. Strano. Di solito resta sempre qualcosa.']);
  if (mem.runs > 0) L.push(['elara', 'Questa versione è diversa dall\'altra. Le ricordo tutte e due.']);
  L.push(['narr', 'Fine del frammento. Il resto della storia non ha ancora deciso se lasciarsi correggere.']);
  return L;
}
export const LUMI_VISION = {
  rottura: 'Lumi ti mostra una versione fallita: il Custode carica, sbatte contro un pilastro... e la corazza si apre.',
  controllo: 'Lumi ti mostra una versione fallita: il Custode ha paura, si allontana dal nucleo, e il legame cede.',
  ambiente: 'Lumi ti mostra una versione fallita: il ponte trasporta l\'impulso e la piega sposta il Custode.',
};

export const ARCHIVE_TEXT = [['narr', 'Sul leggio, la prima versione della storia. Nessuna parola rossa. Nessun verdetto.'], ['ilde', '«Elara attraversò il fiume da sola, e il fiume la lasciò passare.»'], ['narr', 'Sotto, con un\'altra penna, una riga aggiunta dopo: «Ma qualcuno doveva pagare per la notte del fiume».'], ['lumi', 'Allora COLPEVOLE non è caduta per caso. Qualcuno l\'ha scelta.']];
export const C2_INTRO = [['narr', 'Capitolo II · Il fiume di carta.'], ['narr', 'Dopo la Fenditura, il libro si bagna. Le pagine si gonfiano, le parole affondano.'], ['elara', 'Qui è dove succede. La notte del fiume. Se vuoi davvero riscrivermi, devi vedere questa pagina.'], ['lumi', 'Le cose qui hanno un peso. Anche le parole.']];
export const C2_END = [['narr', 'Acqua ferma. Al centro, la pagina di Elara si specchia nel fiume.'], ['elara', 'La notte del fiume io non c\'ero. C\'era mia madre. Ilde.'], ['elara', 'Ha scritto COLPEVOLE su di me perché nessuno cercasse lei.'], ['lumi', '…e il Rilegatore profumava di lavanda. Come il suo scialle.'], ['narr', 'Il libro chiude il capitolo. Da qualche parte, qualcuno ricuce.']];
export const SECRET_TEXT = {
  c1_shelf: [['narr', 'Tra i libri marci, una lettera mai spedita.'], ['ilde', '«Cara Elara, se un giorno leggerai il libro, sappi che ogni parola sbagliata l\'ho scelta io.»', 'lettera']],
  c2_stone: [['narr', 'Sotto il sasso, un biglietto del traghetto. Una sola corsa, notte del 12 marzo. Il nome è cancellato.']],
  c2_pile: [['narr', 'Tra i libri crollati, una pagina di cronaca: «Una donna salva una bambina dal fiume. La donna non è mai stata identificata».']],
  c2_dam: [['narr', 'Sotto il sasso dell\'acqua ferma, una ciocca di capelli grigi legata con filo da rilegatore.']],
  c1_trap: [['narr', 'Sotto la botola, una pagina di diario. La calligrafia è quella di Ilde, ma più giovane.'], ['ilde', '«Scrivo di notte perché di giorno lei mi guarda. Se legge come finisce, non mi perdonerà.»', 'verdetto'], ['narr', 'Come finisce? La riga dopo è stata strappata.']],
  c1_well: [['narr', 'Dal calamaio rotto scivola un foglio arrotolato, asciutto per miracolo.'], ['narr', 'È un disegno a matita: una bambina sul fiume, e sotto, una parola cancellata tre volte. Non è COLPEVOLE.'], ['narr', 'È LIBERA.']],
};
