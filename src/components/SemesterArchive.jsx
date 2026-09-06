import { useCallback, useState } from 'react'
import { Modal } from './Modals'
import { hasSemesterContent, MAX_ARCHIVES } from '../lib/semesterArchive'
import { downloadFile } from '../lib/download'

const labels = { subjects: 'Fag', lectures: 'Forelesninger', readings: 'Pensum', assignments: 'Arbeidskrav', exams: 'Eksamener', reviews: 'Repetisjoner', weekTemplates: 'Ukemaler', workPlans: 'Arbeidsplaner', aiSources: 'AI-kilder', quizAttempts: 'Quizforsøk' }
const summary = (data) => `${data.subjects.length} fag · ${data.lectures.length} forelesninger · ${data.assignments.length} arbeidskrav · ${data.exams.length} eksamener`

function Contents({ data }) {
  return <div className="mt-4 space-y-5 border-t border-line pt-4">
    {Object.entries(labels).filter(([key]) => data[key]?.length).map(([key, label]) => <section key={key}>
      <h4 className="text-sm font-semibold">{label} ({data[key].length})</h4>
      <ul className="mt-2 space-y-3 text-sm">
        {data[key].map((item) => <li key={item.id} className="break-words">
          <p>{item.title || item.name || item.topic || item.question || 'Uten tittel'}</p>
          <p className="text-xs text-muted">{[item.date || item.deadline || item.nextReview, item.start || item.time, item.end && `– ${item.end}`, item.week && `Uke ${item.week}`, item.room, (item.done || item.status === 'done') && 'Fullført'].filter(Boolean).join(' · ')}</p>
          {item.chapters?.length > 0 && <p className="mt-1 text-xs text-muted">Kapitler: {item.chapters.map((chapter) => `${chapter.text}${chapter.done ? ' (lest)' : ''}`).join(', ')}</p>}
          {item.steps?.length > 0 && <ol className="mt-2 list-inside list-decimal text-xs text-muted">{item.steps.map((step) => <li key={step.id}>{step.title}{step.completed ? ' (fullført)' : ''}</li>)}</ol>}
        </li>)}
      </ul>
    </section>)}
    <p className="text-xs text-muted">Dette er en skrivebeskyttet oversikt. Last ned sikkerhetskopien for alle detaljer, eller gjenopprett semesteret for å jobbe videre.</p>
  </div>
}

export default function SemesterArchive({ data, onArchive, onRestore, onRemove, syncStatus }) {
  const [name, setName] = useState(() => `${new Date().getMonth() >= 6 ? 'Høst' : 'Vår'} ${new Date().getFullYear()}`)
  const [confirm, setConfirm] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const close = useCallback(() => { setConfirm(null); setError('') }, [])
  const archives = data.semesterArchives ?? []
  const selected = archives.find((item) => item.id === confirm?.id)
  const ask = (action) => { setError(''); setMessage(''); setConfirm(action) }
  const apply = () => {
    try {
      if (confirm.type === 'archive') onArchive(name)
      else if (confirm.type === 'restore') onRestore(confirm.id)
      else onRemove(confirm.id)
      setMessage(confirm.type === 'archive' ? 'Semesteret er arkivert. Den aktive planen er nå tom.' : confirm.type === 'restore' ? 'Semesteret er gjenopprettet som aktiv plan.' : 'Arkivet er slettet.')
      close()
    } catch (err) { setError(err.message) }
  }

  return <section className="mt-6" aria-labelledby="archive-title">
    <h2 id="archive-title" className="font-display text-2xl font-semibold">Semesterarkiv</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted">Bevar tidligere semestre uten at de fyller den aktive planen. Arkivet inkluderer også pensum, repetisjoner, arbeidsplaner og AI-kilder.</p>
    <p className="mt-2 text-xs text-muted">{syncStatus === 'local' ? 'Som gjest lagres arkivet bare i denne nettleseren. Last ned en sikkerhetskopi for ekstra trygghet.' : 'Arkivet følger kontoens vanlige synkronisering. Last ned en sikkerhetskopi for ekstra trygghet.'}</p>
    {['error', 'conflict'].includes(syncStatus) && <p role="alert" className="mt-3 text-sm text-warning">Arkivendringer er satt på vent fordi synkroniseringen feilet eller en annen enhet endret planen. Last ned en sikkerhetskopi under Importer før du oppdaterer siden.</p>}
    <form className="my-6 rounded-lg border border-line bg-surface p-5" onSubmit={(event) => { event.preventDefault(); ask({ type: 'archive' }) }}>
      <h3 className="font-semibold">Arkiver aktiv plan</h3>
      <p className="mt-1 text-sm text-muted">{summary(data)}. Hele den aktive planen flyttes, uansett dato.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-full text-sm font-medium sm:basis-0">Navn på semester<input className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <button type="submit" className="btn-primary" disabled={!name.trim() || !hasSemesterContent(data) || archives.length >= MAX_ARCHIVES}>Arkiver semester</button>
      </div>
      {!hasSemesterContent(data) && <p className="mt-3 text-xs text-muted">Den aktive planen er tom. Legg til innhold før du arkiverer.</p>}
      {archives.length >= MAX_ARCHIVES && <p className="mt-3 text-xs text-warning">Arkivet er fullt. Last ned og fjern et eldre semester for å frigjøre plass.</p>}
    </form>
    {message && <p role="status" className="mb-4 text-sm text-success">{message}</p>}
    {error && !confirm && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
    <h3 className="text-lg font-semibold">Lagrede semestre ({archives.length})</h3>
    {!archives.length && <p className="mt-3 text-sm text-muted">Ingen semestre er arkivert ennå.</p>}
    <div className="mt-3 space-y-3">
      {archives.map((archive) => <article key={archive.id} className="rounded-lg border border-line bg-surface p-5">
        <h3 className="break-words font-semibold">{archive.name}</h3>
        <p className="mt-1 text-xs text-muted">{summary(archive.data)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => ask({ type: 'restore', id: archive.id })}>Gjenopprett</button>
          <button type="button" className="btn-ghost" onClick={() => {
            try { downloadFile(JSON.stringify(archive.data, null, 2), `semester-${archive.createdAt.slice(0, 10).replace(/[^0-9-]/g, '') || 'arkiv'}.json`, 'application/json') }
            catch { setError('Kunne ikke laste ned sikkerhetskopien. Prøv igjen.') }
          }}>Last ned sikkerhetskopi</button>
          <button type="button" className="btn-ghost text-danger" onClick={() => ask({ type: 'delete', id: archive.id })}>Slett arkiv</button>
        </div>
        <details className="mt-4"><summary className="w-fit text-sm text-muted">Se innhold<span className="sr-only"> i {archive.name}</span></summary><Contents data={archive.data} /></details>
      </article>)}
    </div>
    {confirm && <Modal title={confirm.type === 'archive' ? 'Arkivere semesteret?' : confirm.type === 'restore' ? 'Gjenopprette semesteret?' : 'Slette arkivet permanent?'} onClose={close} solid>
      <p className="break-words text-sm">{confirm.type === 'archive' ? `Hele den aktive planen lagres som «${name.trim()}». Den aktive planen blir deretter tom, klar for neste semester.` : confirm.type === 'restore' ? `«${selected?.name ?? 'Semesteret'}» blir den aktive planen og tas ut av arkivet. Har du innhold i den aktive planen, arkiveres det automatisk først.` : `«${selected?.name ?? 'Semesteret'}» slettes fra arkivet. Dette kan ikke angres. Last ned en sikkerhetskopi først hvis du vil beholde innholdet.`}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className="btn-ghost" onClick={close}>Avbryt</button><button type="button" className={confirm.type === 'delete' ? 'btn-danger' : 'btn-primary'} onClick={apply}>{confirm.type === 'archive' ? 'Arkiver og start tom plan' : confirm.type === 'restore' ? 'Bekreft gjenoppretting' : 'Slett permanent'}</button></div>
    </Modal>}
  </section>
}
