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
        weakQuestions: (options.weakQuestions ?? []).filter((question) => typeof question === 'string' && question.trim()).slice(-12).map((question) => question.trim().slice(0, 500)),
      },
    } : {}),
    ...(tool === 'feedback' ? { feedback: { question: String(options.question ?? '').trim().slice(0, 2000), expectedAnswer: String(options.expectedAnswer ?? '').trim().slice(0, 2000), userAnswer: String(options.userAnswer ?? '').trim().slice(0, 4000) } } : {}),
    ...(tool === 'summary' ? { summary: {} } : {}),
    ...(tool === 'source-search' ? { search: { query: String(options.query ?? text).trim().slice(0, 1000), passages: (options.passages ?? []).slice(0, 30).map((p) => ({ id: String(p.id).slice(0, 128), sourceId: String(p.sourceId).slice(0, 128), sourceTitle: String(p.sourceTitle).slice(0, 300), index: Number(p.index) || 1, text: String(p.text).slice(0, 1600) })) } } : {}),
    ...(tool === 'source-chat' ? { chat: { query: String(options.query ?? text).trim().slice(0, 1000), passages: (options.passages ?? []).slice(0, 30).map((p) => ({ id: String(p.id).slice(0, 128), sourceId: String(p.sourceId).slice(0, 128), sourceTitle: String(p.sourceTitle).slice(0, 300), index: Number(p.index) || 1, text: String(p.text).slice(0, 1600) })), history: (options.history ?? []).slice(-10).map((entry) => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: String(entry.content ?? '').trim().slice(0, 1000) })).filter((entry) => entry.content) } } : {}),
    ...(tool === 'weekly-report' ? { weekly: { snapshot: options.snapshot ?? {} } } : {}),
    ...(tool === 'exam' ? { exam: { count: Number.isInteger(Number(options.count)) ? Math.min(15, Math.max(3, Number(options.count))) : 5, minutes: Number.isInteger(Number(options.minutes)) ? Math.min(180, Math.max(5, Number(options.minutes))) : 30, difficulty: ['easy', 'medium', 'hard'].includes(options.difficulty) ? options.difficulty : 'medium' } } : {}),
    ...(tool === 'exam-feedback' ? { examFeedback: { questions: (options.questions ?? []).slice(0, 15).map((item) => ({ question: String(item.question).slice(0, 2000), expectedAnswer: String(item.expectedAnswer).slice(0, 2000), userAnswer: String(item.userAnswer).slice(0, 4000) })) } } : {}),
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

export function splitSourcePassages(source, chunkSize = 1200, overlap = 200) {
  const text = String(source?.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return []
  const chunks = []
  const effectiveOverlap = Math.min(overlap, chunkSize - 1)
  const step = chunkSize - effectiveOverlap
  // ponytail: overlap 200 bevarer setningsgrenser, ~20% ekstra chunks – erstatt med embeddings hvis semantisk søk trengs
  for (let start = 0, index = 0; start < text.length; start += step, index++) {
    chunks.push({ id: `${source.id}:${index + 1}`, sourceId: source.id, sourceTitle: source.title, index: index + 1, text: text.slice(start, start + chunkSize) })
  }
  return chunks
}

const STOPWORDS = new Set(['det','som','til','den','for','med','har','ble','fra','ved','hun','han','jeg','deg','seg','var','mer','kun','også','eller','men','ikke','over','under','etter','før','mot','mellom','gjennom','hvor','hva','hvem','hvilken','hvilket','dette','disse','være','vært','blitt','blir','hadde','kunne','skulle','ville','måtte'])

export function rankSourcePassages(sources, subjectId, query, maxChars = 12_000) {
  const rawTerms = String(query).toLocaleLowerCase('nb-NO').match(/[\p{L}\p{N}]{3,}/gu) ?? []
  const terms = rawTerms.filter((term) => !STOPWORDS.has(term))
  const ranked = (sources ?? [])
    .filter((source) => source.subjectId === subjectId)
    .flatMap((source) => splitSourcePassages(source))
    .map((passage) => ({
      ...passage,
      score: terms.reduce((score, term) => score + (passage.text.toLocaleLowerCase('nb-NO').split(term).length - 1), 0),
    }))
    .filter((passage) => passage.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  const selected = []; let used = 0
  for (const passage of ranked) { if (used + passage.text.length > maxChars) continue; selected.push(passage); used += passage.text.length }
  return selected
}

export function buildWeeklySnapshot(data, now = new Date()) {
  const localIso = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const upcomingEnd = new Date(now)
  upcomingEnd.setHours(0, 0, 0, 0)
  upcomingEnd.setDate(upcomingEnd.getDate() + 7)
  const today = localIso(now)
  const from = localIso(start)
  const to = localIso(end)
  const upcomingTo = localIso(upcomingEnd)
  const safe = (item, date) => ({ title: String(item.title ?? item.topic ?? '').slice(0, 200), date })
  const assignments = data.assignments ?? []
  const reviews = data.reviews ?? []
  return {
    week: { from, to },
    completedThisWeek: [
      ...assignments.filter((item) => item.status === 'done' && item.completedAt?.slice(0, 10) >= from && item.completedAt.slice(0, 10) <= to).map((item) => safe(item, item.completedAt.slice(0, 10))),
      ...(data.lectures ?? []).filter((item) => item.done && item.completedAt?.slice(0, 10) >= from && item.completedAt.slice(0, 10) <= to).map((item) => safe(item, item.completedAt.slice(0, 10))),
    ].slice(0, 50),
    overdueIncomplete: [...assignments.filter((x) => x.status !== 'done' && x.deadline < today).map((x) => safe(x, x.deadline)), ...reviews.filter((x) => x.nextReview < today).map((x) => safe(x, x.nextReview))].slice(0, 50),
    upcomingDeadlines: [
      ...assignments.filter((x) => x.status !== 'done' && x.deadline >= today && x.deadline <= upcomingTo).map((x) => safe(x, x.deadline)),
      ...(data.exams ?? []).filter((x) => x.date >= today && x.date <= upcomingTo).map((x) => safe(x, x.date)),
      ...reviews.filter((x) => x.nextReview >= today && x.nextReview <= upcomingTo).map((x) => safe(x, x.nextReview)),
    ].slice(0, 50),
  }
}
