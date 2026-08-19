import { useMemo } from 'react'
import { SubjectChip } from './ui'
import { fmtShort } from '../lib/date'

export default function Pensum({ readings, subjects, onToggleReading, onRemoveReading }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])

  const sorted = useMemo(
    () => [...readings].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')),
    [readings],
  )

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Pensum til forelesning</h2>
      {sorted.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen pensum registrert. Legg til pensum eller skriv f.eks. «pensum kapittel 3 i forretningsjus» i feltet øverst.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {sorted.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-4 ${r.done ? 'opacity-50' : ''}`}>
            <button
              onClick={() => onToggleReading(r.id)}
              className="flex h-5 w-5 items-center justify-center rounded border border-line text-xs text-secondary"
              aria-label="Marker som lest"
            >
              {r.done ? '✓' : ''}
            </button>
            <span className={`text-sm font-medium ${r.done ? 'text-muted line-through' : ''}`}>{r.title}</span>
            {r.date && <span className="text-xs text-muted">til {fmtShort(new Date(r.date))}</span>}
            <SubjectChip subject={subjectById[r.subjectId]} />
            <button
              onClick={() => onRemoveReading(r.id)}
              className="ml-auto rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
              aria-label="Fjern pensum"
            >
              Fjern
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}