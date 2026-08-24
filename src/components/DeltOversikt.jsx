import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { weekdayShort, fmtShort, isoWeek, weekRangeByWeek } from '../lib/date'

const STATUS_LABEL = { not_started: 'Ikke startet', in_progress: 'I arbeid', done: 'Ferdig' }
const STATUS_DOT = { not_started: 'bg-line', in_progress: 'bg-warning', done: 'bg-success' }

function groupLecturesByWeek(lectures) {
  const m = new Map()
  for (const l of lectures) {
    if (!l.date) {
      if (!m.has('uten')) m.set('uten', [])
      m.get('uten').push(l)
      continue
    }
    const w = isoWeek(new Date(l.date))
    if (!m.has(w)) m.set(w, [])
    m.get(w).push(l)
  }
  const entries = [...m.entries()]
    .filter(([k]) => k !== 'uten')
    .sort((a, b) => a[0] - b[0])
  entries.forEach(([, list]) => list.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)))
  if (m.has('uten')) entries.push(['uten', m.get('uten')])
  return entries
}

export default function DeltOversikt({ token }) {
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState(() => new Set())
  const [lectureFilter, setLectureFilter] = useState(null)

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

  const filteredSubjects = useMemo(() => {
    if (!data) return []
    return lectureFilter ? data.subjects.filter((s) => s.id === lectureFilter) : data.subjects
  }, [data, lectureFilter])

  const allLecturesFlat = useMemo(() => {
    if (!data) return []
    const all = data.subjects.flatMap((s) => s.lectures.map((l) => ({ ...l, _subject: s })))
    all.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    return lectureFilter ? all.filter((l) => l._subject.id === lectureFilter) : all
  }, [data, lectureFilter])

  const toggleExpand = (id) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

            {/* Interactive forelesninger-seksjon */}
            {stats.lectures > 0 && (
              <section className="mt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">Forelesninger</h2>
                  <span className="text-xs text-muted">{allLecturesFlat.length} totalt</span>
                </div>

                {/* Fag-filter for forelesninger */}
                {data.subjects.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLectureFilter(null)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${lectureFilter === null ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-ink/20 hover:text-ink'}`}
                    >
                      Alle fag
                    </button>
                    {data.subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setLectureFilter(s.id)}
                        className={`chip subject-chip !px-3 !py-1.5 text-xs transition-all ${lectureFilter === s.id ? 'ring-1 ring-ink/20' : 'opacity-70 hover:opacity-100'}`}
                        style={{ '--subject-color': s.color }}
                      >
                        {s.short || s.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Samlet tidslinje gruppert per uke */}
                <div className="mt-4 space-y-6">
                  {groupLecturesByWeek(allLecturesFlat).map(([week, list]) => (
                    <div key={String(week)}>
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-display text-sm font-semibold">
                          {week === 'uten' ? 'Uten dato' : `Uke ${week}`}
                        </h3>
                        {week !== 'uten' && (
                          <span className="text-xs text-muted">{weekRangeByWeek(week)}</span>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        {list.map((l, i) => {
                          const d = l.date ? new Date(l.date) : null
                          return (
                            <div key={`${l._subject.id}-${l.date}-${l.start}-${i}`} className={`flex gap-3 rounded-xl border bg-surface p-4 transition-colors ${l.done ? 'border-success/20 bg-success/[0.04]' : 'border-line hover:border-ink/10'}`}>
                              <span className="chip subject-chip h-fit shrink-0 !px-2 !py-0.5 text-[11px]" style={{ '--subject-color': l._subject.color }}>
                                {l._subject.short || l._subject.name}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-5">
                                  {d ? `${weekdayShort(d)} ${fmtShort(d)}` : 'Uten dato'}
                                  {l.start ? <span className="font-mono text-xs font-normal text-muted"> · {l.start}{l.end ? `–${l.end}` : ''}</span> : null}
                                  {l.room && <span className="font-mono text-xs font-normal text-muted"> · {l.room}</span>}
                                </p>
                                {l.lecturer && <p className="text-xs text-muted">{l.lecturer}</p>}
                                {l.topic && <p className={`mt-1 text-sm ${l.done ? 'text-muted line-through' : 'text-ink'}`}>{l.topic}</p>}
                                {(l.chapters?.length ?? 0) > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {l.chapters.map((c, ci) => (
                                      <li key={ci} className={`text-xs ${c.done ? 'text-muted line-through' : 'text-muted'}`}>• {c.text}</li>
                                    ))}
                                  </ul>
                                )}
                                {l.done && <span className="mt-1 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Deltatt</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Per-fag kort — pensum + arbeidskrav + eksamener */}
            <div className="mt-10 space-y-6">
              <h2 className="font-display text-lg font-semibold">Per fag</h2>
              {filteredSubjects.map((subject) => {
                const total = subject.readings.length + subject.assignments.length + subject.exams.length
                const done = subject.readings.filter((r) => r.done).length + subject.assignments.filter((a) => a.status === 'done').length
                const hasContent = total > 0 || subject.lectures.length > 0
                const isExpanded = expandedSubjects.has(subject.id)
                return (
                  <section key={subject.id} className="app-surface overflow-hidden p-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(subject.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                    >
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="chip subject-chip" style={{ '--subject-color': subject.color }}>
                          {subject.short || subject.name}
                        </span>
                        {subject.code && <span className="font-mono text-xs text-muted">{subject.code}</span>}
                        <span className="font-display text-base font-semibold">{subject.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {hasContent && (
                          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-muted">
                            {done}/{total} fullført
                          </span>
                        )}
                        <span className={`text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="grid gap-0 divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
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
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-muted">Forelesninger i faget</h3>
                            <p className="mt-1 text-xs text-muted">{subject.lectures.length} totalt — se samlet tidslinje over.</p>
                            <ul className="mt-2.5 space-y-2">
                              {groupLecturesByWeek(subject.lectures).slice(0, 3).map(([week, list]) => (
                                <li key={String(week)} className="text-xs">
                                  <span className="font-medium">{week === 'uten' ? 'Uten dato' : `Uke ${week}`}</span>
                                  <span className="text-muted"> · {list.length} forelesninger</span>
                                </li>
                              ))}
                              {groupLecturesByWeek(subject.lectures).length > 3 && (
                                <li className="text-xs text-muted">+ {groupLecturesByWeek(subject.lectures).length - 3} uker til i tidslinjen over</li>
                              )}
                              {subject.lectures.length === 0 && <li className="text-xs text-muted">Ingen forelesninger.</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {!isExpanded && hasContent && (
                      <p className="border-t border-line bg-paper px-5 py-2 text-center text-xs text-muted sm:px-6">Klikk for å se pensum, arbeidskrav og eksamener</p>
                    )}
                    {!hasContent && !isExpanded && (
                      <p className="border-t border-dashed border-line bg-paper px-5 py-6 text-center text-sm text-muted sm:px-6">
                        Ingen innhold registrert i dette faget ennå — se forelesninger i tidslinjen over.
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
