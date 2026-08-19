import { useMemo } from 'react'
import { SubjectChip, DeadlineBadge } from './ui'

const STATUS_LABEL = { not_started: 'Ikke startet', in_progress: 'I arbeid', done: 'Ferdig' }
const SECTIONS = [
  ['not_started', 'Ikke startet'],
  ['in_progress', 'I arbeid'],
  ['done', 'Ferdig'],
]

export default function Gjøremål({ assignments, subjects, onSetAssignmentStatus, onRemoveAssignment }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])

  const grouped = useMemo(() => {
    const g = { not_started: [], in_progress: [], done: [] }
    assignments.forEach((a) => (g[a.status] ?? g.not_started).push(a))
    Object.values(g).forEach((list) => list.sort((a, b) => a.deadline.localeCompare(b.deadline)))
    return g
  }, [assignments])

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Gjøremål &amp; arbeidskrav</h2>
      {assignments.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen gjøremål ennå. Legg til et arbeidskrav.
        </p>
      )}
      <div className="mt-3 space-y-6">
        {SECTIONS.map(([status, label]) => (
          <div key={status}>
            <h3 className="text-sm font-semibold text-muted">
              {label} <span className="font-mono text-xs">({grouped[status].length})</span>
            </h3>
            <div className="mt-2 space-y-2">
              {grouped[status].map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4">
                  <DeadlineBadge deadline={a.deadline} />
                  <span className="text-sm font-medium">{a.title}</span>
                  <SubjectChip subject={subjectById[a.subjectId]} />
                  <select
                    value={a.status}
                    onChange={(e) => onSetAssignmentStatus(a.id, e.target.value)}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
                    aria-label={`Status for ${a.title}`}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onRemoveAssignment(a.id)}
                    className="ml-auto rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                    aria-label="Fjern arbeidskrav"
                  >
                    Fjern
                  </button>
                </div>
              ))}
              {grouped[status].length === 0 && <p className="text-xs text-muted">Ingen.</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}