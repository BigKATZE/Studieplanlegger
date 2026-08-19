import { useState } from 'react'
import { Modal } from './Modals'
import { Select, DateField, TimeField } from './ui'
import { checkFile } from '../lib/upload'
import IcsImport from './IcsModal'

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
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ink"
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

export default function ImportModal({ subjects, onImportPdf, onImportIcs, onClose }) {
  const [mode, setMode] = useState('pdf')
  return (
    <Modal title="Importer" onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-lg border border-line bg-paper p-1">
        {[
          ['pdf', 'Timeplan (PDF)'],
          ['ical', 'iCal'],
        ].map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? 'bg-primary text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'pdf' ? (
        <PdfImport subjects={subjects} onImport={onImportPdf} onClose={onClose} />
      ) : (
        <IcsImport subjects={subjects} onImport={onImportIcs} onClose={onClose} />
      )}
    </Modal>
  )
}