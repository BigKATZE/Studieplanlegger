import { useMemo, useState } from 'react'
import { CompletedFilterButton, SubjectChip, DeadlineBadge, Select, WeekFilter } from './ui'
import { isoWeek, weekRangeByWeek, DEFAULT_WEEKS } from '../lib/date'

const STATUS_LABEL = { not_started: 'Ikke startet', in_progress: 'I arbeid', done: 'Ferdig' }
const SECTIONS = [
  ['not_started', 'Ikke startet'],
  ['in_progress', 'I arbeid'],
  ['done', 'Ferdig'],
]

export default function Gjøremål({ assignments, subjects, onSetAssignmentStatus, onRemoveAssignment, onEditAssignment, hideCompleted = false, onToggleHideCompleted, completedCount = 0 }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])
  const [week, setWeek] = useState(null)
  const visibleAssignments = useMemo(() => hideCompleted ? assignments.filter((assignment) => assignment.status !== 'done') : assignments, [assignments, hideCompleted])

  const groups = useMemo(() => {
    const m = new Map()
    visibleAssignments.forEach((a) => {
      const w = isoWeek(new Date(a.deadline))
      if (!m.has(w)) m.set(w, { week: w, date: new Date(a.deadline), byStatus: { not_started: [], in_progress: [], done: [] } })
      m.get(w).byStatus[a.status] ??= []
      m.get(w).byStatus[a.status].push(a)
    })
    const arr = [...m.values()].sort((a, b) => a.date - b.date)
    arr.forEach((g) => Object.values(g.byStatus).forEach((list) => list.sort((x, y) => x.deadline.localeCompare(y.deadline))))
    return arr
  }, [visibleAssignments])

  const groupsByWeek = useMemo(() => new Map(groups.map((g) => [g.week, g])), [groups])
  const weeks = useMemo(() => groups.map((g) => g.week), [groups])
  const emptyByStatus = { not_started: [], in_progress: [], done: [] }
  const renderWeeks = week == null ? DEFAULT_WEEKS : [week]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Arbeidskrav</h2>
        <div className="flex items-center justify-end gap-2">
          <CompletedFilterButton active={hideCompleted} count={completedCount} onChange={onToggleHideCompleted} />
          <WeekFilter weeks={weeks} active={week} onChange={setWeek} />
        </div>
      </div>
      {visibleAssignments.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          {hideCompleted && assignments.length > 0 ? 'Alle fullførte arbeidskrav er skjult.' : 'Ingen arbeidskrav ennå. Legg til et arbeidskrav.'}
        </p>
      )}
      <div className="mt-3 space-y-6">
        {renderWeeks.map((w) => {
          const g = groupsByWeek.get(w)
          const byStatus = g?.byStatus ?? emptyByStatus
          return (
            <div key={w}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-lg font-semibold">Uke {w}</h3>
                <span className="text-xs text-muted">{weekRangeByWeek(w)}</span>
              </div>
              <div className="mt-2 space-y-4">
                {SECTIONS.filter(([status]) => !hideCompleted || status !== 'done').map(([status, label]) => (
                  <div key={status}>
                    <h4 className="text-sm font-semibold text-muted">
                      {label} <span className="font-mono text-xs">({byStatus[status].length})</span>
                    </h4>
                    <div className="mt-2 space-y-2">
                      {byStatus[status].map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4">
                        <DeadlineBadge deadline={a.deadline} />
                        <span className="text-sm font-medium">{a.title}</span>
                        <SubjectChip subject={subjectById[a.subjectId]} />
                        <Select
                          value={a.status}
                          onChange={(v) => onSetAssignmentStatus(a.id, v)}
                          options={Object.entries(STATUS_LABEL).map(([v, label]) => ({ value: v, label }))}
                          className="w-auto"
                          ariaLabel={`Status for ${a.title}`}
                        />
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => onEditAssignment(a)}
                            className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                            aria-label="Rediger arbeidskrav"
                          >
                            Rediger
                          </button>
                          <button
                            onClick={() => onRemoveAssignment(a.id)}
                            className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                            aria-label="Fjern arbeidskrav"
                          >
                            Fjern
                          </button>
                        </div>
                      </div>
                    ))}
                    {byStatus[status].length === 0 && <p className="text-xs text-muted">Ingen.</p>}
                  </div>
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
