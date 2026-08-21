import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildAiRequest, formatBreakdownPlan } from '../lib/aiTools'
import { checkFile } from '../lib/upload'

const subjectLabel = (subject) => subject.code && subject.name && subject.code !== subject.name
  ? `${subject.code} - ${subject.name}`
  : subject.name || subject.short || subject.code

const formatDuration = (minutes) => {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} t ${rest} min` : `${hours} t`
}

export default function AiTools({ data, enabled, onAddReview }) {
  const [tool, setTool] = useState('breakdown')
  const [text, setText] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState('5')
  const [breakdownDetail, setBreakdownDetail] = useState('standard')
  const [timeBudgetHours, setTimeBudgetHours] = useState('')
  const [avoidPrevious, setAvoidPrevious] = useState(true)
  const [previousQuestions, setPreviousQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [copyState, setCopyState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfState, setPdfState] = useState('')
  const normalizedQuestionCount = Math.min(15, Math.max(3, Number(questionCount) || 5))

  const selectTool = (next) => {
    setTool(next)
    setText('')
    setResult(null)
    setCompletedSteps(new Set())
    setCopyState('')
    setError('')
    setPdfState('')
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
    setCopyState('')
    try {
      const assignmentContext = assignment
        ? `${assignment.title}${assignment.deadline ? ` (frist ${assignment.deadline})` : ''}`
        : undefined
      const { data: response, error: invokeError } = await supabase.functions.invoke('study-suggestions', {
        body: buildAiRequest(tool, text, {
          subject: subject && subjectLabel(subject),
          assignment: assignmentContext,
        }, {
          detail: breakdownDetail,
          timeBudgetHours,
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
        setCompletedSteps(new Set())
        if (tool === 'quiz' && Array.isArray(response?.questions)) {
          setPreviousQuestions((previous) => [...previous, ...response.questions.map((item) => item.question)].slice(-30))
        }
      }
    } catch {
      setError('Mistet forbindelsen til AI-verktøyet. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCompletedStep = (index) => {
    setCompletedSteps((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const copyBreakdown = async () => {
    try {
      await navigator.clipboard.writeText(formatBreakdownPlan(result))
      setCopyState('Arbeidsplanen er kopiert.')
    } catch {
      setCopyState('Kunne ikke kopiere automatisk.')
    }
  }

  const readPdf = async (file) => {
    if (!file) return
    const fileError = checkFile(file, { maxBytes: 10 * 1024 * 1024, types: ['application/pdf'], extensions: ['pdf'] })
    if (fileError) { setError(fileError); return }
    setPdfState('Leser PDF-en lokalt…')
    setError('')
    try {
      const { extractTextFromPdf } = await import('../lib/parsePdf')
      const extracted = await extractTextFromPdf(file)
      const clipped = extracted.slice(0, 20_000)
      setText(clipped)
      setPdfState(extracted.length > clipped.length ? 'PDF-en ble lest lokalt og teksten ble forkortet til 20 000 tegn.' : 'PDF-en ble lest lokalt. Sendes først når du velger å lage spørsmål.')
    } catch {
      setError('Kunne ikke lese PDF-en. Prøv en annen eller en uskadd PDF.')
      setPdfState('')
    }
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
                {data.assignments.filter((item) => item.status !== 'done').map((item) => <option key={item.id} value={item.id}>{item.title}{item.deadline ? ` – frist ${item.deadline}` : ''}</option>)}
              </select>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ai-breakdown-detail" className="block text-sm font-medium">Detaljnivå</label>
                  <select id="ai-breakdown-detail" value={breakdownDetail} onChange={(event) => setBreakdownDetail(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                    <option value="compact">Kort · 4–5 steg</option>
                    <option value="standard">Standard · 6–8 steg</option>
                    <option value="detailed">Grundig · 8–10 steg</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-time-budget" className="block text-sm font-medium">Tilgjengelig tid <span className="font-normal text-muted">(valgfritt)</span></label>
                  <div className="relative mt-1">
                    <input id="ai-time-budget" type="number" min="1" max="100" inputMode="numeric" value={timeBudgetHours} onChange={(event) => setTimeBudgetHours(event.target.value)} onBlur={() => {
                      if (!timeBudgetHours) return
                      setTimeBudgetHours(String(Math.min(100, Math.max(1, Math.round(Number(timeBudgetHours) || 1)))))
                    }} className="w-full rounded-md border border-line bg-surface px-3 py-2 pr-14 text-sm" placeholder="F.eks. 12" />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">timer</span>
                  </div>
                </div>
              </div>
              <label htmlFor="ai-source" className="mt-4 block text-sm font-medium">Oppgavetekst og vurderingskrav</label>
              <p className="mt-1 text-xs text-muted">Ta med omfang, frist, formkrav og vurderingskriterier for en mer presis plan.</p>
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
              <label className="mt-3 block text-sm font-medium" htmlFor="ai-pdf">Eller velg PDF</label>
              <input id="ai-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => readPdf(event.target.files?.[0])} className="file-input mt-1 block w-full text-sm text-muted" />
              {pdfState && <p role="status" className="mt-1 text-xs text-muted">{pdfState}</p>}
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Arbeidsplan</h3>
              <p className="mt-1 text-xs text-muted">{completedSteps.size} av {result.steps.length} steg fullført</p>
            </div>
            <button type="button" onClick={copyBreakdown} className="btn-ghost !min-h-8 !px-2.5 !py-1.5 text-xs">Kopier plan</button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper" role="progressbar" aria-label="Fremdrift i arbeidsplan" aria-valuemin="0" aria-valuemax={result.steps.length} aria-valuenow={completedSteps.size}>
            <div className="h-full rounded-full bg-secondary transition-[width]" style={{ width: `${result.steps.length ? (completedSteps.size / result.steps.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted">{result.summary}</p>
          {result.steps.some((step) => Number.isFinite(step.estimatedMinutes)) && (
            <p className="mt-2 text-xs font-medium text-secondary">Estimert arbeidstid: {formatDuration(result.steps.reduce((total, step) => total + (Number.isFinite(step.estimatedMinutes) ? step.estimatedMinutes : 0), 0))}</p>
          )}
          {result.requirements?.length > 0 && (
            <div className="mt-5 rounded-md border border-line bg-paper p-4">
              <h4 className="text-sm font-semibold">Dette må leveransen inneholde</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {result.requirements.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}
              </ul>
            </div>
          )}
          <ol className="mt-4 space-y-3">
            {result.steps.map((step, index) => (
              <li key={`${step.title}-${index}`} className={`flex gap-3 rounded-md bg-paper p-3 ${completedSteps.has(index) ? 'opacity-60' : ''}`}>
                <input type="checkbox" checked={completedSteps.has(index)} onChange={() => toggleCompletedStep(index)} className="mt-1 h-4 w-4 accent-primary" aria-label={`Fullfør ${step.title}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className={`text-sm font-semibold ${completedSteps.has(index) ? 'line-through' : ''}`}>{index + 1}. {step.title}</h4>
                    {Number.isFinite(step.estimatedMinutes) && <span className="text-xs text-muted">{formatDuration(step.estimatedMinutes)}</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{step.description}</p>
                  {step.doneCriteria && <p className="mt-2 text-xs text-muted"><span className="font-semibold text-ink">Ferdig når:</span> {step.doneCriteria}</p>}
                </div>
              </li>
            ))}
          </ol>
          {result.clarifications?.length > 0 && (
            <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-4">
              <h4 className="text-sm font-semibold">Avklar før du starter</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {result.clarifications.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}
              </ul>
            </div>
          )}
          {copyState && <p role="status" className="mt-3 text-xs text-muted">{copyState}</p>}
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
                <button className="btn-ghost mt-3 !min-h-8 !px-2 !py-1 text-xs" onClick={() => onAddReview?.({ subjectId, title: item.question, details: item.answer })}>Legg til repetisjon</button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-4 text-xs text-muted">Teksten sendes til Gemini. Maks 25 forespørsler per bruker per dag.</p>
    </section>
  )
}
