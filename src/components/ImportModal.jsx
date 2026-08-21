import { useState } from 'react'
import { Modal } from './Modals'
import { Select, DateField, TimeField } from './ui'
import { checkFile, validateFileMagic } from '../lib/upload'
import IcsImport from './IcsModal'
import { isValidBackupData, normalizePlannerData } from '../lib/store'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

function PdfImport({ subjects, onImport, onClose }) {
  const [rows, setRows] = useState([])
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const patch = (i, fields) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...fields } : row)))
  const remove = (i) => setRows((r) => r.filter((_, j) => j !== i))

  const handleFile = async (file) => {
    if (!file) return
    const err = checkFile(file, { maxBytes: 10 * 1024 * 1024, types: ['application/pdf'], extensions: ['pdf'] })
    if (err) {
      setError(err)
      return
    }
    const magicError = await validateFileMagic(file)
    if (magicError) { setError(magicError); return }
    setState('parsing')
    setError('')
    try {
      const { extractLecturesFromPdf } = await import('../lib/parsePdf')
      const { lectures, courseCode } = await extractLecturesFromPdf(file)
      if (lectures.length === 0) {
        setError('Fant ingen forelesninger i PDF-en. Formatet ser ikke ut til å være en TimeEdit-timeplan.')
        setState('idle')
        return
      }
      const match = courseCode && subjects.find((s) => s.code.replace(/\s/g, '') === courseCode)
      setSubjectId(match?.id ?? subjects[0]?.id ?? '')
      setRows(lectures)
      setFileName(file.name)
      setState('review')
    } catch (err) {
      console.error(err)
      setError('Kunne ikke lese PDF-en: ' + err.message)
      setState('idle')
    }
  }

  const confirm = () => {
    const kept = rows.map((r) => ({ subjectId, ...r }))
    if (kept.length === 0) return
    onImport(kept)
    onClose()
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Velg PDF-fil (TimeEdit-eksport)</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="file-input block w-full text-sm text-muted"
        />
      </label>

      {state === 'parsing' && <p className="text-sm text-muted">Leser PDF-en…</p>}
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {state === 'review' && (
        <>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Import til fag</span>
            <Select value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.short }))} ariaLabel="Import til fag" placeholder="Velg fag" />
          </div>

          <p className="text-xs text-muted">
            Fant {rows.length} forelesninger i «{fileName}». Gjennomgå og rett opp før lagring.
          </p>

          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper/60 p-2">
                <button
                  onClick={() => remove(i)}
                  className="rounded px-1 text-xs text-muted hover:bg-paper hover:text-danger"
                  aria-label="Fjern rad"
                >
                  ✕
                </button>
                <DateField
                  value={r.date}
                  onChange={(v) => patch(i, { date: v })}
                  className="w-28"
                  ariaLabel="Dato"
                />
                <TimeField
                  value={r.start}
                  onChange={(v) => patch(i, { start: v })}
                  className="w-20"
                  ariaLabel="Starttid"
                />
                <TimeField
                  value={r.end}
                  onChange={(v) => patch(i, { end: v })}
                  className="w-20"
                  ariaLabel="Sluttid"
                />
                <input
                  type="text"
                  value={r.room}
                  onChange={(e) => patch(i, { room: e.target.value })}
                  placeholder="Rom"
                  className={`${inputCls} w-24`}
                />
                <input
                  type="text"
                  value={r.lecturer}
                  onChange={(e) => patch(i, { lecturer: e.target.value })}
                  placeholder="Foreleser"
                  className={`${inputCls} min-w-32 flex-1`}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="button" onClick={confirm} className="btn-primary">
              Importer {rows.length} forelesninger
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function BackupTab({ data, onImport, onClose }) {
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [fileName, setFileName] = useState('')

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studieplanlegger-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (file) => {
    if (!file) return
    const sizeError = checkFile(file, { maxBytes: 5 * 1024 * 1024, types: ['application/json'], extensions: ['json'] })
    if (sizeError) { setError(sizeError); return }
    const magicError = await validateFileMagic(file)
    if (magicError) { setError(magicError); return }
    setError('')
    try {
      const text = await file.text()
      if (text.length > 5 * 1024 * 1024) { setError('Filen er for stor. Maks 5 MB.'); return }
      const raw = JSON.parse(text)
      if (!isValidBackupData(raw)) {
        setError('Ugyldig fil. Dette ser ikke ut til å være en eksportert sikkerhetskopi.')
        return
      }
      const parsed = normalizePlannerData(raw)
      setFileName(file.name)
      setConfirm(parsed)
    } catch {
      setError('Kunne ikke lese filen. Sjekk at den er gyldig JSON.')
    }
  }

  const counts = confirm && {
    subjects: confirm.subjects.length,
    lectures: confirm.lectures.length,
    readings: confirm.readings.length,
    assignments: confirm.assignments.length,
    exams: confirm.exams.length,
    reviews: confirm.reviews.length,
    weekTemplates: confirm.weekTemplates.length,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-ink">Eksporter alt innhold som en JSON-fil.</p>
          <p className="text-xs text-muted">Nyttig som sikkerhetskopi eller for å flytte mellom nettlesere.</p>
        </div>
        <button type="button" onClick={exportJson} className="btn-ghost">Eksporter data</button>
      </div>

      <div className="border-t border-line pt-4">
        <span className="mb-1 block text-xs font-medium text-muted">Importer sikkerhetskopi</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="file-input block w-full text-sm text-muted"
        />
        <p className="mt-1 text-xs text-muted">Importering erstatter alt nåværende innhold.</p>
      </div>

      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {confirm && (
        <div className="rounded-md border border-line bg-paper/60 p-3 text-sm">
          <p className="text-ink">
            «{fileName}» inneholder {counts.subjects} fag, {counts.lectures} forelesninger, {counts.readings} pensum,{' '}
            {counts.assignments} arbeidskrav, {counts.exams} eksamener, {counts.reviews} repetisjoner og {counts.weekTemplates} ukemaler.
          </p>
          <p className="mt-1 text-xs text-muted">Erstatte alt nåværende innhold med dette?</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="btn-ghost">Avbryt</button>
            <button
              type="button"
              onClick={() => {
                onImport(confirm)
                onClose()
              }}
              className="btn-primary"
            >
              Erstatt og importer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ImportModal({ subjects, data, onImportPdf, onImportIcs, onImportBackup, onClose }) {
  const [mode, setMode] = useState('pdf')
  return (
    <Modal title="Importer" onClose={onClose}>
      <div className="mb-4 grid grid-cols-1 gap-1 rounded-lg border border-line bg-paper p-1 sm:grid-cols-3">
        {[
          ['pdf', 'Timeplan (PDF)'],
          ['ical', 'iCal'],
          ['backup', 'Sikkerhetskopi'],
        ].map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`min-h-10 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? 'bg-primary text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'pdf' ? (
        <PdfImport subjects={subjects} onImport={onImportPdf} onClose={onClose} />
      ) : mode === 'ical' ? (
        <IcsImport subjects={subjects} data={data} onImport={onImportIcs} onClose={onClose} />
      ) : (
        <BackupTab data={data} onImport={onImportBackup} onClose={onClose} />
      )}
    </Modal>
  )
}
