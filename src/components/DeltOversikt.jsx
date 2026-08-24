import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { weekdayShort, fmtShort } from '../lib/date'

const STATUS_LABEL = { not_started: 'Ikke startet', in_progress: 'I arbeid', done: 'Ferdig' }

export default function DeltOversikt({ token }) {
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setState('loading')
      setError('')
      try {
        const { data: res, error: err } = await supabase.functions.invoke('shared-semester', { body: { token } })
        if (!alive) return
        if (err) throw new Error(err.message)
        if (!res?.subjects) throw new Error('Tomt svar')
        setData(res)
        setState('ready')
      } catch (e) {
        console.error('Delt oversikt:', e)
        if (alive) {
          setError('Kunne ikke hente den delte oversikten.')
          setState('error')
        }
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [token])

  const exit = () => {
    window.location.replace(window.location.pathname)
  }

  return (
    <div className="min-h-screen">
      <header className="relative mx-auto max-w-5xl px-4 pb-6 pt-10">
        <button
          onClick={exit}
          className="absolute right-4 top-4 min-h-10 rounded-[10px] px-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          Åpne planleggeren →
        </button>
        <h1 className="font-display text-3xl font-bold tracking-tight">Delt semesteroversikt</h1>
        <p className="mt-1 text-sm text-muted">Skrivebeskyttet visning - timeplan, pensum, arbeidskrav og eksamener.</p>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 pb-20">
        {state === 'loading' && <p className="text-sm text-muted">Laster…</p>}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            <p className="text-sm text-muted">Lenken kan være ugyldig eller tilbakekalt.</p>
          </div>
        )}

        {state === 'ready' && data.subjects.map((subject) => (
          <section key={subject.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip subject-chip" style={{ '--subject-color': subject.color }}>
                {subject.short || subject.name}
              </span>
              {subject.code && <span className="font-mono text-xs text-muted">{subject.code}</span>}
              <h2 className="font-display text-xl font-semibold">{subject.name}</h2>
            </div>

            {subject.exams.length > 0 && (
              <ul className="mt-3 space-y-1">
                {subject.exams.map((exam, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{exam.title}</span>
                    {exam.date && (
                      <span className="text-muted"> · {fmtShort(new Date(exam.date))}{exam.time ? ` ${exam.time}` : ''}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {subject.assignments.length > 0 && (
              <ul className="mt-3 space-y-1">
                {subject.assignments.map((a, i) => (
                  <li key={i} className={`text-sm ${a.status === 'done' ? 'text-muted line-through' : ''}`}>
                    <span className="font-medium">{a.title}</span>
                    <span className="text-muted">
                      {' '}· {STATUS_LABEL[a.status]}{a.deadline ? ` · frist ${fmtShort(new Date(a.deadline))}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {subject.readings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {subject.readings.map((r, i) => (
                  <li key={i} className={`text-sm ${r.done ? 'text-muted line-through' : ''}`}>
                    <span className="font-medium">{r.title}</span>
                    {r.week != null && <span className="text-muted"> · uke {r.week}</span>}
                    {(r.chapters?.length ?? 0) > 0 && (
                      <span className="text-muted"> · {r.chapters.filter((c) => c.done).length}/{r.chapters.length} kapitler</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {subject.lectures.length > 0 && (
              <div className="mt-3 space-y-2">
                {subject.lectures.map((l, i) => {
                  const date = l.date ? new Date(l.date) : null
                  return (
                    <div key={i} className="rounded-lg border border-line bg-surface p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-medium">
                          {date ? `${weekdayShort(date)} ${fmtShort(date)}` : 'Uten dato'}{l.start ? ` · ${l.start}${l.end ? `-${l.end}` : ''}` : ''}
                        </span>
                        {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
                        {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
                      </div>
                      {l.topic && <p className={`mt-1 text-sm text-muted ${l.done ? 'line-through' : ''}`}>{l.topic}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {subject.lectures.length === 0 && subject.readings.length === 0 && subject.assignments.length === 0 && subject.exams.length === 0 && (
              <p className="mt-3 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">Ingen innhold registrert i dette faget.</p>
            )}
          </section>
        ))}

        {state === 'ready' && data.generatedAt && (
          <p className="text-center text-xs text-muted">
            Øyeblikksbilde hentet {new Date(data.generatedAt).toLocaleString('nb-NO')}. Endringer etter dette vises ikke.
          </p>
        )}
      </main>
    </div>
  )
}
