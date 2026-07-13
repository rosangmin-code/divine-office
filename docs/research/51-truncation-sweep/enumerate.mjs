import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'src/data')
const CYRILLIC = /\p{Script=Cyrillic}/u
const GCA = /^gospelCanticleAntiphon(?:Rich|Candidates|Rubric)?$/

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(p) : [p]
  })
}

function areaFor(rel) {
  const p = rel.split('/')
  if (p[2] === 'bible') return 'src/data/bible'
  if (p[2] !== 'loth') return p.slice(0, 3).join('/')
  if (p.length === 4) return 'src/data/loth/(root)'
  if (p[3] !== 'prayers') return `src/data/loth/${p[3]}`
  if (p[4] === 'commons' && p[5] === 'compline') return 'src/data/loth/prayers/commons/compline'
  if (p[4] === 'commons' && p[5] === 'psalter') return 'src/data/loth/prayers/commons/psalter'
  if (p[4] === 'commons') return 'src/data/loth/prayers/commons/(root)'
  if (p[4] === 'seasonal') return `src/data/loth/prayers/seasonal/${p[5]}`
  return `src/data/loth/prayers/${p[4]}`
}

const allFiles = filesUnder(DATA).sort()
const dataFiles = allFiles.filter((f) => /\.jsonl?$/.test(f))
const records = []
const parseErrors = []
const fileRows = new Map()

function pointer(parts) {
  return '/' + parts.map((p) => String(p).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')
}

function visit(value, rel, parts) {
  if (typeof value === 'string') {
    if (!CYRILLIC.test(value)) return
    const namedParts = parts.filter((p) => typeof p === 'string')
    const gca = namedParts.some((p) => GCA.test(p))
    const leafKey = [...parts].reverse().find((p) => typeof p === 'string') ?? '(root)'
    records.push({ rel, area: areaFor(rel), pointer: pointer(parts), value, leafKey, gca })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, rel, [...parts, index]))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) visit(item, rel, [...parts, key])
  }
}

for (const file of dataFiles) {
  const rel = path.relative(ROOT, file)
  try {
    if (file.endsWith('.jsonl')) {
      fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
        if (line.trim()) visit(JSON.parse(line), rel, [index])
      })
    } else {
      visit(JSON.parse(fs.readFileSync(file, 'utf8')), rel, [])
    }
  } catch (error) {
    parseErrors.push(`${rel}: ${error.message}`)
  }
}

for (const file of dataFiles) {
  const rel = path.relative(ROOT, file)
  const rows = records.filter((r) => r.rel === rel)
  fileRows.set(rel, {
    area: areaFor(rel),
    cyrillic: rows.length,
    gca: rows.filter((r) => r.gca).length,
  })
}

const areas = new Map()
for (const [, row] of fileRows) {
  const a = areas.get(row.area) ?? { files: 0, cyrillic: 0, gca: 0, targets: 0 }
  a.files++
  a.cyrillic += row.cyrillic
  a.gca += row.gca
  a.targets += row.cyrillic - row.gca
  areas.set(row.area, a)
}

const lothTargets = records.filter((r) => r.rel.startsWith('src/data/loth/') && !r.gca)
const bibleTargets = records.filter((r) => r.rel.startsWith('src/data/bible/') && !r.gca)
const allTargets = records.filter((r) => !r.gca)
const manifest = (rows) => rows.map((r) => `${r.rel}#${r.pointer}\t${r.value}`).sort().join('\n')
const addresses = (rows) => rows.map((r) => `${r.rel}#${r.pointer}`).sort().join('\n')
const sha = (rows) => crypto.createHash('sha256').update(manifest(rows)).digest('hex')
const addressSha = (rows) => crypto.createHash('sha256').update(addresses(rows)).digest('hex')

console.log('DATA FILE UNIVERSE')
console.log(`all_files=${allFiles.length}`)
console.log(`json=${dataFiles.filter((f) => f.endsWith('.json')).length}`)
console.log(`jsonl=${dataFiles.filter((f) => f.endsWith('.jsonl')).length}`)
console.log(`other=${allFiles.length - dataFiles.length}`)
for (const f of allFiles.filter((f) => !/\.jsonl?$/.test(f))) console.log(`OTHER ${path.relative(ROOT, f)}`)
console.log(`parse_errors=${parseErrors.length}`)
for (const e of parseErrors) console.log(`ERROR ${e}`)
const zeroFiles = [...fileRows].filter(([, row]) => row.cyrillic === 0).map(([rel]) => rel)
console.log(`zero_cyrillic_data_files=${zeroFiles.length}`)
for (const rel of zeroFiles) console.log(`ZERO ${rel}`)

console.log('\nAREA RECONCILIATION (occurrences, not deduplicated values)')
console.log('area | files | cyrillic_leaves | excluded_gca | targets')
for (const [area, a] of [...areas].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`${area} | ${a.files} | ${a.cyrillic} | ${a.gca} | ${a.targets}`)
}

console.log('\nTOTALS')
console.log(`cyrillic_leaves=${records.length}`)
console.log(`excluded_gca=${records.filter((r) => r.gca).length}`)
console.log(`all_data_targets_after_gca=${allTargets.length}`)
console.log(`loth_pdf_sweep_targets=${lothTargets.length}`)
console.log(`bible_sibling_units_non_pdf_sot=${bibleTargets.length}`)
console.log(`reconciles=${lothTargets.length + bibleTargets.length === allTargets.length}`)
console.log(`target_addresses_unique=${new Set(allTargets.map((r) => `${r.rel}#${r.pointer}`)).size === allTargets.length}`)
console.log(`loth_target_address_sha256=${addressSha(lothTargets)}`)
console.log(`loth_target_content_sha256=${sha(lothTargets)}`)
console.log(`all_data_target_address_sha256=${addressSha(allTargets)}`)
console.log(`all_data_target_content_sha256=${sha(allTargets)}`)

console.log('\nGCA EXCLUSION RECONCILIATION')
const gcaFamilies = new Map()
for (const r of records.filter((r) => r.gca)) {
  const family = r.pointer.split('/').find((p) => GCA.test(p))
  gcaFamilies.set(family, (gcaFamilies.get(family) ?? 0) + 1)
}
for (const [family, count] of [...gcaFamilies].sort(([a], [b]) => a.localeCompare(b))) console.log(`${family} | ${count}`)
console.log(`sum=${[...gcaFamilies.values()].reduce((a, b) => a + b, 0)}`)

console.log('\nLOTH TARGETS BY NEAREST NAMED FIELD (complete nonzero list)')
const keys = new Map()
for (const r of lothTargets) keys.set(r.leafKey, (keys.get(r.leafKey) ?? 0) + 1)
for (const [key, count] of [...keys].sort(([a], [b]) => a.localeCompare(b))) console.log(`${key} | ${count}`)
