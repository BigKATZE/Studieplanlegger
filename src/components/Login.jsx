import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

const turnstileSitekey = import.meta.env.VITE_TURNSTILE_SITEKEY || ''

export default function Login({ onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const widgetRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!turnstileSitekey) return
    let widgetId
    const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]')
    const script = existing || document.createElement('script')
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const render = () => {
      if (window.turnstile && widgetRef.current) {
        try { if (widgetId != null) window.turnstile.remove(widgetId) } catch {}
        widgetId = window.turnstile.render(widgetRef.current, {
          sitekey: turnstileSitekey,
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken(''),
        })
        widgetIdRef.current = widgetId
      } else {
        setTimeout(render, 400)
      }
    }
    if (existing && window.turnstile) render()
    else script.onload = render
    return () => {
      try { if (widgetId != null && window.turnstile) window.turnstile.remove(widgetId) } catch {}
      if (!existing) script.remove()
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined })
      setBusy(false)
      if (err) setError(err.message)
      try { if (window.turnstile) window.turnstile.reset(widgetIdRef.current ?? undefined) } catch {}
      setCaptchaToken('')
      return
    }
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: captchaToken ? { captchaToken } : undefined })
    setBusy(false)
    if (err) {
      setError(err.message)
    } else if (!data.session) {
      setInfo('Konto opprettet! Sjekk e-posten din for å bekrefte kontoen før du logger inn.')
    }
    try { if (window.turnstile) window.turnstile.reset(widgetIdRef.current ?? undefined) } catch {}
    setCaptchaToken('')
  }

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError('Skriv inn e-postadressen din først.')
      return
    }
    setBusy(true)
    setError('')
    setInfo('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
      captchaToken: captchaToken || undefined,
    })
    setBusy(false)
    if (err) setError(err.message)
    else setInfo('Sjekk innboksen din - vi har sendt en lenke for å tilbakestille passordet.')
    try { if (window.turnstile) window.turnstile.reset(widgetIdRef.current ?? undefined) } catch {}
    setCaptchaToken('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl ring-1 ring-line">
        <h1 className="font-display text-2xl font-bold">Studieplanlegger</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === 'login'
            ? 'Logg inn for å synkronisere planleggeren på tvers av enheter.'
            : 'Opprett en konto - du kan bruke den på alle enhetene dine.'}
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
          {turnstileSitekey ? (
            <div ref={widgetRef} className="flex justify-center" aria-label="Bot-beskyttelse" />
          ) : (
            <p className="text-xs text-muted">Bot-beskyttelse ikke konfigurert — sett VITE_TURNSTILE_SITEKEY i Vercel/Supabase for å skru på.</p>
          )}
          {mode === 'login' && (
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="text-xs text-muted hover:text-ink"
            >
              Glemt passord?
            </button>
          )}
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {info && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p>}
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
