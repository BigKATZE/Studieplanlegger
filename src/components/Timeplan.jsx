import { useMemo } from 'react'
import { isoWeek, weekRange, weekdayShort } from '../lib/date'
import { SubjectChip } from './ui'

export default function Timeplan({ lectures, subjects, onToggleLecture, onToggleChapter, onRemoveLecture }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])

  const weeks = useMemo(() => {
    const groups = new Map()
    lectures.forEach((l) => {
      const date = new Date(l.date)
      const w = isoWeek(date)
      if (!groups.has(w)) groups.set(w, { week: w, date, lectures: [] })
      groups.get(w).lectures.push(l)
    })
    return [...groups.values()].sort((a, b) => a.date - b.date)
  }, [lectures])

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Uke for uke</h2>
      {weeks.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen forelesninger ennå. Importer en timeplan-PDF eller legg til manuelt.
        </p>
      )}
      <div className="mt-3 space-y-6">
        {weeks.map((g) => (
          <div key={g.week}>
            <div className="flex items-baseline gap-3">
              <h3 className="font-display text-lg font-semibold">Uke {g.week}</h3>
              <span className="text-xs text-muted">{weekRange(g.date)}</span>
            </div>
            <div className="mt-2 space-y-2">
              {g.lectures.map((l) => {
                const date = new Date(l.date)
                const subject = subjectById[l.subjectId]
                return (
                  <div key={l.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm" title="Merket forelesning = deltatt / gjennomgått">
                        <input
                          type="checkbox"
                          checked={l.done}
                          onChange={() => onToggleLecture(l.id)}
                          className="h-4 w-4 accent-secondary"
                        />
                        <span className="w-28 font-medium">
                          {weekdayShort(date)} {date.getDate()}.{date.getMonth() + 1}.
                        </span>
                      </label>
                      <span className="text-sm">{l.start}–{l.end}</span>
                      {subject && <SubjectChip subject={subject} />}
                      {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
                      {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
                      <button
                        onClick={() => onRemoveLecture(l.id)}
                        className="ml-auto rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                        aria-label="Fjern forelesning"
                      >
                        Fjern
                      </button>
                    </div>
                    {l.topic && <p className="mt-1 pl-6 text-sm text-muted">{l.topic}</p>}
                    {l.chapters.length > 0 && (
                      <ul className="mt-2 space-y-1 pl-6">
                        {l.chapters.map((c) => (
                          <li key={c.id}>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={c.done}
                                onChange={() => onToggleChapter(l.id, c.id)}
                                className="h-4 w-4 accent-secondary"
                              />
                              <span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}