import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modals'
import { search } from '../lib/search'
import { SubjectChip, DeadlineBadge } from './ui'
import { fmtShort, weekdayShort } from '../lib/date'

const GROUPS = [
  ['subject', 'Fag'],
  ['lecture', 'Timeplan'],
  ['reading', 'Pensum'],
  ['assignment', 'Arbeidskrav'],
  ['exam', 'Eksamener'],
]

export default function SearchModal({ data, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  const results = useMemo(() => search(data, query), [data, query])

  const flat = useMemo(() => [
    ...results.subjects.map((r) => ({ kind: 'subject', result: r })),
    ...results.lectures.map((r) => ({ kind: 'lecture', result: r })),
    ...results.readings.map((r) => ({ kind: 'reading', result: r })),
    ...results.assignments.map((r) => ({ kind: 'assignment', result: r })),
    ...results.exams.map((r) => ({ kind: 'exam', result: r })),
  ], [results])

  const groups = useMemo(() => {
    let index = 0
    const out = []
    for (const [kind, label] of GROUPS) {
      const items = flat.filter((f) => f.kind === kind).map((f) => ({ ...f, index: index++ }))
      if (items.length) out.push({ label, items })
    }
    return out
  }, [flat])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => {
        const n = flat.length
        if (!n) return 0
        return e.key === 'ArrowDown' ? Math.min(n - 1, i + 1) : Math.max(0, i - 1)
      })
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault()
      onSelect(flat[active])
    }
  }

  return (
    <Modal title="Søk" onClose={onClose}>
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Søk fag, forelesninger, pensum, arbeidskrav, eksamener…"
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        aria-label="Søk"
      />

      <div ref={listRef} className="mt-3 max-h-96 space-y-4 overflow-y-auto pr-1">
        {!query.trim() && <p className="text-sm text-muted">Skriv for å søke.</p>}
        {query.trim() && flat.length === 0 && <p className="text-sm text-muted">Ingen treff.</p>}

        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</h3>
            <ul className="mt-1.5 space-y-1">
              {g.items.map(({ index, kind, result }) => (
                <li key={index}>
                  <button
                    type="button"
                    data-active={active === index}
                    onClick={() => onSelect({ kind, result })}
                    onMouseEnter={() => setActive(index)}
                    className={`block w-full rounded-md px-2.5 py-2 text-left transition-colors ${
                      active === index ? 'bg-secondary/10' : 'hover:bg-paper'
                    }`}
                  >
                    <Row kind={kind} result={result} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-3 border-t border-line pt-2 text-xs text-muted">↑↓ naviger · Enter velg · Esc lukk</p>
    </Modal>
  )
}

function Row({ kind, result }) {
  if (kind === 'subject') {
    const s = result
    return (
      <div className="flex items-center gap-2">
        <SubjectChip subject={s} />
        <span className="text-sm text-ink">{s.name}</span>
        <span className="ml-auto font-mono text-xs text-muted">{s.code}</span>
      </div>
    )
  }
  if (kind === 'lecture') {
    const { lecture: l, subject, chapters } = result
    const date = new Date(l.date)
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {subject && <SubjectChip subject={subject} />}
          <span className="text-sm font-medium">
            {weekdayShort(date)} {fmtShort(date)} · {l.start}-{l.end}
          </span>
          {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
          {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
        </div>
        {chapters.length > 0 && (
          <p className="mt-0.5 pl-1 text-xs text-muted">{chapters.map((c) => c.text).join(', ')}</p>
        )}
      </div>
    )
  }
  if (kind === 'reading') {
    const { reading: r, subject, chapters } = result
    return (
      <div className="flex items-center gap-2">
        {subject && <SubjectChip subject={subject} />}
        <span className="text-sm text-ink">{r.title}</span>
        {r.week != null && <span className="text-xs text-muted">Uke {r.week}</span>}
        {chapters.length > 0 && (
          <span className="ml-auto text-xs text-muted">{chapters.map((c) => c.text).join(', ')}</span>
        )}
      </div>
    )
  }
  if (kind === 'assignment') {
    const { assignment: a, subject } = result
    return (
      <div className="flex items-center gap-2">
        {subject && <SubjectChip subject={subject} />}
        <span className="text-sm text-ink">{a.title}</span>
        <span className="ml-auto"><DeadlineBadge deadline={a.deadline} /></span>
      </div>
    )
  }
  const { exam: e, subject } = result
  return (
    <div className="flex items-center gap-2">
      {subject && <SubjectChip subject={subject} />}
      <span className="text-sm text-ink">{e.title}</span>
      <span className="ml-auto font-mono text-xs text-muted">{fmtShort(new Date(e.date))}</span>
    </div>
  )
}
