import { useState } from 'react'
import { Modal } from './Modals'
import { Select } from './ui'
import { exportCalendar } from '../lib/calendarExport'
import { downloadFile } from '../lib/download'
import CalendarSubscription from './CalendarSubscription'

const kinds = { lectures: 'Forelesninger', assignments: 'Arbeidskrav (frister)', exams: 'Eksamener', reviews: 'Repetisjoner' }
const fieldClass = 'mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm'

export default function ExportModal({ data, onClose, user, syncStatus }) {
  const [mode, setMode] = useState('calendar')
  const [calendarMode, setCalendarMode] = useState('file')
  const [subscriptionOpened, setSubscriptionOpened] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [types, setTypes] = useState(Object.keys(kinds))
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  let result
  let error = ''
  try { result = exportCalendar(data, { subjectId, from, to, types, includeCompleted }) } catch (err) { error = err.message }

  const download = () => {
    try {
      if (mode === 'backup') {
        downloadFile(JSON.stringify(data, null, 2), `studieplanlegger-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
      } else {
        downloadFile(result.text, 'studieplanlegger.ics', 'text/calendar;charset=utf-8')
      }
      setDownloaded(true)
      setDownloadError('')
    } catch { setDownloadError('Kunne ikke laste ned filen. Prøv igjen.') }
  }

  return (
    <Modal title="Eksporter" onClose={onClose} solid>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-line bg-paper p-1">
        {[['calendar', 'Kalender'], ['backup', 'Sikkerhetskopi']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value}
            onClick={() => { setMode(value); setDownloaded(false); setDownloadError('') }}
            className={`min-h-11 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === value ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'calendar' && <fieldset className="mb-4">
        <legend className="text-sm font-semibold">Kalendermodus</legend>
        {[['file', 'Last ned kalenderfil'], ['subscription', 'Abonner på kalender']].map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="calendar-mode" value={value} checked={calendarMode === value} onChange={() => { setCalendarMode(value); if (value === 'subscription') setSubscriptionOpened(true) }} />{label}
          </label>
        ))}
      </fieldset>}
      {/* Keep the one-time URL in memory across all mode switches until this dialog closes. */}
      <div hidden={mode !== 'calendar' || calendarMode !== 'subscription'}>
        {subscriptionOpened && <CalendarSubscription subjects={data.subjects} user={user} syncStatus={syncStatus} />}
        <div className="mt-5 flex justify-end"><button type="button" className="btn-ghost min-h-11" onClick={onClose}>Lukk eksport</button></div>
      </div>
      <div hidden={mode === 'calendar' && calendarMode === 'subscription'} className="space-y-5" onChange={() => setDownloaded(false)}>
        {mode === 'calendar' ? <>
        <p className="text-sm text-muted">Last ned en .ics-fil som du kan importere i kalenderappen din. Dette er en kopi, ikke automatisk synkronisering.</p>
        <div className="text-sm font-medium">Fag
          <Select className="mt-1" ariaLabel="Fag" value={subjectId}
            onChange={(value) => { setSubjectId(value); setDownloaded(false) }}
            options={[{ value: '', label: 'Alle fag' }, ...data.subjects.map((subject) => ({ value: subject.id, label: subject.short || subject.name }))]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-medium">Fra dato (valgfritt)<input className={fieldClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="min-w-0 text-sm font-medium">Til dato (valgfritt)<input className={fieldClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Ta med</legend>
          {Object.entries(kinds).map(([key, label]) => <label key={key} className="flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" checked={types.includes(key)} onChange={(event) => setTypes((prev) => event.target.checked ? [...prev, key] : prev.filter((type) => type !== key))} />{label}</label>)}
          <label className="flex min-h-8 items-center gap-2 border-t border-line pt-3 text-sm"><input type="checkbox" checked={includeCompleted} onChange={(event) => setIncludeCompleted(event.target.checked)} />Ta også med fullførte elementer</label>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted">Klokkeslett tolkes som norsk tid (Europe/Oslo). Uten klokkeslett brukes hele dagen. Pensum og arbeidssteg uten dato tas ikke med. Notater og AI-kilder eksporteres ikke.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {result && <p aria-live="polite" className="text-sm">{result.count} {result.count === 1 ? 'hendelse klar' : 'hendelser klare'} for eksport.{result.skipped > 0 && <span className="block text-warning">{result.skipped} elementer ble utelatt fordi dato eller klokkeslett mangler eller er ugyldig.</span>}</p>}
        {downloaded && <p role="status" className="text-sm text-success">Kalenderfilen er klargjort for nedlasting. Importer den i kalenderappen din. Gjentatt import kan gi duplikater.</p>}
        </> : <>
          <p className="text-sm text-muted">Last ned alt innhold som en JSON-fil, inkludert semesterarkivet, notater og AI-kilder. Bruk filen som sikkerhetskopi eller for å flytte planen til en annen nettleser.</p>
          <p className="text-sm text-muted">Gjenopprett filen under Importer → Sikkerhetskopi. Oppbevar den trygt, siden den inneholder dine personlige studiedata.</p>
          {downloaded && <p role="status" className="text-sm text-success">Sikkerhetskopien er klargjort for nedlasting.</p>}
        </>}
        {downloadError && <p role="alert" className="text-sm text-danger">{downloadError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Lukk eksport</button>
          <button type="button" className="btn-primary" disabled={mode === 'calendar' && (!result?.count || Boolean(error))} onClick={download}>{mode === 'calendar' ? 'Last ned .ics' : 'Last ned sikkerhetskopi'}</button>
        </div>
      </div>
    </Modal>
  )
}
