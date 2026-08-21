import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildSuggestionPayload } from '../lib/aiSuggestions'

export default function AiSuggestions({ data, enabled }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    const { data: response, error: invokeError } = await supabase.functions.invoke('study-suggestions', {
      body: buildSuggestionPayload(data),
    })
    if (invokeError) {
      let message = 'Kunne ikke hente forslag akkurat nå.'
      try {
        const body = await invokeError.context.json()
        if (body.error) message = body.error
      } catch {
        // Keep the generic message when the function did not return JSON.
      }
      setError(message)
    } else {
      setResult(response)
    }
    setLoading(false)
  }

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">AI-forslag</h2>
          <p className="mt-1 text-sm text-muted">
            {enabled ? 'Få konkrete forslag til temaer og kapitler du bør lese.' : 'Logg inn for å få personlige leseforslag.'}
          </p>
        </div>
        <button type="button" onClick={generate} disabled={!enabled || loading} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? 'Lager forslag…' : result ? 'Lag nye forslag' : 'Få forslag'}
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-4">
          <p className="text-sm text-ink">{result.summary}</p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {result.suggestions.map((suggestion, index) => (
              <li key={`${suggestion.title}-${index}`} className="rounded-md border border-line bg-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{index + 1}</p>
                <h3 className="mt-1 text-sm font-semibold text-ink">{suggestion.title}</h3>
                <p className="mt-1 text-sm text-ink">{suggestion.action}</p>
                <p className="mt-2 text-xs text-muted">{suggestion.reason}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Fag, aktivitetstitler, kapitler og datoer sendes til Gemini. Maks 5 forespørsler per bruker per dag.</p>
    </section>
  )
}
