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
const {
  buildSourceIndex,
  buildSourceIndexMulti,
  buildFirstTokenIndex,
  lookupPage,
  countPageFields,
} = require('./lib/page-fingerprint');

const ROOT = path.resolve(__dirname, '..');
// Two-tier source strategy for propers/sanctoral:
//   PRIMARY = narrow scoped (propers_full.txt + hymns_full.txt p.795+).
//     Avoids false positives where a SHORT gospel-canticle antiphon
//     coincides with the same Gospel verse quoted earlier in the readings
//     section (lookupPage's Math.min picks the wrong earlier page).
//   FALLBACK = whole-book full_pdf.txt. Only used for entries that PRIMARY
//     can't match, AND only with a tight safeAmbiguousMin (≥15) to keep
//     short-text false positives out. Catches saint-specific propers (e.g.
//     optional-memorials) whose text only appears in the sanctoral pages.
const SOURCES = [
  path.join(ROOT, 'parsed_data/propers/propers_full.txt'),
  path.join(ROOT, 'parsed_data/hymns/hymns_full.txt'),
];
const FALLBACK_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt');

const TARGET_FILES = [
  'src/data/loth/propers/ordinary-time.json',
  'src/data/loth/propers/advent.json',
  'src/data/loth/propers/christmas.json',
  'src/data/loth/propers/lent.json',
  'src/data/loth/propers/easter.json',
  'src/data/loth/sanctoral/solemnities.json',
  'src/data/loth/sanctoral/feasts.json',
  'src/data/loth/sanctoral/memorials.json',
  'src/data/loth/sanctoral/optional-memorials.json',
];

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
// Lookup that falls back to the whole-book index when the narrow source
// can't find a match. Fallback uses a higher safeAmbiguousMin to avoid
// short-text false positives (gospel quotes etc.).
function lookupWithFallback(text, primary, fallback) {
  const p = lookupPage(text, primary.tokens, primary.fti);
  if (p !== null) return p;
  if (!fallback) return null;
  return lookupPage(text, fallback.tokens, fallback.fti, { safeAmbiguousMin: 15 });
}

function annotate(node, primary, fallback, stats) {
  const tokens = primary.tokens;
  const firstTokenIndex = primary.fti;
  if (Array.isArray(node)) {
    for (const item of node) annotate(item, primary, fallback, stats);
    return;
  }
  if (!node || typeof node !== 'object') return;

  // First, recurse so nested HourPropers (e.g. a sanctoral entry that also
  // has lauds/vespers/vespers2 sub-objects) get processed too.
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (v && typeof v === 'object') {
      annotate(v, primary, fallback, stats);
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
    const page = lookupWithFallback(text, primary, fallback);
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
      const page = lookupWithFallback(first, primary, fallback);
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
      const page = lookupWithFallback(candidate, primary, fallback);
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

  // responsory: short versicle + response. Each line on its own is usually
  // too short to disambiguate, so try (versicle + " " + response) first,
  // then fall back to versicle alone, then response alone.
  if (
    node.responsory &&
    typeof node.responsory === 'object' &&
    !Array.isArray(node.responsory)
  ) {
    const r = node.responsory;
    const v = typeof r.versicle === 'string' ? r.versicle.trim() : '';
    const resp = typeof r.response === 'string' ? r.response.trim() : '';
    const tries = [];
    if (v && resp) tries.push(`${v} ${resp}`);
    if (v) tries.push(v);
    if (resp) tries.push(resp);

    let page = null;
    for (const t of tries) {
      page = lookupWithFallback(t, primary, fallback);
      if (page !== null) break;
    }
    if (tries.length > 0) {
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
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Indexing primary source:');
  for (const s of SOURCES) console.log('  -', path.relative(ROOT, s));
  const primaryTokens = buildSourceIndexMulti(SOURCES);
  const primaryFti = buildFirstTokenIndex(primaryTokens);
  const primary = { tokens: primaryTokens, fti: primaryFti };
  console.log(`  ${primaryTokens.length.toLocaleString()} tokens, ${primaryFti.size.toLocaleString()} unique`);

  let fallback = null;
  if (fs.existsSync(FALLBACK_PDF)) {
    console.log('Indexing fallback source:', path.relative(ROOT, FALLBACK_PDF));
    const fbTokens = buildSourceIndex(FALLBACK_PDF);
    const fbFti = buildFirstTokenIndex(fbTokens);
    fallback = { tokens: fbTokens, fti: fbFti };
    console.log(`  ${fbTokens.length.toLocaleString()} tokens, ${fbFti.size.toLocaleString()} unique`);
  }

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
    annotate(data, primary, fallback, stats);

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
