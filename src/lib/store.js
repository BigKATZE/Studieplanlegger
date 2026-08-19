const KEY = 'oliarev-study-planner-v2'

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const SUBJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488',
  '#db2777', '#4f46e5', '#ea580c', '#0891b2', '#65a30d', '#c026d3',
  '#1d4ed8', '#16a34a', '#b45309', '#be185d', '#0f766e', '#9333ea',
  '#ca8a04', '#0369a1', '#4d7c0f', '#c2410c', '#6d28d9', '#0e7490',
]

export function pickSubjectColor(i) {
  return SUBJECT_COLORS[i % SUBJECT_COLORS.length]
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (!Array.isArray(data.exams)) data.exams = []
      if (!Array.isArray(data.readings)) data.readings = []
      data.readings = data.readings.map((r) => ({ chapters: [], ...r }))
      return data
    }
  } catch {
    /* ignore corrupted data */
  }
  return { subjects: [], lectures: [], assignments: [], exams: [], readings: [] }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}