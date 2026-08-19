import { useEffect, useRef, useState } from 'react'
import { daysUntil, fmtShort, DEFAULT_WEEKS } from '../lib/date'

export function Select({ value, onChange, options, className = '', ariaLabel, placeholder = 'Velg…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find((o) => o.value === value)
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm transition-colors hover:border-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
      >
        <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 20 20"
        >
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="select-menu absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`block w-full truncate rounded px-2.5 py-1.5 text-left text-sm transition-colors ${
                o.value === value ? 'bg-secondary/10 font-medium text-ink' : 'text-ink hover:bg-paper'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SubjectChip({ subject }) {
  if (!subject) return null
  return (
    <span className="chip" style={{ backgroundColor: subject.color + '1a', color: subject.color }}>
      {subject.short || subject.name}
    </span>
  )
}

export function DeadlineBadge({ deadline }) {
  const d = daysUntil(deadline)
  const overdue = d < 0
  const soon = d >= 0 && d <= 7
  return (
    <span className={`font-mono text-xs ${overdue ? 'text-danger' : soon ? 'text-warning' : 'text-muted'}`}>
      {fmtShort(new Date(deadline))}
      {overdue && <span className="ml-1 rounded bg-danger/10 px-1.5 py-0.5 text-danger">Forfalt</span>}
      {!overdue && d <= 7 && (
        <span className="ml-1 rounded bg-warning/10 px-1.5 py-0.5 text-warning">{d === 0 ? 'I dag' : `${d} dager`}</span>
      )}
    </span>
  )
}

export function WeekFilter({ weeks, active, onChange }) {
  return (
    <Select
      value={active == null ? '' : String(active)}
      onChange={(v) => onChange(v === '' ? null : Number(v))}
      options={[{ value: '', label: 'Alle uker' }, ...(weeks.length > 0 ? weeks : DEFAULT_WEEKS).map((w) => ({ value: String(w), label: `Uke ${w}` }))]}
      className="w-36"
      ariaLabel="Filtrer på uke"
    />
  )
}

export function SubjectFilter({ subjects, active, onChange }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange(null)}
        className={`btn-chip ${active === null ? 'border-primary bg-primary text-white' : ''}`}
      >
        Alle
      </button>
      {subjects.map((s) => {
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => onChange(isActive ? null : s.id)}
            className={`btn-chip ${isActive ? 'border-primary bg-primary text-white' : ''}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? '#fff' : s.color }} />
            {s.short}
          </button>
        )
      })}
    </div>
  )
}

export function DeadlineStrip({ assignments = [], exams = [], subjects }) {
  const upcoming = [
    ...assignments
      .filter((a) => a.status !== 'done')
      .map((a) => ({ key: 'a' + a.id, label: a.title, deadline: a.deadline, subjectId: a.subjectId })),
    ...exams.map((e) => ({ key: 'e' + e.id, label: e.title, deadline: e.date, subjectId: e.subjectId })),
  ]
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5)
  if (upcoming.length === 0) return null
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Nærmeste frister</h2>
      <ul className="mt-2 space-y-1.5">
        {upcoming.map((a) => (
          <li key={a.key} className="flex flex-wrap items-center gap-2 text-sm">
            <DeadlineBadge deadline={a.deadline} />
            <span>{a.label}</span>
            <SubjectChip subject={subjects.find((s) => s.id === a.subjectId)} />
          </li>
        ))}
      </ul>
    </div>
  )
}