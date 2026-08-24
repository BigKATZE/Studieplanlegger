import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from './Modals'

async function functionErrorMessage(error, fallback) {
  try {
    const body = await error?.context?.json()
    return body?.error || fallback
  } catch {
    return fallback
  }
}

export default function ShareSemesterModal({ onClose }) {
  const [share, setShare] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const createLink = async () => {
    setLoading(true)
    setError('')
    setStatus('')
    const { data, error: invokeError } = await supabase.functions.invoke('shared-semester', {
      body: { action: 'create' },
    })
    setLoading(false)
    if (invokeError || !data?.token) {
      setError(data?.error || await functionErrorMessage(invokeError, 'Kunne ikke lage delingslenke.'))
      return
    }
    setShare({
      token: data.token,
      expiresAt: data.expiresAt,
      url: `${window.location.origin}${window.location.pathname}?semester=${data.token}`,
    })
    setStatus(data.reused ? 'Eksisterende aktiv lenke ble hentet.' : 'Delingslenken er klar.')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(share.url)
      setStatus('Lenken er kopiert.')
    } catch {
      setError('Kunne ikke kopiere automatisk. Marker og kopier lenken manuelt.')
    }
  }

  const revokeLink = async () => {
    setLoading(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('shared-semester', {
      body: { action: 'revoke', token: share.token },
    })
    setLoading(false)
    if (invokeError || !data?.ok) {
      setError(data?.error || await functionErrorMessage(invokeError, 'Kunne ikke tilbakekalle lenken.'))
      return
    }
    setShare(null)
    setStatus('Lenken er tilbakekalt og kan ikke lenger åpnes.')
  }

  return (
    <Modal title="Del hele oversikten" onClose={onClose}>
      <p className="text-sm text-muted">
        Mottakeren får en skrivebeskyttet oversikt over alle fagene dine - timeplan, pensum, arbeidskrav og eksamener.
        Notater til AI, øvingssvar og arbeidsplaner deles ikke. Lenken utløper etter 30 dager.
      </p>
      {share ? (
        <>
          <input
            aria-label="Delingslenke"
            readOnly
            value={share.url}
            className="mt-4 w-full rounded-md border border-line bg-paper p-2 text-sm"
          />
          {share.expiresAt && (
            <p className="mt-2 text-xs text-muted">
              Utløper {new Date(share.expiresAt).toLocaleDateString('nb-NO')}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={copyLink}>Kopier lenke</button>
            <button type="button" className="btn-danger" disabled={loading} onClick={revokeLink}>
              {loading ? 'Tilbakekaller…' : 'Tilbakekall lenke'}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn-primary mt-4" disabled={loading} onClick={createLink}>
          {loading ? 'Lager lenke…' : 'Lag delingslenke'}
        </button>
      )}
      {status && <p role="status" className="mt-3 text-sm text-muted">{status}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
