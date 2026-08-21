import { iso } from './date.js'

export function buildSuggestionPayload(data, now = new Date()) {
  const today = iso(now)
  const inTwoWeeks = new Date(now)
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14)
  const lastLectureDate = iso(inTwoWeeks)
  const subject = Object.fromEntries(data.subjects.map((s) => [s.id, s.short || s.code || s.name]))
  const item = (kind, value, date, status) => {
    const details = value.chapters?.filter((chapter) => !chapter.done).map((chapter) => chapter.text).filter(Boolean).join('; ')
    return {
      kind,
      subject: subject[value.subjectId] || 'Ukjent fag',
      title: value.title || value.topic || kind,
      date,
      ...(details ? { details: details.slice(0, 1000) } : {}),
      ...(status ? { status } : {}),
    }
  }

  const items = [
    ...data.assignments.filter((a) => a.status !== 'done').map((a) => item('Arbeidskrav', a, a.deadline, a.status)),
    ...data.exams.filter((e) => e.date >= today).map((e) => item('Eksamen', e, e.date)),
    ...data.lectures.filter((l) => !l.done && l.date >= today && l.date <= lastLectureDate).map((l) => item('Forelesning', l, l.date)),
    ...data.readings.filter((r) => !r.done && !(r.chapters?.length && r.chapters.every((c) => c.done))).map((r) => item('Pensum', r, `Uke ${r.week}`)),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 100)

  return { today, items }
}
