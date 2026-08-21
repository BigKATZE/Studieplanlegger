export function buildAiRequest(tool, text, context = {}, options = {}) {
  const count = Number(options.count)
  const timeBudgetHours = Number(options.timeBudgetHours)
  return {
    tool,
    text: text.trim().slice(0, 20_000),
    context: Object.fromEntries(
      ['subject', 'assignment']
        .filter((key) => context[key]?.trim())
        .map((key) => [key, context[key].trim().slice(0, 200)]),
    ),
    ...(tool === 'breakdown' ? {
      breakdown: {
        detail: ['compact', 'standard', 'detailed'].includes(options.detail) ? options.detail : 'standard',
        ...(Number.isInteger(timeBudgetHours) && timeBudgetHours >= 1 && timeBudgetHours <= 100 ? { timeBudgetHours } : {}),
      },
    } : {}),
    ...(tool === 'quiz' ? {
      quiz: {
        difficulty: ['easy', 'medium', 'hard'].includes(options.difficulty) ? options.difficulty : 'medium',
        count: Number.isInteger(count) && count >= 3 && count <= 15 ? count : 5,
        previousQuestions: (options.previousQuestions ?? [])
          .filter((question) => typeof question === 'string' && question.trim())
          .slice(-30)
          .map((question) => question.trim().slice(0, 500)),
      },
    } : {}),
  }
}

export function formatBreakdownPlan(result) {
  if (!result || !Array.isArray(result.steps)) return ''
  const lines = ['ARBEIDSPLAN']
  if (result.summary?.trim()) lines.push('', result.summary.trim())
  if (result.requirements?.length) {
    lines.push('', 'KRAV', ...result.requirements.map((item) => `- ${item}`))
  }
  lines.push('', 'DELOPPGAVER')
  result.steps.forEach((step, index) => {
    const estimate = Number.isFinite(step.estimatedMinutes) ? ` (${step.estimatedMinutes} min)` : ''
    lines.push(`${index + 1}. ${step.title}${estimate}`, step.description)
    if (step.doneCriteria) lines.push(`   Ferdig når: ${step.doneCriteria}`)
  })
  if (result.clarifications?.length) {
    lines.push('', 'AVKLAR FØR DU STARTER', ...result.clarifications.map((item) => `- ${item}`))
  }
  return lines.filter((line) => line !== undefined && line !== null).join('\n').trim()
}
