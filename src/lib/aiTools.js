export function buildAiRequest(tool, text, context = {}, options = {}) {
  const count = Number(options.count)
  return {
    tool,
    text: text.trim().slice(0, 20_000),
    context: Object.fromEntries(
      ['subject', 'assignment']
        .filter((key) => context[key]?.trim())
        .map((key) => [key, context[key].trim().slice(0, 200)]),
    ),
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
