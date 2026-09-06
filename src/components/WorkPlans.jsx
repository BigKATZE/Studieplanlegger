export default function WorkPlans({ plans, subjects, onToggle, onRemove, onShare, canShare, hideCompleted = false }) {
  const names = Object.fromEntries(subjects.map((subject) => [subject.id, subject.short || subject.name || subject.code]))
  if (!plans.length) return null

  return (
    <section className="mt-6" aria-labelledby="workplans-heading">
      <h2 id="workplans-heading" className="font-display text-lg font-semibold">Lagrede arbeidsplaner</h2>
      <div className="mt-3 space-y-3">
        {plans.map((plan) => {
          const visibleSteps = hideCompleted ? plan.steps.filter((step) => !step.completed) : plan.steps
          const completed = plan.steps.filter((step) => step.completed).length
          const remainingMinutes = plan.steps.reduce((total, step) => total + (step.completed ? 0 : step.estimatedMinutes || 0), 0)
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
              {plan.steps.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap justify-between gap-1 text-xs text-muted">
                    <span>{completed} av {plan.steps.length} steg fullført</span>
                    {remainingMinutes > 0 && <span>Ca. {remainingMinutes} min gjenstår</span>}
                  </div>
                  <div role="progressbar" aria-label={`Fremdrift: ${plan.title}`} aria-valuemin={0} aria-valuemax={plan.steps.length} aria-valuenow={completed} className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                    <div className="work-plan-progress h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${completed / plan.steps.length})` }} />
                  </div>
                </div>
              )}
              {visibleSteps.length > 0 ? (
                <ol className="mt-3 space-y-2">
                  {visibleSteps.map((step) => {
                    const index = plan.steps.findIndex((item) => item.id === step.id)
                    return (
                      <li key={step.id} className="border-b border-line/60 pb-2 text-sm last:border-0 last:pb-0">
                        <label className="completion-row flex min-h-9 items-center gap-2">
                          <input className="h-4 w-4 shrink-0 accent-primary" type="checkbox" checked={step.completed} onChange={() => onToggle(plan.id, step.id)} aria-label={`Fullfør ${step.title}`} />
                          <span className={step.completed ? 'line-through text-muted' : ''}>{index + 1}. {step.title}</span>
                        </label>
                        {(step.description || step.doneCriteria || step.estimatedMinutes > 0) && (
                          <details className="step-disclosure ml-6">
                            <summary className="w-fit cursor-pointer py-1 text-xs text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Stegdetaljer<span className="sr-only">: {step.title}</span></summary>
                            <div className="step-details space-y-2 py-2 text-muted">
                              {step.description && <p className="whitespace-pre-wrap break-words">{step.description}</p>}
                              {step.doneCriteria && <p className="whitespace-pre-wrap break-words"><span className="font-medium text-ink">Ferdig når: </span>{step.doneCriteria}</p>}
                              {step.estimatedMinutes > 0 && <p className="text-xs">Estimert tid: {step.estimatedMinutes} min</p>}
                            </div>
                          </details>
                        )}
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
