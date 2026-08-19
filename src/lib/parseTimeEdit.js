const ROW = /^u\s+(\d+)\s+\S+\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})\s+(\S+)\s+(.+)$/

export function parseTimeEdit(text) {
  const lectures = []
  for (const line of text.split('\n')) {
    const m = line.trim().match(ROW)
    if (!m) continue
    const [, , dateStr, start, end, , rest] = m
    const [dd, mm, yyyy] = dateStr.split('.')
    const room = rest.match(/([A-Z]\d-\d{3})$/)?.[1] ?? ''
    const lecturer = room ? rest.slice(0, -room.length).trim() : rest.trim()
    lectures.push({ date: `${yyyy}-${mm}-${dd}`, start, end, room, lecturer })
  }
  return lectures
}

export function detectCourseCode(text) {
  const m = text.match(/[A-Z]{2,}\s?\d{3,4}(?:-\d+)?/)
  return m ? m[0].replace(/\s/g, '') : null
}