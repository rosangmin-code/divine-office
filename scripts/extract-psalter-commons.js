#!/usr/bin/env node
/**
 * Extract common prayer elements from parsed_data/weekN/weekN_final.txt
 * and merge them into psalter/week-N.json.
 *
 * Uses the _final.txt files which have clean sequential structure:
 *   НЯМ ГАРАГ → 1st Vespers → Lauds → 2nd Vespers → ДАВАА ГАРАГ → Lauds → Vespers → ...
 */

const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..')
const PARSED_DIR = path.join(BASE, 'parsed_data')
const PSALTER_DIR = path.join(BASE, 'src', 'data', 'loth', 'psalter')

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_HEADERS = ['НЯМ ГАРАГ', 'ДАВАА ГАРАГ', 'МЯГМАР ГАРАГ', 'ЛХАГВА ГАРАГ', 'ПҮРЭВ ГАРАГ', 'БААСАН ГАРАГ', 'БЯМБА ГАРАГ']

// Lines to skip (page numbers, headers, footers)
const SKIP_PATTERNS = [
  /^\d+\s*$/,
  /^\d+\s+долоо хоног/,
  /гарагийн\s+(өглөө|орой)/,
  /^\d+\s+дүгээр долоо хоног/,
  /^\d+\s+дугаар долоо хоног/,
  /^\d+\s+1 дүгээр/,
  /^\d+\s+2 дугаар/,
  /^\d+\s+3 дугаар/,
  /^\d+\s+4 дүгээр/,
]

function isSkipLine(line) {
  return SKIP_PATTERNS.some(p => p.test(line))
}

/**
 * Parse a weekN_final.txt into structured sections.
 * Returns array of { day, hour, startLine, endLine }
 */
function parseStructure(lines) {
  const sections = []
  let currentDay = null

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const upper = trimmed.toUpperCase()

    // Day header
    const dayIdx = DAY_HEADERS.findIndex(h => upper === h || upper.includes(h))
    if (dayIdx >= 0) {
      currentDay = DAY_KEYS[dayIdx]
      continue
    }

    // Hour markers
    if (trimmed.includes('Өглөөний даатгал залбирал') && currentDay) {
      sections.push({ day: currentDay, hour: 'lauds', startLine: i, endLine: -1 })
    } else if (trimmed.includes('Оройн даатгал залбирал') && currentDay) {
      // Sunday has "1 дүгээр Оройн" (1st Vespers = Saturday evening) and "2 дугаар Оройн" (2nd Vespers)
      // Weekdays just have "Оройн даатгал залбирал"
      // All contain common prayer elements (readings, responsories, intercessions) from the psalter
      // Only the gospel canticle antiphon and concluding prayer come from seasonal propers on Sundays
      if (trimmed.includes('1 дүгээр')) {
        sections.push({ day: currentDay, hour: 'vespers1', startLine: i, endLine: -1 })
      } else if (trimmed.includes('2 дугаар')) {
        sections.push({ day: currentDay, hour: 'vespers2', startLine: i, endLine: -1 })
      } else {
        sections.push({ day: currentDay, hour: 'vespers', startLine: i, endLine: -1 })
      }
    }
  }

  // Set endLine for each section
  for (let i = 0; i < sections.length; i++) {
    sections[i].endLine = i + 1 < sections.length ? sections[i + 1].startLine : lines.length
  }

  return sections.filter(s => ['lauds', 'vespers', 'vespers1', 'vespers2'].includes(s.hour))
}

/**
 * Collect lines from start to end of a section, skipping noise.
 */
function collectText(lines, from, to, stopMarker) {
  const result = []
  for (let i = from; i < to; i++) {
    const trimmed = lines[i].trim()
    if (stopMarker && stopMarker(trimmed)) break
    if (isSkipLine(trimmed)) continue
    if (trimmed.length > 0) result.push(trimmed)
  }
  return result
}

function findMarker(lines, start, end, marker) {
  for (let i = start; i < end; i++) {
    if (lines[i].trim().startsWith(marker)) return i
  }
  return -1
}

/**
 * Extract all common prayer elements from a section.
 */
function extractFromSection(lines, start, end) {
  const result = {}

  // --- Short Reading ---
  // Match "Уншлага" and typo variant "Уншлаг" (without final а)
  let readIdx = findMarker(lines, start, end, 'Уншлага')
  if (readIdx < 0) readIdx = findMarker(lines, start, end, 'Уншлаг')
  if (readIdx >= 0) {
    let refLine = ''
    let textStart = readIdx + 1
    for (let i = readIdx + 1; i < end; i++) {
      const t = lines[i].trim()
      if (t.length > 0 && !isSkipLine(t)) { refLine = t; textStart = i + 1; break }
    }
    const textLines = collectText(lines, textStart, end, t =>
      t.startsWith('Хариу залбирал') || t.startsWith('Захариагийн') ||
      t.startsWith('Мариагийн') || t.startsWith('Гуйлтын') || t.startsWith('Төгсгөлийн'))
    const text = textLines.join(' ').replace(/\s+/g, ' ').trim()
    if (refLine && text.length > 10) {
      result.shortReading = { ref: refLine, text }
    }
  }

  // --- Responsory ---
  const respIdx = findMarker(lines, start, end, 'Хариу залбирал')
  if (respIdx >= 0) {
    const respLines = collectText(lines, respIdx + 1, end, t =>
      t.startsWith('Захариагийн') || t.startsWith('Мариагийн') ||
      t.startsWith('Гуйлтын') || t.startsWith('Төгсгөлийн') ||
      t.startsWith('Шад магтаал') || t.startsWith('"Тэнгэр дэх'))

    const versicle = respLines.find(l => !l.startsWith('-') && !l.startsWith('Эцэг,')) || ''
    const response = respLines.find(l => l.startsWith('-'))?.replace(/^-\s*/, '') || ''
    if (versicle) result.responsory = { versicle: versicle.trim(), response: response.trim() }
  }

  // --- Gospel Canticle Antiphon ---
  let canticleIdx = findMarker(lines, start, end, 'Захариагийн магтаал')
  if (canticleIdx < 0) canticleIdx = findMarker(lines, start, end, 'Мариагийн магтаал')
  if (canticleIdx >= 0) {
    // Pre-process: join "Шад\nмагтаал" split across lines
    const searchEnd = Math.min(canticleIdx + 10, end)
    const joined = lines.slice(canticleIdx + 1, searchEnd).map(l => l.trim()).join(' ')

    for (let i = canticleIdx + 1; i < searchEnd; i++) {
      const t = lines[i].trim()
      // Also match when "Шад" is alone on one line followed by "магтаал" on next
      const isShad = t === 'Шад' && i + 1 < end && lines[i + 1].trim().startsWith('магтаал')
      if (t.startsWith('Шад магтаал') || t.startsWith('Шад дуулал') || isShad) {
        let antiphon = ''
        let startJ = i + 1
        if (isShad) {
          // "Шад" on line i, "магтаал <text>" on line i+1
          antiphon = lines[i + 1].trim().replace(/^магтаал\s*/, '').trim()
          startJ = i + 2
        } else {
          antiphon = t.replace(/^Шад\s+(магтаал|дуулал)\s*/, '').trim()
        }
        for (let j = startJ; j < end; j++) {
          const next = lines[j].trim()
          if (next.length === 0 || next.startsWith('Гуйлтын') || next.startsWith('Амилалтын') ||
              next.startsWith('Ирэлтийн') || next.startsWith('Дөчин') ||
              isSkipLine(next) || next.startsWith('Израилийн') || next.startsWith('Сэтгэл')) break
          antiphon += ' ' + next
        }
        if (!antiphon.includes('Онцлог шинж') && !antiphon.includes('татаж авна') && antiphon.length > 5) {
          result.gospelCanticleAntiphon = antiphon.replace(/\s+/g, ' ').trim()
        }
        break
      }
    }
  }

  // --- Intercessions ---
  const intIdx = findMarker(lines, start, end, 'Гуйлтын залбирал')
  if (intIdx >= 0) {
    const items = []
    let current = ''
    for (let i = intIdx + 1; i < end; i++) {
      const t = lines[i].trim()
      if (t.startsWith('"Тэнгэр дэх Эцэг') || t.startsWith('Төгсгөлийн') || t.startsWith('Төгсгөл')) break
      if (isSkipLine(t) || t.length === 0) continue
      if (t.startsWith('-')) {
        if (current) { current += ' ' + t; items.push(current.replace(/\s+/g, ' ').trim()); current = '' }
      } else {
        if (current) items.push(current.replace(/\s+/g, ' ').trim())
        current = t
      }
    }
    if (current) items.push(current.replace(/\s+/g, ' ').trim())
    if (items.length > 0) result.intercessions = items
  }

  // --- Concluding Prayer ---
  const prayerIdx = findMarker(lines, start, end, 'Төгсгөлийн даатгал залбирал')
  if (prayerIdx >= 0) {
    const prayerLines = collectText(lines, prayerIdx + 1, end, t =>
      t.startsWith('Төгсгөлийг дэг') || t.startsWith('Оройн даатгал') ||
      t.startsWith('Өглөөний даатгал') || DAY_HEADERS.some(h => t.toUpperCase().includes(h)))
    const prayer = prayerLines.join(' ').replace(/\s+/g, ' ').trim()
    if (prayer.length > 10 && !prayer.includes('Онцлог шинж')) {
      result.concludingPrayer = prayer
    }
  }

  // Check for "Төгсгөлийн залбирлыг" reference (Sunday pattern — no local prayer)
  const refIdx = findMarker(lines, start, end, 'Төгсгөлийн залбирлыг')
  if (refIdx >= 0 && lines[refIdx].trim().includes('Онцлог шинж')) {
    // Sunday - concluding prayer comes from seasonal propers, don't add here
  }

  return Object.keys(result).length > 0 ? result : null
}

function main() {
  const stats = { total: 0, shortReading: 0, responsory: 0, antiphon: 0, intercessions: 0, concludingPrayer: 0 }

  for (let week = 1; week <= 4; week++) {
    console.log(`\n=== Week ${week} ===`)

    const finalPath = path.join(PARSED_DIR, `week${week}`, `week${week}_final.txt`)
    if (!fs.existsSync(finalPath)) { console.log('  (no final file)'); continue }
    const text = fs.readFileSync(finalPath, 'utf-8')
    const lines = text.split('\n')

    const psalterPath = path.join(PSALTER_DIR, `week-${week}.json`)
    const psalter = JSON.parse(fs.readFileSync(psalterPath, 'utf-8'))

    const sections = parseStructure(lines)
    console.log(`  Found ${sections.length} sections`)

    for (const section of sections) {
      const extracted = extractFromSection(lines, section.startLine, section.endLine)
      if (!extracted) {
        console.log(`  ${section.day} ${section.hour}: (nothing extracted)`)
        continue
      }

      // Map vespers1/vespers2 to the 'vespers' psalter key
      const psalterHour = section.hour.startsWith('vespers') ? 'vespers' : section.hour
      const hourData = psalter.days[section.day]?.[psalterHour]
      if (!hourData) {
        console.log(`  ${section.day} ${section.hour}: (no psalter entry)`)
        continue
      }

      if (extracted.shortReading) { hourData.shortReading = extracted.shortReading; stats.shortReading++ }
      if (extracted.responsory) { hourData.responsory = extracted.responsory; stats.responsory++ }
      if (extracted.gospelCanticleAntiphon) { hourData.gospelCanticleAntiphon = extracted.gospelCanticleAntiphon; stats.antiphon++ }
      if (extracted.intercessions) { hourData.intercessions = extracted.intercessions; stats.intercessions++ }
      if (extracted.concludingPrayer) { hourData.concludingPrayer = extracted.concludingPrayer; stats.concludingPrayer++ }

      const fields = Object.keys(extracted).join(', ')
      console.log(`  ${section.day} ${section.hour}: ${fields}`)
      stats.total++
    }

    fs.writeFileSync(psalterPath, JSON.stringify(psalter, null, 2) + '\n', 'utf-8')
    console.log(`  -> Written to week-${week}.json`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total hour entries updated: ${stats.total}`)
  console.log(`Short readings: ${stats.shortReading}`)
  console.log(`Responsories: ${stats.responsory}`)
  console.log(`Gospel canticle antiphons: ${stats.antiphon}`)
  console.log(`Intercessions: ${stats.intercessions}`)
  console.log(`Concluding prayers: ${stats.concludingPrayer}`)

  const expected = { shortReading: 56, responsory: 56, antiphon: 48, intercessions: 56, concludingPrayer: 48 }
  console.log(`\n=== EXPECTED vs ACTUAL ===`)
  for (const [key, exp] of Object.entries(expected)) {
    const actual = stats[key]
    const pct = Math.round(actual / exp * 100)
    console.log(`  ${key}: ${actual}/${exp} (${pct}%)`)
  }
}

main()
