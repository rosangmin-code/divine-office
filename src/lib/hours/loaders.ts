import fs from 'fs'
import path from 'path'
import type { Ordinarium } from './types'

export type PsalterTextEntry = {
  stanzas: string[][]
  psalmPrayer?: string
  psalmPrayerPage?: number
}

// `dataPath` is relative to src/data/loth. Joining it onto that fixed folder
// lets the bundler trace just the data; a bare `process.cwd()` join made
// Turbopack ship the whole repository with the server functions.
function loadJsonFile(dataPath: string) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'src/data/loth', dataPath), 'utf-8'),
  )
}

let _ordinarium: Ordinarium | null = null
let _psalterTexts: Record<string, PsalterTextEntry> | null = null

export function loadPsalterTexts(): Record<string, PsalterTextEntry> {
  if (_psalterTexts) return _psalterTexts
  try {
    _psalterTexts = loadJsonFile('psalter-texts.json')
  } catch {
    _psalterTexts = {}
  }
  return _psalterTexts!
}

export function loadOrdinarium(): Ordinarium {
  if (!_ordinarium) {
    const invData = loadJsonFile('ordinarium/invitatory.json')
    _ordinarium = {
      invitatory: {
        openingVersicle: invData.openingVersicle,
        invitatoryPsalms: invData.invitatoryPsalms,
        gloryBe: invData.gloryBe,
        rubric: invData.rubric,
      },
      invitatoryAntiphons: loadJsonFile('ordinarium/invitatory-antiphons.json'),
      canticles: loadJsonFile('ordinarium/canticles.json'),
      commonPrayers: loadJsonFile('ordinarium/common-prayers.json'),
      complineData: loadJsonFile('ordinarium/compline.json'),
    }
  }
  return _ordinarium
}
