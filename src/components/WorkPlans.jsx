export default function WorkPlans({ plans, subjects, onToggle, onRemove, onShare, canShare, hideCompleted = false }) {
  const names = Object.fromEntries(subjects.map((subject) => [subject.id, subject.short || subject.name || subject.code]))
  if (!plans.length) return null

  return (
    <section className="mt-6" aria-labelledby="workplans-heading">
      <h2 id="workplans-heading" className="font-display text-lg font-semibold">Lagrede arbeidsplaner</h2>
      <div className="mt-3 space-y-3">
        {plans.map((plan) => {
          const visibleSteps = hideCompleted ? plan.steps.filter((step) => !step.completed) : plan.steps
          return (
            <article key={plan.id} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{plan.title}</h3>
                  <p className="text-xs text-muted">{names[plan.subjectId] || 'Uten fag'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onRemove(plan.id)} className="btn-ghost !min-h-8 !px-2 !py-1 text-xs">Slett</button>
                  {canShare && <button onClick={() => onShare(plan)} className="btn-ghost !min-h-8 !px-2 !py-1 text-xs">Del</button>}
                </div>
              </div>
              {plan.summary && <p className="mt-2 text-sm text-muted">{plan.summary}</p>}
              {visibleSteps.length > 0 ? (
                <ol className="mt-3 space-y-2">
                  {visibleSteps.map((step) => {
                    const index = plan.steps.findIndex((item) => item.id === step.id)
                    return (
                      <li key={step.id} className="flex gap-2 text-sm">
                        <input type="checkbox" checked={step.completed} onChange={() => onToggle(plan.id, step.id)} aria-label={`Fullfør ${step.title}`} />
                        <span className={step.completed ? 'line-through text-muted' : ''}>{index + 1}. {step.title}</span>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  {hideCompleted && plan.steps.some((step) => step.completed) ? 'Alle fullførte steg er skjult.' : 'Arbeidsplanen har ingen steg.'}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
