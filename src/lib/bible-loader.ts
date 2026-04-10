import type { BibleChapter, ScriptureRef, ReadingText, VerseRef } from './types'
import fs from 'fs'
import path from 'path'

let bibleIndex: Map<string, BibleChapter> | null = null

function makeKey(book: string, chapter: number): string {
  return `${book}:${chapter}`
}

function ensureLoaded(): Map<string, BibleChapter> {
  if (bibleIndex) return bibleIndex

  bibleIndex = new Map()
  const dataDir = path.join(process.cwd(), 'src/data/bible')

  const files = [
    'bible_ot.jsonl',
    'bible_nt_rest.jsonl',
    'bible_gospels.jsonl',
  ]

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    if (!fs.existsSync(filePath)) continue

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
    for (const line of lines) {
      const raw = JSON.parse(line)
      const entry: BibleChapter = {
        book: raw.book,
        bookMn: raw.book_mn,
        chapter: raw.chapter,
        headings: raw.headings ?? [],
        verses: raw.verses ?? [],
      }
      const key = makeKey(entry.book, entry.chapter)
      bibleIndex.set(key, entry)
    }
  }

  return bibleIndex
}

const VERBAL_CONJUNCTIONS = ['ч', 'бөгөөд']
const NOMINAL_PARTICLES = ['нь', 'бол', 'ба', 'болон']

function trimSuffixA(text: string): string {
  const trimmed = text.trim()
  if (/[.!?»"]$/.test(trimmed)) return trimmed

  const lastSpaceIdx = trimmed.lastIndexOf(' ')
  if (lastSpaceIdx === -1) return trimmed

  const lastWord = trimmed.slice(lastSpaceIdx + 1)
  const beforeLastWord = trimmed.slice(0, lastSpaceIdx).trim()

  if (VERBAL_CONJUNCTIONS.includes(lastWord)) {
    const cleaned = beforeLastWord.replace(/[,\s]+$/, '')
    return cleaned + '.'
  }

  if (NOMINAL_PARTICLES.includes(lastWord)) {
    const lastPeriod = Math.max(
      beforeLastWord.lastIndexOf('.'),
      beforeLastWord.lastIndexOf('!'),
      beforeLastWord.lastIndexOf('?'),
    )
    if (lastPeriod > 0) {
      return beforeLastWord.slice(0, lastPeriod + 1)
    }
  }

  return trimmed + '...'
}

function trimSuffixB(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/[.!?»"]\s+/)
  if (match && match.index != null) {
    const after = trimmed.slice(match.index + match[0].length).trim()
    if (after.length > 0) return after
  }
  return trimmed
}

function trimSuffixC(text: string): string {
  const trimmed = text.trim()
  let remaining = trimmed
  for (let i = 0; i < 2; i++) {
    const match = remaining.match(/[.!?»"]\s+/)
    if (match && match.index != null) {
      remaining = remaining.slice(match.index + match[0].length).trim()
    } else {
      break
    }
  }
  return remaining || trimmed
}

function trimVerseText(text: string, suffix?: 'a' | 'b' | 'c'): string {
  if (!suffix) return text
  switch (suffix) {
    case 'a': return trimSuffixA(text)
    case 'b': return trimSuffixB(text)
    case 'c': return trimSuffixC(text)
  }
}

export function getChapter(book: string, chapter: number): BibleChapter | null {
  const index = ensureLoaded()
  return index.get(makeKey(book, chapter)) ?? null
}

const PSALM_OFFSETS: Record<number, number> = {
  4: -1, 8: -1, 18: -1, 19: -1, 22: -1, 30: -1, 31: -1, 34: -1,
  40: -1, 41: -1, 47: -1, 62: -1, 63: -1, 65: -1, 67: -1, 68: -1,
  69: -1, 80: -1, 81: -1, 85: -1, 89: -1, 92: -1,
  51: -2, 52: -2, 54: -2, 56: -2, 57: -2, 59: -2, 60: -2, 142: -2,
}

export function lookupRef(ref: ScriptureRef): ReadingText | null {
  const chapter = getChapter(ref.book, ref.chapter)
  if (!chapter) return null

  const offset = ref.book === 'psalm' ? (PSALM_OFFSETS[ref.chapter] ?? 0) : 0

  const texts = ref.verses
    .map((vr: VerseRef) => {
      const dataVerseNum = vr.num + offset
      if (dataVerseNum < 1) return null
      const verse = chapter.verses.find((x) => x.verse === dataVerseNum)
      if (!verse) return null
      return {
        verse: vr.num,
        text: trimVerseText(verse.text, vr.suffix),
      }
    })
    .filter((x): x is { verse: number; text: string } => x !== null)

  if (texts.length === 0) return null

  return {
    reference: '',
    bookMn: chapter.bookMn,
    texts,
  }
}
