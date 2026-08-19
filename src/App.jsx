import { useState } from 'react'
import { load, save, uid, pickSubjectColor } from './lib/store'
import { fmtShort, iso, isoWeek } from './lib/date'
import SubjectPanel from './components/SubjectPanel'
import Timeplan from './components/Timeplan'
import Pensum from './components/Pensum'
import Gjøremål from './components/Gjøremål'
import Eksamener from './components/Eksamener'
import SmartInput from './components/SmartInput'
import ImportModal from './components/ImportModal'
import IcsModal from './components/IcsModal'
import { Modal, SubjectForm, LectureForm, AssignmentForm, ExamForm, ReadingForm } from './components/Modals'
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
  { id: 'reading', label: 'Pensum' },
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
  const [editing, setEditing] = useState(null)
  const [filterSubjectId, setFilterSubjectId] = useState(null)

  const closeModal = () => {
    setModal(null)
    setEditing(null)
  }
  const openModal = (m) => {
    setModal(m)
    setEditing(null)
  }
  const openEdit = (type, item) => {
    setEditing(item)
    setModal(type)
  }

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
    addReading: (r) => update((d) => ({
      ...d,
      readings: [...d.readings, { id: uid(), ...r }],
    })),
    addChapter: (lectureId, text) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) =>
        l.id === lectureId && !l.chapters.some((c) => c.text.trim().toLowerCase() === text.trim().toLowerCase())
          ? { ...l, chapters: [...l.chapters, { id: uid(), text, done: false }] }
          : l,
      ),
    })),
    importLectures: (rows) => update((d) => ({
      ...d,
      lectures: [...d.lectures, ...rows.map((l) => ({ id: uid(), chapters: [], done: false, ...l }))],
    })),
    icsImport: (rows) => update((d) => {
      const subjects = [...d.subjects]
      const assignments = [...d.assignments]
      const exams = [...d.exams]
      const lectures = [...d.lectures]
      const newSubjects = new Map()
      const resolveSubject = (r) => {
        if (r.subjectValue !== 'new') return r.subjectValue
        const name = (r.newName || '').trim() || 'Ukjent fag'
        if (newSubjects.has(name)) return newSubjects.get(name)
        const id = uid()
        newSubjects.set(name, id)
        subjects.push({ id, code: name, name, short: name, color: pickSubjectColor(subjects.length), levelOverride: null })
        return id
      }
      for (const r of rows) {
        if (!r.include || !r.title.trim() || !r.date) continue
        const subjectId = resolveSubject(r)
        if (r.kind === 'exam') {
          const exam = { id: uid(), subjectId, title: r.title.trim(), date: r.date, time: '' }
          if (!exams.some((x) => x.subjectId === subjectId && x.title === exam.title && x.date === exam.date)) {
            exams.push(exam)
          }
        } else if (r.kind === 'lecture') {
          const start = r.time || '10:00'
          const lecture = { id: uid(), subjectId, date: r.date, start, end: addMinutes(start, 105), room: '', lecturer: '', topic: r.title.trim(), chapters: [], done: false }
          if (!lectures.some((x) => x.subjectId === subjectId && x.date === lecture.date && x.topic === lecture.topic)) {
            lectures.push(lecture)
          }
        } else {
          const item = { id: uid(), subjectId, title: r.title.trim(), deadline: r.date, status: 'not_started' }
          if (!assignments.some((x) => x.subjectId === subjectId && x.title === item.title && x.deadline === item.deadline)) {
            assignments.push(item)
          }
        }
      }
      return { ...d, subjects, assignments, exams, lectures }
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
    removeSubject: (id) => update((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => s.id !== id),
      lectures: d.lectures.filter((l) => l.subjectId !== id),
      assignments: d.assignments.filter((a) => a.subjectId !== id),
      exams: d.exams.filter((e) => e.subjectId !== id),
      readings: d.readings.filter((r) => r.subjectId !== id),
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
    toggleReading: (id) => update((d) => ({
      ...d,
      readings: d.readings.map((r) => (r.id === id ? { ...r, done: !r.done } : r)),
    })),
    toggleReadingChapter: (readingId, chapterId) => update((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === readingId
          ? { ...r, chapters: (r.chapters ?? []).map((c) => (c.id === chapterId ? { ...c, done: !c.done } : c)) }
          : r,
      ),
    })),
    removeReading: (id) => update((d) => ({
      ...d,
      readings: d.readings.filter((r) => r.id !== id),
    })),
    updateSubject: (s) => update((d) => ({
      ...d,
      subjects: d.subjects.map((x) => (x.id === s.id ? { ...x, ...s } : x)),
    })),
    updateLecture: (l) => update((d) => ({
      ...d,
      lectures: d.lectures.map((x) => (x.id === l.id ? { ...x, ...l } : x)),
    })),
    updateAssignment: (a) => update((d) => ({
      ...d,
      assignments: d.assignments.map((x) => (x.id === a.id ? { ...x, ...a } : x)),
    })),
    updateExam: (e) => update((d) => ({
      ...d,
      exams: d.exams.map((x) => (x.id === e.id ? { ...x, ...e } : x)),
    })),
    updateReading: (r) => update((d) => ({
      ...d,
      readings: d.readings.map((x) => (x.id === r.id ? { ...x, ...r } : x)),
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
    if (action.type === 'reading') {
      actions.addReading({
        subjectId: action.subject.id,
        title: action.label,
        week: action.date ? isoWeek(action.date) : null,
        done: false,
      })
      return {
        ok: true,
        message: `La til «${action.label}» i ${action.subject.short}${action.date ? `, til ${fmtShort(action.date)}` : ''}.`,
      }
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
          <button onClick={() => openModal('import')} className="btn-primary">Importer timeplan (PDF)</button>
          <button onClick={() => openModal('ics')} className="btn-primary">Importer iCal</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => openModal('lecture')} className="btn-ghost">Ny forelesning</button>
          <button onClick={() => openModal('reading')} className="btn-ghost">Nytt pensum</button>
          <button onClick={() => openModal('assignment')} className="btn-ghost">Nytt arbeidskrav</button>
          <button onClick={() => openModal('exam')} className="btn-ghost">Ny eksamen</button>
          <button onClick={() => openModal('subject')} className="btn-ghost">Nytt fag</button>
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
              onRemoveSubject={actions.removeSubject}
              onEditSubject={(s) => openEdit('subject', s)}
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
              onEditLecture={(l) => openEdit('lecture', l)}
            />
          </>
        )}

        {tab === 'reading' && (
          <>
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <Pensum
              readings={bySubject(data.readings)}
              subjects={data.subjects}
              lectures={data.lectures}
              onToggleReading={actions.toggleReading}
              onToggleReadingChapter={actions.toggleReadingChapter}
              onRemoveReading={actions.removeReading}
              onEditReading={(r) => openEdit('reading', r)}
              onAdd={() => openModal('reading')}
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
              onEditAssignment={(a) => openEdit('assignment', a)}
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
              onEditExam={(e) => openEdit('exam', e)}
            />
          </>
        )}
      </main>

      {modal === 'subject' && (
        <Modal title={editing ? 'Rediger fag' : 'Nytt fag'} onClose={closeModal}>
          <SubjectForm initial={editing} onAdd={editing ? actions.updateSubject : actions.addSubject} onClose={closeModal} />
        </Modal>
      )}
      {modal === 'lecture' && (
        <Modal title={editing ? 'Rediger forelesning' : 'Ny forelesning'} onClose={closeModal}>
          <LectureForm subjects={data.subjects} initial={editing} onAdd={editing ? actions.updateLecture : actions.addLecture} onClose={closeModal} />
        </Modal>
      )}
      {modal === 'assignment' && (
        <Modal title={editing ? 'Rediger arbeidskrav' : 'Nytt arbeidskrav'} onClose={closeModal}>
          <AssignmentForm subjects={data.subjects} initial={editing} onAdd={editing ? actions.updateAssignment : actions.addAssignment} onClose={closeModal} />
        </Modal>
      )}
      {modal === 'reading' && (
        <Modal title={editing ? 'Rediger pensum' : 'Nytt pensum'} onClose={closeModal}>
          <ReadingForm subjects={data.subjects} lectures={data.lectures} initial={editing} onAdd={editing ? actions.updateReading : actions.addReading} onClose={closeModal} />
        </Modal>
      )}
      {modal === 'exam' && (
        <Modal title={editing ? 'Rediger eksamen' : 'Ny eksamen'} onClose={closeModal}>
          <ExamForm subjects={data.subjects} initial={editing} onAdd={editing ? actions.updateExam : actions.addExam} onClose={closeModal} />
        </Modal>
      )}
      {modal === 'import' && (
        <ImportModal subjects={data.subjects} onImport={actions.importLectures} onClose={closeModal} />
      )}
      {modal === 'ics' && (
        <IcsModal subjects={data.subjects} onImport={actions.icsImport} onClose={closeModal} />
      )}
    </div>
  )
}