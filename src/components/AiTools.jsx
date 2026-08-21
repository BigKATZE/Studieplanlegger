import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildAiRequest, formatBreakdownPlan, buildWeeklySnapshot, rankSourcePassages } from '../lib/aiTools'
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

export default function AiTools({ data, enabled, onAddReview, onAddSource, onRemoveSource, onAddAttempt, onSaveWorkPlan }) {
  const [tool, setTool] = useState('breakdown')
  const [text, setText] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState('5')
  const [breakdownDetail, setBreakdownDetail] = useState('standard')
  const [timeBudgetHours, setTimeBudgetHours] = useState('')
  const [avoidPrevious, setAvoidPrevious] = useState(true)
  const [adaptiveVariants, setAdaptiveVariants] = useState(true)
  const [previousQuestions, setPreviousQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [copyState, setCopyState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfState, setPdfState] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [answerInputs, setAnswerInputs] = useState({})
  const [feedbackByQuestion, setFeedbackByQuestion] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [examMinutes, setExamMinutes] = useState('30')
  const [examDifficulty, setExamDifficulty] = useState('medium')
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [examAnswers, setExamAnswers] = useState({})
  const submittedExam = useRef(false)
  const submitExamRef = useRef(null)
  const sourceForSubject = useMemo(() => data.aiSources.filter((source) => source.subjectId === subjectId), [data.aiSources, subjectId])
  useEffect(() => { if (secondsLeft == null) return; if (secondsLeft <= 0) { if (!submittedExam.current && result?.questions) submitExamRef.current?.(); return } const timer = setInterval(() => setSecondsLeft((value) => value == null ? value : value - 1), 1000); return () => clearInterval(timer) }, [secondsLeft, result])

  const submitExam = useCallback(async () => {
    if (!result?.questions || submittedExam.current) return
    submittedExam.current = true
    setLoading(true)
    try {
      const questions = result.questions.map((item, index) => ({
        question: item.question,
        expectedAnswer: item.answer,
        userAnswer: examAnswers[index] || '',
      }))
      const { data: feedback, error: invokeError } = await supabase.functions.invoke('study-suggestions', {
        body: buildAiRequest('exam-feedback', 'vurder eksamen', {}, { questions }),
      })
      if (invokeError) throw new Error()
      setResult({ exam: result.questions, evaluation: feedback })
      setSecondsLeft(null)
    } catch {
      submittedExam.current = false
      setSecondsLeft(null)
      setError('Kunne ikke vurdere eksamensbesvarelsen. Du kan prøve å levere på nytt.')
    } finally {
      setLoading(false)
    }
  }, [examAnswers, result])
  useEffect(() => { submitExamRef.current = submitExam }, [submitExam])
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
    if (tool === 'exam' && result?.questions) { submitExam(); return }
    if (tool === 'weekly-report') {
      setLoading(true); setError(''); setResult(null)
      try { const { data: response, error: invokeError } = await supabase.functions.invoke('study-suggestions', { body: buildAiRequest('weekly-report', 'ukerapport', {}, { snapshot: buildWeeklySnapshot(data) }) }); if (invokeError) setError('Kunne ikke lage ukesrapporten.'); else setResult(response) } catch { setError('Mistet forbindelsen til AI-verktøyet.') } finally { setLoading(false) }
      return
    }
    if (tool === 'source-search') {
      if (searchQuery.trim().length < 3) { setError('Skriv et spørsmål på minst tre tegn.'); return }
      const passages = rankSourcePassages(data.aiSources, subjectId, searchQuery)
      if (!passages.length) {
        setError(sourceForSubject.length
          ? 'Fant ingen relevante utdrag i kildene. Prøv mer konkrete søkeord.'
          : 'Legg til en kilde i valgt fag før du søker.')
        return
      }
      setLoading(true); setError(''); setResult(null); try { const { data: response, error: invokeError } = await supabase.functions.invoke('study-suggestions', { body: buildAiRequest('source-search', searchQuery, { subject: subjectLabel(data.subjects.find((x) => x.id === subjectId) || {}) }, { query: searchQuery, passages }) }); if (invokeError) setError('Kunne ikke søke i kildene.'); else setResult(response) } catch { setError('Mistet forbindelsen til AI-verktøyet.') } finally { setLoading(false) }
      return
    }
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
    setResult(null)
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
          difficulty: tool === 'exam' ? examDifficulty : difficulty,
          count: normalizedQuestionCount,
          minutes: examMinutes,
          previousQuestions: avoidPrevious ? previousQuestions : [],
          weakQuestions: adaptiveVariants ? data.quizAttempts.filter((attempt) => attempt.subjectId === subjectId && attempt.verdict !== 'correct').slice(-12).map((attempt) => attempt.question) : [],
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
        if (tool === 'exam' && Array.isArray(response?.questions)) { submittedExam.current = false; setExamAnswers({}); setSecondsLeft(Math.min(180, Math.max(5, Number(examMinutes) || 30)) * 60) }
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
  const addPdfSource = async (file) => {
    if (!file) return
    const fileError = checkFile(file, { maxBytes: 10 * 1024 * 1024, types: ['application/pdf'], extensions: ['pdf'] })
    if (fileError) { setError(fileError); return }
    if (!subjectId || !sourceTitle.trim()) { setError('Velg fag og skriv en kildetittel før du leser PDF-en.'); return }
    if (data.aiSources.length >= 25) { setError('Du kan lagre maksimalt 25 kilder.'); return }
    setPdfState('Leser PDF-en lokalt…')
    try {
      const { extractTextFromPdf } = await import('../lib/parsePdf')
      const extracted = (await extractTextFromPdf(file)).slice(0, 60_000)
      if (!extracted.trim()) throw new Error('empty')
      onAddSource({ subjectId, title: sourceTitle.trim(), text: extracted, sourceType: 'pdf', fileName: file.name })
      setSourceTitle(''); setPdfState('PDF-en ble lagret lokalt som tekst. Originalfilen ble ikke lastet opp.')
    } catch { setError('Kunne ikke lese PDF-en. Prøv en annen eller en uskadd PDF.'); setPdfState('') }
  }

  return (
    <section className="mt-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">AI-verktøy</h2>
        <p className="mt-1 text-sm text-muted">Innholdet brukes bare til å lage svaret og lagres ikke i studieplanen.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {[
          ['breakdown', 'Bryt ned arbeidskrav'], ['quiz', 'Lag øvingsspørsmål'], ['exam', 'Eksamensøving'], ['summary', 'Oppsummer'], ['source-search', 'Søk i kilder'], ['weekly-report', 'Ukerapport'],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => selectTool(value)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium sm:flex-none ${tool === value ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {!enabled ? (
        <><section className="mt-5 rounded-lg border border-line bg-surface p-5"><h3 className="font-semibold">Private fagkilder</h3><p className="mt-1 text-xs text-muted">Kilder lagres lokalt. Logg inn for AI-søk.</p><select aria-label="Fag for kilde" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-3 w-full rounded-md border border-line bg-paper p-2 text-sm"><option value="">Velg fag</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}</select><input aria-label="Kildetittel" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-paper p-2 text-sm" placeholder="Kildetittel" /><textarea aria-label="Kildetekst" value={sourceText} onChange={(event) => setSourceText(event.target.value)} maxLength="60000" rows="3" className="mt-2 w-full rounded-md border border-line bg-paper p-2 text-sm" placeholder="Notater eller tekst" /><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn-ghost" onClick={() => { if (!subjectId || !sourceTitle.trim() || !sourceText.trim()) { setError('Velg fag og fyll ut tittel og kilde.'); return }; if (data.aiSources.length >= 25) { setError('Du kan lagre maksimalt 25 kilder.'); return }; onAddSource({ subjectId, title: sourceTitle, text: sourceText, sourceType: 'notes' }); setSourceTitle(''); setSourceText('') }}>Lagre kilde</button><label className="btn-ghost">Legg til PDF<input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => addPdfSource(event.target.files?.[0])} /></label></div>{pdfState && <p className="mt-2 text-xs text-muted">{pdfState}</p>}{sourceForSubject.map((source) => <div key={source.id} className="mt-2 flex justify-between text-sm"><span>{source.title}</span><button className="text-danger" onClick={() => onRemoveSource(source.id)}>Fjern</button></div>)}</section><p className="mt-5 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">Logg inn for å bruke AI-verktøyene.</p></>
      ) : (
        <>
        <section className="mt-5 rounded-lg border border-line bg-surface p-5" aria-labelledby="ai-sources-heading"><h3 id="ai-sources-heading" className="font-semibold">Private fagkilder</h3><p className="mt-1 text-xs text-muted">Uttrukket tekst lagres og synkroniseres med kontoen din. Originale PDF-filer lastes ikke opp, og bare relevante utdrag sendes til Gemini ved søk.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><select aria-label="Fag for kilde" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="rounded-md border border-line bg-paper p-2 text-sm"><option value="">Velg fag</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}</select><input aria-label="Kildetittel" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} maxLength="300" className="rounded-md border border-line bg-paper p-2 text-sm" placeholder="Kildetittel" /></div><textarea aria-label="Kildetekst" value={sourceText} onChange={(event) => setSourceText(event.target.value)} maxLength="60000" rows="3" className="mt-2 w-full rounded-md border border-line bg-paper p-2 text-sm" placeholder="Notater eller tekst" /><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn-ghost" onClick={() => { if (!subjectId || !sourceTitle.trim() || !sourceText.trim()) { setError('Velg fag og fyll ut tittel og kilde.'); return }; if (data.aiSources.length >= 25) { setError('Du kan lagre maksimalt 25 kilder.'); return }; onAddSource({ subjectId, title: sourceTitle, text: sourceText, sourceType: 'notes' }); setSourceTitle(''); setSourceText('') }}>Lagre kilde</button><label className="btn-ghost">Legg til PDF<input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => addPdfSource(event.target.files?.[0])} /></label></div>{pdfState && <p className="mt-2 text-xs text-muted">{pdfState}</p>}{sourceForSubject.length > 0 && <ul className="mt-3 space-y-1 text-sm">{sourceForSubject.map((source) => <li key={source.id} className="flex justify-between gap-2"><span>{source.title}</span><button type="button" className="text-danger" onClick={() => onRemoveSource(source.id)}>Fjern</button></li>)}</ul>}</section>
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
          ) : tool === 'weekly-report' ? <p className="text-sm text-muted">Lag en ukesrapport basert på en begrenset, anonymisert planoversikt.</p> : tool === 'source-search' ? (
            <><label htmlFor="ai-subject" className="block text-sm font-medium">Fag</label><select id="ai-subject" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"><option value="">Velg fag</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}</select><label htmlFor="source-query" className="mt-4 block text-sm font-medium">Spørsmål</label><input id="source-query" required value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></>
          ) : tool === 'exam' ? (<><div className="grid gap-3 sm:grid-cols-3"><label htmlFor="exam-minutes" className="block text-sm font-medium">Tid (minutter)<input id="exam-minutes" min="5" max="180" type="number" value={examMinutes} onChange={(event) => setExamMinutes(event.target.value)} onBlur={() => setExamMinutes(String(Math.min(180, Math.max(5, Number(examMinutes) || 30))))} className="mt-1 w-full rounded-md border border-line bg-paper p-2 text-sm" /></label><label htmlFor="exam-count" className="block text-sm font-medium">Antall spørsmål<input id="exam-count" min="3" max="15" type="number" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} onBlur={() => setQuestionCount(String(normalizedQuestionCount))} className="mt-1 w-full rounded-md border border-line bg-paper p-2 text-sm" /></label><label htmlFor="exam-difficulty" className="block text-sm font-medium">Vanskelighet<select id="exam-difficulty" value={examDifficulty} onChange={(event) => setExamDifficulty(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper p-2 text-sm"><option value="easy">Lett</option><option value="medium">Middels</option><option value="hard">Vanskelig</option></select></label></div><p className="mt-2 text-xs text-muted">Lag oppgaver fra teksten og lever når du er ferdig.</p></>)
           : (
            <>
              <label htmlFor="ai-subject" className="block text-sm font-medium">Fag <span className="font-normal text-muted">(valgfritt)</span></label>
              <select id="ai-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                <option value="">Ikke velg fag</option>
                {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}
              </select>
              {tool === 'quiz' && <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
              </div>}
              {tool === 'quiz' && (
                <div className="mt-3">
                  <span className="block text-sm font-medium">Adaptive varianter</span>
                  <button
                    type="button"
                    aria-pressed={adaptiveVariants}
                    onClick={() => setAdaptiveVariants((value) => !value)}
                    className={`mt-1 rounded-md border px-3 py-2 text-sm font-medium ${adaptiveVariants ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'}`}
                  >
                    {adaptiveVariants ? 'Bruk tidligere svake svar' : 'Ikke bruk tidligere svake svar'}
                  </button>
                </div>
              )}
              {tool === 'quiz' && previousQuestions.length > 0 && <p className="mt-2 text-xs text-muted">{previousQuestions.length} tidligere spørsmål i denne økten.</p>}
              <label htmlFor="ai-source" className="mt-4 block text-sm font-medium">Notater eller pensumtekst</label>
              <p className="mt-1 text-xs text-muted">{tool === 'summary' ? 'Oppsummeringen lages kun fra teksten du oppgir.' : 'Spørsmål og svar lages kun fra teksten du oppgir.'}</p>
              <label className="mt-3 block text-sm font-medium" htmlFor="ai-pdf">Eller velg PDF</label>
              <input id="ai-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => readPdf(event.target.files?.[0])} className="file-input mt-1 block w-full text-sm text-muted" />
              {pdfState && <p role="status" className="mt-1 text-xs text-muted">{pdfState}</p>}
            </>
          )}
          {tool !== 'weekly-report' && tool !== 'source-search' && <textarea id="ai-source" value={text} onChange={(event) => setText(event.target.value)} maxLength={20_000} rows={10} className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" placeholder={tool === 'breakdown' ? 'Lim inn oppgaveteksten her…' : 'Lim inn notater eller pensumtekst her…'} />}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">{tool === 'source-search' ? 'Bare relevante tekstutdrag sendes.' : `${text.length.toLocaleString('nb-NO')} / 20 000 tegn`}</span>
            <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Arbeider…' : tool === 'breakdown' ? 'Lag arbeidsplan' : tool === 'exam' && result?.questions ? 'Lever eksamen' : tool === 'exam' ? 'Lag eksamensøving' : tool === 'summary' ? 'Lag oppsummering' : tool === 'source-search' ? 'Søk i kilder' : tool === 'weekly-report' ? 'Lag ukesrapport' : `Lag ${normalizedQuestionCount} spørsmål`}</button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </form></>
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
          <button type="button" className="btn-ghost mt-3" onClick={() => onSaveWorkPlan?.({ assignmentId, subjectId: data.assignments.find((x) => x.id === assignmentId)?.subjectId || '', title: data.assignments.find((x) => x.id === assignmentId)?.title || 'Arbeidsplan', ...result })}>Lagre arbeidsplan</button>
        </section>
      )}

      {result && tool === 'quiz' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Øvingsspørsmål</h3>
          <ol className="mt-4 space-y-3">
            {result.questions.map((item, index) => (
              <li key={`${item.question}-${index}`} className="rounded-md bg-paper p-4">
                <p className="text-sm font-semibold">{index + 1}. {item.question}</p>
                <details className="mt-2 text-sm"><summary className="cursor-pointer text-secondary">Vis svar</summary><p className="mt-2 text-muted">{item.answer}</p></details><textarea aria-label={`Ditt svar på ${item.question}`} value={answerInputs[index] || ''} onChange={(event) => setAnswerInputs((value) => ({ ...value, [index]: event.target.value }))} className="mt-3 w-full rounded-md border border-line bg-surface p-2 text-sm" rows="2" placeholder="Skriv ditt svar" /><button type="button" className="btn-ghost mt-2 !min-h-8 !px-2 !py-1 text-xs" onClick={async () => { const userAnswer = answerInputs[index]?.trim(); if (!userAnswer) return; setLoading(true); try { const { data: feedback, error: invokeError } = await supabase.functions.invoke('study-suggestions', { body: buildAiRequest('feedback', 'vurder svar', {}, { question: item.question, expectedAnswer: item.answer, userAnswer }) }); if (invokeError) throw new Error(); setFeedbackByQuestion((v) => ({ ...v, [index]: feedback })); onAddAttempt?.({ subjectId, sourceId: '', question: item.question, expectedAnswer: item.answer, userAnswer, verdict: feedback.verdict, feedback: feedback.feedback }); if (feedback.verdict !== 'correct') onAddReview?.({ subjectId, title: item.question, details: item.answer }) } catch { setError('Kunne ikke vurdere svaret.') } finally { setLoading(false) } }}>Vurder svar</button>{feedbackByQuestion[index] && <p className="mt-2 text-sm text-muted">{feedbackByQuestion[index].feedback} ({feedbackByQuestion[index].verdict})</p>}
                <button className="btn-ghost mt-3 !min-h-8 !px-2 !py-1 text-xs" onClick={() => onAddReview?.({ subjectId, title: item.question, details: item.answer })}>Legg til repetisjon</button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {result && tool === 'exam' && result.questions && <section className="mt-6 rounded-lg border border-line bg-surface p-5"><h3 className="font-display text-lg font-semibold">Eksamensøving</h3>{secondsLeft != null && <p role="timer" className="mt-2 font-mono text-lg">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</p>}<ol className="mt-4 space-y-3">{result.questions.map((item, index) => <li key={item.question} className="rounded-md bg-paper p-3"><p className="font-semibold text-sm">{index + 1}. {item.question}</p><textarea aria-label={`Svar på ${item.question}`} onChange={(event) => setExamAnswers((value) => ({ ...value, [index]: event.target.value }))} className="mt-2 w-full rounded-md border border-line bg-surface p-2 text-sm" rows="3" /></li>)}</ol><button className="btn-primary mt-4" onClick={submitExam}>Lever eksamen</button></section>}
      {result?.evaluation && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Studiefeedback</h3>
          <p className="mt-1 text-xs text-muted">Dette er studietilbakemelding, ikke en formell karakter.</p>
          <p className="mt-3 text-sm text-muted">{result.evaluation.summary}</p>
          <p className="mt-2 text-sm font-medium">
            Poeng: {result.evaluation.totalScore} av {(result.exam?.length ?? 0) * 10}
          </p>
          <ol className="mt-4 space-y-2">
            {(result.evaluation.perQuestion ?? []).map((item, index) => (
              <li key={index} className="rounded-md bg-paper p-3 text-sm">
                <p className="font-medium">Spørsmål {index + 1}: {item.score} av 10</p>
                <p className="mt-1 text-muted">{item.feedback}</p>
              </li>
            ))}
          </ol>
          {(result.evaluation.focusAreas ?? []).length > 0 && (
            <><h4 className="mt-4 font-semibold">Fokus videre</h4><ul className="mt-2 list-disc pl-5 text-sm text-muted">{result.evaluation.focusAreas.map((item) => <li key={item}>{item}</li>)}</ul></>
          )}
        </section>
      )}
      {result && tool === 'summary' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Oppsummering</h3>
          <p className="mt-2 text-muted">{result.summary}</p>
          <h4 className="mt-4 font-semibold">Viktige punkter</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">{(result.keyPoints ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
          <h4 className="mt-4 font-semibold">Sentrale begreper</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">{(result.keyConcepts ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
          <h4 className="mt-4 font-semibold">Repetisjonsspørsmål</h4>
          {(result.reviewQuestions ?? []).map((item) => (
            <div key={item.question} className="mt-2 text-sm">
              <span>{item.question}</span>
              <button className="ml-2 text-secondary" onClick={() => onAddReview?.({ subjectId, title: item.question, details: item.answer || '' })}>Legg til</button>
            </div>
          ))}
        </section>
      )}
      {result && tool === 'source-search' && <section className="mt-6 rounded-lg border border-line bg-surface p-5"><h3 className="font-display text-lg font-semibold">Svar fra kildene</h3><p className="mt-2 text-sm text-muted">{result.answer}</p>{!result.grounded && <p className="mt-3 text-sm text-warning">Kildene er ikke tilstrekkelige for et sikkert svar.</p>}<ul className="mt-3 text-xs text-muted">{(result.citations ?? []).map((citation) => <li key={citation.passageId}>{citation.sourceTitle} · avsnitt {citation.index}</li>)}</ul></section>}
      {result && tool === 'weekly-report' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">Ukerapport</h3>
          <p className="mt-2 text-sm text-muted">{result.summary}</p>
          {[
            ['Fullført denne uken', result.completed],
            ['Forfalt og ikke fullført', result.overdue],
            ['Kommende frister', result.upcoming],
            ['Anbefalt fokus', result.focus],
          ].map(([heading, items]) => (
            <div key={heading} className="mt-4">
              <h4 className="text-sm font-semibold">{heading}</h4>
              {items?.length
                ? <ul className="mt-1 list-disc pl-5 text-sm text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul>
                : <p className="mt-1 text-sm text-muted">Ingen punkter.</p>}
            </div>
          ))}
        </section>
      )}

      <p className="mt-4 text-xs text-muted">Teksten sendes til Gemini. Maks 25 forespørsler per bruker per dag.</p>
    </section>
  )
}
