import fs from 'fs'
import path from 'path'
import type { Ordinarium } from './types'

export type PsalterTextEntry = {
  stanzas: string[][]
  psalmPrayer?: string
  psalmPrayerPage?: number
}

function loadJsonFile(relativePath: string) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8'),
  )
}

let _ordinarium: Ordinarium | null = null
let _psalterTexts: Record<string, PsalterTextEntry> | null = null

export function loadPsalterTexts(): Record<string, PsalterTextEntry> {
  if (_psalterTexts) return _psalterTexts
  try {
    _psalterTexts = loadJsonFile('src/data/loth/psalter-texts.json')
  } catch {
    _psalterTexts = {}
  }
  return _psalterTexts!
}

export function loadOrdinarium(): Ordinarium {
  if (!_ordinarium) {
    const invData = loadJsonFile('src/data/loth/ordinarium/invitatory.json')
    _ordinarium = {
      invitatory: {
        openingVersicle: invData.openingVersicle,
        invitatoryPsalms: invData.invitatoryPsalms,
        gloryBe: invData.gloryBe,
        rubric: invData.rubric,
      },
      invitatoryAntiphons: loadJsonFile(
        'src/data/loth/ordinarium/invitatory-antiphons.json',
      ),
      canticles: loadJsonFile('src/data/loth/ordinarium/canticles.json'),
      commonPrayers: loadJsonFile(
        'src/data/loth/ordinarium/common-prayers.json',
      ),
      complineData: loadJsonFile('src/data/loth/ordinarium/compline.json'),
    }
  }
  return _ordinarium
}
