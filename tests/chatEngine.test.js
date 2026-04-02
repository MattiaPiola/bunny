'use strict';

const {
  processMessage,
  detectTeam,
  detectLocation,
  detectFoundClue,
  detectGreeting,
  normalise,
  CLUES,
  ROUTES,
  LOCATION_LABELS,
} = require('../src/chatEngine');

// ──────────────────────────────────────────────
// normalise
// ──────────────────────────────────────────────
describe('normalise', () => {
  test('lowercases input', () => {
    expect(normalise('CIAO')).toBe('ciao');
  });

  test('removes accents', () => {
    expect(normalise('è é ù à')).toBe('e e u a');
  });

  test('collapses whitespace', () => {
    expect(normalise('  a   b  ')).toBe('a b');
  });

  test('removes special characters', () => {
    expect(normalise('ciao! come stai?')).toBe('ciao come stai');
  });
});

// ──────────────────────────────────────────────
// detectTeam
// ──────────────────────────────────────────────
describe('detectTeam', () => {
  test('detects red team from "rossa"', () => {
    expect(detectTeam('squadra rossa')).toBe('red');
  });

  test('detects yellow team from "gialla"', () => {
    expect(detectTeam('squadra gialla')).toBe('yellow');
  });

  test('returns null when no team keyword', () => {
    expect(detectTeam('siamo in classe')).toBeNull();
  });

  test('detects red from "rossi"', () => {
    expect(detectTeam('noi rossi siamo qui')).toBe('red');
  });

  test('detects yellow from "gialli"', () => {
    expect(detectTeam('team gialli')).toBe('yellow');
  });
});

// ──────────────────────────────────────────────
// detectLocation
// ──────────────────────────────────────────────
describe('detectLocation', () => {
  test('detects campone', () => {
    expect(detectLocation('siamo sul campone')).toBe('campone');
  });

  test('detects quadriportico', () => {
    expect(detectLocation('siamo in quadriportico')).toBe('quadriportico');
  });

  test('detects giardini nobili', () => {
    expect(detectLocation('siamo nei giardini nobili')).toBe('giardini');
  });

  test('detects classe', () => {
    expect(detectLocation('siamo in classe')).toBe('classe');
  });

  test('detects campo sintetico', () => {
    expect(detectLocation('campo sintetico')).toBe('campo');
  });

  test('detects mensa', () => {
    expect(detectLocation('siamo in mensa')).toBe('mensa');
  });

  test('detects pista di atletica', () => {
    expect(detectLocation('pista di atletica')).toBe('pista');
  });

  test('returns null when no location', () => {
    expect(detectLocation('ciao come stai')).toBeNull();
  });

  test('longer keyword wins: campo sintetico over plain campo', () => {
    // "campone" contains "campo" substring but campone keyword is more specific
    expect(detectLocation('campone')).toBe('campone');
  });
});

// ──────────────────────────────────────────────
// detectFoundClue
// ──────────────────────────────────────────────
describe('detectFoundClue', () => {
  test('detects "abbiamo trovato"', () => {
    expect(detectFoundClue('abbiamo trovato l indizio')).toBe(true);
  });

  test('detects "trovato"', () => {
    expect(detectFoundClue('trovato')).toBe(true);
  });

  test('detects "recuperato"', () => {
    expect(detectFoundClue('recuperato')).toBe(true);
  });

  test('returns false for unrelated message', () => {
    expect(detectFoundClue('siamo in classe squadra rossa')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// detectGreeting
// ──────────────────────────────────────────────
describe('detectGreeting', () => {
  test('detects "ciao"', () => {
    expect(detectGreeting('ciao come stai')).toBe(true);
  });

  test('detects "salve"', () => {
    expect(detectGreeting('salve a tutti')).toBe(true);
  });

  test('returns false for non-greeting', () => {
    expect(detectGreeting('siamo in classe rossa')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// processMessage — from the problem statement examples
// ──────────────────────────────────────────────
describe('processMessage — problem statement examples', () => {
  test('"Ciao, siamo la squadra rossa, siamo sul campone" → clue for campone', () => {
    const { reply, team, location } = processMessage('Ciao, siamo la squadra rossa, siamo sul campone');
    expect(team).toBe('red');
    expect(location).toBe('campone');
    expect(reply).toContain(CLUES.campone);
  });

  test('"abbiamo trovato il primo indizio" → found clue response', () => {
    const { reply } = processMessage('abbiamo trovato il primo indizio');
    expect(reply).toContain('trovato');
  });

  test('"siamo la squadra rossa in quadriportico" → clue for quadriportico', () => {
    const { reply, team, location } = processMessage('siamo la squadra rossa in quadriportico');
    expect(team).toBe('red');
    expect(location).toBe('quadriportico');
    expect(reply).toContain(CLUES.quadriportico);
  });

  test('"classe - gialla" → clue for classe, yellow team', () => {
    const { reply, team, location } = processMessage('classe - gialla');
    expect(team).toBe('yellow');
    expect(location).toBe('classe');
    expect(reply).toContain(CLUES.classe);
  });
});

// ──────────────────────────────────────────────
// processMessage — edge cases
// ──────────────────────────────────────────────
describe('processMessage — all locations for both teams', () => {
  const locations = ['campo', 'mensa', 'pista', 'classe', 'giardini', 'quadriportico', 'campone'];
  const teams = ['red', 'yellow'];

  for (const team of teams) {
    for (const loc of locations) {
      test(`Team ${team} at ${loc} gets the correct clue`, () => {
        const teamWord = team === 'red' ? 'rossa' : 'gialla';
        const locWord = LOCATION_LABELS[loc].replace(/[^\w\s]/gu, '').trim().split(' ').slice(0, 2).join(' ');
        const { reply } = processMessage(`squadra ${teamWord}, siamo in ${locWord}`);
        expect(reply).toContain(CLUES[loc]);
      });
    }
  }
});

describe('processMessage — partial information', () => {
  test('only team → asks for location', () => {
    const { reply } = processMessage('siamo la squadra rossa');
    expect(reply).toContain('Dove vi trovate');
  });

  test('only location → asks for team', () => {
    const { reply } = processMessage('siamo in mensa');
    expect(reply).toContain('squadra');
  });

  test('greeting only → intro', () => {
    const { reply } = processMessage('Ciao!');
    expect(reply).toContain('Coniglio Pasquale');
  });

  test('help request → help text', () => {
    const { reply } = processMessage('aiuto');
    expect(reply).toContain('Come funziona');
  });

  test('empty message → error response', () => {
    const { reply } = processMessage('');
    expect(reply).toContain('dimenticato');
  });

  test('unknown message → fallback', () => {
    const { reply } = processMessage('xyz abc 123');
    expect(reply).toContain('non ho capito');
  });
});

describe('processMessage — route step info', () => {
  test('red team at step 1 (campo) shows step 1 of 7', () => {
    const { reply } = processMessage('squadra rossa, campo sintetico');
    expect(reply).toContain('tappa 1 di 7');
  });

  test('yellow team at step 1 (quadriportico) shows step 1 of 7', () => {
    const { reply } = processMessage('squadra gialla, quadriportico');
    expect(reply).toContain('tappa 1 di 7');
  });

  test('campone is final step for both teams', () => {
    const red = processMessage('rossa campone');
    const yellow = processMessage('gialla campone');
    expect(red.reply).toContain('ultima tappa');
    expect(yellow.reply).toContain('ultima tappa');
  });
});
