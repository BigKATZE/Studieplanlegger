import { useState } from 'react'
import { supabase } from '../lib/supabase'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

export default function Login({ onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (err) setError(err.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl ring-1 ring-line">
        <h1 className="font-display text-2xl font-bold">Studieplanlegger</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === 'login'
            ? 'Logg inn for å synkronisere planleggeren på tvers av enheter.'
            : 'Opprett en konto – du kan bruke den på alle enhetene dine.'}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">E-post</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Passord</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy ? 'Vent…' : mode === 'login' ? 'Logg inn' : 'Opprett konto'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-3 w-full text-center text-sm text-muted hover:text-ink"
        >
          {mode === 'login' ? 'Ny bruker? Opprett konto' : 'Har du konto? Logg inn'}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-1 w-full text-center text-sm text-muted hover:text-ink"
          >
            Gå tilbake uten innlogging
          </button>
        )}
      </div>
    </div>
  )
}