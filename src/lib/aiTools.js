export function buildAiRequest(tool, text, context = {}) {
  return {
    tool,
    text: text.trim().slice(0, 20_000),
    context: Object.fromEntries(
      ['subject', 'assignment']
        .filter((key) => context[key]?.trim())
        .map((key) => [key, context[key].trim().slice(0, 200)]),
    ),
  }
}
