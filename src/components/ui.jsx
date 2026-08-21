import { useEffect, useRef, useState } from 'react'
import { daysUntil, fmtShort, isoToDisplayDate, displayDateToIso, isValidTime } from '../lib/date'

const fieldInputCls =
  'w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

// Tekstbasert datofelt som alltid viser dd/mm/yyyy, uavhengig av nettleserens/OS-ens
// locale-innstillinger (i motsetning til <input type="date">, som varierer per bruker).
// value/onChange bruker fortsatt ISO 'yyyy-mm-dd' internt.
export function DateField({ value, onChange, className = '', required, ariaLabel }) {
  const [text, setText] = useState(() => isoToDisplayDate(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(isoToDisplayDate(value))
  }, [value, focused])

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    setText(formatted)
    const nextIso = displayDateToIso(formatted)
    onChange(nextIso ?? '')
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/yyyy"
      value={text}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`${fieldInputCls} ${className}`}
      required={required}
      pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
      aria-invalid={text !== '' && !displayDateToIso(text)}
      aria-label={ariaLabel}
    />
  )
}

// Tekstbasert klokkeslettfelt som alltid viser 24-timers HH:mm, uavhengig av
// nettleserens/OS-ens locale-innstillinger (i motsetning til <input type="time">,
// som kan vise AM/PM avhengig av brukerens system).
export function TimeField({ value, onChange, className = '', required, ariaLabel }) {
  const [text, setText] = useState(value ?? '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value ?? '')
  }, [value, focused])

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    let formatted = digits
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`
    setText(formatted)
    onChange(isValidTime(formatted) ? formatted : '')
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="tt:mm"
      value={text}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`${fieldInputCls} ${className}`}
      required={required}
      pattern="[0-9]{2}:[0-9]{2}"
      aria-invalid={text !== '' && !isValidTime(text)}
      aria-label={ariaLabel}
    />
  )
}

export function Select({ value, onChange, options, className = '', ariaLabel, placeholder = 'Velg…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const optionRefs = useRef([])
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find((o) => o.value === value)
  const focusOption = (i) => {
    const n = options.length
    if (!n) return
    optionRefs.current[((i % n) + n) % n]?.focus()
  }
  const onKeyDown = (e) => {
    const n = options.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        focusOption(Math.max(0, options.findIndex((o) => o.value === value)))
        return
      }
      const cur = optionRefs.current.findIndex((el) => el === document.activeElement)
      focusOption(e.key === 'ArrowDown' ? cur + 1 : cur - 1)
    } else if (e.key === 'Home' && open) {
      e.preventDefault()
      focusOption(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault()
      focusOption(n - 1)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      btnRef.current?.focus()
    }
  }
  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
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
        <div role="listbox" className="select-menu absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg">
          {options.map((o, i) => (
            <button
              key={o.value}
              ref={(el) => (optionRefs.current[i] = el)}
              type="button"
              role="option"
              aria-selected={o.value === value}
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
    <span className="chip subject-chip" style={{ '--subject-color': subject.color || '#146c54' }}>
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
      options={[{ value: '', label: 'Alle uker' }, ...weeks.map((w) => ({ value: String(w), label: `Uke ${w}` }))]}
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
