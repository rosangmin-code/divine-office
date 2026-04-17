/**
 * Shared types for per-structure parsers that turn raw PDF-extracted text
 * blocks into clean structured data. One parser per liturgical element type
 * (hymn, psalm, antiphon, reading, responsory, intercession, prayer, ...).
 */

export type LineKind =
  | 'blank'
  | 'verse'
  | 'refrainMarker'
  | 'stanzaMarker'
  | 'hymnRef'
  | 'dateHeader'
  | 'dateHeaderTail'
  | 'allCapsHeader'
  | 'allCapsWordFragment'
  | 'pageNumber'
  | 'seasonHeader'
  | 'magtuuHeader'
  | 'unknown'

export interface ClassifiedLine {
  raw: string
  trimmed: string
  kind: LineKind
}

export interface ParseDiagnostic {
  kind: 'info' | 'warn' | 'error'
  message: string
  lineIndex?: number
}

export interface ParseResult<T> {
  value: T | null
  diagnostics: ParseDiagnostic[]
}
