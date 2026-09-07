import { useState } from 'react'
import { fmtShort, isoWeek } from '../lib/date'
import { weeklyWorkload } from '../lib/plannerFeatures'
import { normalizeMinutes } from '../lib/store'

export default function WeeklyWorkload({ data, onBudgetChange }) {
  const [date, setDate] = useState(() => new Date())
  const [budgetDraft, setBudgetDraft] = useState(null)
  const [error, setError] = useState('')
  const workload = weeklyWorkload(data, date)
  const budget = budgetDraft ?? (workload.budgetMinutes == null ? '' : String(workload.budgetMinutes))
  const moveWeek = (days) => setDate((current) => {
    const next = new Date(current)
    next.setDate(next.getDate() + days)
    return next
  })
  const submit = (event) => {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    const minutes = budget === '' ? null : normalizeMinutes(Number(budget))
    if (budget !== '' && minutes === null) { setError('Bruk et helt antall minutter fra 0 til 10080.'); return }
    try {
      onBudgetChange(minutes)
      setBudgetDraft(null)
      setError('')
    } catch {
      setError('Kunne ikke lagre budsjettet. Prøv igjen.')
    }
  }

  return (
    <section aria-labelledby="weekly-workload-heading" className="mt-8 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="weekly-workload-heading" className="font-display text-lg font-semibold">Ukebelastning</h2>
          <p className="mt-1 text-sm text-muted" aria-live="polite">Uke {isoWeek(date)} · {fmtShort(new Date(`${workload.from}T12:00:00`))} – {fmtShort(new Date(`${workload.to}T12:00:00`))}</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto" role="group" aria-label="Velg uke for ukebelastning">
          <button type="button" className="btn-ghost min-h-11 px-2" onClick={() => moveWeek(-7)}>Forrige uke</button>
          <button type="button" className="btn-ghost min-h-11 px-2" onClick={() => setDate(new Date())}>Denne uken</button>
          <button type="button" className="btn-ghost min-h-11 px-2" onClick={() => moveWeek(7)}>Neste uke</button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 text-sm font-medium">Ukentlig selvstudiebudsjett (minutter)
          <input type="number" min="0" max="10080" step="1" value={budget} onChange={(event) => { setBudgetDraft(event.target.value); setError('') }} placeholder="Ikke angitt" aria-describedby="weekly-budget-help" className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" />
        </label>
        <button type="submit" className="btn-primary min-h-11">Lagre ukebudsjett</button>
      </form>
      <p id="weekly-budget-help" className="mt-2 text-xs text-muted">Samme budsjett hver uke, uten forelesningstid. Tøm feltet og lagre for å fjerne budsjettet.</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-5 border-t border-line pt-4" aria-live="polite">
        <p className="font-medium tabular-nums">{workload.minutes} min estimert for ufullførte oppgaver{workload.budgetMinutes !== null && ` / ${workload.budgetMinutes} min budsjett`}</p>
        <p className={`mt-1 text-sm ${workload.availableMinutes < 0 ? 'text-warning' : 'text-muted'}`}>
          {workload.availableMinutes === null ? 'Sett et budsjett for å sammenligne med estimatene.' : workload.availableMinutes < 0 ? `${-workload.availableMinutes} min over budsjettet, basert på oppgitte estimater.` : `${workload.availableMinutes} min tilgjengelig i budsjettet, basert på oppgitte estimater.`}
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt>Arbeidskrav ({workload.assignments.count})</dt><dd className="tabular-nums">{workload.assignments.minutes} min</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Pensum ({workload.readings.count})</dt><dd className="tabular-nums">{workload.readings.minutes} min</dd></div>
        </dl>
        {workload.missing > 0 && <p className="mt-3 text-sm text-warning">{workload.missing} oppgaver i valgt uke mangler tidsestimat. Belastningen kan være høyere.</p>}
        {workload.assignments.count + workload.readings.count === 0 && <p className="mt-3 text-sm text-muted">Ingen ufullførte oppgaver i valgt uke.</p>}
      </div>

      {(workload.overdue.count > 0 || workload.unplanned.count > 0) && (
        <div className="mt-4 border-t border-line pt-4 text-sm">
          <h3 className="font-semibold">Utenfor ukesummen</h3>
          {[[workload.overdue, 'Forfalte arbeidskrav utenfor valgt uke'], [workload.unplanned, 'Uten gyldig frist eller uke']].filter(([group]) => group.count > 0).map(([group, label]) => (
            <p key={label} className="mt-2 text-muted">{label}: {group.count} oppgaver, {group.minutes} min estimert.{group.missing > 0 && ` ${group.missing} mangler tidsestimat.`}</p>
          ))}
        </div>
      )}
      <details className="mt-4 text-xs text-muted">
        <summary className="w-fit cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Slik beregnes ukebelastningen</summary>
        <p className="mt-1 max-w-prose leading-relaxed">Arbeidskrav legges til kalenderuken med fristen, også når fristen er passert. Forfalte arbeidskrav utenfor valgt uke vises separat. Dette er estimater, ikke målt gjenstående tid. Hele pensumestimatet teller til oppgaven eller alle kapitlene er fullført. Fullførte oppgaver, forelesninger og arbeidsplansteg telles ikke.</p>
        <p className="mt-2 max-w-prose leading-relaxed">Pensum har ukenummer, men ikke år. Uke 34–53 tolkes som {workload.schoolYear}, og uke 1–33 som {workload.schoolYear + 1}, i gjeldende skoleår. Pensum vises derfor ikke på nytt når du blar til andre år. Eldre planer må arkiveres; årstilknytningen kan ikke utledes fra lagret pensum.</p>
      </details>
    </section>
  )
}
