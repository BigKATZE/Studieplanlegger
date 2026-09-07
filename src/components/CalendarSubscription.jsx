import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'

const kinds = { lectures: 'Forelesninger', assignments: 'Arbeidskrav (frister)', exams: 'Eksamener', reviews: 'Repetisjoner' }

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke('calendar-subscription', { body })
  if (error) {
    let message = 'Kunne ikke kontakte kalendertjenesten. Prøv igjen.'
    try {
      const details = await error.context?.json()
      if (typeof details?.error === 'string') message = details.error
    } catch { /* HTTP errors do not always contain JSON. */ }
    throw new Error(message)
  }
  return data
}

export default function CalendarSubscription({ subjects, user, syncStatus }) {
  const signedIn = Boolean(user && !user.is_anonymous)
  const [subjectIds, setSubjectIds] = useState(() => subjects.map((subject) => subject.id))
  const [types, setTypes] = useState(Object.keys(kinds))
  const [subscriptions, setSubscriptions] = useState(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [confirmId, setConfirmId] = useState(null)
  const [copyStatus, setCopyStatus] = useState('')
  const input = useRef(null)
  const generation = useRef(0)
  const pending = useRef(false)
  const selectedIds = subjectIds.filter((id) => subjects.some((subject) => subject.id === id))

  useEffect(() => {
    const current = ++generation.current
    if (signedIn) {
      invoke({ action: 'list' }).then((data) => {
        if (!Array.isArray(data?.subscriptions)) throw new Error('Ugyldig svar fra kalendertjenesten. Prøv igjen.')
        if (generation.current === current) { setSubscriptions(data.subscriptions); setError('') }
      }).catch((err) => { if (generation.current === current) setError(err.message) })
    }
    return () => { generation.current = current + 1 }
  }, [signedIn, retry])

  async function change(action, id) {
    if (pending.current || !signedIn || subscriptions === null) return
    if (action === 'create' && (syncStatus !== 'saved' || subscriptions.length || !selectedIds.length || !types.length)) return
    const current = generation.current
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const data = await invoke(action === 'create' ? { action, subjectIds: selectedIds, types } : { action, id })
      if (generation.current !== current) return
      if (action === 'create') {
        if (!data?.subscription?.id || typeof data.token !== 'string' || !data.token) throw new Error('Kunne ikke lese abonnementet. Lukk og åpne eksport for å kontrollere status før du prøver igjen.')
        setSubscriptions([data.subscription])
        setUrl(`${supabaseUrl}/functions/v1/calendar-subscription?token=${encodeURIComponent(data.token)}`)
      } else {
        if (data?.ok !== true) throw new Error('Kunne ikke deaktivere abonnementet. Prøv igjen.')
        setSubscriptions((previous) => previous.filter((subscription) => subscription.id !== id))
        setUrl('')
        setCopyStatus('')
        setConfirmId(null)
      }
    } catch (err) {
      if (generation.current === current) setError(err.message)
    } finally {
      if (generation.current === current) { pending.current = false; setBusy(false) }
    }
  }

  async function copy() {
    const current = generation.current
    try {
      await navigator.clipboard.writeText(url)
      if (generation.current === current) setCopyStatus('Lenken er kopiert.')
    } catch {
      if (generation.current !== current) return
      input.current?.focus()
      input.current?.select()
      setCopyStatus('Kunne ikke kopiere automatisk. Marker lenken og kopier den manuelt.')
    }
  }

  if (!signedIn) return <p className="text-sm text-muted">Logg inn med en konto for å abonnere på kalenderen. Som gjest kan du fortsatt velge «Last ned kalenderfil» og eksportere planen din.</p>

  return <section aria-label="Kalenderabonnement" className="space-y-4 text-sm" aria-busy={busy}>
    <p className="text-muted">Abonnementet viser bare data som er lagret på kontoen. Kalenderappen henter oppdateringer med forsinkelse, ofte flere timer. Dette er enveis: endringer i kalenderappen endrer ikke studieplanen.</p>
    <p className="text-muted">Alle med den hemmelige lenken kan lese kalenderen uten innlogging. Kalenderleverandøren kan lagre kopier; de forsvinner ikke nødvendigvis når du deaktiverer lenken. Del den bare med en kalenderleverandør du stoler på.</p>
    {syncStatus !== 'saved' && <p className="text-warning">Planen er ikke ferdig synkronisert. Vent til den er lagret før du oppretter et abonnement. Du kan fortsatt se og deaktivere eksisterende abonnement.</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {subscriptions === null ? error
      ? <button type="button" className="btn-ghost min-h-11" onClick={() => { setError(''); setRetry((value) => value + 1) }}>Prøv igjen</button>
      : <p role="status">Henter abonnement…</p>
      : subscriptions.length ? <>
        {subscriptions.map((subscription) => <div key={subscription.id} className="space-y-3 border-t border-line pt-4">
          <h3 className="font-semibold">Aktivt kalenderabonnement</h3>
          <p>Opprettet: {new Date(subscription.created_at).toLocaleString('nb-NO')}</p>
          <p>Fag: {subscription.subject_ids.map((id) => subjects.find((subject) => subject.id === id)?.name || 'Fag som ikke lenger finnes i planen').join(', ')}</p>
          <p>Hendelser: {subscription.event_types.map((type) => kinds[type] || type).join(', ')}</p>
          {!url && <p className="text-muted">Den hemmelige lenken vises bare ved opprettelse og kan ikke hentes igjen. Hvis du har mistet den, deaktiver abonnementet og opprett et nytt.</p>}
          {confirmId === subscription.id ? <div className="space-y-3">
            <p>Deaktivere lenken? Kalenderappen kan ikke hente nye oppdateringer. Allerede lagrede kopier kan bli værende.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-danger min-h-11" disabled={busy} onClick={() => change('revoke', subscription.id)}>{busy ? 'Deaktiverer…' : 'Bekreft deaktivering'}</button>
              <button type="button" className="btn-ghost min-h-11" disabled={busy} onClick={() => setConfirmId(null)}>Avbryt</button>
            </div>
          </div> : <button type="button" className="btn-ghost min-h-11" disabled={busy} onClick={() => setConfirmId(subscription.id)}>Deaktiver abonnement</button>}
        </div>)}
        {url && <div className="space-y-3">
          <label className="block font-medium">Hemmelig kalenderlenke
            <input ref={input} type="text" readOnly value={url} autoComplete="off" spellCheck={false} onFocus={(event) => event.target.select()} className="mt-1 block min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base sm:text-sm" />
          </label>
          <p className="text-muted">Lenken vises bare nå, til du lukker eksportvinduet. Bytte mellom kalenderfil, abonnement og sikkerhetskopi beholder lenken. Kopier den og legg den til som kalenderabonnement fra URL i kalenderappen, ikke som filimport.</p>
          <button type="button" className="btn-ghost min-h-11" onClick={copy}>Kopier lenke</button>
          {copyStatus && <p role="status">{copyStatus}</p>}
        </div>}
      </> : <>
        <p>Ingen aktive abonnement. Du kan ha ett aktivt abonnement per konto.</p>
        <fieldset disabled={busy}>
          <legend className="font-semibold">Fag i abonnementet</legend>
          {subjects.map((subject) => <label key={subject.id} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={selectedIds.includes(subject.id)} onChange={(event) => setSubjectIds((previous) => event.target.checked ? [...previous, subject.id] : previous.filter((id) => id !== subject.id))} />{subject.name}
          </label>)}
        </fieldset>
        <fieldset disabled={busy}>
          <legend className="font-semibold">Hendelser i abonnementet</legend>
          {Object.entries(kinds).map(([type, label]) => <label key={type} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={types.includes(type)} onChange={(event) => setTypes((previous) => event.target.checked ? [...previous, type] : previous.filter((value) => value !== type))} />{label}
          </label>)}
        </fieldset>
        {(!selectedIds.length || !types.length) && <p className="text-warning">Velg minst ett fag og én hendelsestype.</p>}
        <button type="button" className="btn-primary min-h-11" disabled={busy || syncStatus !== 'saved' || !selectedIds.length || !types.length} onClick={() => change('create')}>{busy ? 'Oppretter…' : 'Opprett abonnement'}</button>
      </>}
    <p className="text-xs leading-relaxed text-muted">Fullførte hendelser er med som historikk. Semesterarkiv og notater er ikke med. Nye fag legges ikke til automatisk. For å endre utvalget må du deaktivere abonnementet og deretter opprette et nytt med en ny lenke.</p>
  </section>
}
