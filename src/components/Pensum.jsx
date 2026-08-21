import { useMemo, useState } from 'react'
import { SubjectChip, WeekFilter } from './ui'
import { weekRangeByWeek, DEFAULT_WEEKS } from '../lib/date'

export default function Pensum({ readings, subjects, onToggleReading, onToggleReadingChapter, onRemoveReading, onEditReading }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])
  const [week, setWeek] = useState(null)

  const groups = useMemo(() => {
    const map = new Map()
    readings.forEach((r) => {
      const key = r.week ? String(r.week) : 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return [...map.entries()].sort((a, b) => (a[0] === 'none' ? 1 : b[0] === 'none' ? -1 : +a[0] - +b[0]))
  }, [readings])

  const noneItems = useMemo(() => groups.find(([wk]) => wk === 'none')?.[1] ?? [], [groups])
  const groupsByWeek = useMemo(() => new Map(groups.filter(([wk]) => wk !== 'none').map(([wk, items]) => [+wk, items])), [groups])
  const weeks = useMemo(() => groups.map(([wk]) => +wk).filter((w) => !Number.isNaN(w)), [groups])
  const renderWeeks = week == null ? DEFAULT_WEEKS : [week]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Pensum til forelesning</h2>
        <WeekFilter weeks={weeks} active={week} onChange={setWeek} />
      </div>
      {readings.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen pensum registrert. Skriv f.eks. «pensum kapittel 3 i forretningsjus» i feltet øverst.
        </p>
      )}
      {week == null && noneItems.length > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-lg font-semibold">Uten uke</h3>
          </div>
          <div className="mt-2 space-y-2">
            {noneItems.map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4 ${r.done ? 'opacity-50' : ''}`}>
                <button
                  onClick={() => onToggleReading(r.id)}
                  className="flex h-5 w-5 items-center justify-center rounded border border-line text-xs text-secondary"
                  aria-label="Marker som lest"
                >
                  {r.done ? '✓' : ''}
                </button>
                <span className={`text-sm font-medium ${r.done ? 'text-muted line-through' : ''}`}>{r.title}</span>
                <SubjectChip subject={subjectById[r.subjectId]} />
                <button
                  onClick={() => onEditReading(r)}
                  className="ml-auto rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                  aria-label="Rediger pensum"
                >
                  Rediger
                </button>
                <button
                  onClick={() => onRemoveReading(r.id)}
                  className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                  aria-label="Fjern pensum"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 space-y-6">
        {renderWeeks.map((w) => {
          const items = groupsByWeek.get(w) ?? []
          return (
            <div key={w}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-lg font-semibold">Uke {w}</h3>
                <span className="text-xs text-muted">{weekRangeByWeek(w)}</span>
              </div>
              <div className="mt-2 space-y-2">
                {items.map((r) => (
                  <div key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4 ${r.done ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => onToggleReading(r.id)}
                      className="flex h-5 w-5 items-center justify-center rounded border border-line text-xs text-secondary"
                      aria-label="Marker som lest"
                    >
                      {r.done ? '✓' : ''}
                    </button>
                    <span className={`text-sm font-medium ${r.done ? 'text-muted line-through' : ''}`}>{r.title}</span>
                    <SubjectChip subject={subjectById[r.subjectId]} />
                    <button
                      onClick={() => onEditReading(r)}
                      className="ml-auto rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                      aria-label="Rediger pensum"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => onRemoveReading(r.id)}
                      className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                      aria-label="Fjern pensum"
                    >
                      Fjern
                    </button>
                    {(r.chapters?.length ?? 0) > 0 && (
                      <div className="mt-1 w-full space-y-1 pl-6">
                        <p className="text-xs font-medium text-muted">{(r.chapters?.length ?? 0) === 1 ? 'Kapittel:' : 'Kapitler:'}</p>
                        <ul className="space-y-1">
                        {r.chapters.map((c) => (
                          <li key={c.id}>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={c.done}
                                onChange={() => onToggleReadingChapter(r.id, c.id)}
                                className="h-4 w-4 accent-secondary"
                              />
                              <span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
