import { useState, useMemo, useEffect, useRef } from 'react'
import { uid, SUBJECT_COLORS } from '../lib/store'
import { isoWeek, weekRange } from '../lib/date'
import { Select, DateField, TimeField } from './ui'

export function Modal({ title, onClose, children }) {
  const panelRef = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    const first = panelRef.current?.querySelector('input, select, textarea, button, [tabindex]')
    ;(first ?? panelRef.current)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-4 pt-12" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
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

function parseChapters(input, existing) {
  const seen = new Set((existing ?? []).map((c) => c.text.trim().toLowerCase()))
  const out = []
  for (const raw of input.split(',')) {
    const text = raw.trim()
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push({ id: uid(), text, done: false })
  }
  return out
}

export function SubjectForm({ onAdd, onClose, initial }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [short, setShort] = useState(initial?.short ?? '')
  const [color, setColor] = useState(initial?.color ?? SUBJECT_COLORS[0])
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ ...(initial?.id ? { id: initial.id } : {}), name: name.trim(), code: code.trim(), short: short.trim() || name.trim(), color })
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
        <button type="submit" className="btn-primary">{initial ? 'Lagre endringer' : 'Legg til fag'}</button>
      </div>
    </form>
  )
}

export function LectureForm({ subjects, onAdd, onClose, initial }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [start, setStart] = useState(initial?.start ?? '10:00')
  const [end, setEnd] = useState(initial?.end ?? '11:45')
  const [room, setRoom] = useState(initial?.room ?? '')
  const [lecturer, setLecturer] = useState(initial?.lecturer ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [chapters, setChapters] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !date) return
    const newCh = parseChapters(chapters, initial?.chapters)
    onAdd({
      ...(initial?.id ? { id: initial.id } : {}),
      subjectId,
      date,
      start,
      end,
      room: room.trim(),
      lecturer: lecturer.trim(),
      topic: topic.trim(),
      chapters: initial ? [...(initial.chapters ?? []), ...newCh] : newCh,
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
          <DateField value={date} onChange={setDate} required ariaLabel="Dato" />
        </Field>
        <Field label="Fra">
          <TimeField value={start} onChange={setStart} ariaLabel="Starttid" />
        </Field>
        <Field label="Til">
          <TimeField value={end} onChange={setEnd} ariaLabel="Sluttid" />
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
      <Field label="Pensum - kapitler, komma-separert (valgfritt)">
        <input className={inputCls} value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="Kapittel 3, Kapittel 4" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">{initial ? 'Lagre endringer' : 'Legg til forelesning'}</button>
      </div>
    </form>
  )
}

export function ReadingForm({ subjects, lectures, onAdd, onClose, initial }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [chapters, setChapters] = useState('')
  const [week, setWeek] = useState(initial?.week != null ? String(initial.week) : '')
  const weekOptions = useMemo(() => buildWeekOptions(lectures), [lectures])
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim()) return
    const newCh = parseChapters(chapters, initial?.chapters)
    onAdd({
      ...(initial?.id ? { id: initial.id } : {}),
      subjectId,
      title: title.trim(),
      week: week ? Number(week) : null,
      done: initial?.done ?? false,
      chapters: initial ? [...(initial.chapters ?? []), ...newCh] : newCh,
    })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <Field label="Pensum">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Avtaleloven - pensum til uken" />
      </Field>
      <Field label="Kapittel (komma-separert, valgfritt)">
        <input className={inputCls} value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="Kapittel 3, Kapittel 4" />
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
        <button type="submit" className="btn-primary">{initial ? 'Lagre endringer' : 'Legg til pensum'}</button>
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

export function AssignmentForm({ subjects, onAdd, onClose, initial }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim() || !deadline) return
    onAdd({ ...(initial?.id ? { id: initial.id } : {}), subjectId, title: title.trim(), deadline, status: initial?.status ?? 'not_started' })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fag">
        <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Fag" placeholder="Velg fag" />
      </Field>
      <Field label="Tittel">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Arbeidskrav 1 - ..." />
      </Field>
      <Field label="Frist">
        <DateField value={deadline} onChange={setDeadline} required ariaLabel="Frist" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">{initial ? 'Lagre endringer' : 'Legg til arbeidskrav'}</button>
      </div>
    </form>
  )
}

export function ExamForm({ subjects, onAdd, onClose, initial }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? 'Skriftlig skoleeksamen')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '09:00')
  const submit = (e) => {
    e.preventDefault()
    if (!subjectId || !title.trim() || !date) return
    onAdd({ ...(initial?.id ? { id: initial.id } : {}), subjectId, title: title.trim(), date, time })
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
          <DateField value={date} onChange={setDate} required ariaLabel="Dato" />
        </Field>
        <Field label="Starttid (valgfritt)">
          <TimeField value={time} onChange={setTime} ariaLabel="Starttid" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
        <button type="submit" className="btn-primary">Legg til eksamen</button>
      </div>
    </form>
  )
}
