import { lazy, Suspense, useEffect, useState } from 'react'
import { uid, pickSubjectColor } from './lib/store'
import { fmtShort, iso, isoWeek } from './lib/date'
import { useAuth, useStore } from './lib/sync'
import { supabase, hasSupabase } from './lib/supabase'
import Login from './components/Login'
import SubjectPanel from './components/SubjectPanel'
import Timeplan from './components/Timeplan'
import Pensum from './components/Pensum'
import Gjøremål from './components/Gjøremål'
import Eksamener from './components/Eksamener'
import SmartInput from './components/SmartInput'
import PasswordForm from './components/PasswordForm'
import SearchModal from './components/SearchModal'
import ShareModal from './components/ShareModal'
import DeltFag from './components/DeltFag'
import { Modal, SubjectForm, LectureForm, AssignmentForm, ExamForm, ReadingForm } from './components/Modals'
import { DeadlineStrip, SubjectFilter } from './components/ui'
import { restoreChapter, restoreItem, restoreSubject } from './lib/undo'
import UpcomingAgenda from './components/UpcomingAgenda'
import ReviewPlan from './components/ReviewPlan'
import FocusMode from './components/FocusMode'
import Changelog from './components/Changelog'
import ReschedulePanel from './components/ReschedulePanel'
import WorkPlans from './components/WorkPlans'
import SharePlanModal from './components/SharePlanModal'
import DeltArbeidsplan from './components/DeltArbeidsplan'
import ShareSemesterModal from './components/ShareSemesterModal'
import DeltOversikt from './components/DeltOversikt'
import DelteLenker from './components/DelteLenker'
import SemesterArchive from './components/SemesterArchive'
import ExportModal from './components/ExportModal'
import WeeklyWorkload from './components/WeeklyWorkload'
import { archiveSemester, restoreSemester } from './lib/semesterArchive'
import { advanceReview, applyWeekTemplate, createWeekTemplate, deferReview, findLectureConflictIds, makeReview } from './lib/plannerFeatures'

const TABS = [
  { id: 'overview', label: 'Oversikt' },
  { id: 'timeplan', label: 'Timeplan' },
  { id: 'reading', label: 'Pensum' },
  { id: 'tasks', label: 'Arbeidskrav' },
  { id: 'exams', label: 'Eksamener' },
  { id: 'ai', label: 'AI' },
  { id: 'archive', label: 'Arkiv' },
]
const ImportModal = lazy(() => import('./components/ImportModal'))
const AiTools = lazy(() => import('./components/AiTools'))

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
  const { user, status: authStatus } = useAuth()
  const { data, update, replace, ready, syncStatus } = useStore(user ?? { id: 'local' })
  const [tab, setTab] = useState('timeplan')
  const [modal, setModal] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterSubjectId, setFilterSubjectId] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [undo, setUndo] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [timeplanWeek, setTimeplanWeek] = useState(null)
  const [shareSubject, setShareSubject] = useState(null)
  const [deleteAllStep, setDeleteAllStep] = useState(1)
  const [focusTarget, setFocusTarget] = useState(null)
  const [sharedToken] = useState(() => new URLSearchParams(window.location.search).get('del'))
  const [planToken] = useState(() => new URLSearchParams(window.location.search).get('plan'))
  const [semesterToken] = useState(() => new URLSearchParams(window.location.search).get('semester'))
  const [sharePlan, setSharePlan] = useState(null)
  const [shareSemester, setShareSemester] = useState(false)
  const [showSharedLinks, setShowSharedLinks] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(() => localStorage.getItem('planner-hide-completed') === 'true')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('planner-theme')
    if (saved) return saved
    return 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('planner-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('planner-hide-completed', String(hideCompleted))
  }, [hideCompleted])

  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 6000)
    return () => clearTimeout(t)
  }, [undo])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (sharedToken) {
    return <DeltFag token={sharedToken} />
  }
  if (planToken) return <DeltArbeidsplan token={planToken} />
  if (semesterToken) return <DeltOversikt token={semesterToken} />

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">Laster…</div>
    )
  }
  if (hasSupabase && showLogin && !user) {
    return <Login onBack={() => setShowLogin(false)} />
  }
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">Laster…</div>
    )
  }

  const closeModal = () => {
    setModal(null)
    setEditing(null)
  }
  const openModal = (m) => {
    if (addOpen && window.matchMedia('(max-width: 767px)').matches) document.getElementById('add-toggle')?.focus()
    setModal(m)
    setEditing(null)
    setAddOpen(false)
  }

  const deleteAll = () => {
    update(() => ({ subjects: [], lectures: [], assignments: [], exams: [], readings: [], reviews: [], weekTemplates: [], aiSources: [], quizAttempts: [], workPlans: [] }))
    setUndo(null)
    setFilterSubjectId(null)
    setTimeplanWeek(null)
    setTab('overview')
    closeModal()
  }
  const openEdit = (type, item) => {
    setEditing(item)
    setModal(type)
  }

  const bySubject = (items) => (filterSubjectId ? items.filter((i) => i.subjectId === filterSubjectId) : items)

  const removeWithUndo = (label, apply, restore) => {
    setUndo({ label, restore, userId: user?.id ?? 'local' })
    update(apply)
  }

  const onUndo = () => {
    if (!undo) return
    if (undo.userId !== (user?.id ?? 'local')) {
      setUndo(null)
      return
    }
    update(undo.restore)
    setUndo(null)
  }

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
    addReview: (review) => update((d) => ({ ...d, reviews: [...d.reviews, makeReview(review, new Date(), uid())] })),
    addReviewUnique: (review) => update((d) => d.reviews.some((x) => x.subjectId === review.subjectId && x.title.trim().toLowerCase() === review.title.trim().toLowerCase()) ? d : ({ ...d, reviews: [...d.reviews, makeReview(review, new Date(), uid())] })),
    addSource: (source) => update((d) => ({ ...d, aiSources: [...d.aiSources, { id: uid(), createdAt: new Date().toISOString(), ...source }] })),
    removeSource: (id) => update((d) => ({ ...d, aiSources: d.aiSources.filter((x) => x.id !== id) })),
    addQuizAttempt: (attempt) => update((d) => ({ ...d, quizAttempts: [...d.quizAttempts, { id: uid(), createdAt: new Date().toISOString(), ...attempt }] })),
    saveWorkPlan: (plan) => update((d) => ({ ...d, workPlans: [...d.workPlans, { ...plan, id: uid(), createdAt: new Date().toISOString(), steps: plan.steps.map((step) => ({ ...step, id: uid(), completed: false })) }] })),
    toggleWorkPlanStep: (planId, stepId) => update((d) => ({ ...d, workPlans: d.workPlans.map((plan) => plan.id === planId ? { ...plan, steps: plan.steps.map((step) => step.id === stepId ? { ...step, completed: !step.completed } : step) } : plan) })),
    removeWorkPlan: (id) => {
      const plan = data.workPlans.find((item) => item.id === id)
      const index = data.workPlans.findIndex((item) => item.id === id)
      removeWithUndo(`Fjernet «${plan?.title ?? 'arbeidsplan'}»`, (d) => ({ ...d, workPlans: d.workPlans.filter((item) => item.id !== id) }), (d) => restoreItem(d, 'workPlans', plan, index))
    },
    applyReschedules: (items) => {
      const prevAssignments = new Map(data.assignments.filter((a) => items.some((y) => y.type === 'assignment' && y.id === a.id)).map((a) => [a.id, a.deadline]))
      const prevReviews = new Map(data.reviews.filter((r) => items.some((y) => y.type === 'review' && y.id === r.id)).map((r) => [r.id, r.nextReview]))
      const label = items.length === 1 ? `Flyttet «${items[0].title}» til ${items[0].to}` : `Flyttet ${items.length} aktiviteter`
      removeWithUndo(label, (d) => ({ ...d, assignments: d.assignments.map((x) => { const item = items.find((y) => y.type === 'assignment' && y.id === x.id); return item ? { ...x, deadline: item.to } : x }), reviews: d.reviews.map((x) => { const item = items.find((y) => y.type === 'review' && y.id === x.id); return item ? { ...x, nextReview: item.to } : x }) }), (d) => ({ ...d, assignments: d.assignments.map((x) => prevAssignments.has(x.id) ? { ...x, deadline: prevAssignments.get(x.id) } : x), reviews: d.reviews.map((x) => prevReviews.has(x.id) ? { ...x, nextReview: prevReviews.get(x.id) } : x) }))
    },
    completeReview: (id) => update((d) => ({ ...d, reviews: d.reviews.map((review) => review.id === id ? advanceReview(review) : review) })),
    deferReview: (id) => update((d) => ({ ...d, reviews: d.reviews.map((review) => review.id === id ? deferReview(review) : review) })),
    removeReview: (id) => update((d) => ({ ...d, reviews: d.reviews.filter((review) => review.id !== id) })),
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
      const readings = [...d.readings]
      const newSubjects = new Map()
      const resolveSubject = (r) => {
        if (r.subjectValue !== 'new') return r.subjectValue
        const name = (r.newName || '').trim() || 'Ukjent fag'
        const key = name.toLowerCase()
        if (newSubjects.has(key)) return newSubjects.get(key)
        const id = uid()
        newSubjects.set(key, id)
        subjects.push({ id, code: name, name, short: name, color: pickSubjectColor(subjects.length), levelOverride: null })
        return id
      }
      for (const r of rows) {
        if (!r.include || !r.title.trim() || !r.date) continue
        const subjectId = resolveSubject(r)
        if (r.kind === 'exam') {
          const exam = { id: uid(), subjectId, title: r.title.trim(), date: r.date, time: r.time || '' }
          if (!exams.some((x) => x.subjectId === subjectId && x.title === exam.title && x.date === exam.date)) {
            exams.push(exam)
          }
        } else if (r.kind === 'lecture') {
          const start = r.time || '10:00'
          const lecture = { id: uid(), subjectId, date: r.date, start, end: addMinutes(start, 105), room: (r.room || '').trim(), lecturer: '', topic: r.title.trim(), chapters: [], done: false }
          if (!lectures.some((x) => x.subjectId === subjectId && x.date === lecture.date && x.start === lecture.start && x.topic === lecture.topic)) {
            lectures.push(lecture)
          }
        } else if (r.kind === 'reading') {
          const reading = { id: uid(), subjectId, title: r.title.trim(), week: isoWeek(new Date(`${r.date}T00:00:00`)), done: false, chapters: [] }
          if (!readings.some((x) => x.subjectId === subjectId && x.title === reading.title && x.week === reading.week)) {
            readings.push(reading)
          }
        } else {
          const item = { id: uid(), subjectId, title: r.title.trim(), deadline: r.date, status: 'not_started' }
          if (!assignments.some((x) => x.subjectId === subjectId && x.title === item.title && x.deadline === item.deadline)) {
            assignments.push(item)
          }
        }
      }
      return { ...d, subjects, assignments, exams, lectures, readings }
    }),
    toggleChapter: (lectureId, chapterId) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) =>
        l.id === lectureId
          ? { ...l, chapters: l.chapters.map((c) => (c.id === chapterId ? { ...c, done: !c.done } : c)) }
          : l,
      ),
    })),
    updateChapter: (lectureId, chapterId, text) => update((d) => ({
      ...d,
      lectures: d.lectures.map((l) =>
        l.id === lectureId
          ? { ...l, chapters: l.chapters.map((c) => (c.id === chapterId ? { ...c, text } : c)) }
          : l,
      ),
    })),
    removeChapter: (lectureId, chapterId) => {
      const l = data.lectures.find((x) => x.id === lectureId)
      const c = l?.chapters.find((x) => x.id === chapterId)
      const index = l?.chapters.findIndex((x) => x.id === chapterId) ?? 0
      removeWithUndo(`Fjernet «${c?.text ?? 'kapittel'}»`, (d) => ({
        ...d,
        lectures: d.lectures.map((x) =>
          x.id === lectureId ? { ...x, chapters: x.chapters.filter((c2) => c2.id !== chapterId) } : x,
        ),
      }), (d) => restoreChapter(d, lectureId, c, index))
    },
    toggleLecture: (lectureId) => update((d) => ({
      ...d,
      lectures: d.lectures.map((lecture) => {
        if (lecture.id !== lectureId) return lecture
        const done = !lecture.done
        return { ...lecture, done, completedAt: done ? new Date().toISOString() : '' }
      }),
    })),
    setLectureAttendance: (ids, done) => {
      const set = new Set(ids)
      update((d) => ({
        ...d,
        lectures: d.lectures.map((lecture) => (set.has(lecture.id) ? { ...lecture, done, completedAt: done ? (lecture.completedAt || new Date().toISOString()) : '' } : lecture)),
      }))
    },
    setAssignmentStatus: (id, status) => update((d) => ({
      ...d,
      assignments: d.assignments.map((assignment) => {
        if (assignment.id !== id) return assignment
        const completedAt = status === 'done'
          ? (assignment.status === 'done' && assignment.completedAt ? assignment.completedAt : new Date().toISOString())
          : ''
        return { ...assignment, status, completedAt }
      }),
    })),
    setLevel: (subjectId, level) => update((d) => ({
      ...d,
      subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, levelOverride: level } : s)),
    })),
    removeSubject: (id) => {
      const subject = data.subjects.find((s) => s.id === id)
      const removed = {
        subject,
        index: data.subjects.findIndex((s) => s.id === id),
        items: Object.fromEntries(['lectures', 'assignments', 'exams', 'readings', 'reviews', 'aiSources', 'quizAttempts', 'workPlans'].map((key) => [key, data[key].filter((x) => x.subjectId === id)])),
      }
      removeWithUndo(`Fjernet «${subject?.short ?? 'fag'}»`, (d) => ({
        ...d,
        subjects: d.subjects.filter((s) => s.id !== id),
        lectures: d.lectures.filter((l) => l.subjectId !== id),
        assignments: d.assignments.filter((a) => a.subjectId !== id),
        exams: d.exams.filter((e) => e.subjectId !== id),
        readings: d.readings.filter((r) => r.subjectId !== id),
        reviews: d.reviews.filter((r) => r.subjectId !== id),
        aiSources: d.aiSources.filter((x) => x.subjectId !== id),
        quizAttempts: d.quizAttempts.filter((x) => x.subjectId !== id),
        workPlans: d.workPlans.filter((x) => x.subjectId !== id),
      }), (d) => restoreSubject(d, removed))
    },
    removeLecture: (id) => {
      const l = data.lectures.find((x) => x.id === id)
      const index = data.lectures.findIndex((x) => x.id === id)
      removeWithUndo(`Fjernet forelesning${l ? ` ${fmtShort(new Date(l.date))}` : ''}`, (d) => ({
        ...d,
        lectures: d.lectures.filter((x) => x.id !== id),
      }), (d) => restoreItem(d, 'lectures', l, index))
    },
    removeAssignment: (id) => {
      const a = data.assignments.find((x) => x.id === id)
      const index = data.assignments.findIndex((x) => x.id === id)
      removeWithUndo(`Fjernet «${a?.title ?? 'arbeidskrav'}»`, (d) => ({
        ...d,
        assignments: d.assignments.filter((x) => x.id !== id),
      }), (d) => restoreItem(d, 'assignments', a, index))
    },
    removeExam: (id) => {
      const e = data.exams.find((x) => x.id === id)
      const index = data.exams.findIndex((x) => x.id === id)
      removeWithUndo(`Fjernet «${e?.title ?? 'eksamen'}»`, (d) => ({
        ...d,
        exams: d.exams.filter((x) => x.id !== id),
      }), (d) => restoreItem(d, 'exams', e, index))
    },
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
    removeReading: (id) => {
      const r = data.readings.find((x) => x.id === id)
      const index = data.readings.findIndex((x) => x.id === id)
      removeWithUndo(`Fjernet «${r?.title ?? 'pensum'}»`, (d) => ({
        ...d,
        readings: d.readings.filter((x) => x.id !== id),
      }), (d) => restoreItem(d, 'readings', r, index))
    },
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

  const handleSearchSelect = (sel) => {
    setSearchOpen(false)
    if (sel.kind === 'subject') {
      setTab('overview')
    } else if (sel.kind === 'lecture') {
      setTab('timeplan')
      setTimeplanWeek(isoWeek(new Date(sel.result.lecture.date)))
    } else if (sel.kind === 'reading') {
      setTab('reading')
    } else if (sel.kind === 'assignment') {
      setTab('tasks')
    } else if (sel.kind === 'exam') {
      setTab('exams')
    }
  }

  const saveTemplate = (name) => {
    if (timeplanWeek == null) return { ok: false, message: 'Kunne ikke lagre. Velg en bestemt uke først.' }
    try {
      const source = data.lectures.filter((lecture) => isoWeek(new Date(`${lecture.date}T00:00:00`)) === timeplanWeek)
      const template = createWeekTemplate(name, source, new Date(), uid())
      update((d) => ({ ...d, weekTemplates: [...d.weekTemplates, template] }))
      return { ok: true, message: 'Ukemalen er lagret.' }
    } catch (error) { return { ok: false, message: `Kunne ikke lagre. ${error.message}` } }
  }
  const applyTemplate = (template) => {
    try {
      const validSubjectIds = new Set(data.subjects.map((subject) => subject.id))
      if (!(template.lectures ?? []).some((lecture) => validSubjectIds.has(lecture.subjectId))) {
        return { ok: false, message: 'Kunne ikke bruke malen. Malen inneholder ingen forelesninger i gjeldende fag.' }
      }
      const lectures = applyWeekTemplate(template, timeplanWeek, data.lectures, uid, new Date(), validSubjectIds)
      if (lectures.length === 0) return { ok: false, message: 'Ingen nye forelesninger ble lagt til. De finnes allerede i denne uken.' }
      update((d) => ({ ...d, lectures: [...d.lectures, ...lectures] }))
      return { ok: true, message: `${lectures.length} forelesninger ble lagt til.` }
    } catch (error) { return { ok: false, message: `Kunne ikke bruke malen. ${error.message}` } }
  }
  const focusItems = [
    ...data.lectures.filter((item) => !item.done).map((item) => ({ ...item, key: `lecture-${item.id}`, type: 'lecture', title: item.topic || 'Forelesning' })),
    ...data.readings.filter((item) => !item.done).map((item) => ({ ...item, key: `reading-${item.id}`, type: 'reading' })),
    ...data.assignments.filter((item) => item.status !== 'done').map((item) => ({ ...item, key: `assignment-${item.id}`, type: 'assignment' })),
    ...data.reviews.map((item) => ({ ...item, key: `review-${item.id}`, type: 'review' })),
    ...data.exams.map((item) => ({ ...item, key: `exam-${item.id}`, type: 'exam' })),
  ]
  const finishFocusItem = (item) => {
    if (item.type === 'lecture') actions.toggleLecture(item.id)
    if (item.type === 'reading') actions.toggleReading(item.id)
    if (item.type === 'assignment') actions.setAssignmentStatus(item.id, 'done')
    if (item.type === 'review') actions.completeReview(item.id)
  }
  const conflictIds = findLectureConflictIds(data.lectures)
  const conflictCount = conflictIds.size

  return (
    <div className="min-h-screen relative">
      {/* Subtile bakgrunns-orbs – glass morphism dybde */}
      <div className="orb-wrap" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <header className="mx-auto max-w-5xl px-4 pt-5 sm:pt-8 animate-fade-in">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2.5">
            <a
              href="https://github.com/BigKATZE/Studieplanlegger"
              target="_blank"
              rel="noreferrer"
              aria-label="Åpne GitHub-repositoriet"
              title="GitHub"
              className="group inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 text-ink shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-ink/15 hover:bg-surface hover:shadow-md hover:text-primary active:scale-[0.96]"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.6 5 18.6 5.3 18.6 5.3c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
              </svg>
            </a>
            <span role="status" aria-live="polite" className={`inline-flex h-9 items-center whitespace-nowrap rounded-xl border px-3 text-xs font-medium shadow-sm backdrop-blur-sm ${syncStatus === 'error' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-line/60 bg-surface/80 text-muted'}`}>
              {{ local: 'Lagret lokalt', loading: 'Kobler til…', saving: 'Lagrer…', saved: 'Synkronisert', conflict: 'Oppdatert fra annen enhet', error: 'Synkfeil' }[syncStatus]}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Søk (Ctrl+K)"
            title="Søk (Ctrl+K)"
            className="group inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 text-ink shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-ink/15 hover:bg-surface hover:shadow-md hover:text-primary active:scale-[0.96]"
          >
            <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.5 13.5 17 17M14.8 9.2a5.3 5.3 0 1 1-10.6 0 5.3 5.3 0 0 1 10.6 0Z" />
            </svg>
          </button>
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
            className="group relative inline-flex h-8 w-[56px] shrink-0 items-center rounded-full border border-line bg-surface p-1 shadow-sm transition-all duration-200 hover:border-ink/15 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {/* statiske spor-ikoner – hint, månen forstørret i lys modus */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-between px-[6px]">
              <svg className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-white/90' : 'text-amber-500'} `} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.0" />
                <path d="M12 1.9v1.85M12 20.25V22.1M4.2 4.2l1.25 1.25M18.55 18.55l1.35 1.35M1.9 12h1.85M20.25 12H22.1M4.2 19.8l1.25-1.25M18.55 5.45l1.35-1.35" />
              </svg>
              <svg className="h-[14px] w-[14px] text-muted" viewBox="0 0 24 24" style={{ opacity: 0.62 }} aria-hidden="true">
                <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                <path fill="white" opacity="0.11" d="M11.21 3A9 9 0 0 0 8.2 17.5a9 9 0 0 1 9.5-11.7A7 7 0 0 0 11.21 3Z" />
              </svg>
            </span>
            <span
              className={`relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.16),0_1px_10px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${theme === 'dark' ? 'translate-x-[25px] bg-primary text-[#102019] ring-1 ring-white/10' : 'translate-x-0 bg-surface text-amber-500 ring-1 ring-line'}`}
            >
              <span className="relative h-4 w-4">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.05" className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${theme === 'dark' ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                  <circle cx="12" cy="12" r="4.0" />
                  <path strokeLinecap="round" d="M12 2.1v1.7M12 20.2V22M4.15 4.15l1.2 1.2M18.65 18.65l1.2 1.2M2.1 12h1.7M20.2 12H22M4.15 19.85l1.2-1.2M18.65 5.35l1.2-1.2" />
                </svg>
                {/* måne – tykkere sigd (9/7) + myk skyggekant + kratere */}
                <svg aria-hidden="true" viewBox="0 0 24 24" className={`absolute inset-0 h-[18px] w-[18px] -m-px translate-x-[0.5px] transition-all duration-300 ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`}>
                  <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                  {/* indre skygge-kant gir volum uten filter */}
                  <path fill="white" opacity="0.09" d="M11.21 3A9 9 0 0 0 8.2 17.5a9 9 0 0 1 9.5-11.7A7 7 0 0 0 11.21 3Z" />
                  {/* kratere – svært lav kontrast, bare anelse av overflate */}
                  <circle cx="15.1" cy="7.9" r="1.25" fill="white" opacity="0.13" />
                  <circle cx="13.4" cy="11.4" r="0.78" fill="white" opacity="0.11" />
                  <circle cx="15.8" cy="12.2" r="0.45" fill="white" opacity="0.08" />
                </svg>
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('changelog')}
            aria-current={tab === 'changelog' ? 'page' : undefined}
            className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-sm font-medium shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 active:scale-[0.96] ${tab === 'changelog' ? 'border-ink/15 bg-surface text-ink shadow-md' : 'border-line/60 bg-surface/80 text-muted hover:border-ink/15 hover:bg-surface hover:text-ink hover:shadow-md'}`}
          >
            Changelog
          </button>
          {hasSupabase && !user && (
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 px-3 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-ink/15 hover:bg-surface hover:text-ink hover:shadow-md active:scale-[0.96]"
            >
              Logg inn
            </button>
          )}
          {hasSupabase && user && (
            <>
              <button
                onClick={() => openModal('password')}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 px-3 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-ink/15 hover:bg-surface hover:text-ink hover:shadow-md active:scale-[0.96]"
              >
                Endre passord
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 px-3 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-ink/15 hover:bg-surface hover:text-ink hover:shadow-md active:scale-[0.96]"
              >
                Logg ut
              </button>
            </>
          )}
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-[-.03em] sm:text-4xl">Studieplanlegger</h1>
        <div className="mt-3 h-[3px] w-12 rounded-full bg-[#141414]" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted">Timeplan, pensum, arbeidskrav og eksamener - uke for uke.</p>

        <SmartInput subjects={data.subjects} onApply={applySmartAction} />
      </header>
      <div className="app-navigation mx-auto mt-7 max-w-5xl px-4">
        <nav className="tab-strip flex gap-1 overflow-x-auto border-b border-line" aria-label="Sider">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setAddOpen(false)
                if (window.matchMedia('(max-width: 767px)').matches) document.getElementById('main-content')?.scrollIntoView({ block: 'start' })
              }}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                tab === t.id ? 'border-primary text-primary tab-active' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-6">
        <div className="app-toolbar primary-toolbar mt-5 flex flex-wrap gap-2">
          <button onClick={() => openModal('import')} className="btn-primary">Importer</button>
          <button onClick={() => openModal('export')} className="btn-primary">Eksporter</button>
          <button onClick={() => setFocusTarget({})} className="btn-ghost">Fokus</button>
        </div>
        <div className="mt-2" onKeyDown={(event) => {
          if (event.key === 'Escape' && addOpen) {
            setAddOpen(false)
            event.currentTarget.querySelector('button')?.focus()
          }
        }}>
          <button id="add-toggle" type="button" className="btn-ghost min-h-11 w-full md:hidden" aria-expanded={addOpen} aria-controls="add-actions" onClick={() => setAddOpen((open) => !open)}>
            Legg til
            <svg aria-hidden="true" className={`h-4 w-4 ${addOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 7 5 5 5-5" /></svg>
          </button>
        <div id="add-actions" className={`${addOpen ? 'grid' : 'hidden'} mt-2 gap-2 md:mt-0 md:flex md:flex-wrap`}>
          <button onClick={() => openModal('subject')} className="btn-ghost">Nytt fag</button>
          <button onClick={() => openModal('lecture')} className="btn-ghost">Ny forelesning</button>
          <button onClick={() => openModal('reading')} className="btn-ghost">Nytt pensum</button>
          <button onClick={() => openModal('assignment')} className="btn-ghost">Nytt arbeidskrav</button>
          <button onClick={() => openModal('exam')} className="btn-ghost">Ny eksamen</button>
        </div>
        </div>
      </div>

      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20">
        {tab === 'overview' && (
          <div key="overview">
            {Boolean(hasSupabase && user && user.id !== 'local') && (
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                <button onClick={() => setShowSharedLinks((v) => !v)} className="btn-ghost">
                  {showSharedLinks ? 'Skjul delte lenker' : 'Delte lenker'}
                </button>
                <button onClick={() => setShareSemester(true)} className="btn-ghost">Del hele oversikten</button>
              </div>
            )}
            {showSharedLinks && (
              <div className="mb-6">
                <DelteLenker subjects={data.subjects} onClose={() => setShowSharedLinks(false)} />
              </div>
            )}
            <UpcomingAgenda
              lectures={hideCompleted ? data.lectures.filter((item) => !item.done) : data.lectures}
              readings={data.readings}
              assignments={data.assignments}
              exams={data.exams}
              reviews={data.reviews}
              subjects={data.subjects}
              conflictCount={conflictCount}
              onFocus={setFocusTarget}
            />
            <WeeklyWorkload key={user?.id ?? 'local'} data={data} onBudgetChange={(weeklyBudgetMinutes) => update((current) => ({ ...current, weeklyBudgetMinutes }))} />
            <ReviewPlan reviews={data.reviews} subjects={data.subjects} onAdd={actions.addReview} onComplete={actions.completeReview} onDefer={actions.deferReview} onRemove={actions.removeReview} />
            <ReschedulePanel data={data} onApply={actions.applyReschedules} />
            <SubjectPanel
              subjects={data.subjects}
              lectures={data.lectures}
              readings={data.readings}
              assignments={data.assignments}
              exams={data.exams}
              onSetLevel={actions.setLevel}
              onRemoveSubject={actions.removeSubject}
              onEditSubject={(s) => openEdit('subject', s)}
              onShare={setShareSubject}
              canShare={Boolean(hasSupabase && user && user.id !== 'local')}
            />
            <DeadlineStrip
              assignments={data.assignments}
              exams={data.exams}
              subjects={data.subjects}
            />
          </div>
        )}

        {tab === 'timeplan' && (
          <div key="timeplan">
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <div key={filterSubjectId ?? 'all'} className="animate-enter">
              <Timeplan
                lectures={bySubject(data.lectures)}
                subjects={data.subjects}
                week={timeplanWeek}
                onWeekChange={setTimeplanWeek}
                onToggleLecture={actions.toggleLecture}
                onSetLectureAttendance={actions.setLectureAttendance}
                onToggleChapter={actions.toggleChapter}
                onUpdateChapter={actions.updateChapter}
                onRemoveChapter={actions.removeChapter}
                onRemoveLecture={actions.removeLecture}
                onEditLecture={(l) => openEdit('lecture', l)}
                weekTemplates={data.weekTemplates}
                onSaveTemplate={saveTemplate}
                onApplyTemplate={applyTemplate}
                onRemoveTemplate={(id) => update((d) => ({ ...d, weekTemplates: d.weekTemplates.filter((template) => template.id !== id) }))}
                conflictIds={conflictIds}
                hideCompleted={hideCompleted}
                onToggleHideCompleted={() => setHideCompleted((value) => !value)}
              />
            </div>
          </div>
        )}

        {tab === 'reading' && (
          <div key="reading">
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <div key={filterSubjectId ?? 'all'} className="animate-enter">
              <Pensum
                readings={bySubject(data.readings)}
                subjects={data.subjects}
                onToggleReading={actions.toggleReading}
                onToggleReadingChapter={actions.toggleReadingChapter}
                onRemoveReading={actions.removeReading}
                onEditReading={(r) => openEdit('reading', r)}
                hideCompleted={hideCompleted}
                onToggleHideCompleted={() => setHideCompleted((value) => !value)}
              />
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div key="tasks">
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <div key={filterSubjectId ?? 'all'} className="animate-enter">
              <Gjøremål
                assignments={bySubject(data.assignments)}
                subjects={data.subjects}
                onSetAssignmentStatus={actions.setAssignmentStatus}
                onRemoveAssignment={actions.removeAssignment}
                onEditAssignment={(a) => openEdit('assignment', a)}
                hideCompleted={hideCompleted}
                onToggleHideCompleted={() => setHideCompleted((value) => !value)}
                completedCount={bySubject(data.assignments).filter((assignment) => assignment.status === 'done').length + bySubject(data.workPlans).reduce((total, plan) => total + plan.steps.filter((step) => step.completed).length, 0)}
              />
              <WorkPlans plans={bySubject(data.workPlans)} subjects={data.subjects} onToggle={actions.toggleWorkPlanStep} onRemove={actions.removeWorkPlan} onShare={setSharePlan} canShare={Boolean(hasSupabase && user && user.id !== 'local')} hideCompleted={hideCompleted} />
            </div>
          </div>
        )}

        {tab === 'exams' && (
          <div key="exams">
            <SubjectFilter subjects={data.subjects} active={filterSubjectId} onChange={setFilterSubjectId} />
            <div key={filterSubjectId ?? 'all'} className="animate-enter">
              <Eksamener
                exams={bySubject(data.exams)}
                subjects={data.subjects}
                data={data}
                onRemoveExam={actions.removeExam}
                onEditExam={(e) => openEdit('exam', e)}
                hideCompleted={hideCompleted}
                onToggleHideCompleted={() => setHideCompleted((value) => !value)}
              />
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div key="ai">
          <Suspense fallback={<p role="status" className="mt-8 text-sm text-muted">Laster AI-verktøy…</p>}>
            <AiTools data={data} enabled={Boolean(hasSupabase && user && user.id !== 'local')} onAddReview={actions.addReviewUnique} onAddSource={actions.addSource} onRemoveSource={actions.removeSource} onAddAttempt={actions.addQuizAttempt} onSaveWorkPlan={actions.saveWorkPlan} />
          </Suspense>
          </div>
        )}

        {tab === 'changelog' && <div key="changelog"><Changelog /></div>}
        {tab === 'archive' && <SemesterArchive key={user?.id ?? 'local'} data={data} syncStatus={syncStatus}
          onArchive={(name) => {
            const id = uid()
            replace((current) => archiveSemester(current, name, id))
            setUndo(null); setFilterSubjectId(null); setTimeplanWeek(null); setFocusTarget(null)
          }}
          onRestore={(id) => {
            const replacementId = uid()
            replace((current) => restoreSemester(current, id, replacementId))
            setUndo(null); setFilterSubjectId(null); setTimeplanWeek(null); setFocusTarget(null)
          }}
          onRemove={(id) => replace((current) => ({ ...current, semesterArchives: current.semesterArchives.filter((item) => item.id !== id) }))}
        />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10">
        <div className="flex justify-end border-t border-line pt-6">
          <button
            onClick={() => {
              setDeleteAllStep(1)
              openModal('deleteAll')
            }}
            className="btn-danger"
            disabled={!data.subjects.length && !data.lectures.length && !data.readings.length && !data.assignments.length && !data.exams.length && !data.reviews.length && !data.weekTemplates.length && !data.aiSources.length && !data.quizAttempts.length && !data.workPlans.length && !data.semesterArchives.length}
          >
            Slett alt
          </button>
        </div>
      </footer>

      {modal === 'export' && <ExportModal key={user?.id ?? 'local'} data={data} user={user} syncStatus={syncStatus} onClose={closeModal} />}
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
        <Suspense fallback={<div role="status" className="fixed inset-0 z-50 grid place-items-center bg-paper/70 text-sm text-muted">Laster import…</div>}>
          <ImportModal
            subjects={data.subjects}
            data={data}
            onImportPdf={actions.importLectures}
            onImportIcs={actions.icsImport}
            onImportBackup={(d) => update(() => d)}
            onClose={closeModal}
          />
        </Suspense>
      )}
      {modal === 'password' && (
        <Modal title="Endre passord" onClose={closeModal}>
          <PasswordForm onClose={closeModal} />
        </Modal>
      )}
      {modal === 'deleteAll' && (
        <Modal title={deleteAllStep === 1 ? 'Slett alt innhold?' : 'Bekreft permanent sletting'} onClose={closeModal}>
          <p className="text-sm text-ink">
            {deleteAllStep === 1
              ? 'Vil du fortsette? Alt innhold, inkludert semesterarkivet, blir valgt for sletting.'
              : 'Dette kan ikke angres. Er du helt sikker på at alt innhold, inkludert semesterarkivet, skal slettes permanent?'}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Avbryt</button>
            <button type="button" onClick={() => deleteAllStep === 1 ? setDeleteAllStep(2) : deleteAll()} className="btn-danger">
              {deleteAllStep === 1 ? 'Ja, fortsett' : 'Ja, slett alt'}
            </button>
          </div>
        </Modal>
      )}

      {searchOpen && (
        <SearchModal data={data} onClose={() => setSearchOpen(false)} onSelect={handleSearchSelect} />
      )}

      {shareSubject && user && (
        <ShareModal subject={shareSubject} userId={user.id} onClose={() => setShareSubject(null)} />
      )}
      {sharePlan && <SharePlanModal plan={sharePlan} onClose={() => setSharePlan(null)} />}
      {shareSemester && <ShareSemesterModal onClose={() => setShareSemester(false)} />}

      {focusTarget !== null && <FocusMode items={focusItems} initialTarget={focusTarget?.key} onClose={() => setFocusTarget(null)} onComplete={finishFocusItem} />}

      {undo && undo.userId === (user?.id ?? 'local') && (
        <div className="animate-scale-in glass-panel fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2.5 text-sm">
          <span className="text-ink">{undo.label}</span>
          <button onClick={onUndo} className="font-medium text-primary hover:underline">
            Angre
          </button>
        </div>
      )}
    </div>
  )
}
