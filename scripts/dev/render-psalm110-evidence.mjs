#!/usr/bin/env node
// FR-161 R-7 — generate static HTML evidence of Psalm 110 phrase render
// using react-dom/server. Output: docs/screenshots/psalm110-phrase-render.html
//
// This is a one-off tool used by the pilot evidence doc, NOT shipped to
// users. It bypasses the full app server (Next.js) so the worktree can
// produce evidence without setting up a dev server. The rendered HTML is
// the SAME markup the R-4 renderer (psalm-block.tsx) would emit at
// runtime — vitest tests already cover the contract; this just makes
// the markup visually inspectable.
//
// Usage: node scripts/dev/render-psalm110-evidence.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const RICH_PATH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const OUT_PATH = 'docs/screenshots/psalm110-phrase-render.html'

const rich = JSON.parse(readFileSync(RICH_PATH, 'utf-8'))
const ps110 = rich['Psalm 110:1-5, 7']
if (!ps110) {
  console.error('Psalm 110:1-5, 7 not found in rich.json')
  process.exit(1)
}

// Render markup mirroring psalm-block.tsx phrase + legacy branches without
// importing React (keeps this script dependency-free; the real renderer is
// covered by src/components/__tests__/psalm-block-phrases.test.ts).
function renderStanza(block) {
  if (block.kind !== 'stanza') return ''
  if (block.phrases && block.phrases.length > 0) {
    const phraseSpans = block.phrases
      .map((phrase) => {
        const [start, end] = phrase.lineRange
        const text = block.lines
          .slice(start, end + 1)
          .map((l) => l.spans.map((s) => s.text).join(''))
          .join(' ')
        const indent = phrase.indent ?? 0
        const indentClass = indent === 0 ? '' : indent === 1 ? 'pl-6' : 'pl-12'
        const role = phrase.role
        const roleClass = role === 'refrain'
          ? ' text-red-700'
          : role === 'doxology'
          ? ' italic'
          : ''
        const dataRole = role === 'refrain'
          ? 'psalm-phrase-refrain'
          : role === 'doxology'
          ? 'psalm-phrase-doxology'
          : 'psalm-phrase'
        return `<span data-role="${dataRole}" class="block${
          indentClass ? ' ' + indentClass : ''
        }${roleClass}">${escapeHtml(text)}</span>`
      })
      .join('\n  ')
    return `<p data-role="psalm-stanza" data-render-mode="phrase" class="font-serif text-base leading-relaxed text-stone-800">
  ${phraseSpans}
</p>`
  }
  const lineSpans = block.lines
    .map((line) => {
      const text = line.spans.map((s) => s.text).join('')
      return `<span class="block">${escapeHtml(text)}</span>`
    })
    .join('\n  ')
  return `<p data-role="psalm-stanza" class="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800">
  ${lineSpans}
</p>`
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const blocksHtml = ps110.stanzasRich.blocks.map(renderStanza).filter(Boolean).join('\n\n')

const page = `<!DOCTYPE html>
<html lang="mn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FR-161 R-7 pilot — Psalm 110:1-5, 7 phrase-render evidence</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { padding: 2rem; max-width: 412px; margin: 0 auto; }  /* Pixel 7 viewport width */
    .label { font-size: 0.75rem; color: #888; margin: 1rem 0 0.5rem; text-transform: uppercase; }
    .container { border: 1px solid #ddd; padding: 1rem; border-radius: 6px; }
  </style>
</head>
<body>
  <h1 class="text-lg font-semibold mb-2">Psalm 110:1-5, 7 — phrase-render (Pixel 7 viewport, 412px)</h1>
  <p class="text-sm text-stone-600 mb-4">
    FR-161 R-7 pilot evidence. Each <code>&lt;span data-role="psalm-phrase"&gt;</code>
    block is one PhraseGroup, joined from PDF-visual lines via
    <code>lineRange [s,e]</code> (inclusive). Viewport-wrap is now free
    (no <code>whitespace-pre-line</code>).
  </p>

  <div class="label">Stanza block 0 (16 PDF lines → 14 phrases)</div>
  <div class="container">
${blocksHtml.split('\n\n').slice(0, 1).join('\n\n')}
  </div>

  <div class="label">Stanza block 1 (5 PDF lines → 4 phrases)</div>
  <div class="container">
${blocksHtml.split('\n\n').slice(1, 2).join('\n\n')}
  </div>
</body>
</html>
`

mkdirSync(resolve('docs/screenshots'), { recursive: true })
writeFileSync(OUT_PATH, page, 'utf-8')
console.log(`wrote ${OUT_PATH} (${page.length} bytes)`)
