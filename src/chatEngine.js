'use strict';

/**
 * Easter Bunny Chat Engine
 * Parses incoming messages to identify team and location,
 * then returns the appropriate clue or a contextual response.
 */

// ──────────────────────────────────────────────
// DATA
// ──────────────────────────────────────────────

const CLUES = {
  campone: `🌱 *Campone*\n\nDove la terra è grande e senza fine,\ndove si corre tra le erbe e le radici,\ncerca tra zolle, sassi e confine:\nil prossimo indizio è tra i tuoi amici…\nnascosti lì vicine!`,
  quadriportico: `🏛️ *Quadriportico alto*\n\nSali le scale, guarda dall'alto in basso,\nil Collegio si vede tutto in un passo.\nTra colonne e archi, in silenzio e con calma,\ncerca l'indizio — ce l'ha chi ha più alma!`,
  giardini: `🌳 *Giardini nobili*\n\nC'è un posto segreto tra alberi e scale,\ndove veglia silenziosa una figura speciale.\nScendi tra i rami, tra muschio e preghiera,\nl'indizio ti aspetta vicino alla primavera.`,
  classe: `🏫 *Classe*\n\nOgni giorno qui si studia con impegno e fatica,\nma oggi la lezione è una caccia magnifica!\nCerca dove si scrive, dove si pensa e si impara:\nl'indizio è nascosto su una superficie cara.`,
  campo: `⚽ *Campo sintetico*\n\nQui si corre, si segna, si tira con forza,\nil campo è verde e l'erba è corta.\nNon cercare in porta, non cercare in curva:\nl'indizio è dove il campo si curva.`,
  mensa: `🍽️ *Mensa*\n\nOgni giorno qui si mangia tutti insieme,\ntra risate, piatti e qualche problema.\nMa oggi non cercare nel tuo piatto:\nl'indizio è nascosto in un altro atto.`,
  pista: `🏃 *Pista di atletica*\n\nHai corso tanto, sei stanco ma forte,\nquesta è l'ultima tappa — non chiudere le porte!\nSulla pista dei campioni, tra curve e rettilinei,\ntroverai l'indizio…`,
};

// Each location has a canonical key and multiple trigger keywords
const LOCATION_KEYWORDS = [
  { key: 'campone', keywords: ['campone', 'campon', 'campo grande'] },
  { key: 'quadriportico', keywords: ['quadriportico', 'quadriport', 'portico', 'porticato', 'colonne'] },
  { key: 'giardini', keywords: ['giardini nobili', 'giardino', 'giardini', 'nobile', 'nobili', 'alberi'] },
  { key: 'classe', keywords: ['classe', 'classi', 'aula', 'aule', 'scuola'] },
  { key: 'campo', keywords: ['campo sintetico', 'campo da calcio', 'sintetico', 'calcio'] },
  { key: 'mensa', keywords: ['mensa', 'refettorio', 'mangiare'] },
  { key: 'pista', keywords: ['pista di atletica', 'pista atletica', 'atletica', 'pista', 'corsa'] },
];

const TEAM_KEYWORDS = {
  red: ['rossa', 'rossi', 'red', 'squadra rossa', 'team rossa', 'team red'],
  yellow: ['gialla', 'gialli', 'yellow', 'squadra gialla', 'team gialla', 'team yellow'],
};

// Routes define the order of locations per team
const ROUTES = {
  red: ['campo', 'mensa', 'pista', 'classe', 'giardini', 'quadriportico', 'campone'],
  yellow: ['quadriportico', 'giardini', 'classe', 'pista', 'mensa', 'campo', 'campone'],
};

const LOCATION_LABELS = {
  campone: '🌱 Campone',
  quadriportico: '🏛️ Quadriportico alto',
  giardini: '🌳 Giardini nobili',
  classe: '🏫 Classe',
  campo: '⚽ Campo sintetico',
  mensa: '🍽️ Mensa',
  pista: '🏃 Pista di atletica',
};

// ──────────────────────────────────────────────
// PARSING HELPERS
// ──────────────────────────────────────────────

/**
 * Normalise a string: lowercase, remove accents, trim extra spaces.
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect the team from a normalised message string.
 * Returns 'red', 'yellow', or null.
 * @param {string} msg normalised message
 * @returns {'red'|'yellow'|null}
 */
function detectTeam(msg) {
  for (const [team, keywords] of Object.entries(TEAM_KEYWORDS)) {
    for (const kw of keywords) {
      if (msg.includes(normalise(kw))) return team;
    }
  }
  return null;
}

/**
 * Detect the location key from a normalised message string.
 * Returns a location key or null.
 * @param {string} msg normalised message
 * @returns {string|null}
 */
function detectLocation(msg) {
  // Sort by keyword length descending so longer/more specific matches win
  const candidates = LOCATION_KEYWORDS.flatMap(({ key, keywords }) =>
    keywords.map((kw) => ({ key, kw: normalise(kw) }))
  ).sort((a, b) => b.kw.length - a.kw.length);

  for (const { key, kw } of candidates) {
    if (msg.includes(kw)) return key;
  }
  return null;
}

/**
 * Detect whether the message signals that the team has found a clue.
 * @param {string} msg normalised message
 * @returns {boolean}
 */
function detectFoundClue(msg) {
  const patterns = [
    'trovato', 'trovato l indizio', 'trovato indizio', 'abbiamo trovato',
    'preso', 'recuperato', 'ce l abbiamo', 'ce lo abbiamo',
    'indizio trovato', 'l abbiamo',
  ];
  return patterns.some((p) => msg.includes(normalise(p)));
}

/**
 * Detect a greeting.
 * @param {string} msg normalised message
 * @returns {boolean}
 */
function detectGreeting(msg) {
  const greetings = ['ciao', 'salve', 'buongiorno', 'buonasera', 'buon pomeriggio', 'ehi', 'hey', 'ola', 'hola'];
  return greetings.some((g) => msg.startsWith(g) || msg.includes(' ' + g + ' ') || msg === g);
}

/**
 * Detect a help request.
 * @param {string} msg normalised message
 * @returns {boolean}
 */
function detectHelp(msg) {
  return ['aiuto', 'help', 'come funziona', 'istruzioni'].some((h) => msg.includes(h));
}

// ──────────────────────────────────────────────
// RESPONSE GENERATORS
// ──────────────────────────────────────────────

const BUNNY_INTRO = `🐰 Ciao ciao! Sono il Coniglio Pasquale!\n\nSono qui per guidarvi nella caccia al tesoro di Pasqua! 🥚🌸\n\nDitemi in quale squadra siete (🔴 Rossa o 🟡 Gialla) e dove vi trovate, e vi darò il prossimo indizio! 🗺️`;

const BUNNY_HELP = `🐰 Come funziona?\n\nScrivetemi dove vi trovate e di quale squadra fate parte!\n\nEsempi:\n• "Siamo la squadra rossa al campo sintetico"\n• "Squadra gialla, siamo in mensa"\n• "Classe - rossa"\n• "Ciao, siamo in pista di atletica, squadra gialla"\n\nPotete anche dirmi se avete trovato un indizio!\n\n🥚 Buona caccia al tesoro!`;

/**
 * Build a "clue delivery" response for a given team + location.
 * @param {string} team 'red' | 'yellow'
 * @param {string} locationKey
 * @returns {string}
 */
function buildClueResponse(team, locationKey) {
  const route = ROUTES[team];
  const step = route.indexOf(locationKey) + 1;
  const teamEmoji = team === 'red' ? '🔴' : '🟡';
  const teamName = team === 'red' ? 'Rossa' : 'Gialla';
  const clue = CLUES[locationKey];
  const label = LOCATION_LABELS[locationKey];

  let header = `🐰 Ottimo, Squadra ${teamName} ${teamEmoji}! Siete a ${label} — tappa ${step} di ${route.length}!\n\n`;

  if (locationKey === 'campone') {
    header = `🐰 Squadra ${teamName} ${teamEmoji}, siete all'ultima tappa! 🎉 Ecco il vostro indizio finale!\n\n`;
  }

  return header + clue;
}

/**
 * Build a "found clue" congratulation response.
 * @param {string|null} team 'red' | 'yellow' | null
 * @returns {string}
 */
function buildFoundClueResponse(team) {
  const teamEmoji = team === 'red' ? '🔴' : team === 'yellow' ? '🟡' : '';
  const teamSuffix = team ? ` Squadra ${team === 'red' ? 'Rossa' : 'Gialla'} ${teamEmoji}` : '';
  return `🐰 Bravissimi${teamSuffix}! 🎉🥚 Avete trovato l'indizio!\n\nOra correte alla prossima tappa e scrivetemi dove siete! Forza forza! 🐾`;
}

/**
 * Build a "where are you?" response when team is known but location is not.
 * @param {string} team 'red' | 'yellow'
 * @returns {string}
 */
function buildAskLocationResponse(team) {
  const teamEmoji = team === 'red' ? '🔴' : '🟡';
  const teamName = team === 'red' ? 'Rossa' : 'Gialla';
  return `🐰 Ciao Squadra ${teamName} ${teamEmoji}! Dove vi trovate? Ditemi la vostra posizione e vi darò il vostro indizio! 🗺️🥚`;
}

/**
 * Build a "which team?" response when location is known but team is not.
 * @param {string} locationKey
 * @returns {string}
 */
function buildAskTeamResponse(locationKey) {
  const label = LOCATION_LABELS[locationKey];
  return `🐰 Ah, siete a ${label}! Ottima posizione! 🌸\n\nMa… di quale squadra fate parte? 🔴 Rossa o 🟡 Gialla?`;
}

// ──────────────────────────────────────────────
// MAIN ENTRY POINT
// ──────────────────────────────────────────────

/**
 * Process a message and return the Easter Bunny's reply.
 * @param {string} message raw user message
 * @returns {{ reply: string, team: string|null, location: string|null }}
 */
function processMessage(message) {
  if (!message || !message.trim()) {
    return { reply: '🐰 Ehm… hai dimenticato di scrivere qualcosa! 😄', team: null, location: null };
  }

  const norm = normalise(message);

  const team = detectTeam(norm);
  const location = detectLocation(norm);
  const foundClue = detectFoundClue(norm);
  const isGreeting = detectGreeting(norm);
  const isHelp = detectHelp(norm);

  // Help request takes priority
  if (isHelp) {
    return { reply: BUNNY_HELP, team, location };
  }

  // Clue found message — only when no location also detected (avoids false positives)
  if (foundClue && !location) {
    return { reply: buildFoundClueResponse(team), team, location };
  }

  // Both team and location identified → give clue
  if (team && location) {
    return { reply: buildClueResponse(team, location), team, location };
  }

  // Only team identified
  if (team && !location) {
    return { reply: buildAskLocationResponse(team), team, location };
  }

  // Only location identified
  if (!team && location) {
    return { reply: buildAskTeamResponse(location), team, location };
  }

  // Pure greeting with no other info
  if (isGreeting) {
    return { reply: BUNNY_INTRO, team, location };
  }

  // Fallback
  return {
    reply: `🐰 Hmm, non ho capito bene! 🤔\n\nDitemi la vostra squadra (🔴 Rossa o 🟡 Gialla) e dove vi trovate, e vi darò subito il vostro indizio! 🥚\n\nSe avete bisogno di aiuto, scrivete "aiuto"! 🐾`,
    team,
    location,
  };
}

// ──────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────

module.exports = {
  processMessage,
  detectTeam,
  detectLocation,
  detectFoundClue,
  detectGreeting,
  CLUES,
  ROUTES,
  LOCATION_LABELS,
  normalise,
};
