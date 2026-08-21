import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildAiRequest } from '../lib/aiTools'

const subjectLabel = (subject) => subject.code && subject.name && subject.code !== subject.name
  ? `${subject.code} – ${subject.name}`
  : subject.name || subject.short || subject.code

export default function AiTools({ data, enabled }) {
  const [tool, setTool] = useState('breakdown')
  const [text, setText] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState('5')
  const [avoidPrevious, setAvoidPrevious] = useState(true)
  const [previousQuestions, setPreviousQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const normalizedQuestionCount = Math.min(15, Math.max(3, Number(questionCount) || 5))

  const selectTool = (next) => {
    setTool(next)
    setText('')
    setResult(null)
    setError('')
  }

  const generate = async (event) => {
    event.preventDefault()
    if (text.trim().length < 20) {
      setError('Lim inn minst 20 tegn med faglig innhold.')
      return
    }
    const assignment = data.assignments.find((item) => item.id === assignmentId)
    const selectedSubjectId = tool === 'breakdown' ? assignment?.subjectId : subjectId
    const subject = data.subjects.find((item) => item.id === selectedSubjectId)
    setLoading(true)
    setError('')
    const { data: response, error: invokeError } = await supabase.functions.invoke('study-suggestions', {
      body: buildAiRequest(tool, text, {
        subject: subject && subjectLabel(subject),
        assignment: assignment?.title,
      }, {
        difficulty,
        count: normalizedQuestionCount,
        previousQuestions: avoidPrevious ? previousQuestions : [],
      }),
    })
    if (invokeError) {
      let message = 'Kunne ikke bruke AI-verktøyet akkurat nå.'
      try {
        const body = await invokeError.context.json()
        if (body.error) message = body.error
      } catch {
        // Keep the generic message when the function did not return JSON.
      }
      setError(message)
    } else {
      setResult(response)
      if (tool === 'quiz') {
        setPreviousQuestions((previous) => [...previous, ...response.questions.map((item) => item.question)].slice(-30))
      }
    }
    setLoading(false)
  }

  return (
    <section className="mt-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">AI-verktøy</h2>
        <p className="mt-1 text-sm text-muted">Innholdet brukes bare til å lage svaret og lagres ikke i studieplanen.</p>
      </div>

      <div className="mt-5 flex gap-1 rounded-lg border border-line bg-surface p-1 sm:w-fit">
        {[
          ['breakdown', 'Bryt ned arbeidskrav'],
          ['quiz', 'Lag øvingsspørsmål'],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => selectTool(value)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium sm:flex-none ${tool === value ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {!enabled ? (
        <p className="mt-5 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">Logg inn for å bruke AI-verktøyene.</p>
      ) : (
        <form onSubmit={generate} className="mt-5 rounded-lg border border-line bg-surface p-5">
          {tool === 'breakdown' ? (
            <>
              <label htmlFor="ai-assignment" className="block text-sm font-medium">Arbeidskrav <span className="font-normal text-muted">(valgfritt)</span></label>
              <select id="ai-assignment" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                <option value="">Ikke koble til et eksisterende arbeidskrav</option>
                {data.assignments.filter((item) => item.status !== 'done').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <label htmlFor="ai-source" className="mt-4 block text-sm font-medium">Oppgavetekst og vurderingskrav</label>
              <p className="mt-1 text-xs text-muted">Lim inn hele oppgaven for å få konkrete, avkryssbare deloppgaver.</p>
            </>
          ) : (
            <>
              <label htmlFor="ai-subject" className="block text-sm font-medium">Fag <span className="font-normal text-muted">(valgfritt)</span></label>
              <select id="ai-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                <option value="">Ikke velg fag</option>
                {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}
              </select>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="ai-difficulty" className="block text-sm font-medium">Vanskelighetsgrad</label>
                  <select id="ai-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                    <option value="easy">Lett</option>
                    <option value="medium">Middels</option>
                    <option value="hard">Vanskelig</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-question-count" className="block text-sm font-medium">Antall spørsmål</label>
                  <input id="ai-question-count" type="number" min="3" max="15" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} onBlur={() => setQuestionCount(String(normalizedQuestionCount))} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                </div>
                <div>
                  <span className="block text-sm font-medium">Tidligere spørsmål</span>
                  <button type="button" aria-pressed={avoidPrevious} onClick={() => setAvoidPrevious((value) => !value)} className={`mt-1 w-full rounded-md border px-3 py-2 text-sm font-medium ${avoidPrevious ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'}`}>
                    {avoidPrevious ? 'Ikke gjenta tidligere' : 'Tidligere kan gjentas'}
                  </button>
                </div>
              </div>
              {previousQuestions.length > 0 && <p className="mt-2 text-xs text-muted">{previousQuestions.length} tidligere spørsmål i denne økten.</p>}
              <label htmlFor="ai-source" className="mt-4 block text-sm font-medium">Notater eller pensumtekst</label>
              <p className="mt-1 text-xs text-muted">Spørsmål og svar lages kun fra teksten du limer inn.</p>
            </>
          )}
          <textarea id="ai-source" value={text} onChange={(event) => setText(event.target.value)} maxLength={20_000} rows={10} className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" placeholder={tool === 'breakdown' ? 'Lim inn oppgaveteksten her…' : 'Lim inn notater eller pensumtekst her…'} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">{text.length.toLocaleString('nb-NO')} / 20 000 tegn</span>
            <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Arbeider…' : tool === 'breakdown' ? 'Lag arbeidsplan' : `Lag ${normalizedQuestionCount} spørsmål`}</button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </form>
      )}

      {result && tool === 'breakdown' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Arbeidsplan</h3>
          <p className="mt-1 text-sm text-muted">{result.summary}</p>
          <ol className="mt-4 space-y-3">
            {result.steps.map((step, index) => (
              <li key={`${step.title}-${index}`} className="flex gap-3 rounded-md bg-paper p-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" aria-label={`Fullfør ${step.title}`} />
                <div><h4 className="text-sm font-semibold">{step.title}</h4><p className="mt-1 text-sm text-muted">{step.description}</p></div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {result && tool === 'quiz' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Øvingsspørsmål</h3>
          <ol className="mt-4 space-y-3">
            {result.questions.map((item, index) => (
              <li key={`${item.question}-${index}`} className="rounded-md bg-paper p-4">
                <p className="text-sm font-semibold">{index + 1}. {item.question}</p>
                <details className="mt-2 text-sm"><summary className="cursor-pointer text-secondary">Vis svar</summary><p className="mt-2 text-muted">{item.answer}</p></details>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-4 text-xs text-muted">Teksten sendes til Gemini. Maks 25 forespørsler per bruker per dag.</p>
    </section>
  )
}
