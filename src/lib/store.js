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

function seed() {
  const subjects = [
    ['EXC3401', 'Business Communication, Culture and Ethics', 'BizCom'],
    ['JUR3420', 'Forretningsjus', 'Forretningsjus'],
    ['BØK3430', 'Bedriftsøkonomi og finans', 'Bedøk'],
    ['ORG3403', 'Organisasjonsadferd og ledelse', 'Org & ledelse'],
    ['JUS2010-1', 'Rettstaten', 'Rettstaten'],
  ].map(([code, name, short], i) => ({
    id: uid(), code, name, short, color: SUBJECT_COLORS[i], levelOverride: null,
  }))

  const jur = subjects[1].id
  const lec = (subjectId, date, start, end, room, lecturer, topic = '', chapters = []) => ({
    id: uid(), subjectId, date, start, end, room, lecturer, topic, chapters, done: false,
  })
  const lectures = [
    lec(jur, '2026-08-17', '10:00', '11:45', 'C2-060', 'Gina Bråthen', 'Introduksjon', [
      { id: uid(), text: 'Kapittel 1 – Rettssystemet og rettskildene', done: false },
      { id: uid(), text: 'Kapittel 2 – Avtaleloven i et nøtteskall', done: false },
    ]),
    lec(jur, '2026-08-28', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-08-31', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-09-04', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-09-07', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-09-11', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-09-16', '10:00', '11:45', 'B1-020', 'Harald Benestad Anderssen'),
    lec(jur, '2026-09-21', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-10-05', '10:00', '11:45', 'C2-060', 'Inger Julie Grimsrud Aasland'),
    lec(jur, '2026-10-09', '10:00', '11:45', 'C2-060', 'Inger Julie Grimsrud Aasland'),
    lec(jur, '2026-10-12', '10:00', '11:45', 'C2-060', 'Inger Julie Grimsrud Aasland'),
    lec(jur, '2026-10-16', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
    lec(jur, '2026-10-19', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
    lec(jur, '2026-10-23', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
    lec(jur, '2026-10-26', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
    lec(jur, '2026-10-30', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
    lec(jur, '2026-11-02', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-11-06', '10:00', '11:45', 'B1-020', 'Harald Benestad Anderssen'),
    lec(jur, '2026-11-09', '10:00', '11:45', 'C2-060', 'Harald Benestad Anderssen'),
    lec(jur, '2026-11-16', '10:00', '11:45', 'C2-060', 'Gina Bråthen'),
  ]

  const assignments = [
    { id: uid(), subjectId: subjects[2].id, title: 'Arbeidskrav 1 – Årsregnskap', deadline: '2026-09-15', status: 'not_started' },
    { id: uid(), subjectId: jur, title: 'Arbeidskrav 1 – Obligasjonsrett', deadline: '2026-10-01', status: 'not_started' },
  ]

  const exams = [
    { id: uid(), subjectId: subjects[4].id, title: 'Hjemmeeksamen', date: '2026-11-20', time: '09:00' },
    { id: uid(), subjectId: jur, title: 'Skriftlig skoleeksamen', date: '2026-12-07', time: '09:00' },
    { id: uid(), subjectId: subjects[2].id, title: 'Skriftlig skoleeksamen', date: '2026-12-10', time: '09:00' },
  ]

  const readings = [
    {
      id: uid(), subjectId: jur, title: 'Kapittel 1–2 – Rettssystemet og rettskildene', week: 34, done: false,
      chapters: [
        { id: uid(), text: 'Kapittel 1 – Rettssystemet', done: false },
        { id: uid(), text: 'Kapittel 2 – Rettskildene', done: false },
      ],
    },
    {
      id: uid(), subjectId: jur, title: 'Kapittel 3 – Avtaleloven', week: 35, done: false,
      chapters: [{ id: uid(), text: 'Kapittel 3 – Avtaleloven', done: false }],
    },
    {
      id: uid(), subjectId: subjects[2].id, title: 'Kapittel 5 – Årsregnskap', week: 37, done: false,
      chapters: [{ id: uid(), text: 'Kapittel 5 – Årsregnskap', done: false }],
    },
  ]

  return { subjects, lectures, assignments, exams, readings }
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
  const data = seed()
  save(data)
  return data
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}