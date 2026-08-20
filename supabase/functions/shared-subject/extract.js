// Ren, testbar kjerne for `shared-subject`-Edge Function-en.
//
// Henter KUN det delte faget ut av brukerens samlede data. Aldri returnerer
// andre fag, gjøremål eller eksamener, og aldri noen bruker/kilde til dataen.
// Denne funksjonen er bevisst fri for Deno-avhengigheter så den kan enhetstestes
// fra `src/lib/sharedSubject.test.mjs` med Node.

export function extractSharedSubject(data, subjectId) {
  const subjects = Array.isArray(data?.subjects) ? data.subjects : []
  const subject = subjects.find((s) => s && s.id === subjectId)
  if (!subject) return null

  const lectures = (Array.isArray(data?.lectures) ? data.lectures : [])
    .filter((l) => l && l.subjectId === subjectId)
    .map(({ subjectId: _subjectId, ...rest }) => rest)
  const readings = (Array.isArray(data?.readings) ? data.readings : [])
    .filter((r) => r && r.subjectId === subjectId)
    .map(({ subjectId: _subjectId, ...rest }) => rest)

  return { subject, lectures, readings }
}