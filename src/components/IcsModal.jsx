import { useMemo, useState } from 'react'
import { parseIcs, guessKind, extractCode } from '../lib/ics'
import { matchSubject } from '../lib/parseSmartInput'
import { checkFile } from '../lib/upload'
import { uid } from '../lib/store'
import { supabase, hasSupabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { Select, DateField } from './ui'
import { isoWeek } from '../lib/date'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

const KIND_LABELS = { lecture: 'forelesninger', reading: 'pensum', assignment: 'arbeidskrav', exam: 'eksamener' }

export default function IcsImport({ subjects, data, onImport, onClose }) {
  const [feedUrl, setFeedUrl] = useState('')
  const [state, setState] = useState('config') // config | loading | review
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const review = useMemo(() => analyzeRows(rows, data), [data, rows])

  const loadText = async (text) => {
    const events = parseIcs(text)
    if (events.length === 0) {
      setError('Fant ingen hendelser i iCal-innholdet.')
      setState('config')
      return
    }
    setRows(
      events.map((e) => {
        const kind = guessKind(e.title)
        const subj = matchSubject(e.title.toLowerCase(), subjects)
        return { key: uid(), include: true, kind, title: e.title, date: e.date, time: e.time, room: e.room, subjectValue: subj?.id ?? 'new', newName: subj ? '' : extractCode(e.title) }
      }),
    )
    setState('review')
  }

  const connect = async (e) => {
    e.preventDefault()
    if (!feedUrl.trim()) return
    setState('loading')
    setError('')
    try {
      if (hasSupabase) {
        // Går via en Edge Function på Supabase-domenet vårt (allerede tillatt av CSP-en),
        // som henter feeden server-side. Unngår CSP-blokkering og CORS-problemer hos LMS-en.
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          throw new Error('Logg inn for å hente en ekstern kalenderfeed automatisk - eller last opp .ics-filen direkte under.')
        }
        const proxyUrl = `${supabaseUrl}/functions/v1/ics-proxy?url=${encodeURIComponent(feedUrl.trim())}`
        const res = await fetch(proxyUrl, {
          headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `Feed svarte ${res.status}`)
        }
        await loadText(await res.text())
        return
      }
      // Ingen Supabase konfigurert (lokal/gjest-modus) - prøv direkte fetch.
      // Vil ofte feile pga. CORS siden LMS-en ikke sender riktige headere.
      // ponytail: enkel SSRF-sperre også klient-side for gjestemodus
      const directUrl = feedUrl.trim()
      if (directUrl.length > 2048) throw new Error('URL-en er for lang.')
      if (directUrl.includes('@')) throw new Error('Denne adressen kan ikke hentes.')
      try {
        const directParsed = new URL(directUrl)
        if (directParsed.username || directParsed.password) throw new Error('Denne adressen kan ikke hentes.')
        if (directParsed.port && !['80', '443', ''].includes(directParsed.port)) throw new Error('Kun port 80 og 443 er støttet.')
        const host = directParsed.hostname.toLowerCase()
        if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || host === '127.0.0.1' || host === '::1' || host.startsWith('100.64.')) throw new Error('Denne adressen kan ikke hentes.')
      } catch (e) {
        if (e.message === 'Denne adressen kan ikke hentes.' || e.message.includes('port') || e.message.includes('for lang')) throw e
        throw new Error('Ugyldig URL.')
      }
      const res = await fetch(directUrl)
      if (!res.ok) throw new Error(`Feed svarte ${res.status}`)
      const text = await res.text()
      if (text.length > 2 * 1024 * 1024) throw new Error('Feed-en er for stor (over 2 MB).')
      await loadText(text)
    } catch (err) {
      console.error(err)
      setError(
        err instanceof TypeError
          ? 'Kunne ikke hente feeden fra nettleseren (CORS). Åpne URL-en i nettleseren, last ned .ics-filen og last den opp under «eller last opp fil».'
          : err.message,
      )
      setState('config')
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    const err = checkFile(file, { maxBytes: 2 * 1024 * 1024, types: ['text/calendar'], extensions: ['ics', 'ical'] })
    if (err) {
      setError(err)
      return
    }
    setError('')
    await loadText(await file.text())
  }

  const patch = (i, fields) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...fields } : row)))

  const confirm = () => {
    onImport(rows.filter((_, i) => review.importable.has(i)))
    onClose()
  }

  return state !== 'review' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Bruk Canvas-kalenderfeeden din i stedet for access token: Åpne Canvas → Konto → Kalender →
            «Kalenderfeed», og lim inn URL-en under - eller last ned .ics-filen og last den opp.
          </p>
          <form onSubmit={connect} className="space-y-4">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Kalenderfeed-URL (.ics)</span>
              <input
                className={inputCls}
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://skolen.instructure.com/feeds/calendars/user_xxxx.ics"
              />
            </div>
            {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            {state === 'loading' && <p className="text-sm text-muted">Henter kalender…</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
              <button type="submit" className="btn-primary" disabled={state === 'loading'}>
                {state === 'loading' ? 'Henter…' : 'Hent feed'}
              </button>
            </div>
          </form>
          <div className="border-t border-line pt-4">
            <span className="mb-1 block text-xs font-medium text-muted">Eller last opp .ics-fil</span>
            <input
              type="file"
              accept=".ics,.ical,text/calendar"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="file-input block w-full text-sm text-muted"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-paper/60 p-3 text-xs text-muted">
            <p>Fant {rows.length} hendelser: {Object.entries(review.counts).map(([kind, count]) => `${count} ${KIND_LABELS[kind]}`).join(', ')}.</p>
            <p className="mt-1">{review.importable.size} nye importeres{review.duplicates.size ? ` · ${review.duplicates.size} duplikater hoppes over` : ''}{review.invalid.size ? ` · ${review.invalid.size} ugyldige rader` : ''}.</p>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="rounded-md border border-line bg-paper/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => patch(i, { include: e.target.checked })}
                    className="h-4 w-4 accent-secondary"
                    aria-label={`Inkluder ${r.title}`}
                  />
                  {review.duplicates.has(i) && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">Duplikat</span>}
                  {review.invalid.has(i) && <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs text-danger">Mangler data</span>}
                  <Select
                    value={r.kind}
                    onChange={(v) => patch(i, { kind: v })}
                    options={[
                      { value: 'lecture', label: 'Forelesning' },
                      { value: 'reading', label: 'Pensum' },
                      { value: 'assignment', label: 'Arbeidskrav' },
                      { value: 'exam', label: 'Eksamen' },
                    ]}
                    className="w-32"
                    ariaLabel="Type"
                  />
                  <input
                    type="text"
                    value={r.title}
                    onChange={(e) => patch(i, { title: e.target.value })}
                    className={`${inputCls} min-w-32 flex-1`}
                  />
                  <DateField
                    value={r.date}
                    onChange={(v) => patch(i, { date: v })}
                    className="w-28"
                    ariaLabel="Dato"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Select
                    value={r.subjectValue}
                    onChange={(v) => patch(i, { subjectValue: v })}
                    options={[...subjects.map((s) => ({ value: s.id, label: s.short })), { value: 'new', label: 'Nytt fag…' }]}
                    className="w-full sm:w-48"
                    ariaLabel="Fag"
                  />
                  {r.subjectValue === 'new' && (
                    <input
                      type="text"
                      value={r.newName}
                      onChange={(e) => patch(i, { newName: e.target.value })}
                      placeholder="Navn på nytt fag"
                      className={`${inputCls} min-w-0 w-full sm:flex-1`}
                    />
                  )}
                  {r.kind === 'lecture' && (
                    <input
                      type="text"
                      value={r.room ?? ''}
                      onChange={(e) => patch(i, { room: e.target.value })}
                      placeholder="Rom"
                      className={`${inputCls} min-w-0 w-full sm:min-w-28 sm:flex-1`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="button" onClick={confirm} className="btn-primary" disabled={review.importable.size === 0}>Importer {review.importable.size} nye</button>
          </div>
        </div>
      )
}

function analyzeRows(rows, data) {
  const counts = { lecture: 0, reading: 0, assignment: 0, exam: 0 }
  const invalid = new Set()
  const duplicates = new Set()
  const importable = new Set()
  const seen = new Set()
  rows.forEach((row, i) => {
    if (!row.include) return
    counts[row.kind]++
    if (!row.title.trim() || !row.date || (row.subjectValue === 'new' && !row.newName.trim())) {
      invalid.add(i)
      return
    }
    const subject = row.subjectValue === 'new' ? `new:${row.newName.trim().toLowerCase()}` : row.subjectValue
    const period = row.kind === 'reading' ? isoWeek(new Date(`${row.date}T00:00:00`)) : row.date
    const key = `${row.kind}|${subject}|${row.title.trim().toLowerCase()}|${period}|${row.kind === 'lecture' ? row.time : ''}`
    const existing = row.subjectValue !== 'new' && (
      row.kind === 'exam' ? data.exams.some((x) => x.subjectId === subject && (x.title ?? '').trim().toLowerCase() === row.title.trim().toLowerCase() && x.date === row.date) :
      row.kind === 'lecture' ? data.lectures.some((x) => x.subjectId === subject && (x.topic ?? '').trim().toLowerCase() === row.title.trim().toLowerCase() && x.date === row.date && x.start === (row.time || '10:00')) :
      row.kind === 'reading' ? data.readings.some((x) => x.subjectId === subject && (x.title ?? '').trim().toLowerCase() === row.title.trim().toLowerCase() && x.week === period) :
      data.assignments.some((x) => x.subjectId === subject && (x.title ?? '').trim().toLowerCase() === row.title.trim().toLowerCase() && x.deadline === row.date)
    )
    if (existing || seen.has(key)) duplicates.add(i)
    else {
      seen.add(key)
      importable.add(i)
    }
  })
  return { counts, invalid, duplicates, importable }
}
