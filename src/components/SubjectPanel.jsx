import { useMemo, useState } from 'react'
import { Select } from './ui'
import { Modal } from './Modals'

export default function SubjectPanel({ subjects, lectures, assignments, onSetLevel, onRemoveSubject, onEditSubject }) {
  const [removeTarget, setRemoveTarget] = useState(null)
  const stats = useMemo(
    () => new Map(subjects.map((s) => [s.id, computeStats(s, lectures, assignments)])),
    [subjects, lectures, assignments],
  )

  if (subjects.length === 0) {
    return (
      <section className="mt-8 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
        Ingen fag ennå. Legg til et fag eller importer en timeplan.
      </section>
    )
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Fag &amp; fremdrift</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const st = stats.get(s.id)
          return (
            <div key={s.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="chip" style={{ backgroundColor: s.color + '1a', color: s.color }}>
                  {s.short || s.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{s.code}</span>
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
                <ProgressRow label="Pensum" done={st.doneCh} total={st.totalCh} />
                <ProgressRow label="Arbeidskrav" done={st.doneAss} total={st.assCount} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-muted">Kunnskapsnivå</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{st.level ? `${st.level}/5` : '–'}</span>
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

function computeStats(s, lectures, assignments) {
  const lecs = lectures.filter((l) => l.subjectId === s.id)
  const totalCh = lecs.reduce((n, l) => n + l.chapters.length, 0)
  const doneCh = lecs.reduce((n, l) => n + l.chapters.filter((c) => c.done).length, 0)
  const ass = assignments.filter((a) => a.subjectId === s.id)
  const doneAss = ass.filter((a) => a.status === 'done').length
  const readPct = totalCh ? doneCh / totalCh : null
  const assPct = ass.length ? doneAss / ass.length : null
  let level = null
  if (readPct !== null || assPct !== null) {
    const combined =
      readPct !== null && assPct !== null ? readPct * 0.6 + assPct * 0.4 : (readPct ?? assPct)
    level = Math.max(1, Math.round(combined * 5))
  }
  return { totalCh, doneCh, assCount: ass.length, doneAss, level }
}