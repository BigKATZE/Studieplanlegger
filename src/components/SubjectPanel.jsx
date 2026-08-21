import { useMemo, useState } from 'react'
import { Select, WeekFilter } from './ui'
import { Modal } from './Modals'
import { fmtShort, iso, isoWeek } from '../lib/date'

export default function SubjectPanel({ subjects, lectures, readings, assignments, exams, onSetLevel, onRemoveSubject, onEditSubject, onShare, canShare }) {
  const [removeTarget, setRemoveTarget] = useState(null)
  const [week, setWeek] = useState(null)
  const weeks = useMemo(() => [...new Set([
    ...lectures.map((l) => isoWeek(new Date(l.date))),
    ...assignments.map((a) => isoWeek(new Date(a.deadline))),
    ...readings.map((r) => r.week),
  ].filter(Boolean))].sort((a, b) => (a < 34 ? a + 53 : a) - (b < 34 ? b + 53 : b)), [assignments, lectures, readings])
  const filteredLectures = week == null ? lectures : lectures.filter((l) => isoWeek(new Date(l.date)) === week)
  const filteredAssignments = week == null ? assignments : assignments.filter((a) => isoWeek(new Date(a.deadline)) === week)
  const filteredReadings = week == null ? readings : readings.filter((r) => r.week === week)
  const stats = useMemo(
    () => new Map(subjects.map((s) => [s.id, computeStats(s, filteredLectures, filteredReadings, filteredAssignments)])),
    [subjects, filteredLectures, filteredReadings, filteredAssignments],
  )
  const overallLevels = useMemo(() => new Map(subjects.map((s) => [s.id, computeStats(s, lectures, readings, assignments).level])), [assignments, lectures, readings, subjects])

  if (subjects.length === 0) {
    return (
      <section className="mt-8 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
        Ingen fag ennå. Legg til et fag eller importer en timeplan.
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Fag &amp; fremdrift</h2>
        <WeekFilter weeks={weeks} active={week} onChange={setWeek} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const st = stats.get(s.id)
          const level = s.levelOverride ?? overallLevels.get(s.id)
          return (
            <div key={s.id} className="app-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="chip subject-chip" style={{ '--subject-color': s.color || '#146c54' }}>
                  {s.short || s.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{s.code}</span>
                  {canShare && (
                    <button
                      onClick={() => onShare(s)}
                      className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                      aria-label={`Del fag ${s.short}`}
                    >
                      Del
                    </button>
                  )}
                  <button
                    onClick={() => onEditSubject(s)}
                    className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                    aria-label={`Rediger fag ${s.short}`}
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => setRemoveTarget(s)}
                    className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                    aria-label={`Fjern fag ${s.short}`}
                  >
                    Fjern
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                <ProgressRow label="Forelesninger" done={st.doneLectures} total={st.lectureCount} />
                <ProgressRow label="Pensum" done={st.doneRead} total={st.totalRead} />
                <ProgressRow label="Arbeidskrav" done={st.doneAss} total={st.assCount} />
              </div>
              {st.totalRead === 0 && <p className="mt-2 text-xs text-warning">Mangler pensum{week == null ? '' : ` i uke ${week}`}.</p>}
              <UpcomingDeadline subjectId={s.id} assignments={assignments} exams={exams} />
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-muted">Kunnskapsnivå</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{level ? `${level}/5` : '-'}</span>
                  <Select
                    value={String(s.levelOverride ?? '')}
                    onChange={(v) => onSetLevel(s.id, v === '' ? null : Number(v))}
                    options={[{ value: '', label: 'Auto' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))]}
                    className="w-auto"
                    ariaLabel={`Nivå for ${s.short}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {removeTarget && (
        <Modal title="Fjern fag" onClose={() => setRemoveTarget(null)}>
          <p className="text-sm text-ink">
            Fjerne <span className="font-medium">{removeTarget.short || removeTarget.name}</span> og alt tilhørende
            (forelesninger, pensum, arbeidskrav og eksamener)?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setRemoveTarget(null)} className="btn-ghost">Avbryt</button>
            <button
              type="button"
              onClick={() => {
                onRemoveSubject(removeTarget.id)
                setRemoveTarget(null)
              }}
              className="btn-danger"
            >
              Fjern fag
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ProgressRow({ label, done, total }) {
  const pct = total ? done / total : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-muted">{done}/{total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

function computeStats(s, lectures, readings, assignments) {
  const lecs = lectures.filter((l) => l.subjectId === s.id)
  const subjectReadings = readings.filter((r) => r.subjectId === s.id)
  const lectureChapters = lecs.flatMap((l) => l.chapters ?? [])
  const readingUnits = subjectReadings.flatMap((r) => r.chapters?.length ? r.chapters.map((c) => ({ ...c, done: r.done || c.done })) : [{ done: r.done }])
  const units = [...lectureChapters, ...readingUnits]
  const ass = assignments.filter((a) => a.subjectId === s.id)
  const doneAss = ass.filter((a) => a.status === 'done').length
  const doneRead = units.filter((unit) => unit.done).length
  const readPct = units.length ? doneRead / units.length : null
  const assPct = ass.length ? doneAss / ass.length : null
  let level = null
  if (readPct !== null || assPct !== null) {
    const combined =
      readPct !== null && assPct !== null ? readPct * 0.6 + assPct * 0.4 : (readPct ?? assPct)
    level = Math.max(1, Math.round(combined * 5))
  }
  return { lectureCount: lecs.length, doneLectures: lecs.filter((l) => l.done).length, totalRead: units.length, doneRead, assCount: ass.length, doneAss, level }
}

function UpcomingDeadline({ subjectId, assignments, exams }) {
  const today = iso(new Date())
  const next = [
    ...assignments.filter((a) => a.subjectId === subjectId && a.status !== 'done').map((a) => ({ title: a.title, date: a.deadline })),
    ...exams.filter((e) => e.subjectId === subjectId).map((e) => ({ title: e.title, date: e.date })),
  ].filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!next) return null
  return <p className="mt-2 truncate text-xs text-muted">Neste frist: {next.title} · {fmtShort(new Date(`${next.date}T00:00:00`))}</p>
}
