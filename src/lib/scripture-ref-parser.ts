import type { ScriptureRef, VerseRef } from './types'

const BOOK_NAME_MAP: Record<string, string> = {
  // OT
  'genesis': 'genesis',
  'exodus': 'exodus',
  'leviticus': 'leviticus',
  'numbers': 'numbers',
  'deuteronomy': 'deuteronomy',
  'joshua': 'joshua',
  'judges': 'judges',
  'ruth': 'ruth',
  '1 samuel': '1-samuel',
  '2 samuel': '2-samuel',
  '1 kings': '1-kings',
  '2 kings': '2-kings',
  '1 chronicles': '1-chronicles',
  '2 chronicles': '2-chronicles',
  'ezra': 'ezra',
  'nehemiah': 'nehemiah',
  'esther': 'esther',
  'job': 'job',
  'psalm': 'psalm',
  'psalms': 'psalm',
  'proverbs': 'proverbs',
  'ecclesiastes': 'ecclesiastes',
  'song of songs': 'song-of-songs',
  'song of solomon': 'song-of-songs',
  'isaiah': 'isaiah',
  'jeremiah': 'jeremiah',
  'lamentations': 'lamentations',
  'ezekiel': 'ezekiel',
  'daniel': 'daniel',
  'hosea': 'hosea',
  'joel': 'joel',
  'amos': 'amos',
  'obadiah': 'obadiah',
  'jonah': 'jonah',
  'micah': 'micah',
  'nahum': 'nahum',
  'habakkuk': 'habakkuk',
  'zephaniah': 'zephaniah',
  'haggai': 'haggai',
  'zechariah': 'zechariah',
  'malachi': 'malachi',
  // Deuterocanonical
  'tobit': 'tobit',
  'judith': 'judith',
  'wisdom': 'wisdom',
  'wisdom of solomon': 'wisdom',
  'sirach': 'sirach',
  'ecclesiasticus': 'sirach',
  'baruch': 'baruch',
  '1 maccabees': '1-maccabees',
  '2 maccabees': '2-maccabees',
  // NT
  'matthew': 'matthew',
  'mark': 'mark',
  'luke': 'luke',
  'john': 'john',
  'acts': 'acts',
  'romans': 'romans',
  '1 corinthians': '1-corinthians',
  '2 corinthians': '2-corinthians',
  'galatians': 'galatians',
  'ephesians': 'ephesians',
  'philippians': 'philippians',
  'colossians': 'colossians',
  '1 thessalonians': '1-thessalonians',
  '2 thessalonians': '2-thessalonians',
  '1 timothy': '1-timothy',
  '2 timothy': '2-timothy',
  'titus': 'titus',
  'philemon': 'philemon',
  'hebrews': 'hebrews',
  'james': 'james',
  '1 peter': '1-peter',
  '2 peter': '2-peter',
  '1 john': '1-john',
  '2 john': '2-john',
  '3 john': '3-john',
  'jude': 'jude',
  'revelation': 'revelation',
}

const SINGLE_CHAPTER_BOOKS = new Set([
  'obadiah', 'philemon', '2 john', '3 john', 'jude',
])

export function parseScriptureRef(reference: string): ScriptureRef[] {
  if (!reference) return []

  const refs: ScriptureRef[] = []
  const segments = reference.split(';').map((s) => s.trim())
  let currentBook = ''

  for (const segment of segments) {
    const match = segment.match(
      /^((?:\d\s+)?[A-Za-z][A-Za-z\s]*?)?\s*(\d+):(.+)$/,
    )

    if (!match) {
      const singleMatch = segment.match(
        /^((?:\d\s+)?[A-Za-z][A-Za-z\s]*?)\s+(\d.+)$/,
      )
      if (singleMatch) {
        const bookName = singleMatch[1].trim()
        if (SINGLE_CHAPTER_BOOKS.has(bookName.toLowerCase())) {
          currentBook = resolveBookKey(bookName)
          if (currentBook) {
            const verses = parseVerseRange(singleMatch[2])
            if (verses.length > 0) {
              refs.push({ book: currentBook, chapter: 1, verses })
            }
          }
        }
      }
      continue
    }

    const bookPart = match[1]?.trim()
    const chapter = parseInt(match[2], 10)
    const versePart = match[3]

    if (bookPart) {
      currentBook = resolveBookKey(bookPart)
    }

    if (!currentBook) continue

    const crossChapterMatch = versePart.match(
      /^(\d+[a-z]?)\s*-\s*(\d+):(.+)$/,
    )
    if (crossChapterMatch) {
      const startVerse = crossChapterMatch[1]
      const endChapter = parseInt(crossChapterMatch[2], 10)
      const endVersePart = crossChapterMatch[3]

      const firstVerses = parseVerseRange(`${startVerse}-200`)
      if (firstVerses.length > 0) {
        refs.push({ book: currentBook, chapter, verses: firstVerses })
      }
      const secondVerses = parseVerseRange(`1-${endVersePart}`)
      if (secondVerses.length > 0) {
        refs.push({ book: currentBook, chapter: endChapter, verses: secondVerses })
      }
      continue
    }

    const verses = parseVerseRange(versePart)
    if (verses.length > 0) {
      refs.push({ book: currentBook, chapter, verses })
    }
  }

  return refs
}

function resolveBookKey(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (BOOK_NAME_MAP[normalized]) return BOOK_NAME_MAP[normalized]

  for (const [key, value] of Object.entries(BOOK_NAME_MAP)) {
    if (key.startsWith(normalized) || normalized.startsWith(key)) {
      return value
    }
  }

  return ''
}

function parseVerseRange(input: string): VerseRef[] {
  const verses: VerseRef[] = []
  const seen = new Set<number>()

  const cleaned = input.replace(/\band\b/g, ',')
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)([a-z])?\s*-\s*(\d+)([a-z])?$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const startSuffix = rangeMatch[2] as 'a' | 'b' | 'c' | undefined
      const end = parseInt(rangeMatch[3], 10)
      const endSuffix = rangeMatch[4] as 'a' | 'b' | 'c' | undefined
      for (let i = start; i <= end; i++) {
        if (!seen.has(i)) {
          seen.add(i)
          const ref: VerseRef = { num: i }
          if (i === start && startSuffix) ref.suffix = startSuffix
          if (i === end && endSuffix) ref.suffix = endSuffix
          verses.push(ref)
        }
      }
      continue
    }

    const singleMatch = part.match(/^(\d+)([a-z])?\.?$/)
    if (singleMatch) {
      const v = parseInt(singleMatch[1], 10)
      if (!seen.has(v)) {
        seen.add(v)
        const ref: VerseRef = { num: v }
        if (singleMatch[2]) ref.suffix = singleMatch[2] as 'a' | 'b' | 'c'
        verses.push(ref)
      }
    }
  }

  return verses
}
