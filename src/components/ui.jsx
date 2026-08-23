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
        className={`flex w-full items-center justify-between gap-2.5 rounded-[12px] border bg-surface px-3.5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-secondary/15 ${open ? 'border-secondary/30 bg-surface shadow-md ring-2 ring-secondary/10' : 'border-line hover:border-muted hover:bg-surface'}`}
      >
        <span className="truncate text-left text-ink">{selected ? selected.label : <span className="text-muted">{placeholder}</span>}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180 text-ink' : ''}`}
          fill="none"
          viewBox="0 0 20 20"
        >
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="select-menu absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl bg-surface border border-line p-1.5 shadow-[0_16px_40px_rgba(23,33,31,0.12),0_4px_12px_rgba(23,33,31,0.08)]">
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
              className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${o.value === value ? 'bg-secondary/[0.09] font-medium text-ink shadow-sm ring-1 ring-secondary/10' : 'text-muted hover:bg-paper/65 hover:text-ink'}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && (
                <svg className="h-3.5 w-3.5 shrink-0 text-secondary" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l3 3 7-6" /></svg>
              )}
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
        className={`btn-chip transition-all duration-200 ease-out active:scale-[0.93] backdrop-blur-[14px] backdrop-saturate-[165%] supports-[backdrop-filter]:backdrop-blur-[14px] ${active === null ? 'filter-chip-active !border-ink/15 !text-ink shadow-[0_4px_14px_rgba(23,33,31,0.06)]' : 'bg-surface/45 border-0 shadow-[0_2px_12px_rgba(23,33,31,0.05)] hover:bg-surface/65 hover:shadow-[0_4px_16px_rgba(23,33,31,0.07)]'}`}
      >
        Alle
      </button>
      {subjects.map((s) => {
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => onChange(isActive ? null : s.id)}
            className={`btn-chip transition-all duration-200 ease-out active:scale-[0.93] ${isActive ? 'filter-chip-active shadow-[0_4px_14px_rgba(23,33,31,0.07)]' : 'bg-surface/45 backdrop-blur-[14px] backdrop-saturate-[165%] supports-[backdrop-filter]:backdrop-blur-[14px] border-0 shadow-[0_2px_12px_rgba(23,33,31,0.05)] hover:bg-surface/65 hover:shadow-[0_4px_16px_rgba(23,33,31,0.07)]'}`}
            style={
              isActive
                ? {
                    background: `color-mix(in srgb, ${s.color} 10%, rgba(255,255,255,0.26))`,
                    borderColor: `color-mix(in srgb, ${s.color} 20%, rgba(255,255,255,0.32))`,
                    color: 'var(--color-ink)',
                    boxShadow: `0 4px 14px color-mix(in srgb, ${s.color} 7%, transparent), inset 0 1px 0 rgba(255,255,255,0.32)`,
                  }
                : undefined
            }
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
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
    <div className="mt-6 rounded-lg card-glass p-4 card-lift">
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
