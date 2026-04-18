#!/bin/bash
# reextract-pdf-pages.sh
#
# Re-extracts "Four-Week psalter.- 2025.pdf" with reliable page markers.
#
# The PDF is a 2-up landscape layout (each PDF page = two printed pages
# side-by-side, separated at x≈297pt). pdftotext's default mode interleaves
# the two columns and drops page-number headers in some spots, leaving
# parsed_data/week*_full.txt with off-by-one gaps.
#
# Strategy: crop each PDF page into LEFT and RIGHT halves separately. Each
# half contains exactly one printed page in clean reading order. Prepend
# the printed page number as a bare integer line so buildSourceIndex picks
# it up as a page marker.
#
# Output: parsed_data/full_pdf.txt (4MB-ish single source covering all
# pages 0-969). Existing extract-* scripts can switch their SOURCES to
# this single file.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="${ROOT}/Four-Week psalter.- 2025.pdf"
OUT="${ROOT}/parsed_data/full_pdf.txt"
TOTAL=$(pdfinfo "$PDF" | awk '/^Pages:/ {print $2}')

if [[ ! -f "$PDF" ]]; then
  echo "PDF not found at $PDF" >&2
  exit 1
fi

echo "Re-extracting $TOTAL PDF pages → ${OUT##*/}"
> "$OUT"

for (( N=1; N<=TOTAL; N++ )); do
  LEFT=$((2*N - 2))
  RIGHT=$((2*N - 1))

  # Left half (printed page LEFT)
  echo "$LEFT" >> "$OUT"
  pdftotext -f $N -l $N -x 0 -y 0 -W 298 -H 482 "$PDF" - 2>/dev/null >> "$OUT" || true

  # Right half (printed page RIGHT)
  echo "" >> "$OUT"
  echo "$RIGHT" >> "$OUT"
  pdftotext -f $N -l $N -x 297 -y 0 -W 298 -H 482 "$PDF" - 2>/dev/null >> "$OUT" || true

  echo "" >> "$OUT"

  if (( N % 50 == 0 )); then
    echo "  ...$N / $TOTAL"
  fi
done

LINES=$(wc -l < "$OUT")
SIZE=$(du -h "$OUT" | cut -f1)
echo "Done. $LINES lines, $SIZE."
