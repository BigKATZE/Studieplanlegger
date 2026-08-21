const clean = (value, max) => String(value ?? '').trim().slice(0, max)

export function extractSharedPlan(data, planId) {
  const plan = data?.workPlans?.find((item) => item?.id === planId)
  if (!plan) return null

  return {
    id: clean(plan.id, 36),
    title: clean(plan.title, 300),
    summary: clean(plan.summary, 2_000),
    requirements: Array.isArray(plan.requirements)
      ? plan.requirements.map((item) => clean(item, 500)).filter(Boolean).slice(0, 15)
      : [],
    clarifications: Array.isArray(plan.clarifications)
      ? plan.clarifications.map((item) => clean(item, 500)).filter(Boolean).slice(0, 10)
      : [],
    steps: Array.isArray(plan.steps)
      ? plan.steps
        .map((step) => ({
          id: clean(step?.id, 36),
          title: clean(step?.title, 300),
          description: clean(step?.description, 2_000),
          doneCriteria: clean(step?.doneCriteria, 1_000),
          estimatedMinutes: Number.isInteger(step?.estimatedMinutes)
            ? Math.max(0, Math.min(600, step.estimatedMinutes))
            : 0,
        }))
        .filter((step) => step.id && step.title)
        .slice(0, 30)
      : [],
  }
}
