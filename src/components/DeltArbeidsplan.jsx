import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function ListSection({ title, items }) {
  if (!items?.length) return null
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </section>
  )
}

function totalMinutes(steps) {
  return (steps ?? []).reduce((sum, step) => sum + (Number(step.estimatedMinutes) || 0), 0)
}

export default function DeltArbeidsplan({ token }) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let live = true
    supabase.functions.invoke('shared-plan', { body: { token } })
      .then(({ data, error }) => {
        if (!live) return
        setState(error || !data?.plan
          ? { error: data?.error || 'Kunne ikke åpne den delte planen.' }
          : { plan: data.plan })
      })
      .catch(() => live && setState({ error: 'Kunne ikke åpne den delte planen.' }))
    return () => { live = false }
  }, [token])

  const home = `${window.location.origin}${window.location.pathname}`
  if (state.loading) return <div className="p-8 text-muted">Laster delt arbeidsplan…</div>
  if (state.error || !state.plan) {
    return (
      <main className="mx-auto max-w-2xl p-5">
        <a href={home} className="text-sm text-secondary">Til studieplanleggeren</a>
        <p className="mt-6 text-danger">{state.error || 'Planen finnes ikke.'}</p>
      </main>
    )
  }

  const plan = state.plan
  const estimate = totalMinutes(plan.steps)
  return (
    <main className="mx-auto max-w-2xl p-5 sm:py-10">
      <header className="border-b border-line pb-5">
        <a href={home} className="text-sm text-secondary">Til studieplanleggeren</a>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Delt arbeidsplan</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{plan.title}</h1>
        {plan.summary && <p className="mt-3 text-muted">{plan.summary}</p>}
        {estimate > 0 && <p className="mt-3 text-sm font-medium">Estimert tid: {estimate} minutter</p>}
      </header>

      <ListSection title="Krav" items={plan.requirements} />
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">Steg</h2>
        <ol className="mt-3 space-y-3">
          {(plan.steps ?? []).map((step, index) => (
            <li key={step.id || index} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{index + 1}. {step.title}</span>
                {step.estimatedMinutes > 0 && <span className="text-xs text-muted">{step.estimatedMinutes} min</span>}
              </div>
              {step.description && <p className="mt-1 text-sm text-muted">{step.description}</p>}
              {step.doneCriteria && (
                <p className="mt-2 text-xs text-muted"><strong className="text-ink">Ferdig når:</strong> {step.doneCriteria}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <ListSection title="Avklar før start" items={plan.clarifications} />
      <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
        Dette er en skrivebeskyttet kopi. Fremdrift og private notater deles ikke.
      </p>
    </main>
  )
}
