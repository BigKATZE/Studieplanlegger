import { iso, isoWeek, weekRangeByWeek } from './date.js'
import { normalizeMinutes } from './store.js'

export const REVIEW_INTERVALS = [1, 3, 7, 14]

function timeMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '')) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function localDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function findLectureConflictIds(lectures = []) {
  const conflicts = new Set()
  for (let i = 0; i < lectures.length; i++) {
    const left = lectures[i]
    const leftStart = timeMinutes(left.start)
    const leftEnd = timeMinutes(left.end)
    if (!localDate(left.date) || leftStart == null || leftEnd == null || leftEnd <= leftStart) continue
    for (let j = i + 1; j < lectures.length; j++) {
      const right = lectures[j]
      const rightStart = timeMinutes(right.start)
      const rightEnd = timeMinutes(right.end)
      if (left.date !== right.date || !localDate(right.date) || rightStart == null || rightEnd == null || rightEnd <= rightStart) continue
      if (leftStart < rightEnd && rightStart < leftEnd) {
        conflicts.add(left.id)
        conflicts.add(right.id)
      }
    }
  }
  return conflicts
}

export function readingComplete(reading) {
  const chapters = (reading.chapters ?? []).filter((chapter) => chapter.text?.trim())
  return Boolean(reading.done) || (chapters.length > 0 && chapters.every((chapter) => chapter.done))
}

export function weeklyWorkload(data, date = new Date(), now = new Date()) {
  const monday = new Date(date)
  if (!Number.isFinite(monday.getTime()) || !Number.isFinite(now.getTime())) throw new Error('Ugyldig dato for ukebelastning.')
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const from = iso(monday)
  const to = iso(sunday)
  const today = iso(now)
  const schoolYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  const inWeek = (value) => value >= from && value <= to
  const groups = { assignments: [], readings: [], overdue: [], unplanned: [] }
  for (const item of data.assignments ?? []) {
    if (item.status === 'done') continue
    if (!localDate(item.deadline)) groups.unplanned.push(item)
    else if (inWeek(item.deadline)) groups.assignments.push(item)
    else if (item.deadline < today) groups.overdue.push(item)
  }
  for (const item of data.readings ?? []) {
    if (readingComplete(item)) continue
    if (!Number.isInteger(item.week) || item.week < 1 || item.week > 53) {
      groups.unplanned.push(item)
      continue
    }
    // ponytail: week-only readings assume one school year; persist weekStart for multi-year plans.
    const year = item.week >= 34 ? schoolYear : schoolYear + 1
    const start = new Date(year, 0, 4, 12)
    start.setDate(start.getDate() - (start.getDay() + 6) % 7 + (item.week - 1) * 7)
    if (isoWeek(start) !== item.week) groups.unplanned.push(item)
    else if (iso(start) === from) groups.readings.push(item)
  }
  const summaries = Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, {
    count: items.length,
    minutes: items.reduce((sum, item) => sum + (normalizeMinutes(item.estimatedMinutes) ?? 0), 0),
    missing: items.filter((item) => normalizeMinutes(item.estimatedMinutes) === null).length,
  }]))
  const minutes = summaries.assignments.minutes + summaries.readings.minutes
  const budgetMinutes = normalizeMinutes(data.weeklyBudgetMinutes)
  return {
    from, to, schoolYear, ...summaries, minutes,
    missing: summaries.assignments.missing + summaries.readings.missing,
    budgetMinutes,
    availableMinutes: budgetMinutes === null ? null : budgetMinutes - minutes,
  }
}

export function examSubjectProgress(exam, data) {
  const matches = (items) => items.filter((item) => item.subjectId === exam.subjectId)
  const lectures = matches(data.lectures ?? [])
  const readings = matches(data.readings ?? [])
  const assignments = matches(data.assignments ?? [])
  const completed = lectures.filter((item) => item.done).length + readings.filter(readingComplete).length + assignments.filter((item) => item.status === 'done').length
  return { completed, total: lectures.length + readings.length + assignments.length }
}

export function reviewNextDate(date, days) {
  const next = localDate(date) ?? new Date()
  next.setDate(next.getDate() + days)
  return iso(next)
}

export function advanceReview(review, now = new Date()) {
  const currentIndex = Math.min(Math.max(review.intervalIndex ?? 0, 0), REVIEW_INTERVALS.length - 1)
  const intervalIndex = Math.min(currentIndex + 1, REVIEW_INTERVALS.length - 1)
  const today = iso(now)
  return { ...review, intervalIndex, lastReviewed: today, nextReview: reviewNextDate(today, REVIEW_INTERVALS[currentIndex]) }
}

export function deferReview(review, now = new Date()) {
  return { ...review, nextReview: reviewNextDate(iso(now), 1) }
}

export function makeReview(input, now = new Date(), id = '') {
  const today = iso(now)
  return { id, subjectId: input.subjectId ?? '', title: input.title.trim(), details: input.details?.trim() ?? '', intervalIndex: 0, nextReview: today, lastReviewed: '', createdAt: now.toISOString() }
}

export function agendaItems(data, range = 'today', now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + (range === 'today' ? 0 : 6))
  const startIso = iso(start)
  const endIso = iso(end)
  const inRange = (date) => date >= startIso && date <= endIso
  const weeks = new Set()
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) weeks.add(isoWeek(date))
  const readingItems = (data.readings ?? []).filter((item) => !readingComplete(item) && weeks.has(item.week)).map((item) => ({ ...item, type: 'reading', date: `Uke ${item.week}`, sort: startIso }))
  return [
    ...(data.lectures ?? []).filter((item) => inRange(item.date)).map((item) => ({ ...item, type: 'lecture' })),
    ...readingItems,
    ...(data.assignments ?? []).filter((item) => item.status !== 'done' && (item.deadline < startIso || inRange(item.deadline))).map((item) => ({ ...item, type: 'assignment', date: item.deadline })),
    ...(data.exams ?? []).filter((item) => inRange(item.date)).map((item) => ({ ...item, type: 'exam' })),
    ...(data.reviews ?? []).filter((item) => item.nextReview <= endIso).map((item) => ({ ...item, type: 'review', date: item.nextReview })),
  ].sort((a, b) => (a.sort ?? a.date).localeCompare(b.sort ?? b.date) || (a.start ?? a.time ?? '').localeCompare(b.start ?? b.time ?? ''))
}

export function createWeekTemplate(name, lectures, now = new Date(), id = '') {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Gi malen et kort navn.')
  if (!lectures.length) throw new Error('Velg en uke med minst én forelesning først.')
  return {
    id,
    name: cleanName,
    createdAt: now.toISOString(),
    lectures: lectures.map((lecture) => ({
      subjectId: lecture.subjectId, weekday: ((localDate(lecture.date)?.getDay() ?? 0) + 6) % 7 + 1,
      start: lecture.start ?? '', end: lecture.end ?? '', room: lecture.room ?? '', lecturer: lecture.lecturer ?? '', topic: lecture.topic ?? '',
      chapters: (lecture.chapters ?? []).map((chapter) => ({ text: chapter.text ?? '', done: false })),
    })),
  }
}

export function applyWeekTemplate(template, week, existingLectures, createId, now = new Date(), validSubjectIds) {
  if (week == null) throw new Error('Velg en bestemt uke før du bruker en mal.')
  const range = weekRangeByWeek(week)
  const match = range.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return []
  const monday = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  const createdAt = now.toISOString()
  const newLectures = []
  for (const source of template.lectures ?? []) {
    const subjectIsValid = validSubjectIds == null || (typeof validSubjectIds.has === 'function' ? validSubjectIds.has(source.subjectId) : validSubjectIds.includes(source.subjectId))
    if (!subjectIsValid) continue
    const date = new Date(monday)
    date.setDate(date.getDate() + Math.max(0, Math.min(6, (source.weekday ?? 1) - 1)))
    const record = { id: createId(), subjectId: source.subjectId, date: iso(date), start: source.start ?? '', end: source.end ?? '', room: source.room ?? '', lecturer: source.lecturer ?? '', topic: source.topic ?? '', chapters: (source.chapters ?? []).map((chapter) => ({ id: createId(), text: chapter.text ?? '', done: false })), done: false, createdAt }
    const duplicate = [...existingLectures, ...newLectures].some((item) => item.subjectId === record.subjectId && item.date === record.date && item.start === record.start && item.end === record.end && item.topic === record.topic)
    if (!duplicate) newLectures.push(record)
  }
  return newLectures
}

export function proposeReschedules(data, now = new Date()) {
  const today = iso(now)
  const exams = new Set((data.exams ?? []).map((item) => item.date).filter(Boolean))
  const lectureCount = (data.lectures ?? []).reduce((map, lecture) => {
    if (!localDate(lecture.date)) return map
    map.set(lecture.date, (map.get(lecture.date) || 0) + 1)
    return map
  }, new Map())
  const candidates = [
    ...(data.assignments ?? [])
      .filter((x) => x.status !== 'done' && localDate(x.deadline) && x.deadline < today)
      .map((x) => ({ type: 'assignment', id: x.id, title: x.title, from: x.deadline })),
    ...(data.reviews ?? [])
      .filter((x) => localDate(x.nextReview) && x.nextReview < today)
      .map((x) => ({ type: 'review', id: x.id, title: x.title, from: x.nextReview })),
  ].sort((a, b) => a.from.localeCompare(b.from))
  if (!candidates.length) return []
  const nextDays = Array.from({ length: 21 }, (_, index) => {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index + 1)
    return iso(date)
  })
  const nextWeek = nextDays.slice(0, 7).filter((date) => !exams.has(date))
  const nonExamDays = nextDays.filter((date) => !exams.has(date))
  const available = nextWeek.length >= candidates.length ? nextWeek : nonExamDays.length ? nonExamDays : nextDays
  const workload = new Map(lectureCount)
  for (const date of [
    ...(data.assignments ?? []).filter((item) => item.status !== 'done').map((item) => item.deadline),
    ...(data.reviews ?? []).map((item) => item.nextReview),
  ]) workload.set(date, (workload.get(date) || 0) + 1)
  const allocated = new Map()
  // Reuse dates when necessary, distributing suggestions before adding another to a day.
  return candidates.map((item) => {
    const to = [...available].sort((a, b) =>
      (allocated.get(a) || 0) - (allocated.get(b) || 0)
      || (workload.get(a) || 0) - (workload.get(b) || 0)
      || a.localeCompare(b),
    )[0]
    allocated.set(to, (allocated.get(to) || 0) + 1)
    return { ...item, to }
  })
}
