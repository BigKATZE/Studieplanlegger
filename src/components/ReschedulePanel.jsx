import { useState } from 'react'
import { proposeReschedules } from '../lib/plannerFeatures'

export default function ReschedulePanel({ data, onApply }) {
  const [dismissed, setDismissed] = useState(() => new Set())
  const all = proposeReschedules(data)
  const suggestions = all.filter((item) => !dismissed.has(`${item.type}-${item.id}`))
  if (!suggestions.length) return null
  const dismissOne = (item) => setDismissed((prev) => new Set([...prev, `${item.type}-${item.id}`]))
  return <section className="animate-enter mt-6 rounded-lg border border-warning/20 bg-surface p-5 card-lift" aria-labelledby="reschedule-heading">
    <h2 id="reschedule-heading" className="font-display text-lg font-semibold">Forslag til ny dato</h2>
    <p className="mt-1 text-sm text-muted">Ingenting flyttes før du godkjenner et forslag.</p>
    <ul className="mt-3 space-y-2">{suggestions.map((item) => <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-paper p-3 text-sm"><span>{item.title}: <span className="text-muted">{item.from} → {item.to}</span></span><div className="flex gap-1"><button type="button" className="btn-ghost !min-h-8 !px-2 !py-1 text-xs" onClick={() => onApply([item])}>Bruk</button><button type="button" aria-label={`Avvis ${item.title}`} className="btn-ghost !min-h-8 !px-2 !py-1 text-xs text-muted" onClick={() => dismissOne(item)}>Avvis</button></div></li>)}</ul>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="btn-primary" onClick={() => onApply(suggestions)}>Bruk alle forslag</button>
      <button type="button" className="btn-ghost text-xs" onClick={() => setDismissed(new Set(all.map((item) => `${item.type}-${item.id}`)))}>Avvis alle</button>
    </div>
  </section>
}
