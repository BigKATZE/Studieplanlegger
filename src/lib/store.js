const KEY = 'oliarev-study-planner-v1'

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const SUBJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488',
  '#db2777', '#4f46e5', '#ea580c', '#0891b2', '#65a30d', '#c026d3',
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