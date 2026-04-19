// The legacy ES5-compatible build of pdfjs-dist ships without its own
// type declaration (the @types live at the package root). The public API
// surface is identical, so we re-export it under the legacy entry.
declare module 'pdfjs-dist/legacy/build/pdf.min.mjs' {
  export * from 'pdfjs-dist'
}
