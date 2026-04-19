const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

// Route handlers accept a YYYY-MM-DD path segment. Validate on the boundary
// so "/pray/2026-13-40/..." fails fast with a clear 400 instead of bubbling
// through the assembler and returning a vague 404 downstream.
export function isValidDateStr(input: unknown): input is string {
  if (typeof input !== 'string' || !DATE_FORMAT.test(input)) return false
  const [y, m, d] = input.split('-').map(Number)
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  // Round-trip through Date.UTC to reject impossible days (Feb 30, Apr 31).
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}
