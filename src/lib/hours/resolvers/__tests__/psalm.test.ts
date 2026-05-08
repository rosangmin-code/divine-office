import { describe, it, expect, vi } from 'vitest'
import type { PsalmEntry } from '../../../types'

// Mock external dependencies so the resolver runs in isolation with
// predictable inputs. The resolver pulls stanza text from loadPsalterTexts;
// we return a minimal stub so the fulfilled path is exercised. bible-loader
// is a backup fallback that should not fire when stanzas are present.
vi.mock('../../loaders', () => ({
  loadPsalterTexts: () => ({
    'Psalm 63:2-9': {
      stanzas: [['Эзэн, Та бол миний Бурхан.']],
      psalmPrayer: undefined,
      psalmPrayerPage: undefined,
    },
    // F-X2 Phase 1 (#219) anchor — Psalm 92:2-9 catalog default = 280
    // (W2-SAT-Lauds, the first occurrence). The W4 occurrence carries
    // its own `psalmPrayerPage: 506` on the week-4.json entry which the
    // resolver's nullish-coalesce should prefer.
    'Psalm 92:2-9': {
      stanzas: [['ЭЗЭНд талархлыг өргөх нь сайн.']],
      psalmPrayer: 'Эзэн минь, Та ичгүүрийг минь биднээс…',
      psalmPrayerPage: 280,
    },
    // F-X2 Phase 2 (#224) anchor — Psalm 51:3-19 catalog default = 144
    // (W1-FRI-Lauds). W2/W3/W4 occurrences carry per-occurrence overrides
    // (265/377/490) on their week-N.json entries.
    'Psalm 51:3-19': {
      stanzas: [['Тэнгэрбурхан минь, намайг нигүүлсээч.']],
      psalmPrayer: 'Эцэг минь, биднийг аварч…',
      psalmPrayerPage: 144,
    },
    // F-X2 Phase 2 (#224) anchor — Psalm 110:1-5, 7 catalog default = 69
    // (W1-SUN-Vespers). W3/W4 occurrences carry overrides (305/416).
    // F-X2 Phase 3 (#352) — W2 occurrence additionally overrides the
    // prayer *text* (PDF p.186 prints a wholly different body).
    'Psalm 110:1-5, 7': {
      stanzas: [['ЭЗЭН миний Эзэнд "Миний баруун гарт залрагтун" гэв.']],
      psalmPrayer: '"Эцэг минь, амар амгалан ба ялалтыг бидэнд хайрлаж…',
      psalmPrayerPage: 69,
    },
    // F-X2 Phase 3 (#352) — Psalm 100:1-5 W3-FRI-Lauds emergent text+page
    // mismatch. Catalog default is the W1-FRI-Lauds prayer (page 148);
    // W3 occurrence carries its own text + page on week-3.json.
    'Psalm 100:1-5': {
      stanzas: [['Бүх дэлхий Эзэнд хашхирагтун.']],
      psalmPrayer: 'Эзэн, баяр баясгалангаар бид Таныг дуудаж…',
      psalmPrayerPage: 148,
    },
    // F-X2 Phase 3 (#352) — Psalm 147:12-20 W4-FRI-Lauds emergent text+page
    // mismatch. Catalog default is the W2-FRI-Lauds prayer (page 268);
    // W4 occurrence carries its own text + page on week-4.json (PDF p.493
    // spans 493→494).
    'Psalm 147:12-20': {
      stanzas: [['Йерусалим аа, Эзэнийг магт.']],
      psalmPrayer: 'Эзэн, Та Йерусалимын хил хязгаарт амар тайвныг тогтоосон…',
      psalmPrayerPage: 268,
    },
    // F-X2 Phase 2 (#224) — Bible-fallback path anchor (review I-1).
    // `stanzas` is empty so resolvePsalm enters the Bible-fallback branch
    // (line 109-125) where the same nullish-coalesce semantics must hold.
    'Psalm 200:1-3': {
      stanzas: [],
      psalmPrayer: 'Synthetic prayer for fallback path test.',
      psalmPrayerPage: 999, // catalog default
    },
  }),
}))

// F-X2 Phase 3 (#352) — surface non-null `psalmPrayerRich` for the 3 refs
// that gain Phase 3 entry-level text overrides. The R-1 suppression
// assertion needs the loader to *return something* in the no-override
// branch so we can prove the override branch returns `undefined` instead
// (otherwise both branches would be vacuously `undefined` and the test
// could not distinguish suppression from natural absence).
const SENTINEL_RICH_AST = {
  blocks: [{ kind: 'para' as const, lines: ['CATALOG_RICH_AST_SENTINEL'] }],
}
vi.mock('../../../prayers/rich-overlay', () => ({
  loadPsalterTextRich: () => null,
  loadPsalterTextPsalmPrayerRich: (ref: string) =>
    ref === 'Psalm 110:1-5, 7' ||
    ref === 'Psalm 100:1-5' ||
    ref === 'Psalm 147:12-20' ||
    // #359 F-2 — surface SENTINEL for the Bible-fallback synthetic ref so
    // the Phase 3 fallback parity test can ACTIVELY prove R-1 suppression
    // (override path returns undefined while the loader still has rich
    // available); previously the loader returned null here making both
    // suppression and natural-absence vacuously equal.
    ref === 'Psalm 200:1-3'
      ? SENTINEL_RICH_AST
      : null,
  loadPsalterHeaderRich: () => null,
}))

vi.mock('../../../bible-loader', () => ({
  // Bible-fallback path returns a single synthetic verse so allVerses.length > 0
  // and the resolver reaches the second return site (line 109).
  // parseScriptureRef normalizes the book name to lowercase ('Psalm' → 'psalm').
  lookupRef: (ref: { book: string; chapter: number }) =>
    ref.book === 'psalm' && ref.chapter === 200
      ? { texts: [{ verse: 1, text: 'Synthetic verse for fallback test.' }] }
      : null,
}))

import { resolvePsalm } from '../psalm'

const baseEntry: PsalmEntry = {
  type: 'psalm',
  ref: 'Psalm 63:2-9',
  antiphon_key: 'w3-thu-vespers-ps2',
  default_antiphon: 'Эзэн бол миний хүч бөгөөд миний аврал.',
  gloria_patri: true,
}

describe('resolvePsalm — seasonal antiphon selection chain', () => {
  it('falls back to default_antiphon + append-Alleluia during Easter when no variant/override', async () => {
    const result = await resolvePsalm(
      baseEntry,
      undefined,
      'EASTER',
      '2026-04-23',
      'THU',
      3,
    )
    expect(result.antiphon).toBe(
      'Эзэн бол миний хүч бөгөөд миний аврал. Аллэлуяа!',
    )
  })

  it('prefers PDF seasonal_antiphons.easter over default and SKIPS append-Alleluia', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан Эзэн бидний хүч. Аллэлуяа!' },
    }
    const result = await resolvePsalm(entry, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(result.antiphon).toBe('Амилсан Эзэн бидний хүч. Аллэлуяа!')
  })

  it('per-Sunday easterSunday[week] wins over easter season-general on matching SUN+week', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн. Аллэлуяа!',
        easterSunday: { 3: '3 дахь Ням гарагийн Pascha. Аллэлуяа!' },
      },
    }
    const result = await resolvePsalm(entry, undefined, 'EASTER', '2026-04-19', 'SUN', 3)
    expect(result.antiphon).toBe('3 дахь Ням гарагийн Pascha. Аллэлуяа!')
  })

  it('overrides outrank seasonal_antiphons (sanctoral/seasonal propers win)', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'PDF variant. Аллэлуяа!',
        easterSunday: { 3: 'Per-Sunday. Аллэлуяа!' },
      },
    }
    const overrides = { 'w3-thu-vespers-ps2': 'Sanctoral override antiphon' }
    const result = await resolvePsalm(entry, overrides, 'EASTER', '2026-04-19', 'SUN', 3)
    expect(result.antiphon).toBe('Sanctoral override antiphon. Аллэлуяа!')
  })

  it('applies adventDec17_23 variant only within the date window', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        advent: 'Жирийн Ирэлтийн variant.',
        adventDec17_23: 'О Мэргэн ухаан, биднийг удирд.',
      },
    }
    // Inside 12/17-23 → date-specific wins over season general
    const inside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-20', 'SAT', 3)
    expect(inside.antiphon).toBe('О Мэргэн ухаан, биднийг удирд.')
    // Outside window → season general 'advent' fires
    const outside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-10', 'WED', 2)
    expect(outside.antiphon).toBe('Жирийн Ирэлтийн variant.')
  })

  it('adventDec24 triggers on 12/24 only', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        adventDec17_23: 'О Мэргэн ухаан.',
        adventDec24: 'Өнөөдөр Эзэний ирэлтийн босгон дээр.',
      },
    }
    const dec24 = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-24', 'WED', 4)
    expect(dec24.antiphon).toBe('Өнөөдөр Эзэний ирэлтийн босгон дээр.')
    const dec23 = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-23', 'TUE', 4)
    expect(dec23.antiphon).toBe('О Мэргэн ухаан.')
  })

  it('per-Sunday lentSunday[week] picked on LENT Sunday; weekday falls through to default', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        lentSunday: { 1: '1 дэх Ням гарагийн Lent онцгой.' },
      },
    }
    const sun = await resolvePsalm(entry, undefined, 'LENT', '2026-02-22', 'SUN', 1)
    expect(sun.antiphon).toBe('1 дэх Ням гарагийн Lent онцгой.')
    // Weekday in LENT — no season-wide marker → default passes through (no append, LENT doesn't add Alleluia)
    const wed = await resolvePsalm(entry, undefined, 'LENT', '2026-03-04', 'WED', 1)
    expect(wed.antiphon).toBe(baseEntry.default_antiphon)
  })

  it('does not consult seasonal_antiphons for ORDINARY_TIME even when present', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан... Аллэлуяа!' },
    }
    const result = await resolvePsalm(entry, undefined, 'ORDINARY_TIME', '2026-06-15', 'MON', 11)
    expect(result.antiphon).toBe(baseEntry.default_antiphon)
  })

  // @fr FR-155 Phase 3
  it('Passion Sunday (LENT SUN week 5) picks lentPassionSunday over lentSunday[5]', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        lentSunday: { 5: 'Lent 5th generic.' },
        lentPassionSunday: 'Христ жанчигдаж, гутаан доромжлогдсон.',
      },
    }
    // Passion Sunday 2026-03-29 (Lent week 5)
    const passion = await resolvePsalm(entry, undefined, 'LENT', '2026-03-29', 'SUN', 5)
    expect(passion.antiphon).toBe('Христ жанчигдаж, гутаан доромжлогдсон.')
  })

  // @fr FR-155 Phase 3
  it('easterAlt fallback fires only when easter is absent/empty', async () => {
    // easter absent → easterAlt chosen, append-Alleluia SKIPPED (PDF variant)
    const altOnly: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easterAlt: 'Үхлээс амилсан Христ. Аллэлуяа!' },
    }
    const r1 = await resolvePsalm(altOnly, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(r1.antiphon).toBe('Үхлээс амилсан Христ. Аллэлуяа!')
    // easter present → easterAlt ignored
    const bothPresent: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Primary. Аллэлуяа!',
        easterAlt: 'Alternate.',
      },
    }
    const r2 = await resolvePsalm(bothPresent, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(r2.antiphon).toBe('Primary. Аллэлуяа!')
  })
})

// @fr FR-NEW (F-X2 Phase 1) — task #219
// Lean Option A: occurrence-specific psalmPrayerPage override on the
// PsalmEntry (week-N.json) wins over the catalog default
// (psalter-texts.json). Backward-compat: entries without override use
// the catalog page unchanged.
describe('resolvePsalm — F-X2 Phase 1 psalmPrayerPage occurrence override', () => {
  // @fr FR-NEW (F-X2 Phase 1)
  it('W4-SAT-Lauds Psalm 92:2-9 override picks page 506 over catalog default 280', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'w4-sat-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 505,
      psalmPrayerPage: 506, // ← week-4.json occurrence override
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(506)
  })

  // @fr FR-NEW (F-X2 Phase 1)
  it('W2-SAT-Lauds Psalm 92:2-9 (no override) keeps catalog default 280 — regression guard', async () => {
    // W2 entry has no `psalmPrayerPage` — resolver must fall back to
    // psalter-texts.json default. Guards against accidentally
    // promoting the W4 override to a global default.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'w2-sat-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 279,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(280)
  })

  // @fr FR-NEW (F-X2 Phase 1)
  it('PsalmEntry without override leaves resolver using catalog default (backward-compat)', async () => {
    // Generic backward-compat anchor — any pre-pilot PsalmEntry that
    // does not declare psalmPrayerPage continues to surface the
    // psalter-texts catalog page exactly as before.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'any-other-key',
      default_antiphon: '',
      gloria_patri: true,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(280)
  })
})

// @fr FR-NEW (F-X2 Phase 2) — task #224
// Phase 2 batch lands per-occurrence `psalmPrayerPage` overrides on 12 PsalmEntry
// across 9 multi-occurrence keys (week-{2,3,4}.json). Anchors below pin a sample
// of the new occurrences so a future regression that drops the override or wires
// the resolver to ignore it surfaces immediately. They also extend the Phase 1
// review I-1 follow-up by adding a Bible-fallback-path anchor (resolver line 109).
describe('resolvePsalm — F-X2 Phase 2 multi-occurrence overrides', () => {
  // @fr FR-NEW (F-X2 Phase 2)
  it('W4-FRI-Lauds Psalm 51:3-19 override picks page 490 over catalog default 144', async () => {
    // Audit estimate was 489 (psalm body 488 +1); PDF-verified 490 (+2).
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 51:3-19',
      antiphon_key: 'w4-fri-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 488,
      psalmPrayerPage: 490, // ← week-4.json occurrence override (PDF-verified)
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(490)
  })

  // @fr FR-NEW (F-X2 Phase 2)
  it('W3-SUN-Vespers Psalm 110:1-5, 7 override picks page 305 over catalog default 69', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w3-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 304,
      psalmPrayerPage: 305, // ← week-3.json occurrence override
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(305)
  })

  // @fr FR-NEW (F-X2 Phase 2)
  it('W1-SUN-Vespers Psalm 110:1-5, 7 (no override) keeps catalog default 69', async () => {
    // The catalog ref's "first occurrence" (W1) intentionally keeps no override —
    // both the W1 entry and the catalog default agree on 69. Guards against a
    // future migration accidentally promoting a later-week override into W1.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w1-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 68,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(69)
  })

  // @fr FR-NEW (F-X2 Phase 2) — review I-1 follow-up
  it('Bible-fallback path also honors per-occurrence psalmPrayerPage override', async () => {
    // When psalter-texts.json has the ref but stanzas[] is empty, resolvePsalm
    // skips the PDF-stanza branch and falls through to the Bible-fallback
    // return site (psalm.ts:109-125). The same nullish-coalesce on
    // `entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage` must hold there.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-anchor-key',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      psalmPrayerPage: 1234, // override should win
    }
    const result = await resolvePsalm(entry, undefined)
    // verses[] populated from bible-loader mock → confirms fallback branch ran
    expect(result.verses?.length).toBeGreaterThan(0)
    expect(result.psalmPrayerPage).toBe(1234)
  })

  // @fr FR-NEW (F-X2 Phase 2) — review I-1 follow-up
  it('Bible-fallback path without override falls back to catalog page', async () => {
    // No `psalmPrayerPage` on the entry → resolver must surface the catalog
    // default (999) via the fallback site too. Pairs with the previous test
    // to confirm both branches of the ?? operator at psalm.ts:122.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-anchor-key',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.verses?.length).toBeGreaterThan(0)
    expect(result.psalmPrayerPage).toBe(999)
  })
})

// @fr FR-NEW (F-X2 Phase 3) — task #352
// Phase 3 lands joint text+page overrides on 3 emergent occurrences whose
// PDF prints a wholly different `Дууллыг төгсгөх залбирал` body than the
// catalog default. Schema (Option A): optional `psalmPrayer?: string` on
// PsalmEntry. Strategy R-1 (peer R2 AGREE): when the override is set,
// resolver suppresses `psalmPrayerRich` so the renderer falls back to the
// plain-text path — preventing rendering of the catalog rich AST (which
// encodes the W1-default text) alongside the override body. See
// docs/handoff-fx2-phase3-audit-2026-05-08.md §1-3 for verbatim PDF
// sources and consensus log.
describe('resolvePsalm — F-X2 Phase 3 psalmPrayer text override (Option A + R-1)', () => {
  // Verbatim PDF strings (parsed_data/full_pdf.txt). Exact byte-equality
  // with what week-{2,3,4}.json now carries — a future drift between catalog,
  // entry, or PDF will surface as a literal string mismatch.
  const PDF_TEXT_PSALM_110_W2 =
    'Төгс хүчит Тэнгэрбурхан минь, Та Өөрийн тосолсон Нэгэн болох Христийн хаанчлалыг бүрэн төгс болгоно уу. Шинэ Йерусалимын мөнхийн тахилч болсон Таны Хүүгийн төгс тахил нь газар бүрт Таны нэрээр өргөгдөх болтугай. Мөн Та бүх үндэстнүүдийг Өөрийнхөө төлөөх ариун хүмүүс болгоно уу.'
  const PDF_TEXT_PSALM_100_W3 =
    'Бидэнд хайртай Эцэг Тэнгэрбурхан минь, Та ид хүчнийхээ тэмдгийг үзүүлснээрээ биднийг бүтээсэн төдийгүй Өөрийнхөө сайн сайхныг харуулснаараа биднийг Өөрийн ард түмнээр сонгосон билээ. Хамаг хүмүүс Таны хашаанд магтаалтайгаар орохын тулд Та охид хөвгүүдийнхээ өргөж буй дуун магтаалыг минь хүлээн авна уу.'
  const PDF_TEXT_PSALM_147_W4 =
    'Төгс хүчит Тэнгэрбурхан минь, хишиг ивээлээр бялхаасан ба Ариун Сүнсээр хүчирхэгжүүлсэн Шашнаараа уламжлан Та Өөрийн үгийг бүх үндэстэн рүү илгээдэг. Тиймийн тул Та Өөрийн Шашныг дээдийн дээд амин зуулгаар тэжээн тэтгэж, итгэл бишрэлдээ эргэлзээгүй болгоно уу. Түүнчлэн Та түүний охид хөвгүүдийг олон болгож өгнө үү. Ингэснээр тэд тэнгэр дээрх тахилын ширээн дээр Таны хайрын нууцуудыг нэгэн сэтгэлээр тэмдэглэх болно.'

  // @fr FR-NEW (F-X2 Phase 3)
  it('Psalm 110:1-5,7 W2-SUN-Vespers — override emits PDF text + page 186 + suppresses rich', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w2-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 185,
      psalmPrayer: PDF_TEXT_PSALM_110_W2,
      psalmPrayerPage: 186,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayer).toBe(PDF_TEXT_PSALM_110_W2)
    expect(result.psalmPrayerPage).toBe(186)
    // R-1: rich must be suppressed even though the loader mock returns a
    // non-null AST for this ref — proves the override branch wins.
    expect(result.psalmPrayerRich).toBeUndefined()
  })

  // @fr FR-NEW (F-X2 Phase 3)
  it('Psalm 100:1-5 W3-FRI-Lauds — override emits PDF text + page 380 + suppresses rich', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 100:1-5',
      antiphon_key: 'w3-fri-lauds-ps3',
      default_antiphon: '',
      gloria_patri: true,
      page: 379,
      psalmPrayer: PDF_TEXT_PSALM_100_W3,
      psalmPrayerPage: 380,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayer).toBe(PDF_TEXT_PSALM_100_W3)
    expect(result.psalmPrayerPage).toBe(380)
    expect(result.psalmPrayerRich).toBeUndefined()
  })

  // @fr FR-NEW (F-X2 Phase 3)
  it('Psalm 147:12-20 W4-FRI-Lauds — override emits PDF text + page 493 + suppresses rich', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 147:12-20',
      antiphon_key: 'w4-fri-lauds-ps3',
      default_antiphon: '',
      gloria_patri: true,
      page: 492,
      psalmPrayer: PDF_TEXT_PSALM_147_W4,
      psalmPrayerPage: 493,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayer).toBe(PDF_TEXT_PSALM_147_W4)
    expect(result.psalmPrayerPage).toBe(493)
    expect(result.psalmPrayerRich).toBeUndefined()
  })

  // @fr FR-NEW (F-X2 Phase 3) — R-1 negative pair
  it('Same ref without psalmPrayer override keeps catalog rich (proves suppression is conditional)', async () => {
    // Same ref as the W2 case above, but no entry-level psalmPrayer override.
    // Resolver must surface the loader-supplied SENTINEL_RICH_AST so we
    // *prove* the previous tests' `undefined` is the suppression branch
    // rather than vacuous absence. Also covers the W1 occurrence position
    // where catalog rich+plain remain authoritative.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w1-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 68,
      // intentionally no psalmPrayer / psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayer).toBe('"Эцэг минь, амар амгалан ба ялалтыг бидэнд хайрлаж…')
    expect(result.psalmPrayerPage).toBe(69)
    // #359 F-1 — pin SENTINEL identity (was toBeDefined). Proves the
    // no-override branch surfaces the loader-supplied AST, so the
    // positive tests' `toBeUndefined()` is observably the suppression
    // branch rather than vacuous absence.
    expect(result.psalmPrayerRich).toBe(SENTINEL_RICH_AST)
  })

  // @fr FR-NEW (F-X2 Phase 3) — Bible-fallback parity (override path)
  it('Bible-fallback path also suppresses rich when entry.psalmPrayer is set', async () => {
    // Mirrors the Phase 2 review I-1 follow-up but for the Phase 3 R-1
    // invariant — fallback site (psalm.ts:115-141) must apply the same
    // suppression so a catalog-less occurrence still renders coherently.
    // #359 F-2 — loader mock now returns SENTINEL for Psalm 200:1-3, so
    // `toBeUndefined()` here ACTIVELY proves the suppression branch ran
    // (the negative pair below surfaces SENTINEL on the same fallback
    // path, distinguishing suppression from natural absence).
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-phase3',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      psalmPrayer: 'Bible-fallback path Phase 3 override.',
      psalmPrayerPage: 1234,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.verses?.length).toBeGreaterThan(0) // confirms fallback branch
    expect(result.psalmPrayer).toBe('Bible-fallback path Phase 3 override.')
    expect(result.psalmPrayerPage).toBe(1234)
    expect(result.psalmPrayerRich).toBeUndefined()
  })

  // @fr FR-NEW (F-X2 Phase 3) — Bible-fallback negative pair (#359 F-2)
  it('Bible-fallback path surfaces catalog rich when entry.psalmPrayer is absent', async () => {
    // Mirror of the negative pair on the catalog return site — when
    // there is no override, the resolver MUST surface the loader-supplied
    // SENTINEL_RICH_AST so the override-path test's `toBeUndefined()`
    // is observably the suppression branch rather than the natural-
    // absence branch (R-1 contract proven across BOTH return sites).
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-phase3-no-override',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      // intentionally no psalmPrayer / psalmPrayerPage — so the catalog
      // default (text from loader stub, page 999) wins and rich surfaces.
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.verses?.length).toBeGreaterThan(0) // confirms fallback branch
    expect(result.psalmPrayer).toBe('Synthetic prayer for fallback path test.')
    expect(result.psalmPrayerPage).toBe(999)
    expect(result.psalmPrayerRich).toBe(SENTINEL_RICH_AST)
  })
})
