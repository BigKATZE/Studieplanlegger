import { useState, useMemo } from 'react'
import { uid, SUBJECT_COLORS } from '../lib/store'
import { isoWeek, weekRange } from '../lib/date'
import { Select } from './ui'

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-4 pt-12" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-paper hover:text-ink"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

export function SubjectForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [short, setShort] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[0])
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), code: code.trim(), short: short.trim() || name.trim(), color })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fagnavn">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Fagkode (f.eks. JUR3420)">
        <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label="Forkortelse (valgfritt)">
        <input className={inputCls} value={short} onChange={(e) => setShort(e.target.value)} />
      </Field>
      <Field label="Farge">
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-ink' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Farge ${c}`}
            />
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til fag</button>
      </div>
    </form>
  )
}

export function LectureForm({ subjects, onAdd, onClose }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:45')
  const [room, setRoom] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [topic, setTopic] = useState('')
  const [chapters, setChapters] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !date) return
    onAdd({
      subjectId,
      date,
      start,
      end,
      room: room.trim(),
      lecturer: lecturer.trim(),
      topic: topic.trim(),
      chapters: chapters
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((text) => ({ id: uid(), text, done: false })),
    })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Dato">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Fra">
          <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Til">
          <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rom">
          <input className={inputCls} value={room} onChange={(e) => setRoom(e.target.value)} />
        </Field>
        <Field label="Foreleser">
          <input className={inputCls} value={lecturer} onChange={(e) => setLecturer(e.target.value)} />
        </Field>
      </div>
      <Field label="Tema (valgfritt)">
        <input className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Field>
      <Field label="Pensum – kapitler, komma-separert (valgfritt)">
        <input className={inputCls} value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="Kapittel 3, Kapittel 4" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til forelesning</button>
      </div>
    </form>
  )
}

export function ReadingForm({ subjects, lectures, onAdd, onClose }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [week, setWeek] = useState('')
  const weekOptions = useMemo(() => buildWeekOptions(lectures), [lectures])
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim()) return
    onAdd({ subjectId, title: title.trim(), week: week ? Number(week) : null, done: false })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <Field label="Pensum">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Kapittel 3 og 4 – Avtaleloven" />
      </Field>
      <Field label="Uke (valgfritt)">
        <Select
          value={week}
          onChange={setWeek}
          options={[{ value: '', label: 'Ingen uke' }, ...weekOptions.map((o) => ({ value: String(o.week), label: o.label }))]}
          ariaLabel="Uke"
          placeholder="Ingen uke"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til pensum</button>
      </div>
    </form>
  )
}

function mondayOf(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function buildWeekOptions(lectures) {
  const known = new Map()
  lectures.forEach((l) => {
    const d = new Date(l.date)
    const w = isoWeek(d)
    if (!known.has(w)) known.set(w, d)
  })
  let reps = [...known.entries()].sort((a, b) => a[0] - b[0])
  if (!reps.length) {
    const now = new Date()
    reps = [[isoWeek(now), now]]
  }
  const [minW] = reps[0]
  const [maxW] = reps[reps.length - 1]
  const base = mondayOf(reps[0][1])
  const out = []
  for (let w = minW; w <= maxW; w++) {
    const m = new Date(base)
    m.setDate(base.getDate() + (w - minW) * 7)
    out.push({ week: w, label: `Uke ${w} · ${weekRange(m)}` })
  }
  return out
}

export function AssignmentForm({ subjects, onAdd, onClose }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim() || !deadline) return
    onAdd({ subjectId, title: title.trim(), deadline, status: 'not_started' })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <Field label="Tittel">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Arbeidskrav 1 – …" />
      </Field>
      <Field label="Frist">
        <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til arbeidskrav</button>
      </div>
    </form>
  )
}

export function ExamForm({ subjects, onAdd, onClose }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('Skriftlig skoleeksamen')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim() || !date) return
    onAdd({ subjectId, title: title.trim(), date, time })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <Field label="Type eksamen">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dato">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Starttid (valgfritt)">
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til eksamen</button>
      </div>
    </form>
  )
}