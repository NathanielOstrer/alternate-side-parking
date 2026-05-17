/* ================================================================
   DATA
================================================================ */
const SUSPENSIONS = [
  // January
  { name: "New Year's Day",                    date: "2026-01-01" },
  { name: "Three Kings' Day",                  date: "2026-01-06" },
  { name: "Martin Luther King Jr. Day",        date: "2026-01-19" },
  // February
  { name: "Lincoln's Birthday",                date: "2026-02-12" },
  { name: "Presidents' Day / Lunar New Year's Eve", date: "2026-02-16" },
  { name: "Lunar New Year",                    date: "2026-02-17" },
  { name: "Ash Wednesday / Losar",             date: "2026-02-18" },
  // March
  { name: "Purim",                             date: "2026-03-03" },
  { name: "Eid al-Fitr",                       date: "2026-03-20" },
  { name: "Eid al-Fitr (2nd day)",             date: "2026-03-21" },
  // April
  { name: "Passover (1st Day) / Holy Thursday", date: "2026-04-02" },
  { name: "Passover (2nd Day) / Good Friday",  date: "2026-04-03" },
  { name: "Passover (7th Day)",                date: "2026-04-08" },
  { name: "Passover (8th Day) / Orthodox Holy Thursday", date: "2026-04-09" },
  { name: "Orthodox Good Friday",              date: "2026-04-10" },
  // May
  { name: "Solemnity of the Ascension",        date: "2026-05-14" },
  { name: "Shavuot (1st Day)",                 date: "2026-05-22" },
  { name: "Shavuot (2nd Day)",                 date: "2026-05-23" },
  { name: "Memorial Day",                      date: "2026-05-25" },
  { name: "Eid al-Adha",                       date: "2026-05-27" },
  { name: "Eid al-Adha (2nd day)",             date: "2026-05-28" },
  // June
  { name: "Juneteenth",                        date: "2026-06-19" },
  // July
  { name: "Independence Day (observed)",       date: "2026-07-03" },
  { name: "Independence Day",                  date: "2026-07-04" },
  { name: "Tisha B'Av",                        date: "2026-07-23" },
  // August
  { name: "Feast of the Assumption",           date: "2026-08-15" },
  // September
  { name: "Labor Day",                         date: "2026-09-07" },
  { name: "Rosh Hashanah (1st Day)",           date: "2026-09-12" },
  { name: "Rosh Hashanah (2nd Day)",           date: "2026-09-13" },
  { name: "Yom Kippur",                        date: "2026-09-21" },
  { name: "Sukkot (1st Day)",                  date: "2026-09-26" },
  { name: "Sukkot (2nd Day)",                  date: "2026-09-27" },
  // October
  { name: "Shemini Atzeret",                   date: "2026-10-03" },
  { name: "Simchat Torah",                     date: "2026-10-04" },
  { name: "Columbus Day / Indigenous Peoples' Day", date: "2026-10-12" },
  // November
  { name: "All Saints' Day",                   date: "2026-11-01" },
  { name: "Election Day",                      date: "2026-11-03" },
  { name: "Diwali",                            date: "2026-11-08" },
  { name: "Veterans Day",                      date: "2026-11-11" },
  { name: "Thanksgiving Day",                  date: "2026-11-26" },
  // December
  { name: "Feast of the Immaculate Conception", date: "2026-12-08" },
  { name: "Christmas Day",                     date: "2026-12-25" },
  // 2027
  { name: "New Year's Day",                    date: "2027-01-01" },
];

const DAYS_FULL  = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ================================================================
   HELPERS
================================================================ */
function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(dateStr, now = new Date()) {
  const d = parseDateStr(dateStr);
  const opts = { weekday:'short', month:'short', day:'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

function daysUntil(dateStr, now = new Date()) {
  const today = parseDateStr(todayStr(now));
  const tgt   = parseDateStr(dateStr);
  return Math.round((tgt - today) / 86400000);
}

function isSuspended(dateStr) {
  return SUSPENSIONS.some(s => s.date === dateStr);
}

function getSuspensionName(dateStr) {
  return SUSPENSIONS.find(s => s.date === dateStr)?.name ?? null;
}

function nextSuspension(now = new Date()) {
  const ts = todayStr(now);
  return SUSPENSIONS.find(s => s.date >= ts) ?? null;
}

// "EAST 9 STREET" → "EAST    9 STREET" (5-char right-justified number)
function normalizeStreetName(name) {
  return name.toUpperCase().replace(/(\s*)(\d+)/, (_, sp, n) => n.padStart(5));
}

function parseSignDesc(desc) {
  if (desc.includes('EXCEPT')) return { days: [], start: null, end: null };
  const days = DAYS_FULL.filter(d => desc.includes(d));
  const tm = desc.match(/(\d{1,2}(?::\d{2})?(?:AM|PM))-(\d{1,2}(?::\d{2})?(?:AM|PM))/);
  return { days, start: tm?.[1] ?? null, end: tm?.[2] ?? null };
}

function toMin(t) {
  if (!t) return null;
  const m = t.match(/(\d{1,2})(?::(\d{2}))?([AP]M)/);
  if (!m) return null;
  let h = parseInt(m[1]), min = parseInt(m[2] || '0');
  if (m[3] === 'PM' && h !== 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function fmtTime(t) {
  if (!t) return '';
  return t.replace(/([AP]M)/, ' $1');
}

function sideLabel(c) { return { N:'North', S:'South', E:'East', W:'West' }[c] ?? c; }
function sideArrow(c) { return { N:'↑', S:'↓', E:'→', W:'←' }[c] ?? '·'; }

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* ================================================================
   GEOMETRY  (EPSG:2263 — NAD83 / NY Long Island, US survey feet)
================================================================ */
function lngLatToStatePlane(lng, lat) {
  const DEG = Math.PI / 180;
  const a   = 6378137.0;           // GRS80 semi-major, metres
  const e2  = 0.00669437999014;    // GRS80 first eccentricity squared
  const e   = Math.sqrt(e2);
  const lat0 = 40.1666666666667 * DEG;
  const lon0 = -74.0             * DEG;
  const lat1 = 41.0333333333333 * DEG;
  const lat2 = 40.6666666666667 * DEG;
  const x0_m = 300000.0;           // false easting in metres (proj4 convention)
  const M2FT = 3937 / 1200;        // 1 m → US survey feet

  const phi = lat * DEG, lam = lng * DEG;
  const mFn = p => Math.cos(p) / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  const tFn = p => { const s = Math.sin(p);
    return Math.tan(Math.PI / 4 - p / 2) / ((1 - e * s) / (1 + e * s)) ** (e / 2); };

  const m1 = mFn(lat1), m2 = mFn(lat2);
  const t0 = tFn(lat0), t1 = tFn(lat1), t2 = tFn(lat2);
  const n   = (Math.log(m1) - Math.log(m2)) / (Math.log(t1) - Math.log(t2));
  const F   = m1 / (n * t1 ** n);
  const rho0 = a * F * t0 ** n;
  const rho  = a * F * tFn(phi) ** n;
  const theta = n * (lam - lon0);

  return [(rho * Math.sin(theta) + x0_m) * M2FT, (rho0 - rho * Math.cos(theta)) * M2FT];
}

// Keep only signs on the same block face as the nearest sign to (lng, lat).
// Falls back to returning all signs if none have coordinates.
function filterSignsToBlockFace(signs, lng, lat) {
  if (!signs.length) return signs;
  const [ax, ay] = lngLatToStatePlane(lng, lat);
  let best = null, bestDist = Infinity;
  for (const s of signs) {
    const x = parseFloat(s.sign_x_coord), y = parseFloat(s.sign_y_coord);
    if (!isFinite(x) || !isFinite(y)) continue;
    const d = (x - ax) ** 2 + (y - ay) ** 2;
    if (d < bestDist) { bestDist = d; best = s; }
  }
  if (!best) return signs;
  const { from_street, to_street, on_street } = best;
  return signs.filter(s =>
    s.from_street === from_street && s.to_street === to_street && s.on_street === on_street
  );
}

// Returns the side_of_street code ('N','S','E','W') whose centroid of sign
// coordinates is nearest to the given click point. Returns null if no signs
// have usable coordinates.
function pickSideFromClick(signs, lng, lat) {
  if (!signs.length) return null;
  const [ax, ay] = lngLatToStatePlane(lng, lat);
  const groups = {};
  for (const s of signs) {
    const x = parseFloat(s.sign_x_coord), y = parseFloat(s.sign_y_coord);
    if (!isFinite(x) || !isFinite(y)) continue;
    const side = s.side_of_street;
    if (!groups[side]) groups[side] = { sumX: 0, sumY: 0, count: 0 };
    groups[side].sumX += x;
    groups[side].sumY += y;
    groups[side].count++;
  }
  const sides = Object.keys(groups);
  if (!sides.length) return null;
  let bestSide = null, bestDist = Infinity;
  for (const side of sides) {
    const { sumX, sumY, count } = groups[side];
    const d = (sumX / count - ax) ** 2 + (sumY / count - ay) ** 2;
    if (d < bestDist) { bestDist = d; bestSide = side; }
  }
  return bestSide;
}

/* ================================================================
   STATUS COMPUTATION
================================================================ */
function computeStatus(signs, now = new Date()) {
  const ts      = todayStr(now);
  const dayFull = DAYS_FULL[now.getDay()];
  const nowMin  = now.getHours() * 60 + now.getMinutes();

  if (isSuspended(ts)) {
    return { state: 'suspended', holidayName: getSuspensionName(ts) };
  }

  for (const s of signs) {
    const { days, start, end } = parseSignDesc(s.sign_description);
    if (!days.includes(dayFull)) continue;
    const sm = toMin(start), em = toMin(end);
    if (sm !== null && em !== null && nowMin >= sm && nowMin < em) {
      return { state: 'active', side: s.side_of_street, start, end, nowMin, endMin: em };
    }
  }

  const upcomingToday = signs.filter(s => {
    const { days, start } = parseSignDesc(s.sign_description);
    return days.includes(dayFull) && toMin(start) > nowMin;
  });
  if (upcomingToday.length > 0) {
    upcomingToday.sort((a, b) => toMin(parseSignDesc(a.sign_description).start) - toMin(parseSignDesc(b.sign_description).start));
    const soonest = upcomingToday[0];
    const { start, end } = parseSignDesc(soonest.sign_description);
    return { state: 'upcoming', side: soonest.side_of_street, start, end };
  }

  const hasTodayCleaning = signs.some(s => parseSignDesc(s.sign_description).days.includes(dayFull));
  if (hasTodayCleaning) {
    return { state: 'clear', reason: 'Cleaning window already passed today' };
  }
  const dow = now.toLocaleDateString('en-US', { weekday: 'long' });
  return { state: 'clear', reason: `No street cleaning on ${dow}s` };
}

/* ================================================================
   DOW + NEXT CLEANING HELPERS
================================================================ */
function getCleaningDOWSet(signs) {
  const s = new Set();
  signs.forEach(sg => parseSignDesc(sg.sign_description).days.forEach(d => s.add(DAYS_FULL.indexOf(d))));
  return s;
}

function nextCleaningInfo(signs, now = new Date()) {
  const todayDOW  = now.getDay();
  const nowMin    = now.getHours() * 60 + now.getMinutes();
  const todayFull = DAYS_FULL[todayDOW];
  const cleanSet  = getCleaningDOWSet(signs);
  if (cleanSet.size === 0) return null;

  if (!isSuspended(todayStr(now))) {
    const todayUpcoming = signs.filter(s => {
      const { days, start } = parseSignDesc(s.sign_description);
      return days.includes(todayFull) && toMin(start) > nowMin;
    });
    if (todayUpcoming.length > 0) {
      todayUpcoming.sort((a, b) => toMin(parseSignDesc(a.sign_description).start) - toMin(parseSignDesc(b.sign_description).start));
      const sg = todayUpcoming[0];
      const { start, end } = parseSignDesc(sg.sign_description);
      return { date: now, isToday: true, side: sg.side_of_street, start, end };
    }
  }

  for (let i = 1; i <= 14; i++) {
    const dow = (todayDOW + i) % 7;
    if (!cleanSet.has(dow)) continue;
    const next = new Date(now);
    next.setDate(now.getDate() + i);
    if (isSuspended(todayStr(next))) continue;
    const dayFull = DAYS_FULL[dow];
    const candidates = signs.filter(s => parseSignDesc(s.sign_description).days.includes(dayFull));
    if (!candidates.length) continue;
    candidates.sort((a, b) => toMin(parseSignDesc(a.sign_description).start) - toMin(parseSignDesc(b.sign_description).start));
    const sg = candidates[0];
    const { start, end } = parseSignDesc(sg.sign_description);
    return { date: next, isToday: false, side: sg.side_of_street, start, end };
  }
  return null;
}

/* ================================================================
   SCHEDULE TABLE BUILDER
================================================================ */
function buildScheduleRows(signs) {
  const groups = {};
  signs.forEach(s => {
    const k = s.side_of_street;
    if (!groups[k]) groups[k] = [];
    groups[k].push(s);
  });

  const rows = [];
  for (const sideCode of ['N','S','E','W']) {
    if (!groups[sideCode]) continue;
    const allDays = new Set();
    const windows = new Map();
    groups[sideCode].forEach(s => {
      const { days, start, end } = parseSignDesc(s.sign_description);
      days.forEach(d => allDays.add(d));
      if (start && end) windows.set(`${start}-${end}`, { start, end });
    });
    if (allDays.size === 0) continue;
    const daysList = DAYS_FULL
      .filter(d => allDays.has(d))
      .map(d => DAYS_SHORT[DAYS_FULL.indexOf(d)])
      .join(' & ');
    const sortedWindows = [...windows.values()].sort((a, b) => toMin(a.start) - toMin(b.start));
    const timeWindows = sortedWindows.map(w => `${fmtTime(w.start)}–${fmtTime(w.end)}`);
    rows.push({ sideCode, daysList, timeWindows });
  }
  return rows;
}

/* ================================================================
   URL PARAM HELPER
================================================================ */
function buildSearchQueryFromParams(params) {
  const street  = params.get('street')  || '';
  const borough = params.get('borough') || '';
  const number  = params.get('number')  || '';
  if (!street || !borough) return null;
  return (number ? number + ' ' : '') + titleCase(street) + ', ' + borough;
}

/* ================================================================
   CommonJS export (Node / tests only — browsers ignore this block)
================================================================ */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUSPENSIONS, DAYS_FULL, DAYS_SHORT,
    todayStr, parseDateStr, fmtDate, daysUntil,
    isSuspended, getSuspensionName, nextSuspension,
    normalizeStreetName, parseSignDesc, toMin, fmtTime,
    sideLabel, sideArrow, titleCase,
    lngLatToStatePlane, filterSignsToBlockFace,
    computeStatus, getCleaningDOWSet, nextCleaningInfo,
    buildScheduleRows, buildSearchQueryFromParams,
    pickSideFromClick,
  };
}
