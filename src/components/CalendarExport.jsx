import { useState } from 'react'
import { Modal } from './Modals'
import { exportCalendar } from '../lib/calendarExport'
import { downloadFile } from '../lib/download'

const kinds = { lectures: 'Forelesninger', assignments: 'Arbeidskrav (frister)', exams: 'Eksamener', reviews: 'Repetisjoner' }
const fieldClass = 'mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm'

export default function CalendarExport({ data, onClose }) {
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
      downloadFile(result.text, 'studieplanlegger.ics', 'text/calendar;charset=utf-8')
      setDownloaded(true)
      setDownloadError('')
    } catch { setDownloadError('Kunne ikke laste ned kalenderfilen. Prøv igjen.') }
  }

  return (
    <Modal title="Eksporter kalender" onClose={onClose} solid>
      <div className="space-y-5" onChange={() => setDownloaded(false)}>
        <p className="text-sm text-muted">Last ned en .ics-fil som du kan importere i kalenderappen din. Dette er en kopi, ikke automatisk synkronisering.</p>
        <label className="block text-sm font-medium">Fag
          <select className={fieldClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            <option value="">Alle fag</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.short || subject.name}</option>)}
          </select>
        </label>
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
        {downloadError && <p role="alert" className="text-sm text-danger">{downloadError}</p>}
        {result && <p aria-live="polite" className="text-sm">{result.count} {result.count === 1 ? 'hendelse klar' : 'hendelser klare'} for eksport.{result.skipped > 0 && <span className="block text-warning">{result.skipped} elementer ble utelatt fordi dato eller klokkeslett mangler eller er ugyldig.</span>}</p>}
        {downloaded && <p role="status" className="text-sm text-success">Kalenderfilen er klargjort for nedlasting. Importer den i kalenderappen din. Gjentatt import kan gi duplikater.</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Lukk eksport</button>
          <button type="button" className="btn-primary" disabled={!result?.count || Boolean(error)} onClick={download}>Last ned .ics</button>
        </div>
      </div>
    </Modal>
  )
}
