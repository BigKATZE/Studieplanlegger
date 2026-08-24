// Bygger det offentlige semesterutdraget fra user_data.
// Sikkerhet: kun eksplisitt oppførte felter returneres – alt annet
// (aiSources, quizAttempts, workPlans, reviews, weekTemplates, id-er,
// tidsstempler og brukerinfo) filtreres bort her, server-side.

const clean = (value, max) => String(value ?? '').trim().slice(0, max)

const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
const iso = (value) => {
  const text = clean(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function pickChapters(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((chapter) => ({ text: clean(chapter?.text, 500), done: Boolean(chapter?.done) }))
    .filter((chapter) => chapter.text)
    .slice(0, 50)
}

export function extractSharedSemester(data) {
  const subjects = (Array.isArray(data?.subjects) ? data.subjects : [])
    .map((subject) => ({
      id: clean(subject?.id, 128),
      name: clean(subject?.name, 300),
      code: clean(subject?.code, 200),
      short: clean(subject?.short, 100),
      color: isHexColor(subject?.color) ? subject.color : '#146c54',
    }))
    .filter((subject) => subject.id)
    .slice(0, 30)
  if (!subjects.length) return null
  const subjectIds = new Set(subjects.map((subject) => subject.id))

  const lectures = (Array.isArray(data?.lectures) ? data.lectures : [])
    .filter((lecture) => subjectIds.has(clean(lecture?.subjectId, 128)))
    .sort((a, b) => String(a?.date ?? '').localeCompare(String(b?.date ?? '')) || String(a?.start ?? '').localeCompare(String(b?.start ?? '')))
    .slice(0, 400)
    .map((lecture) => ({
      subjectId: clean(lecture.subjectId, 128),
      date: iso(lecture.date),
      start: clean(lecture.start, 10),
      end: clean(lecture.end, 10),
      room: clean(lecture.room, 200),
      lecturer: clean(lecture.lecturer, 300),
      topic: clean(lecture.topic, 500),
      done: Boolean(lecture.done),
      chapters: pickChapters(lecture.chapters),
    }))

  const readings = (Array.isArray(data?.readings) ? data.readings : [])
    .filter((reading) => subjectIds.has(clean(reading?.subjectId, 128)))
    .slice(0, 200)
    .map((reading) => ({
      subjectId: clean(reading.subjectId, 128),
      title: clean(reading.title, 500),
      week: Number.isInteger(reading.week) && reading.week >= 1 && reading.week <= 53 ? reading.week : null,
      done: Boolean(reading.done),
      chapters: pickChapters(reading.chapters),
    }))

  const assignments = (Array.isArray(data?.assignments) ? data.assignments : [])
    .filter((assignment) => subjectIds.has(clean(assignment?.subjectId, 128)))
    .slice(0, 200)
    .map((assignment) => ({
      subjectId: clean(assignment.subjectId, 128),
      title: clean(assignment.title, 500),
      deadline: iso(assignment.deadline),
      status: ['not_started', 'in_progress', 'done'].includes(assignment.status) ? assignment.status : 'not_started',
    }))

  const exams = (Array.isArray(data?.exams) ? data.exams : [])
    .filter((exam) => subjectIds.has(clean(exam?.subjectId, 128)))
    .slice(0, 100)
    .map((exam) => ({
      subjectId: clean(exam.subjectId, 128),
      title: clean(exam.title, 500),
      date: iso(exam.date),
      time: clean(exam.time, 10),
    }))

  const bySubject = (items) => subjects.map((subject) => items.filter((item) => item.subjectId === subject.id))

  const [subjectLectures, subjectReadings, subjectAssignments, subjectExams] = [
    bySubject(lectures), bySubject(readings), bySubject(assignments), bySubject(exams),
  ]

  return {
    generatedAt: new Date().toISOString(),
    subjects: subjects.map((subject, index) => ({
      ...subject,
      lectures: subjectLectures[index],
      readings: subjectReadings[index],
      assignments: subjectAssignments[index],
      exams: subjectExams[index],
    })),
  }
}
