import { matchSubject } from './parseSmartInput.js'

function canvasDate(isoStr) {
  if (!isoStr) return null
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function mapCanvasRows(courses, assignmentsByCourse, subjects) {
  const rows = []
  for (const course of courses) {
    const items = assignmentsByCourse[course.id] ?? []
    const key = `${course.course_code ?? ''} ${course.name ?? ''}`.toLowerCase()
    const subject = matchSubject(key, subjects)
    for (const a of items) {
      const deadline = canvasDate(a.due_at)
      if (!deadline) continue
      rows.push({
        courseCode: course.course_code ?? '',
        courseName: course.name ?? '',
        title: a.name,
        deadline,
        subjectId: subject?.id ?? null,
      })
    }
  }
  return rows
}

export async function canvasFetchAssignments(baseUrl, token) {
  const base = baseUrl.replace(/\/+$/, '')
  const headers = { Authorization: `Bearer ${token}` }
  const coursesRes = await fetch(
    `${base}/api/v1/courses?enrollment_state=active&state[]=available&per_page=100`,
    { headers },
  )
  if (!coursesRes.ok) throw new Error(`Canvas svarte ${coursesRes.status}`)
  const courses = (await coursesRes.json()).filter((c) => !c.access_restricted_by_date)

  const assignmentsByCourse = {}
  await Promise.all(
    courses.map(async (course) => {
      const res = await fetch(`${base}/api/v1/courses/${course.id}/assignments?per_page=100`, { headers })
      if (!res.ok) return
      assignmentsByCourse[course.id] = (await res.json()).filter((a) => a.published !== false)
    }),
  )

  return { courses, assignmentsByCourse }
}