import { useMemo, useState } from 'react'
import { fmtShort } from '../lib/date'
import { agendaItems } from '../lib/plannerFeatures'
import { SubjectChip } from './ui'

const TYPE_LABELS = { lecture: 'Forelesning', reading: 'Pensum', assignment: 'Arbeidskrav', exam: 'Eksamen', review: 'Repetisjon' }

export default function UpcomingAgenda({ lectures, readings, assignments, exams, reviews = [], subjects, conflictCount = 0, onFocus }) {
  const [range, setRange] = useState('today')
  const items = useMemo(() => {
    return agendaItems({ lectures, readings, assignments, exams, reviews }, range)
  }, [assignments, exams, lectures, range, readings, reviews])

  return (
    <section className="mt-8 rounded-lg card-glass p-4 card-lift">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">{range === 'today' ? 'Dagens plan' : 'Plan for neste 7 dager'}</h2>{conflictCount > 0 && <p role="alert" className="mt-1 text-xs text-warning">{conflictCount} forelesninger har tidskonflikt.</p>}</div>
        <div className="flex rounded-md border border-line bg-paper p-1">
          {[['today', 'I dag'], ['week', 'Neste 7 dager']].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all duration-200 ease-out active:scale-[0.93] ${range === value ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-white/60'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div key={range} className="animate-enter">
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Ingen åpne aktiviteter i perioden. Du kan bruke tiden til repetisjon eller legge til noe nytt.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {items.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="w-24 text-xs font-medium text-muted">{TYPE_LABELS[item.type]}</span>
                <span className="font-medium">{item.title || item.topic || 'Forelesning'}</span>
                <SubjectChip subject={subjects.find((s) => s.id === item.subjectId)} />
                <span className="ml-auto font-mono text-xs text-muted">{item.date?.startsWith('Uke ') ? item.date : fmtShort(new Date(`${item.date}T00:00:00`))}{item.start || item.time ? ` ${item.start || item.time}` : ''}</span>
                {item.type !== 'exam' && <button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs" onClick={() => onFocus?.({ ...item, key: `${item.type}-${item.id}` })}>Fokus</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
