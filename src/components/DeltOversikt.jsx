import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { weekdayShort, fmtShort } from '../lib/date'

const STATUS_LABEL = { not_started: 'Ikke startet', in_progress: 'I arbeid', done: 'Ferdig' }
const STATUS_DOT = { not_started: 'bg-line', in_progress: 'bg-warning', done: 'bg-success' }

export default function DeltOversikt({ token }) {
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [expandedLectures, setExpandedLectures] = useState(() => new Set())
  const [activeLecture, setActiveLecture] = useState(null)

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
    return () => { alive = false }
  }, [token])

  const stats = useMemo(() => {
    if (!data) return null
    let lectures = 0, readings = 0, assignments = 0, exams = 0, doneReadings = 0, doneAssignments = 0
    for (const s of data.subjects) {
      lectures += s.lectures.length
      readings += s.readings.length
      assignments += s.assignments.length
      exams += s.exams.length
      doneReadings += s.readings.filter((r) => r.done).length
      doneAssignments += s.assignments.filter((a) => a.status === 'done').length
    }
    return { lectures, readings, assignments, exams, doneReadings, doneAssignments, subjects: data.subjects.length }
  }, [data])

  const exit = () => window.location.replace(window.location.pathname)

  return (
    <div className="min-h-screen relative">
      <div className="orb-wrap" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="mx-auto max-w-5xl px-4 pb-6 pt-5 sm:pt-8">
        <div className="flex justify-end">
          <button
            onClick={exit}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-line/60 bg-surface/80 px-4 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-ink/15 hover:bg-surface hover:text-ink"
          >
            Åpne planleggeren →
          </button>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-[-.03em] sm:text-4xl">Delt semesteroversikt</h1>
        <div className="mt-3 h-[3px] w-12 rounded-full bg-[#141414]" aria-hidden="true" />
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Skrivebeskyttet øyeblikksbilde — timeplan, pensum, arbeidskrav og eksamener per fag.
          Endringer i planen vises ikke automatisk.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        {state === 'loading' && (
          <div className="mt-10 flex items-center gap-3 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-secondary" aria-hidden="true" />
            Laster semesteroversikt…
          </div>
        )}

        {state === 'error' && (
          <div className="mt-8 space-y-3">
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
            <p className="text-sm text-muted">Lenken kan være ugyldig, utløpt eller tilbakekalt.</p>
          </div>
        )}

        {state === 'ready' && stats && (
          <div className="mt-2 animate-enter">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Fag', value: stats.subjects },
                { label: 'Forelesninger', value: stats.lectures },
                { label: 'Arbeidskrav', value: `${stats.doneAssignments}/${stats.assignments}` },
                { label: 'Eksamener', value: stats.exams },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Subjects */}
            <div className="mt-8 space-y-6">
              {data.subjects.map((subject) => {
                const total = subject.readings.length + subject.assignments.length + subject.exams.length + subject.lectures.length
                const done = subject.readings.filter((r) => r.done).length + subject.assignments.filter((a) => a.status === 'done').length
                const hasContent = total > 0
                return (
                  <section key={subject.id} className="app-surface overflow-hidden p-0">
                    {/* Subject header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="chip subject-chip" style={{ '--subject-color': subject.color }}>
                          {subject.short || subject.name}
                        </span>
                        {subject.code && <span className="font-mono text-xs text-muted">{subject.code}</span>}
                        <h2 className="font-display text-lg font-semibold leading-none">{subject.name}</h2>
                      </div>
                      {hasContent && (
                        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-muted">
                          {done}/{total} fullført
                        </span>
                      )}
                    </div>

                    {/* Content grid */}
                    <div className="grid gap-0 divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                      {/* Left: Exams + Assignments */}
                      <div className="space-y-5 p-5 sm:p-6">
                        {subject.exams.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-muted">Eksamener</h3>
                            <ul className="mt-2.5 space-y-2">
                              {subject.exams.map((exam, i) => (
                                <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-paper px-3 py-2.5">
                                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-5">{exam.title}</p>
                                    {exam.date && (
                                      <p className="font-mono text-xs text-muted">
                                        {fmtShort(new Date(exam.date))}{exam.time ? ` · ${exam.time}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {subject.assignments.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-muted">Arbeidskrav</h3>
                            <ul className="mt-2.5 space-y-2">
                              {subject.assignments.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-paper px-3 py-2.5">
                                  <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[a.status]}`} aria-hidden="true" />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium leading-5 ${a.status === 'done' ? 'text-muted line-through' : ''}`}>{a.title}</p>
                                    <p className="text-xs text-muted">
                                      {STATUS_LABEL[a.status]}{a.deadline ? ` · frist ${fmtShort(new Date(a.deadline))}` : ''}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {subject.exams.length === 0 && subject.assignments.length === 0 && (
                          <p className="text-sm text-muted">Ingen eksamener eller arbeidskrav.</p>
                        )}
                      </div>

                      {/* Right: Readings + Lectures */}
                      <div className="space-y-5 p-5 sm:p-6">
                        {subject.readings.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-muted">Pensum</h3>
                            <ul className="mt-2.5 space-y-2">
                              {subject.readings.map((r, i) => (
                                <li key={i} className={`rounded-lg border bg-paper px-3 py-2.5 ${r.done ? 'border-success/20 bg-success/5' : 'border-line'}`}>
                                  <p className={`text-sm font-medium leading-5 ${r.done ? 'text-muted line-through' : ''}`}>{r.title}</p>
                                  <p className="text-xs text-muted">
                                    {r.week != null ? `Uke ${r.week}` : 'Uten uke'}
                                    {(r.chapters?.length ?? 0) > 0 ? ` · ${r.chapters.filter((c) => c.done).length}/${r.chapters.length} kapitler` : ''}
                                    {r.done ? ' · fullført' : ''}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {subject.lectures.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-muted">Forelesninger</h3>
                              {subject.lectures.length > 8 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedLectures((prev) => { const n = new Set(prev); n.has(subject.id) ? n.delete(subject.id) : n.add(subject.id); return n })}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm transition-all hover:border-ink/15 hover:bg-paper hover:text-ink hover:shadow active:scale-[0.98]"
                                >
                                  {expandedLectures.has(subject.id) ? 'Vis færre' : `Vis alle · ${subject.lectures.length}`}
                                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className={`h-3 w-3 transition-transform duration-200 ${expandedLectures.has(subject.id) ? 'rotate-180' : ''}`}>
                                    <path d="M3 4.5 6 7.5 9 4.5" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <ul className="mt-2.5 space-y-2">
                              {(expandedLectures.has(subject.id) ? subject.lectures : subject.lectures.slice(0, 8)).map((l, i) => {
                                const d = l.date ? new Date(l.date) : null
                                const key = `${subject.id}-${l.date}-${l.start}-${i}`
                                const isActive = activeLecture === key
                                const hasChapters = (l.chapters?.length ?? 0) > 0
                                return (
                                  <li
                                    key={key}
                                    onClick={() => hasChapters && setActiveLecture(isActive ? null : key)}
                                    className={`rounded-lg border px-3 py-2.5 transition-colors ${l.done ? 'border-success/20 bg-success/5' : 'border-line bg-paper'} ${hasChapters ? 'cursor-pointer hover:border-ink/15 hover:shadow-sm' : ''} ${isActive ? 'ring-1 ring-secondary/20' : ''}`}
                                  >
                                    <p className="text-sm font-medium leading-5">
                                      {d ? `${weekdayShort(d)} ${fmtShort(d)}` : 'Uten dato'}
                                      {l.start ? <span className="font-mono text-xs text-muted"> · {l.start}{l.end ? `–${l.end}` : ''}</span> : null}
                                      {hasChapters && <span className="ml-1 text-xs text-muted">{isActive ? '▴' : '▾'}</span>}
                                    </p>
                                    <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                                      {l.room && <span>{l.room}</span>}
                                      {l.lecturer && <span>{l.lecturer}</span>}
                                    </p>
                                    {l.topic && <p className={`mt-1 text-sm ${l.done ? 'text-muted line-through' : 'text-muted'}`}>{l.topic}</p>}
                                    {l.done && <span className="mt-1 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Deltatt</span>}
                                    {hasChapters && isActive && (
                                      <ul className="mt-2 space-y-1 border-t border-line pt-2">
                                        {l.chapters.map((c, ci) => (
                                          <li key={ci} className={`text-xs ${c.done ? 'text-muted line-through' : 'text-muted'}`}>• {c.text}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                        {subject.readings.length === 0 && subject.lectures.length === 0 && (
                          <p className="text-sm text-muted">Ingen pensum eller forelesninger.</p>
                        )}
                      </div>
                    </div>

                    {!hasContent && (
                      <p className="border-t border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-muted sm:px-6">
                        Ingen innhold registrert i dette faget ennå.
                      </p>
                    )}
                  </section>
                )
              })}
            </div>

            {data.generatedAt && (
              <p className="mt-10 text-center text-xs text-muted">
                Øyeblikksbilde hentet {new Date(data.generatedAt).toLocaleString('nb-NO')}. Endringer etter dette vises ikke.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
