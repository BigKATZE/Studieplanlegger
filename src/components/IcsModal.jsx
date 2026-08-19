import { useState } from 'react'
import { Modal } from './Modals'
import { parseIcs, guessKind } from '../lib/ics'
import { matchSubject } from '../lib/parseSmartInput'
import { uid } from '../lib/store'
import { Select } from './ui'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

export default function IcsModal({ subjects, onImport, onClose }) {
  const [feedUrl, setFeedUrl] = useState('')
  const [state, setState] = useState('config') // config | loading | review
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

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
        return { key: uid(), include: true, kind, title: e.title, date: e.date, time: e.time, subjectValue: subj?.id ?? 'new', newName: '' }
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
      const res = await fetch(feedUrl.trim())
      if (!res.ok) throw new Error(`Feed svarte ${res.status}`)
      await loadText(await res.text())
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
    setError('')
    await loadText(await file.text())
  }

  const patch = (i, fields) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...fields } : row)))

  const confirm = () => {
    onImport(rows)
    onClose()
  }

  return (
    <Modal title="Importer iCal" onClose={onClose}>
      {state !== 'review' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Bruk Canvas-kalenderfeeden din i stedet for access token: Åpne Canvas → Konto → Kalender →
            «Kalenderfeed», og lim inn URL-en under – eller last ned .ics-filen og last den opp.
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
              accept=".ics,text/calendar"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ink"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Fant {rows.length} hendelser. Velg fag for hver rad – ukjente opprettes som nytt fag. Velg om det er
            forelesning, arbeidskrav eller eksamen.
          </p>
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
                  <Select
                    value={r.kind}
                    onChange={(v) => patch(i, { kind: v })}
                    options={[
                      { value: 'lecture', label: 'Forelesning' },
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
                  <input
                    type="date"
                    value={r.date}
                    onChange={(e) => patch(i, { date: e.target.value })}
                    className={`${inputCls} w-36`}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={r.subjectValue}
                    onChange={(v) => patch(i, { subjectValue: v })}
                    options={[...subjects.map((s) => ({ value: s.id, label: s.short })), { value: 'new', label: 'Nytt fag…' }]}
                    className="w-48"
                    ariaLabel="Fag"
                  />
                  {r.subjectValue === 'new' && (
                    <input
                      type="text"
                      value={r.newName}
                      onChange={(e) => patch(i, { newName: e.target.value })}
                      placeholder="Navn på nytt fag"
                      className={`${inputCls} flex-1`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="button" onClick={confirm} className="btn-primary">Importer valgte</button>
          </div>
        </div>
      )}
    </Modal>
  )
}