import { useEffect, useState } from 'react'
import { Modal } from './Modals'
import { supabase } from '../lib/supabase'

const SHARE_BASE = 'https://studieplanlegger.vercel.app/?del='

function generateToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function ShareModal({ subject, userId, onClose }) {
  const [token, setToken] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    const init = async () => {
      setState('loading')
      setError('')
      try {
        let t = await getActiveToken(userId, subject.id)
        if (!t) t = await createToken(userId, subject.id)
        if (alive) {
          setToken(t)
          setState('ready')
        }
      } catch (e) {
        console.error('Deling:', e)
        if (alive) {
          setError('Kunne ikke opprette delingslenke. Prøv igjen.')
          setState('error')
        }
      }
    }
    init()
    return () => {
      alive = false
    }
  }, [subject.id, userId])

  const link = token ? `${SHARE_BASE}${token}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard ikke tilgjengelig – brukeren kan markere lenken manuelt */
    }
  }

  const revoke = async () => {
    const { error: err } = await supabase
      .from('shared_links')
      .update({ revoked: true })
      .eq('user_id', userId)
      .eq('subject_id', subject.id)
      .eq('revoked', false)
    if (err) {
      console.error('Tilbakekall:', err.message)
      setError('Kunne ikke tilbakekalle lenken. Prøv igjen.')
      return
    }
    setToken(null)
    setState('revoked')
    setCopied(false)
  }

  return (
    <Modal title={`Del ${subject.short || subject.name}`} onClose={onClose}>
      <p className="text-sm text-muted">
        Alle med lenken kan se timeplan og pensum for dette faget, uten innlogging.
      </p>

      {state === 'loading' && <p className="mt-4 text-sm text-muted">Oppretter lenke…</p>}

      {state === 'error' && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {state === 'ready' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              aria-label="Delingslenke"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-secondary focus:outline-none"
            />
            <button type="button" onClick={copy} className="btn-primary whitespace-nowrap">
              {copied ? 'Kopiert!' : 'Kopier'}
            </button>
          </div>
          <button type="button" onClick={revoke} className="text-xs text-danger hover:underline">
            Tilbakekall lenken
          </button>
        </div>
      )}

      {state === 'revoked' && (
        <div className="mt-4 space-y-3">
          <p className="rounded-md bg-paper px-3 py-2 text-sm text-muted">Lenken er tilbakekalt og virker ikke lenger.</p>
          <button
            type="button"
            onClick={async () => {
              setState('loading')
              try {
                setToken(await createToken(userId, subject.id))
                setState('ready')
              } catch (e) {
                console.error('Deling:', e)
                setError('Kunne ikke opprette ny lenke. Prøv igjen.')
                setState('error')
              }
            }}
            className="text-sm text-primary hover:underline"
          >
            Lag ny lenke
          </button>
        </div>
      )}

      {error && state !== 'loading' && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </Modal>
  )
}

async function getActiveToken(userId, subjectId) {
  const { data } = await supabase
    .from('shared_links')
    .select('token')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .eq('revoked', false)
    .maybeSingle()
  return data?.token ?? null
}

async function createToken(userId, subjectId) {
  const token = generateToken()
  const { error } = await supabase.from('shared_links').insert({ token, user_id: userId, subject_id: subjectId })
  if (error) throw new Error(error.message)
  return token
}