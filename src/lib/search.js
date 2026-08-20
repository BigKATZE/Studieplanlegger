export const MAX_PER_GROUP = 5

export function search(data, query) {
  const q = query.trim().toLowerCase()
  const empty = { subjects: [], lectures: [], readings: [], assignments: [], exams: [] }
  if (!q) return empty

  const match = (v) => String(v ?? '').toLowerCase().includes(q)
  const subjectById = new Map(data.subjects.map((s) => [s.id, s]))

  const subjects = data.subjects
    .filter((s) => match(s.name) || match(s.code) || match(s.short))
    .slice(0, MAX_PER_GROUP)

  const lectures = []
  for (const l of data.lectures) {
    const chapters = (l.chapters ?? []).filter((c) => match(c.text))
    if (match(l.room) || match(l.lecturer) || match(l.topic) || chapters.length) {
      lectures.push({ lecture: l, subject: subjectById.get(l.subjectId), chapters })
    }
    if (lectures.length === MAX_PER_GROUP) break
  }

  const readings = []
  for (const r of data.readings) {
    const chapters = (r.chapters ?? []).filter((c) => match(c.text))
    if (match(r.title) || chapters.length) {
      readings.push({ reading: r, subject: subjectById.get(r.subjectId), chapters })
    }
    if (readings.length === MAX_PER_GROUP) break
  }

  const assignments = []
  for (const a of data.assignments) {
    if (match(a.title)) assignments.push({ assignment: a, subject: subjectById.get(a.subjectId) })
    if (assignments.length === MAX_PER_GROUP) break
  }

  const exams = []
  for (const e of data.exams) {
    if (match(e.title)) exams.push({ exam: e, subject: subjectById.get(e.subjectId) })
    if (exams.length === MAX_PER_GROUP) break
  }

  return { subjects, lectures, readings, assignments, exams }
}