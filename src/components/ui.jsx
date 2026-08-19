import { daysUntil, fmtShort } from '../lib/date'

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