import { useState } from 'react'
import { load, save, uid, pickSubjectColor } from './lib/store'
import { fmtShort, iso } from './lib/date'
import SubjectPanel from './components/SubjectPanel'
import Timeplan from './components/Timeplan'
import Gjøremål from './components/Gjøremål'
import Eksamener from './components/Eksamener'
import SmartInput from './components/SmartInput'
import ImportModal from './components/ImportModal'
import CanvasModal from './components/CanvasModal'
import IcsModal from './components/IcsModal'
import { Modal, SubjectForm, LectureForm, AssignmentForm, ExamForm } from './components/Modals'
import { DeadlineStrip, SubjectFilter } from './components/ui'

function useStore() {
  const [data, setData] = useState(load)
  const update = (fn) => setData((prev) => {
    const next = fn(prev)
    save(next)
    return next
  })
  return [data, update]
}

const TABS = [
  { id: 'overview', label: 'Oversikt' },
  { id: 'timeplan', label: 'Timeplan' },
  { id: 'tasks', label: 'Gjøremål' },
  { id: 'exams', label: 'Eksamener' },
]

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function findTargetLecture(lectures, subject, date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = iso(today)
  const sorted = [...lectures].sort((a, b) => a.date.localeCompare(b.date))
  const match = (l) =>
    subject && date
      ? l.subjectId === subject.id && l.date === iso(date)
      : subject
        ? l.subjectId === subject.id
        : date
          ? l.date === iso(date)
          : true
  return sorted.find((l) => match(l) && l.date >= todayIso) || sorted.find(match) || null
}

export default function App() {
  const [data, update] = useStore()
  const [tab, setTab] = useState('timeplan')
  const [modal, setModal] = useState(null)
  const [filterSubjectId, setFilterSubjectId] = useState(null)

  const bySubject = (items) => (filterSubjectId ? items.filter((i) => i.subjectId === filterSubjectId) : items)

  const actions = {
    addSubject: (s) => update((d) => ({
      ...d,
      subjects: [...d.subjects, { id: uid(), color: pickSubjectColor(d.subjects.length), levelOverride: null, ...s }],
    })),
    addLecture: (l) => update((d) => ({
      ...d,
      lectures: [...d.lectures, { id: uid(), chapters: [], done: false, ...l }],
    })),
    addAssignment: (a) => update((d) => ({
      ...d,
      assignments: [...d.assignments, { id: uid(), ...a }],
    })),
    addExam: (e) => update((d) => ({
      ...d,
      exams: [...d.exams, { id: uid(), ...e }],
    })),
    addChapter: (lectureId, text) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) =>
        l.id === lectureId ? { ...l, chapters: [...l.chapters, { id: uid(), text, done: false }] } : l,
      ),
    })),
    importLectures: (rows) => update((d) => ({
      ...d,
      lectures: [...d.lectures, ...rows.map((l) => ({ id: uid(), chapters: [], done: false, ...l }))],
    })),
    canvasImport: (groups) => update((d) => {
      const subjects = [...d.subjects]
      const added = []
      for (const g of groups) {
        let subjectId = g.subjectValue
        if (subjectId === 'new') {
          subjectId = uid()
          subjects.push({
            id: subjectId,
            code: g.courseCode,
            name: g.courseName,
            short: g.courseName || g.courseCode,
            color: pickSubjectColor(subjects.length),
            levelOverride: null,
          })
        }
        for (const r of g.rows) {
          if (!r.include || !r.title.trim() || !r.deadline) continue
          const assignment = { subjectId, title: r.title.trim(), deadline: r.deadline, status: 'not_started' }
          const dup = d.assignments.some(
            (x) => x.subjectId === subjectId && x.title === assignment.title && x.deadline === assignment.deadline,
          )
          if (!dup) added.push({ id: uid(), ...assignment })
        }
      }
      return { ...d, subjects, assignments: [...d.assignments, ...added] }
    }),
    icsImport: (rows) => update((d) => {
      const subjects = [...d.subjects]
      const assignments = [...d.assignments]
      const exams = [...d.exams]
      for (const r of rows) {
        if (!r.include || !r.title.trim() || !r.date) continue
        let subjectId = r.subjectValue
        if (subjectId === 'new') {
          subjectId = uid()
          const name = r.newName.trim() || r.title.trim()
          subjects.push({
            id: subjectId,
            code: '',
            name,
            short: name,
            color: pickSubjectColor(subjects.length),
            levelOverride: null,
          })
        }
        if (r.kind === 'exam') {
          const exam = { id: uid(), subjectId, title: r.title.trim(), date: r.date, time: '' }
          if (!exams.some((x) => x.subjectId === subjectId && x.title === exam.title && x.date === exam.date)) {
            exams.push(exam)
          }
        } else {
          const item = { id: uid(), subjectId, title: r.title.trim(), deadline: r.date, status: 'not_started' }
          if (!assignments.some((x) => x.subjectId === subjectId && x.title === item.title && x.deadline === item.deadline)) {
            assignments.push(item)
          }
        }
      }
      return { ...d, subjects, assignments, exams }
    }),
    toggleChapter: (lectureId, chapterId) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) =>
        l.id === lectureId
          ? { ...l, chapters: l.chapters.map((c) => (c.id === chapterId ? { ...c, done: !c.done } : c)) }
          : l,
      ),
    })),
    toggleLecture: (lectureId) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) => (l.id === lectureId ? { ...l, done: !l.done } : l)),
    })),
    setAssignmentStatus: (id, status) => update((d) => ({
      ...d,
      assignments: d.assignments.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
    setLevel: (subjectId, level) => update((d) => ({
      ...d,
      subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, levelOverride: level } : s)),
    })),
    removeLecture: (id) => update((d) => ({
      ...d,
      lectures: d.lectures.filter((l) => l.id !== id),
    })),
    removeAssignment: (id) => update((d) => ({
      ...d,
      assignments: d.assignments.filter((a) => a.id !== id),
    })),
    removeExam: (id) => update((d) => ({
      ...d,
      exams: d.exams.filter((e) => e.id !== id),
    })),
  }

  const applySmartAction = (action) => {
    if (action.type === 'assignment') {
      actions.addAssignment({ subjectId: action.subject.id, title: action.title, deadline: iso(action.date), status: 'not_started' })
      return { ok: true, message: `La til «${action.title}» i ${action.subject.short}, frist ${fmtShort(action.date)}.` }
    }
    if (action.type === 'exam') {
      actions.addExam({ subjectId: action.subject.id, title: action.title, date: iso(action.date), time: action.time || '09:00' })
      return { ok: true, message: `La til ${action.title} i ${action.subject.short} ${fmtShort(action.date)}.` }
    }
    if (action.type === 'lecture') {
      actions.addLecture({
        subjectId: action.subject.id,
        date: iso(action.date),
        start: action.time,
        end: addMinutes(action.time, 105),
        room: '',
        lecturer: '',
        topic: action.topic,
      })
      return { ok: true, message: `La til forelesning i ${action.subject.short} ${fmtShort(action.date)} kl. ${action.time}.` }
    }
    const target = findTargetLecture(data.lectures, action.subject, action.date)
    if (!target) {
      return { ok: false, error: 'Fant ingen forelesning å legge kapittelet til. Legg til en forelesning først.' }
    }
    actions.addChapter(target.id, action.label)
    const subject = data.subjects.find((s) => s.id === target.subjectId)
    return {
      ok: true,
      message: `La til «${action.label}» på forelesningen ${fmtShort(new Date(target.date))} i ${subject?.short ?? ''}.`,
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-5xl px-4 pb-6 pt-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">Studieplanlegger</h1>
        <p className="mt-1 text-sm text-muted">Timeplan, pensum, arbeidskrav og eksamener – uke for uke.</p>

        <SmartInput subjects={data.subjects} onApply={applySmartAction} />

        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sider">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setModal('import')} className="btn-primary">Importer timeplan (PDF)</button>
          <button onClick={() => setModal('ics')} className="btn-primary">Importer iCal (uten token)</button>
          <button onClick={() => setModal('canvas')} className="btn-ghost">Importer fra Canvas (token)</button>
          <button onClick={() => setModal('lecture')} className="btn-ghost">Ny forelesning</button>
          <button onClick={() => setModal('assignment')} className="btn-ghost">Nytt arbeidskrav</button>
          <button onClick={() => setModal('exam')} className="btn-ghost">Ny eksamen</button>
          <button onClick={() => setModal('subject')} className="btn-ghost">Nytt fag</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        {tab === 'overview' && (
          <>
            <SubjectPanel
              subjects={data.subjects}
              lectures={data.lectures}
              assignments={data.assignments}
              onSetLevel={actions.setLevel}
            />
            <DeadlineStrip
              assignments={data.assignments}
              exams={data.exams}
              subjects={data.subjects}
            />
          </>
        )}

        {tab === 'timeplan' && (
          <>
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <Timeplan
              lectures={bySubject(data.lectures)}
              subjects={data.subjects}
              onToggleLecture={actions.toggleLecture}
              onToggleChapter={actions.toggleChapter}
              onRemoveLecture={actions.removeLecture}
            />
          </>
        )}

        {tab === 'tasks' && (
          <>
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <Gjøremål
              assignments={bySubject(data.assignments)}
              subjects={data.subjects}
              onSetAssignmentStatus={actions.setAssignmentStatus}
              onRemoveAssignment={actions.removeAssignment}
            />
          </>
        )}

        {tab === 'exams' && (
          <>
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <Eksamener
              exams={bySubject(data.exams)}
              subjects={data.subjects}
              onRemoveExam={actions.removeExam}
            />
          </>
        )}
      </main>

      {modal === 'subject' && (
        <Modal title="Nytt fag" onClose={() => setModal(null)}>
          <SubjectForm onAdd={actions.addSubject} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'lecture' && (
        <Modal title="Ny forelesning" onClose={() => setModal(null)}>
          <LectureForm subjects={data.subjects} onAdd={actions.addLecture} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'assignment' && (
        <Modal title="Nytt arbeidskrav" onClose={() => setModal(null)}>
          <AssignmentForm subjects={data.subjects} onAdd={actions.addAssignment} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'exam' && (
        <Modal title="Ny eksamen" onClose={() => setModal(null)}>
          <ExamForm subjects={data.subjects} onAdd={actions.addExam} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'import' && (
        <ImportModal subjects={data.subjects} onImport={actions.importLectures} onClose={() => setModal(null)} />
      )}
      {modal === 'canvas' && (
        <CanvasModal subjects={data.subjects} onImport={actions.canvasImport} onClose={() => setModal(null)} />
      )}
      {modal === 'ics' && (
        <IcsModal subjects={data.subjects} onImport={actions.icsImport} onClose={() => setModal(null)} />
      )}
    </div>
  )
}