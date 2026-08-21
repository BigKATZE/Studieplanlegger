const KEY = 'oliarev-study-planner-v2'
const LEGACY_KEY = 'oliarev-study-planner-v1'
const EMPTY_DATA = { subjects: [], lectures: [], assignments: [], exams: [], readings: [], reviews: [], weekTemplates: [], aiSources: [], quizAttempts: [], workPlans: [] }

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

const cleanText = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function normalizeSource(item) {
  if (!isRecord(item) || !cleanText(item.id, 128) || !cleanText(item.subjectId, 128) || !cleanText(item.title, 300) || !cleanText(item.text, 60_000) || !['notes', 'pdf'].includes(item.sourceType)) return null
  return { id: cleanText(item.id, 128), subjectId: cleanText(item.subjectId, 128), title: cleanText(item.title, 300), text: cleanText(item.text, 60_000), sourceType: item.sourceType, ...(cleanText(item.fileName, 300) ? { fileName: cleanText(item.fileName, 300) } : {}), createdAt: cleanText(item.createdAt, 80) }
}
function normalizeAttempt(item) {
  if (!isRecord(item) || !cleanText(item.id, 128) || !cleanText(item.subjectId, 128) || !cleanText(item.question) || !cleanText(item.expectedAnswer) || !cleanText(item.userAnswer) || !['correct', 'partial', 'incorrect'].includes(item.verdict)) return null
  return { id: cleanText(item.id, 128), subjectId: cleanText(item.subjectId, 128), sourceId: cleanText(item.sourceId, 128), question: cleanText(item.question), expectedAnswer: cleanText(item.expectedAnswer), userAnswer: cleanText(item.userAnswer), verdict: item.verdict, feedback: cleanText(item.feedback, 1000), createdAt: cleanText(item.createdAt, 80) }
}
function normalizeWorkPlan(item) {
  if (!isRecord(item) || !cleanText(item.id, 128) || !cleanText(item.title, 300)) return null
  const steps = Array.isArray(item.steps) ? item.steps.map((step) => isRecord(step) && cleanText(step.id, 128) && cleanText(step.title, 300) ? { id: cleanText(step.id, 128), title: cleanText(step.title, 300), description: cleanText(step.description), doneCriteria: cleanText(step.doneCriteria, 1000), estimatedMinutes: Number.isInteger(step.estimatedMinutes) ? Math.max(0, Math.min(600, step.estimatedMinutes)) : 0, completed: Boolean(step.completed) } : null).filter(Boolean) : []
  return { id: cleanText(item.id, 128), assignmentId: cleanText(item.assignmentId, 128), subjectId: cleanText(item.subjectId, 128), title: cleanText(item.title, 300), summary: cleanText(item.summary), requirements: Array.isArray(item.requirements) ? item.requirements.map((x) => cleanText(x, 500)).filter(Boolean).slice(0, 15) : [], steps, clarifications: Array.isArray(item.clarifications) ? item.clarifications.map((x) => cleanText(x, 500)).filter(Boolean).slice(0, 10) : [], createdAt: cleanText(item.createdAt, 80) }
}

const ALLOWED_BACKUP_KEYS = ['subjects', 'lectures', 'assignments', 'exams', 'readings', 'reviews', 'weekTemplates', 'aiSources', 'quizAttempts', 'workPlans']
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

function sanitizePlannerString(value, max) {
  return cleanText(value, max)
}

function normalizeSubject(item) {
  if (!isRecord(item) || !cleanText(item.id, 128)) return null
  return {
    id: cleanText(item.id, 128),
    code: sanitizePlannerString(item.code, 200),
    name: sanitizePlannerString(item.name, 300),
    short: sanitizePlannerString(item.short, 100),
    color: typeof item.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : SUBJECT_COLORS[0],
    levelOverride: item.levelOverride ?? null,
  }
}
function normalizeLecture(item) {
  if (!isRecord(item) || !cleanText(item.id, 128)) return null
  const chapters = Array.isArray(item.chapters) ? item.chapters.filter(isRecord).filter((chapter) => typeof chapter.text === 'string' && chapter.text.trim()).map((chapter) => ({ id: cleanText(chapter.id, 128), text: sanitizePlannerString(chapter.text, 2000), done: Boolean(chapter.done) })).slice(0, 50) : []
  return {
    id: cleanText(item.id, 128),
    subjectId: cleanText(item.subjectId, 128),
    date: typeof item.date === 'string' && validIsoDate(item.date) ? item.date : '',
    start: typeof item.start === 'string' ? cleanText(item.start, 10) : '',
    end: typeof item.end === 'string' ? cleanText(item.end, 10) : '',
    room: sanitizePlannerString(item.room, 200),
    lecturer: sanitizePlannerString(item.lecturer, 300),
    topic: sanitizePlannerString(item.topic, 500),
    chapters,
    done: Boolean(item.done),
    completedAt: cleanText(item.completedAt, 80),
    createdAt: cleanText(item.createdAt, 80),
  }
}
function normalizeAssignment(item) {
  if (!isRecord(item) || !cleanText(item.id, 128)) return null
  return {
    id: cleanText(item.id, 128),
    subjectId: cleanText(item.subjectId, 128),
    title: sanitizePlannerString(item.title, 500),
    deadline: typeof item.deadline === 'string' && validIsoDate(item.deadline) ? item.deadline : '',
    status: ['not_started', 'in_progress', 'done'].includes(item.status) ? item.status : 'not_started',
    completedAt: cleanText(item.completedAt, 80),
    createdAt: cleanText(item.createdAt, 80),
  }
}
function normalizeExam(item) {
  if (!isRecord(item) || !cleanText(item.id, 128)) return null
  return {
    id: cleanText(item.id, 128),
    subjectId: cleanText(item.subjectId, 128),
    title: sanitizePlannerString(item.title, 500),
    date: typeof item.date === 'string' && validIsoDate(item.date) ? item.date : '',
    time: typeof item.time === 'string' ? cleanText(item.time, 10) : '',
    createdAt: cleanText(item.createdAt, 80),
  }
}
function normalizeReading(item) {
  if (!isRecord(item) || !cleanText(item.id, 128)) return null
  const chapters = Array.isArray(item.chapters) ? item.chapters.filter(isRecord).filter((chapter) => typeof chapter.text === 'string' && chapter.text.trim()).map((chapter) => ({ id: cleanText(chapter.id, 128), text: sanitizePlannerString(chapter.text, 2000), done: Boolean(chapter.done) })).slice(0, 50) : []
  return {
    id: cleanText(item.id, 128),
    subjectId: cleanText(item.subjectId, 128),
    title: sanitizePlannerString(item.title, 500),
    week: Number.isInteger(item.week) && item.week >= 1 && item.week <= 53 ? item.week : null,
    done: Boolean(item.done),
    chapters,
    createdAt: cleanText(item.createdAt, 80),
  }
}

export function normalizePlannerData(data) {
  if (!isRecord(data)) return { ...EMPTY_DATA }
  if (FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key))) return { ...EMPTY_DATA }
  const unique = (items) => {
    const ids = new Set()
    return items.filter((item) => {
      if (!item || ids.has(item.id)) return false
      ids.add(item.id)
      return true
    })
  }
  return {
    subjects: unique((Array.isArray(data.subjects) ? data.subjects : []).map(normalizeSubject).filter(Boolean)),
    lectures: unique((Array.isArray(data.lectures) ? data.lectures : []).map(normalizeLecture).filter(Boolean)),
    assignments: unique((Array.isArray(data.assignments) ? data.assignments : []).map(normalizeAssignment).filter(Boolean)),
    exams: unique((Array.isArray(data.exams) ? data.exams : []).map(normalizeExam).filter(Boolean)),
    readings: unique((Array.isArray(data.readings) ? data.readings : []).map(normalizeReading).filter(Boolean)),
    reviews: unique((Array.isArray(data.reviews) ? data.reviews : []).map(normalizeReview)),
    weekTemplates: unique((Array.isArray(data.weekTemplates) ? data.weekTemplates : []).map(normalizeWeekTemplate)),
    aiSources: unique((Array.isArray(data.aiSources) ? data.aiSources : []).map(normalizeSource)).slice(0, 25),
    quizAttempts: unique((Array.isArray(data.quizAttempts) ? data.quizAttempts : []).map(normalizeAttempt)).slice(-200),
    workPlans: unique((Array.isArray(data.workPlans) ? data.workPlans : []).map(normalizeWorkPlan)).slice(0, 100),
  }
}

export function isValidBackupData(data) {
  if (!isRecord(data) || !Array.isArray(data.subjects) || !Array.isArray(data.lectures)) return false
  if (Object.keys(data).some((key) => FORBIDDEN_KEYS.includes(key) || !ALLOWED_BACKUP_KEYS.includes(key))) return false
  if (ALLOWED_BACKUP_KEYS.some((key) => Array.isArray(data[key]) && data[key].length > 10000)) return false
  return ALLOWED_BACKUP_KEYS.every((key) => !(key in data) || Array.isArray(data[key]))
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
