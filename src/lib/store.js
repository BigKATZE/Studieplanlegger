const KEY = 'oliarev-study-planner-v2'
const LEGACY_KEY = 'oliarev-study-planner-v1'
const EMPTY_DATA = { subjects: [], lectures: [], assignments: [], exams: [], readings: [], reviews: [], weekTemplates: [] }

export function uid() {
  return crypto.randomUUID()
}

export const SUBJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488',
  '#db2777', '#4f46e5', '#ea580c', '#0891b2', '#65a30d', '#c026d3',
  '#e11d48', '#16a34a', '#f59e0b', '#9333ea', '#0f766e', '#ca8a04',
  '#ec4899', '#14b8a6', '#0369a1', '#a21caf', '#f97316', '#06b6d4',
  '#4d7c0f', '#1d4ed8',
]

export function pickSubjectColor(i) {
  return SUBJECT_COLORS[i % SUBJECT_COLORS.length]
}

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value)

function validIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function normalizeReview(review) {
  if (!isRecord(review) || typeof review.id !== 'string' || !review.id.trim() || typeof review.title !== 'string' || !review.title.trim() || typeof review.nextReview !== 'string' || !validIsoDate(review.nextReview.trim())) return null
  return {
    ...review,
    id: review.id.trim(),
    subjectId: typeof review.subjectId === 'string' ? review.subjectId : '',
    title: review.title.trim(),
    details: typeof review.details === 'string' ? review.details : '',
    intervalIndex: Number.isInteger(review.intervalIndex) ? Math.min(3, Math.max(0, review.intervalIndex)) : 0,
    nextReview: review.nextReview.trim(),
    lastReviewed: typeof review.lastReviewed === 'string' ? review.lastReviewed : '',
    createdAt: typeof review.createdAt === 'string' ? review.createdAt : '',
  }
}

function normalizeTemplateLecture(lecture) {
  if (!isRecord(lecture)) return null
  const chapters = Array.isArray(lecture.chapters) ? lecture.chapters
    .filter(isRecord)
    .filter((chapter) => typeof chapter.text === 'string' && chapter.text.trim())
    .map((chapter) => ({ ...chapter, text: chapter.text.trim(), done: false })) : []
  return {
    ...lecture,
    subjectId: typeof lecture.subjectId === 'string' ? lecture.subjectId : '',
    weekday: Number.isInteger(lecture.weekday) && lecture.weekday >= 1 && lecture.weekday <= 7 ? lecture.weekday : 1,
    start: typeof lecture.start === 'string' ? lecture.start : '',
    end: typeof lecture.end === 'string' ? lecture.end : '',
    room: typeof lecture.room === 'string' ? lecture.room : '',
    lecturer: typeof lecture.lecturer === 'string' ? lecture.lecturer : '',
    topic: typeof lecture.topic === 'string' ? lecture.topic : '',
    chapters,
  }
}

function normalizeWeekTemplate(template) {
  if (!isRecord(template) || typeof template.id !== 'string' || !template.id.trim() || typeof template.name !== 'string' || !template.name.trim()) return null
  return {
    ...template,
    id: template.id.trim(),
    name: template.name.trim(),
    createdAt: typeof template.createdAt === 'string' ? template.createdAt : '',
    lectures: (Array.isArray(template.lectures) ? template.lectures : []).map(normalizeTemplateLecture).filter(Boolean),
  }
}

export function normalizePlannerData(data) {
  if (!isRecord(data)) return { ...EMPTY_DATA }
  const unique = (items) => {
    const ids = new Set()
    return items.filter((item) => {
      if (!item || ids.has(item.id)) return false
      ids.add(item.id)
      return true
    })
  }
  return {
    ...data,
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    lectures: Array.isArray(data.lectures) ? data.lectures : [],
    assignments: Array.isArray(data.assignments) ? data.assignments : [],
    exams: Array.isArray(data.exams) ? data.exams : [],
    readings: (Array.isArray(data.readings) ? data.readings : []).map((reading) => ({ ...reading, chapters: Array.isArray(reading?.chapters) ? reading.chapters : [] })),
    reviews: unique((Array.isArray(data.reviews) ? data.reviews : []).map(normalizeReview)),
    weekTemplates: unique((Array.isArray(data.weekTemplates) ? data.weekTemplates : []).map(normalizeWeekTemplate)),
  }
}

export function isValidBackupData(data) {
  if (!isRecord(data) || !Array.isArray(data.subjects) || !Array.isArray(data.lectures)) return false
  return ['assignments', 'exams', 'readings', 'reviews', 'weekTemplates'].every((key) => !(key in data) || Array.isArray(data[key]))
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (raw) {
      return normalizePlannerData(JSON.parse(raw))
    }
  } catch {
    /* ignore corrupted data */
  }
  return { ...EMPTY_DATA }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}
