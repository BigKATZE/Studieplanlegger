import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isoWeek, weekdayShort, fmtShort, weekRangeByWeek } from '../lib/date'

export default function DeltFag({ token }) {
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setState('loading')
      setError('')
      try {
        const { data: res, error: err } = await supabase.functions.invoke('shared-subject', { query: { token } })
        if (!alive) return
        if (err) throw new Error(err.message)
        if (!res?.subject) throw new Error('Tomt svar')
        setData(res)
        setState('ready')
      } catch (e) {
        console.error('Delt fag:', e)
        if (alive) {
          setError('Kunne ikke hente det delte faget.')
          setState('error')
        }
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [token])

  const lectureGroups = useMemo(() => {
    if (!data) return []
    const m = new Map()
    data.lectures.forEach((l) => {
      const w = isoWeek(new Date(l.date))
      if (!m.has(w)) m.set(w, [])
      m.get(w).push(l)
    })
    const arr = [...m.entries()].sort((a, b) => a[0] - b[0])
    arr.forEach(([, list]) => list.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)))
    return arr
  }, [data])

  const readingGroups = useMemo(() => {
    if (!data) return []
    const m = new Map()
    data.readings.forEach((r) => {
      const key = r.week != null ? String(r.week) : 'none'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(r)
    })
    return [...m.entries()].sort((a, b) => (a[0] === 'none' ? 1 : b[0] === 'none' ? -1 : +a[0] - +b[0]))
  }, [data])

  const exit = () => {
    window.location.replace(window.location.pathname)
  }

  return (
    <div className="min-h-screen">
      <header className="relative mx-auto max-w-5xl px-4 pb-6 pt-10">
        <button
          onClick={exit}
          className="absolute right-4 top-4 rounded p-1 text-sm text-muted hover:text-ink"
        >
          Åpne planleggeren →
        </button>
        {data && (
          <div className="flex items-center gap-2">
            <span className="chip" style={{ backgroundColor: (data.subject.color || '#7c3aed') + '1a', color: data.subject.color || '#7c3aed' }}>
              {data.subject.short || data.subject.name}
            </span>
            <span className="font-mono text-xs text-muted">{data.subject.code}</span>
          </div>
        )}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{data?.subject?.name ?? 'Delt fag'}</h1>
        <p className="mt-1 text-sm text-muted">Skrivebeskyttet visning – kun timeplan og pensum for dette faget.</p>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-20">
        {state === 'loading' && <p className="text-sm text-muted">Laster…</p>}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            <p className="text-sm text-muted">Lenken kan være ugyldig eller tilbakekalt.</p>
          </div>
        )}

        {state === 'ready' && (
          <>
            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Timeplan</h2>
              {lectureGroups.length === 0 && (
                <p className="mt-3 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">Ingen forelesninger registrert.</p>
              )}
              <div className="mt-3 space-y-6">
                {lectureGroups.map(([week, list]) => (
                  <div key={week}>
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display text-lg font-semibold">Uke {week}</h3>
                      <span className="text-xs text-muted">{weekRangeByWeek(week)}</span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {list.map((l) => {
                        const date = new Date(l.date)
                        return (
                          <div key={l.id} className="rounded-lg border border-line bg-surface p-4">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-sm font-medium">
                                {weekdayShort(date)} {fmtShort(date)} · {l.start}–{l.end}
                              </span>
                              {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
                              {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
                            </div>
                            {l.topic && <p className="mt-1 text-sm text-muted">{l.topic}</p>}
                            {(l.chapters?.length ?? 0) > 0 && (
                              <ul className="mt-2 space-y-1">
                                {l.chapters.map((c) => (
                                  <li key={c.id} className="text-sm">
                                    <span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Pensum</h2>
              {readingGroups.length === 0 && (
                <p className="mt-3 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">Ingen pensum registrert.</p>
              )}
              <div className="mt-3 space-y-6">
                {readingGroups.map(([week, list]) => (
                  <div key={week}>
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display text-lg font-semibold">{week === 'none' ? 'Uten uke' : `Uke ${week}`}</h3>
                    </div>
                    <div className="mt-2 space-y-2">
                      {list.map((r) => (
                        <div key={r.id} className="rounded-lg border border-line bg-surface p-4">
                          <p className="text-sm font-medium">{r.title}</p>
                          {(r.chapters?.length ?? 0) > 0 && (
                            <ul className="mt-2 space-y-1">
                              {r.chapters.map((c) => (
                                <li key={c.id} className="text-sm">
                                  <span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}