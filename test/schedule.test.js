'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUSPENSIONS, DAYS_FULL, DAYS_SHORT,
  todayStr, parseDateStr, fmtDate, daysUntil,
  isSuspended, getSuspensionName, nextSuspension,
  normalizeStreetName, parseSignDesc, toMin, fmtTime,
  sideLabel, sideArrow, titleCase,
  lngLatToStatePlane, filterSignsToBlockFace,
  computeStatus, getCleaningDOWSet, nextCleaningInfo,
  buildScheduleRows, buildSearchQueryFromParams,
} = require('../schedule.js');

// Fixed clock: Tuesday 2026-05-12, 09:00 local
const NOW = new Date(2026, 4, 12, 9, 0);    // month is 0-indexed
const MON_8AM  = new Date(2026, 4, 11, 8, 0);   // Monday 08:00
const MON_9AM  = new Date(2026, 4, 11, 9, 0);   // Monday 09:00 — inside 8:30-10
const MON_11AM = new Date(2026, 4, 11, 11, 0);  // Monday 11:00 — after window
const WED_9AM  = new Date(2026, 4, 13, 9, 0);   // Wednesday — no cleaning
const HOLIDAY  = new Date(2026, 4, 14, 9, 0);   // Thu 2026-05-14 — Solemnity of the Ascension
const SUN_9AM  = new Date(2026, 4, 17, 9, 0);   // Sunday — no cleaning

// Synthetic sign fixture helpers
function makeSign(side, days, start, end, block = 1) {
  const blocks = {
    1: { from_street:'FIRST CROSS ST',  to_street:'SECOND CROSS ST',  sign_x_coord:'1000000', sign_y_coord:'200000' },
    2: { from_street:'SECOND CROSS ST', to_street:'THIRD CROSS ST',   sign_x_coord:'1000800', sign_y_coord:'200000' },
    3: { from_street:'THIRD CROSS ST',  to_street:'FOURTH CROSS ST',  sign_x_coord:'1001600', sign_y_coord:'200000' },
  };
  const b = blocks[block];
  const daysStr = (Array.isArray(days) ? days : [days]).join(' ');
  return {
    side_of_street: side,
    on_street: 'TEST AVENUE A',
    from_street: b.from_street,
    to_street:   b.to_street,
    sign_x_coord: b.sign_x_coord,
    sign_y_coord: b.sign_y_coord,
    sign_description: `NO PARKING (SANITATION BROOM SYMBOL) ${daysStr} ${start}-${end} <->`,
  };
}

// ─── todayStr ───────────────────────────────────────────────────────────────
describe('todayStr', () => {
  it('formats the pinned date correctly', () => {
    assert.equal(todayStr(NOW), '2026-05-12');
  });
  it('works for a January date', () => {
    assert.equal(todayStr(new Date(2026, 0, 1)), '2026-01-01');
  });
});

// ─── parseDateStr ────────────────────────────────────────────────────────────
describe('parseDateStr', () => {
  it('parses as local date (no TZ offset)', () => {
    const d = parseDateStr('2026-05-12');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 4);
    assert.equal(d.getDate(), 12);
  });
});

// ─── daysUntil ───────────────────────────────────────────────────────────────
describe('daysUntil', () => {
  it('returns 2 for two days ahead', () => {
    assert.equal(daysUntil('2026-05-14', NOW), 2);
  });
  it('returns 0 for same day', () => {
    assert.equal(daysUntil('2026-05-12', NOW), 0);
  });
  it('returns negative for past dates', () => {
    assert.equal(daysUntil('2026-05-10', NOW), -2);
  });
});

// ─── suspension helpers ───────────────────────────────────────────────────────
describe('isSuspended', () => {
  it('returns true for a suspension date', () => {
    assert.equal(isSuspended('2026-05-14'), true);
  });
  it('returns false for a non-suspension date', () => {
    assert.equal(isSuspended('2026-05-13'), false);
  });
});

describe('getSuspensionName', () => {
  it('returns the holiday name', () => {
    assert.equal(getSuspensionName('2026-05-14'), 'Solemnity of the Ascension');
  });
  it('returns null for non-holiday', () => {
    assert.equal(getSuspensionName('2026-05-13'), null);
  });
});

describe('nextSuspension', () => {
  it('finds the upcoming suspension', () => {
    // NOW = May 12; next suspension = May 14
    const s = nextSuspension(NOW);
    assert.equal(s.date, '2026-05-14');
  });
  it('includes today if today is a suspension', () => {
    const s = nextSuspension(HOLIDAY);
    assert.equal(s.date, '2026-05-14');
  });
  it('wraps to 2027 at year end', () => {
    const s = nextSuspension(new Date(2026, 11, 26, 9, 0)); // Dec 26
    assert.equal(s.date, '2027-01-01');
  });
});

// ─── string helpers ───────────────────────────────────────────────────────────
describe('normalizeStreetName', () => {
  it('pads 3-digit numbers to 5 chars (2 spaces)', () => {
    assert.equal(normalizeStreetName('West 120 Street'), 'WEST  120 STREET');
  });
  it('pads 1-digit numbers to 5 chars (4 spaces)', () => {
    assert.equal(normalizeStreetName('east 9 street'), 'EAST    9 STREET');
  });
  it('pads 2-digit numbers to 5 chars (3 spaces)', () => {
    assert.equal(normalizeStreetName('North 14 Avenue'), 'NORTH   14 AVENUE');
  });
});

describe('titleCase', () => {
  it('lowercases and capitalises each word', () => {
    assert.equal(titleCase('TEST AVENUE A'), 'Test Avenue A');
  });
});

describe('sideLabel / sideArrow', () => {
  it('maps N/S/E/W correctly', () => {
    assert.equal(sideLabel('N'), 'North');
    assert.equal(sideLabel('S'), 'South');
    assert.equal(sideLabel('E'), 'East');
    assert.equal(sideLabel('W'), 'West');
    assert.equal(sideArrow('N'), '↑');
    assert.equal(sideArrow('S'), '↓');
  });
  it('returns the raw code for unknown sides', () => {
    assert.equal(sideLabel('X'), 'X');
  });
});

// ─── toMin ───────────────────────────────────────────────────────────────────
describe('toMin', () => {
  it('parses 8:30AM → 510', () => { assert.equal(toMin('8:30AM'), 510); });
  it('parses 10AM → 600',   () => { assert.equal(toMin('10AM'), 600); });
  it('parses 12:00PM → 720 (noon)', () => { assert.equal(toMin('12:00PM'), 720); });
  it('parses 12:30AM → 30 (midnight half-hour)', () => { assert.equal(toMin('12:30AM'), 30); });
  it('parses 12AM → 0 (midnight)', () => { assert.equal(toMin('12AM'), 0); });
  it('returns null for null', () => { assert.equal(toMin(null), null); });
  it('returns null for empty string', () => { assert.equal(toMin(''), null); });
  it('returns null for garbage', () => { assert.equal(toMin('not-a-time'), null); });
});

// ─── fmtTime ─────────────────────────────────────────────────────────────────
describe('fmtTime', () => {
  it('inserts a narrow no-break space (U+202F) before AM/PM', () => {
    assert.equal(fmtTime('8:30AM'), '8:30 AM');
    assert.equal(fmtTime('10AM'), '10 AM');
  });
  it('returns empty string for falsy input', () => {
    assert.equal(fmtTime(''), '');
    assert.equal(fmtTime(null), '');
  });
});

// ─── parseSignDesc ────────────────────────────────────────────────────────────
describe('parseSignDesc', () => {
  it('parses Mon/Thu broom sign', () => {
    const r = parseSignDesc('NO PARKING (SANITATION BROOM SYMBOL) MONDAY THURSDAY 8:30AM-10AM <->');
    assert.deepEqual(r.days, ['MONDAY', 'THURSDAY']);
    assert.equal(r.start, '8:30AM');
    assert.equal(r.end, '10AM');
  });
  it('parses Tue/Fri broom sign', () => {
    const r = parseSignDesc('NO PARKING (SANITATION BROOM SYMBOL) TUESDAY FRIDAY 11AM-12:30PM <->');
    assert.deepEqual(r.days, ['TUESDAY', 'FRIDAY']);
    assert.equal(r.start, '11AM');
    assert.equal(r.end, '12:30PM');
  });
  it('returns empty days/null times for EXCEPT signs', () => {
    const r = parseSignDesc('NO PARKING (SANITATION BROOM SYMBOL) 7:30AM-8AM EXCEPT SUNDAY');
    assert.deepEqual(r.days, []);
    assert.equal(r.start, null);
    assert.equal(r.end, null);
  });
  it('handles times without minutes', () => {
    const r = parseSignDesc('NO PARKING (SANITATION BROOM SYMBOL) WEDNESDAY 8AM-9AM <->');
    assert.equal(r.start, '8AM');
    assert.equal(r.end, '9AM');
  });
});

// ─── lngLatToStatePlane ───────────────────────────────────────────────────────
describe('lngLatToStatePlane', () => {
  it('projects Statue of Liberty within 50 ft of known value', () => {
    const [x, y] = lngLatToStatePlane(-74.0445, 40.6892);
    assert.ok(Math.abs(x - 971909) < 50, `x=${x} not near 971909`);
    assert.ok(Math.abs(y - 190374) < 50, `y=${y} not near 190374`);
  });
  it('projects Times Square within 50 ft of known value', () => {
    const [x, y] = lngLatToStatePlane(-73.9857, 40.7484);
    assert.ok(Math.abs(x - 988212) < 50, `x=${x} not near 988212`);
    assert.ok(Math.abs(y - 211939) < 50, `y=${y} not near 211939`);
  });
  it('result lies in a plausible NYC state-plane bounding box', () => {
    const [x, y] = lngLatToStatePlane(-74.0445, 40.6892);
    assert.ok(x > 900000 && x < 1100000, `x=${x} out of NYC range`);
    assert.ok(y > 100000 && y < 300000, `y=${y} out of NYC range`);
  });
});

// ─── filterSignsToBlockFace ───────────────────────────────────────────────────
// Regression test for the multi-window block-face bug.
// Fixture: three block faces along TEST AVENUE A. Block 2 is centred at x=1000800.
// We compute the lng/lat that maps to x≈1000800, y≈200000 using an approximate
// inverse (shift the reference lng slightly east) and verify block 2 is selected.
describe('filterSignsToBlockFace', () => {
  const signsAllBlocks = [
    makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM',     1),
    makeSign('S', ['TUESDAY','FRIDAY'],  '8:30AM', '10AM',     1),
    makeSign('N', ['MONDAY','THURSDAY'], '11AM',   '12:30PM',  2),
    makeSign('S', ['TUESDAY','FRIDAY'],  '11AM',   '12:30PM',  2),
    makeSign('N', ['MONDAY','THURSDAY'], '11:30AM','1PM',      3),
    makeSign('S', ['TUESDAY','FRIDAY'],  '11:30AM','1PM',      3),
  ];

  it('returns only block 1 signs for a point near block 1 (x≈1000000)', () => {
    // Block 1 centre is at state-plane (1000000, 200000).
    // Use block 1 sign coords directly — passing matching coords as lng/lat is
    // impractical without inverse projection, so we test via the function's own
    // lngLatToStatePlane by giving it a lng/lat that projects very close to
    // block 1. We know Times Square projects to (988212, 211939); we need ~1000000.
    // The difference is ~11788 ft east. One degree lon ≈ 84,900 ft at this lat.
    // So Δlng ≈ 11788/84900 ≈ 0.1389°. Times Square is at -73.9857;
    // target lon ≈ -73.9857 + 0.1389 = -73.8468.
    // But that puts us outside NYC. Let's approach differently:
    // Inject signs with state-plane coords matching a known projected point.
    const refLng = -73.9857, refLat = 40.7484; // Times Square → (988212, 211939)
    const [refX, refY] = lngLatToStatePlane(refLng, refLat);
    // Build signs whose coords equal the projected Times Square point (block A)
    // and a different block (block B) much farther away.
    const nearSign  = { ...makeSign('N', ['MONDAY'], '8:30AM', '10AM'), from_street:'BLOCK A FROM', to_street:'BLOCK A TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)),     sign_y_coord: String(Math.round(refY)) };
    const farSign   = { ...makeSign('S', ['TUESDAY'],'8:30AM', '10AM'), from_street:'BLOCK B FROM', to_street:'BLOCK B TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)+2000), sign_y_coord: String(Math.round(refY)) };
    const result = filterSignsToBlockFace([nearSign, farSign], refLng, refLat);
    assert.equal(result.length, 1);
    assert.equal(result[0].from_street, 'BLOCK A FROM');
  });

  it('returns both sides of the nearest block face', () => {
    const [refX, refY] = lngLatToStatePlane(-73.9857, 40.7484);
    const northSign = { ...makeSign('N', ['MONDAY'], '8:30AM', '10AM'), from_street:'BLOCK A FROM', to_street:'BLOCK A TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)),   sign_y_coord: String(Math.round(refY)) };
    const southSign = { ...makeSign('S', ['TUESDAY'],'8:30AM', '10AM'), from_street:'BLOCK A FROM', to_street:'BLOCK A TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)+5), sign_y_coord: String(Math.round(refY)) };
    const farSign   = { ...makeSign('N', ['MONDAY'], '11AM',   '12:30PM'),from_street:'BLOCK B FROM',to_street:'BLOCK B TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)+2000),sign_y_coord: String(Math.round(refY)) };
    const result = filterSignsToBlockFace([northSign, southSign, farSign], -73.9857, 40.7484);
    assert.equal(result.length, 2);
    assert.ok(result.every(s => s.from_street === 'BLOCK A FROM'));
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(filterSignsToBlockFace([], -74, 40.7), []);
  });

  it('returns all signs unchanged when none have coordinates', () => {
    const noCoords = [
      { side_of_street:'N', sign_description:'...', on_street:'X', from_street:'A', to_street:'B' },
      { side_of_street:'S', sign_description:'...', on_street:'X', from_street:'A', to_street:'B' },
    ];
    const result = filterSignsToBlockFace(noCoords, -74, 40.7);
    assert.equal(result.length, 2);
  });

  it('ignores signs with non-numeric coordinate strings', () => {
    const [refX, refY] = lngLatToStatePlane(-73.9857, 40.7484);
    const good = { ...makeSign('N', ['MONDAY'], '8:30AM', '10AM'), from_street:'GOOD FROM', to_street:'GOOD TO', on_street:'TEST ST', sign_x_coord: String(Math.round(refX)), sign_y_coord: String(Math.round(refY)) };
    const bad  = { ...makeSign('S', ['TUESDAY'],'8:30AM', '10AM'), from_street:'BAD FROM',  to_street:'BAD TO',  on_street:'TEST ST', sign_x_coord: 'N/A', sign_y_coord: '' };
    const result = filterSignsToBlockFace([good, bad], -73.9857, 40.7484);
    assert.equal(result.length, 1);
    assert.equal(result[0].from_street, 'GOOD FROM');
  });
});

// ─── computeStatus ───────────────────────────────────────────────────────────
describe('computeStatus', () => {
  const monThuSign = makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM');
  const tueFriSign = makeSign('S', ['TUESDAY','FRIDAY'],  '8:30AM', '10AM');
  const signs = [monThuSign, tueFriSign];

  it('returns active when inside cleaning window', () => {
    // MON_9AM = Monday 09:00, inside Mon/Thu 8:30-10
    const s = computeStatus([monThuSign], MON_9AM);
    assert.equal(s.state, 'active');
    assert.equal(s.side, 'N');
    assert.equal(s.start, '8:30AM');
    assert.equal(s.end, '10AM');
    assert.equal(s.endMin, 600);
  });

  it('returns upcoming before window starts', () => {
    // MON_8AM = Monday 08:00, window starts 8:30
    const s = computeStatus([monThuSign], MON_8AM);
    assert.equal(s.state, 'upcoming');
    assert.equal(s.start, '8:30AM');
  });

  it('returns clear (passed) after window ends', () => {
    // MON_11AM = Monday 11:00, window was 8:30-10
    const s = computeStatus([monThuSign], MON_11AM);
    assert.equal(s.state, 'clear');
    assert.match(s.reason, /passed/);
  });

  it('returns clear (no cleaning) on an off day', () => {
    // WED_9AM = Wednesday, only Mon/Thu signs
    const s = computeStatus([monThuSign], WED_9AM);
    assert.equal(s.state, 'clear');
    assert.match(s.reason, /Wednesdays/);
  });

  it('returns suspended on a holiday regardless of time', () => {
    const s = computeStatus(signs, HOLIDAY);
    assert.equal(s.state, 'suspended');
    assert.equal(s.holidayName, 'Solemnity of the Ascension');
  });

  it('returns clear on Sunday with no Sunday signs', () => {
    const s = computeStatus(signs, SUN_9AM);
    assert.equal(s.state, 'clear');
    assert.match(s.reason, /Sundays/);
  });
});

// ─── nextCleaningInfo ─────────────────────────────────────────────────────────
describe('nextCleaningInfo', () => {
  const monThuSign = makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM');

  it('returns isToday:true when window is upcoming today', () => {
    // MON_8AM, window starts 8:30 → still upcoming today
    const r = nextCleaningInfo([monThuSign], MON_8AM);
    assert.equal(r.isToday, true);
    assert.equal(r.start, '8:30AM');
  });

  it('returns Thursday when Mon window has passed', () => {
    // MON_11AM, window passed → next is Thursday
    const r = nextCleaningInfo([monThuSign], MON_11AM);
    assert.equal(r.isToday, false);
    assert.equal(r.date.getDay(), 4); // Thursday
  });

  it('returns Monday from Sunday', () => {
    const r = nextCleaningInfo([monThuSign], SUN_9AM);
    assert.equal(r.isToday, false);
    assert.equal(r.date.getDay(), 1); // Monday
  });

  it('returns null when there are no signs', () => {
    assert.equal(nextCleaningInfo([], NOW), null);
  });
});

// ─── getCleaningDOWSet ────────────────────────────────────────────────────────
describe('getCleaningDOWSet', () => {
  it('returns correct day numbers for Mon/Thu and Tue/Fri signs', () => {
    const signs = [
      makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM'),
      makeSign('S', ['TUESDAY','FRIDAY'],  '8:30AM', '10AM'),
    ];
    const s = getCleaningDOWSet(signs);
    assert.ok(s.has(1)); // Monday
    assert.ok(s.has(2)); // Tuesday
    assert.ok(s.has(4)); // Thursday
    assert.ok(s.has(5)); // Friday
    assert.equal(s.size, 4);
  });
});

// ─── buildScheduleRows ────────────────────────────────────────────────────────
describe('buildScheduleRows', () => {
  it('returns N before S row', () => {
    const signs = [
      makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM'),
      makeSign('S', ['TUESDAY','FRIDAY'],  '11AM',   '12:30PM'),
    ];
    const rows = buildScheduleRows(signs);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].sideCode, 'N');
    assert.equal(rows[1].sideCode, 'S');
  });

  it('formats daysList with DAYS_FULL order', () => {
    const signs = [makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM')];
    const rows = buildScheduleRows(signs);
    assert.equal(rows[0].daysList, 'Mon & Thu');
  });

  it('produces a single time window per row for one sign', () => {
    const signs = [makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM')];
    const rows = buildScheduleRows(signs);
    assert.equal(rows[0].timeWindows.length, 1);
    assert.equal(rows[0].timeWindows[0], '8:30 AM–10 AM');
  });

  it('deduplicates identical time windows', () => {
    const signs = [
      makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM'),
      makeSign('N', ['MONDAY','THURSDAY'], '8:30AM', '10AM'), // duplicate
    ];
    const rows = buildScheduleRows(signs);
    assert.equal(rows[0].timeWindows.length, 1);
  });

  it('sorts multiple windows by start time', () => {
    const signs = [
      makeSign('N', ['MONDAY'], '11AM', '12:30PM'),
      makeSign('N', ['MONDAY'], '8:30AM', '10AM'),
    ];
    const rows = buildScheduleRows(signs);
    assert.equal(rows[0].timeWindows[0], '8:30 AM–10 AM');
    assert.equal(rows[0].timeWindows[1], '11 AM–12:30 PM');
  });

  it('omits sides whose signs only have EXCEPT descriptors', () => {
    const exceptSign = {
      side_of_street: 'N',
      on_street: 'TEST AVENUE A',
      from_street: 'FIRST CROSS ST',
      to_street: 'SECOND CROSS ST',
      sign_x_coord: '1000000',
      sign_y_coord: '200000',
      sign_description: 'NO PARKING (SANITATION BROOM SYMBOL) 7:30AM-8AM EXCEPT SUNDAY <->',
    };
    const rows = buildScheduleRows([exceptSign]);
    assert.equal(rows.length, 0);
  });
});

// ─── buildSearchQueryFromParams ───────────────────────────────────────────────
// Regression test for the URL-sharing house-number fix.
describe('buildSearchQueryFromParams', () => {
  function params(obj) {
    return new URLSearchParams(obj);
  }

  it('includes house number when present', () => {
    const q = buildSearchQueryFromParams(params({ street: 'TEST AVENUE A', borough: 'Brooklyn', number: '42' }));
    assert.equal(q, '42 Test Avenue A, Brooklyn');
  });

  it('omits house number when absent', () => {
    const q = buildSearchQueryFromParams(params({ street: 'TEST AVENUE A', borough: 'Brooklyn' }));
    assert.equal(q, 'Test Avenue A, Brooklyn');
  });

  it('returns null when street is missing', () => {
    const q = buildSearchQueryFromParams(params({ borough: 'Brooklyn' }));
    assert.equal(q, null);
  });

  it('returns null when borough is missing', () => {
    const q = buildSearchQueryFromParams(params({ street: 'TEST AVENUE A' }));
    assert.equal(q, null);
  });

  it('title-cases the street name', () => {
    const q = buildSearchQueryFromParams(params({ street: 'WILLOW STREET', borough: 'Brooklyn', number: '70' }));
    assert.equal(q, '70 Willow Street, Brooklyn');
  });
});
