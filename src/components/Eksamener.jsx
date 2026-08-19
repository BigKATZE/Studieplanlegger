import { useMemo } from 'react'
import { SubjectChip, DeadlineBadge } from './ui'
import { fmtShort } from '../lib/date'

export default function Eksamener({ exams, subjects, onRemoveExam, onEditExam }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])

  const sorted = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date)), [exams])

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Eksamensdatoer</h2>
      {sorted.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen eksamener registrert. Legg til en eksamen eller skriv f.eks. «eksamen i bedøk 1. november» i feltet øverst.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {sorted.map((e) => {
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
      <p className="mt-4 text-xs text-muted">{fmtShort(new Date())} – viser eksamener sortert etter dato.</p>
    </section>
  )
}