#!/usr/bin/env node
/**
 * extract-propers-pages.js
 *
 * Annotates propers/sanctoral JSON files with PDF page numbers by matching
 * Mongolian text fingerprints against the page-marked extraction in
 * parsed_data/propers/propers_full.txt.
 *
 * Strategy:
 *   1. Tokenize propers_full.txt into a flat token stream while tracking
 *      which page each token belongs to. A "token" is a whitespace-separated
 *      word; bare integer lines (e.g. "491") flip the current page.
 *   2. For every text field we want to annotate (concludingPrayer,
 *      gospelCanticleAntiphon, alternativeConcludingPrayer, intercessions,
 *      shortReading.text, responsory.versicle), build a fingerprint from the
 *      first ~6-8 normalized tokens and locate it in the token stream.
 *   3. Write the matched page back into the JSON via the appropriate
 *      `*Page` field (or `page` for shortReading/responsory objects).
 *
 * Existing text fields are left untouched. Existing `*Page` values are
 * overwritten only if a match is found; otherwise they are preserved.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_TXT = path.join(ROOT, 'parsed_data/propers/propers_full.txt');

const TARGET_FILES = [
  'src/data/loth/propers/ordinary-time.json',
  'src/data/loth/propers/advent.json',
  'src/data/loth/propers/christmas.json',
  'src/data/loth/propers/lent.json',
  'src/data/loth/propers/easter.json',
  'src/data/loth/sanctoral/solemnities.json',
  'src/data/loth/sanctoral/feasts.json',
  'src/data/loth/sanctoral/memorials.json',
];

// ---------------------------------------------------------------------------
// Source text indexing
// ---------------------------------------------------------------------------

/**
 * Normalize a chunk of text into lower-case Mongolian/Cyrillic-friendly
 * tokens. Punctuation and stray symbols are stripped so the JSON's
 * "Аяа, ..." matches the PDF's "Аяа,..." with line breaks etc.
 */
function tokenize(s) {
  if (!s) return [];
  return s
    .toLowerCase()
    .normalize('NFC')
    // keep Cyrillic letters, latin letters, digits; everything else -> space
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function buildSourceIndex(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let currentPage = null;
  // tokens[i] = { token, page }
  const tokens = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // bare integer line == page marker. Source pages are 3-4 digits.
    if (/^\d{1,4}$/.test(trimmed)) {
      currentPage = parseInt(trimmed, 10);
      continue;
    }
    const lineTokens = tokenize(trimmed);
    for (const t of lineTokens) {
      tokens.push({ token: t, page: currentPage });
    }
  }
  return tokens;
}

/**
 * Build a quick lookup: first-token -> array of indices in `tokens` where
 * that token appears. Used to seed the windowed comparison without scanning
 * the whole stream for every fingerprint.
 */
function buildFirstTokenIndex(tokens) {
  const map = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].token;
    if (!map.has(t)) map.set(t, []);
    map.get(t).push(i);
  }
  return map;
}

/**
 * Find ALL positions in `tokens` where the next `needle.length` tokens
 * exactly equal `needle`. Returns array of pages.
 */
function findAllPagesForFingerprint(needle, tokens, firstTokenIndex) {
  if (needle.length === 0) return [];
  const candidates = firstTokenIndex.get(needle[0]);
  if (!candidates) return [];
  const pages = [];
  outer: for (const start of candidates) {
    if (start + needle.length > tokens.length) continue;
    for (let j = 1; j < needle.length; j++) {
      if (tokens[start + j].token !== needle[j]) continue outer;
    }
    pages.push(tokens[start].page);
  }
  return pages;
}

/**
 * Take a JSON text field and try to match it against the source token
 * stream.
 *
 * Strategy:
 *  - Start with a long fingerprint (up to 25 tokens or the whole text).
 *    Shrink one token at a time until it matches at least once.
 *  - If the matching fingerprint uniquely identifies a single page, take
 *    it. If it matches multiple positions on the SAME page, take that
 *    page.
 *  - If the matching fingerprint matches MULTIPLE distinct pages, that's
 *    OK so long as we found it at the LONG length — long match across
 *    pages means the same text is genuinely printed multiple times in the
 *    PDF (common for repeated Lenten responsories) and we just pick the
 *    earliest page as a representative.
 *  - We refuse short ambiguous matches (< 10 tokens hitting multiple
 *    distinct pages), since those are usually false-positive prefix
 *    collisions on common prayer openings like "Аяа, Тэнгэрбурхан...".
 */
function lookupPage(text, tokens, firstTokenIndex) {
  const all = tokenize(text);
  if (all.length === 0) return null;

  const SAFE_AMBIGUOUS_MIN = 10; // shorter than this, only accept unique matches
  const maxLen = Math.min(all.length, 25);

  for (let len = maxLen; len >= 3; len--) {
    if (len > all.length) continue;
    const pages = findAllPagesForFingerprint(all.slice(0, len), tokens, firstTokenIndex);
    if (pages.length === 0) continue;
    const distinct = [...new Set(pages)];
    if (distinct.length === 1) return distinct[0];
    // Multiple distinct pages — accept only if the fingerprint is long
    // enough that collisions imply genuinely repeated PDF text rather
    // than a generic prefix.
    if (len >= SAFE_AMBIGUOUS_MIN) {
      // Pick the earliest page as the representative.
      return Math.min(...distinct);
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// JSON walking
// ---------------------------------------------------------------------------

/**
 * Walk `node` and, whenever it looks like an HourPropers object (i.e. a
 * plain object that may carry concludingPrayer / gospelCanticleAntiphon /
 * intercessions / shortReading / responsory / hymn), enrich it with page
 * numbers in-place.
 *
 * We don't try to match by structural location — we just process every
 * object that has any of the recognized text fields. This works for both
 * the propers (weeks -> day -> hour) and sanctoral (date -> hour) shapes.
 */
function annotate(node, tokens, firstTokenIndex, stats) {
  if (Array.isArray(node)) {
    for (const item of node) annotate(item, tokens, firstTokenIndex, stats);
    return;
  }
  if (!node || typeof node !== 'object') return;

  // First, recurse so nested HourPropers (e.g. a sanctoral entry that also
  // has lauds/vespers/vespers2 sub-objects) get processed too.
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (v && typeof v === 'object') {
      annotate(v, tokens, firstTokenIndex, stats);
    }
  }

  // Then handle the field-level annotations on this node.
  const FIELD_TO_PAGE_KEY = {
    concludingPrayer: 'concludingPrayerPage',
    alternativeConcludingPrayer: 'alternativeConcludingPrayerPage',
    gospelCanticleAntiphon: 'gospelCanticleAntiphonPage',
    hymn: 'hymnPage',
  };

  for (const [textKey, pageKey] of Object.entries(FIELD_TO_PAGE_KEY)) {
    const text = node[textKey];
    if (typeof text !== 'string' || !text.trim()) continue;
    const page = lookupPage(text, tokens, firstTokenIndex);
    if (page !== null) {
      const before = node[pageKey];
      node[pageKey] = page;
      if (before === undefined) stats.added++;
      else if (before !== page) stats.changed++;
      else stats.unchanged++;
      stats.matchedByField[textKey] = (stats.matchedByField[textKey] || 0) + 1;
    } else {
      stats.missedByField[textKey] = (stats.missedByField[textKey] || 0) + 1;
    }
  }

  // intercessions: array of strings — match the FIRST line, which uniquely
  // identifies the intercessions block in the source.
  if (Array.isArray(node.intercessions) && node.intercessions.length > 0) {
    const first = node.intercessions[0];
    if (typeof first === 'string') {
      const page = lookupPage(first, tokens, firstTokenIndex);
      if (page !== null) {
        const before = node.intercessionsPage;
        node.intercessionsPage = page;
        if (before === undefined) stats.added++;
        else if (before !== page) stats.changed++;
        else stats.unchanged++;
        stats.matchedByField.intercessions = (stats.matchedByField.intercessions || 0) + 1;
      } else {
        stats.missedByField.intercessions = (stats.missedByField.intercessions || 0) + 1;
      }
    }
  }

  // shortReading object: match by `text`, fall back to `ref`. Page lives on
  // the object itself.
  if (
    node.shortReading &&
    typeof node.shortReading === 'object' &&
    !Array.isArray(node.shortReading)
  ) {
    const sr = node.shortReading;
    const candidate = typeof sr.text === 'string' && sr.text.trim() ? sr.text : sr.ref;
    if (typeof candidate === 'string' && candidate.trim()) {
      const page = lookupPage(candidate, tokens, firstTokenIndex);
      if (page !== null) {
        const before = sr.page;
        sr.page = page;
        if (before === undefined) stats.added++;
        else if (before !== page) stats.changed++;
        else stats.unchanged++;
        stats.matchedByField.shortReading = (stats.matchedByField.shortReading || 0) + 1;
      } else {
        stats.missedByField.shortReading = (stats.missedByField.shortReading || 0) + 1;
      }
    }
  }

  // responsory: short verse + response — match on the versicle. Page lives
  // on the object.
  if (
    node.responsory &&
    typeof node.responsory === 'object' &&
    !Array.isArray(node.responsory)
  ) {
    const r = node.responsory;
    const candidate = typeof r.versicle === 'string' ? r.versicle : null;
    if (candidate && candidate.trim()) {
      const page = lookupPage(candidate, tokens, firstTokenIndex);
      if (page !== null) {
        const before = r.page;
        r.page = page;
        if (before === undefined) stats.added++;
        else if (before !== page) stats.changed++;
        else stats.unchanged++;
        stats.matchedByField.responsory = (stats.matchedByField.responsory || 0) + 1;
      } else {
        stats.missedByField.responsory = (stats.missedByField.responsory || 0) + 1;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Page-field counting (for the "verify" report)
// ---------------------------------------------------------------------------

function countPageFields(node, counter = { total: 0, byKey: {} }) {
  if (Array.isArray(node)) {
    for (const item of node) countPageFields(item, counter);
    return counter;
  }
  if (!node || typeof node !== 'object') return counter;
  for (const [k, v] of Object.entries(node)) {
    if (
      (k === 'page' || k.endsWith('Page')) &&
      typeof v === 'number'
    ) {
      counter.total++;
      counter.byKey[k] = (counter.byKey[k] || 0) + 1;
    }
    if (v && typeof v === 'object') countPageFields(v, counter);
  }
  return counter;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Indexing source:', path.relative(ROOT, SOURCE_TXT));
  const tokens = buildSourceIndex(SOURCE_TXT);
  const firstTokenIndex = buildFirstTokenIndex(tokens);
  console.log(`  ${tokens.length.toLocaleString()} tokens, ${firstTokenIndex.size.toLocaleString()} unique`);

  const grandTotals = { added: 0, changed: 0, unchanged: 0 };

  for (const rel of TARGET_FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.log(`\n[skip] ${rel} (not found)`);
      continue;
    }
    const raw = fs.readFileSync(abs, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`\n[error] Failed to parse ${rel}: ${err.message}`);
      continue;
    }

    const stats = {
      added: 0,
      changed: 0,
      unchanged: 0,
      matchedByField: {},
      missedByField: {},
    };
    annotate(data, tokens, firstTokenIndex, stats);

    const next = JSON.stringify(data, null, 2) + '\n';
    // Re-parse to validate before writing.
    JSON.parse(next);
    fs.writeFileSync(abs, next, 'utf8');

    const counts = countPageFields(data);
    console.log(`\n[ok] ${rel}`);
    console.log(`  added: ${stats.added}, changed: ${stats.changed}, unchanged: ${stats.unchanged}`);
    console.log(`  matched : ${JSON.stringify(stats.matchedByField)}`);
    if (Object.keys(stats.missedByField).length > 0) {
      console.log(`  missed  : ${JSON.stringify(stats.missedByField)}`);
    }
    console.log(`  total page fields now: ${counts.total} ${JSON.stringify(counts.byKey)}`);

    grandTotals.added += stats.added;
    grandTotals.changed += stats.changed;
    grandTotals.unchanged += stats.unchanged;
  }

  console.log('\n=== summary ===');
  console.log(grandTotals);
}

main();
