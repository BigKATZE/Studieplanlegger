import { useMemo, useState } from 'react'
import { SubjectChip, DeadlineBadge, WeekFilter } from './ui'
import { isoWeek, weekRangeByWeek, fmtShort, DEFAULT_WEEKS } from '../lib/date'

export default function Eksamener({ exams, subjects, onRemoveExam, onEditExam }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])
  const [week, setWeek] = useState(null)

  const groups = useMemo(() => {
    const m = new Map()
    exams.forEach((e) => {
      const w = isoWeek(new Date(e.date))
      if (!m.has(w)) m.set(w, { week: w, date: new Date(e.date), exams: [] })
      m.get(w).exams.push(e)
    })
    const arr = [...m.values()].sort((a, b) => a.date - b.date)
    arr.forEach((g) => g.exams.sort((a, b) => a.date.localeCompare(b.date)))
    return arr
  }, [exams])

  const groupsByWeek = useMemo(() => new Map(groups.map((g) => [g.week, g])), [groups])
  const weeks = useMemo(() => groups.map((g) => g.week), [groups])
  const renderWeeks = week == null ? DEFAULT_WEEKS : [week]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Eksamensdatoer</h2>
        <WeekFilter weeks={weeks} active={week} onChange={setWeek} />
      </div>
      {exams.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen eksamener registrert. Legg til en eksamen eller skriv f.eks. «eksamen i bedøk 1. november» i feltet øverst.
        </p>
      )}
      <div className="mt-3 space-y-6">
        {renderWeeks.map((w) => {
          const g = groupsByWeek.get(w)
          return (
            <div key={w}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-lg font-semibold">Uke {w}</h3>
                <span className="text-xs text-muted">{weekRangeByWeek(w)}</span>
              </div>
              <div className="mt-2 space-y-2">
                {g?.exams.map((e) => {
                const past = e.date < new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={e.id}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4 ${past ? 'opacity-50' : ''}`}
                  >
                    <DeadlineBadge deadline={e.date} />
                    <span className="text-sm font-medium">{e.title}</span>
                    {e.time && <span className="text-xs text-muted">kl. {e.time}</span>}
                    <SubjectChip subject={subjectById[e.subjectId]} />
                    {past && <span className="text-xs text-muted">(gjennomført)</span>}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => onEditExam(e)}
                        className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                        aria-label="Rediger eksamen"
                      >
                        Rediger
                      </button>
                      <button
                        onClick={() => onRemoveExam(e.id)}
                        className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                        aria-label="Fjern eksamen"
                      >
                        Fjern
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-muted">{fmtShort(new Date())} – viser eksamener sortert etter uke.</p>
    </section>
  )
}