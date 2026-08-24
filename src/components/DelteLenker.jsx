import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Row({ label, sub, href, expiresAt, onRevoke, revoking }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
        <a href={href} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-xs text-secondary hover:underline">
          {href}
        </a>
        {expiresAt && (
          <p className="mt-1 text-xs text-muted">Utløper {new Date(expiresAt).toLocaleDateString('nb-NO')}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={copy} className="btn-ghost text-xs">
          {copied ? 'Kopiert!' : 'Kopier'}
        </button>
        <button type="button" onClick={onRevoke} disabled={revoking} className="btn-danger text-xs">
          {revoking ? '…' : 'Tilbakekall'}
        </button>
      </div>
    </div>
  )
}

export default function DelteLenker({ subjects, onClose }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState('')

  const load = async () => {
    setError('')
    try {
      const origin = window.location.origin + window.location.pathname
      const next = []

      // Fag — direkte spørring (RLS: kun eier)
      const { data: subjectLinks, error: sErr } = await supabase
        .from('shared_links')
        .select('token, subject_id, created_at')
        .eq('revoked', false)
      if (sErr) throw sErr
      for (const row of subjectLinks ?? []) {
        const subj = subjects.find((s) => s.id === row.subject_id)
        next.push({
          key: `fag-${row.token}`,
          kind: 'Fag',
          label: subj ? subj.name : row.subject_id,
          sub: subj?.code || '',
          href: `${origin}?del=${row.token}`,
          token: row.token,
          subjectId: row.subject_id,
          type: 'subject',
        })
      }

      // Arbeidsplaner — via funksjon (service_role-tabell)
      const { data: planData } = await supabase.functions.invoke('shared-plan', { body: { action: 'list' } })
      for (const row of planData?.links ?? []) {
        next.push({
          key: `plan-${row.token}`,
          kind: 'Arbeidsplan',
          label: row.title || 'Arbeidsplan',
          sub: row.subjectName || '',
          href: `${origin}?plan=${row.token}`,
          token: row.token,
          expiresAt: row.expiresAt,
          type: 'plan',
        })
      }

      // Semester — via funksjon
      const { data: semData } = await supabase.functions.invoke('shared-semester', { body: { action: 'list' } })
      for (const row of semData?.links ?? []) {
        next.push({
          key: `sem-${row.token}`,
          kind: 'Semester',
          label: 'Hele semesteret',
          sub: 'Alle fag',
          href: `${origin}?semester=${row.token}`,
          token: row.token,
          expiresAt: row.expiresAt,
          type: 'semester',
        })
      }

      setItems(next)
    } catch (e) {
      console.error('Delte lenker:', e)
      setError('Kunne ikke hente delte lenker.')
      setItems([])
    }
  }

  useEffect(() => { load() }, [])

  const revoke = async (item) => {
    setRevoking(item.key)
    setError('')
    try {
      if (item.type === 'subject') {
        const { error } = await supabase.from('shared_links').update({ revoked: true }).eq('token', item.token)
        if (error) throw error
      } else if (item.type === 'plan') {
        const { data, error } = await supabase.functions.invoke('shared-plan', { body: { action: 'revoke', token: item.token } })
        if (error || !data?.ok) throw new Error(data?.error || error?.message)
      } else {
        const { data, error } = await supabase.functions.invoke('shared-semester', { body: { action: 'revoke', token: item.token } })
        if (error || !data?.ok) throw new Error(data?.error || error?.message)
      }
      setItems((prev) => prev.filter((x) => x.key !== item.key))
    } catch (e) {
      setError(e.message || 'Kunne ikke tilbakekalle lenken.')
    } finally {
      setRevoking('')
    }
  }

  return (
    <div className="app-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Delte lenker</h3>
          <p className="mt-1 text-sm text-muted">Oversikt over alle aktive delingslenker — tilbakekall når du ikke lenger vil dele.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Lukk">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M6 6 14 14M14 6 6 14" /></svg>
          </button>
        )}
      </div>

      {items === null && <p className="mt-4 text-sm text-muted">Laster…</p>}
      {error && <p className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {items !== null && items.length === 0 && !error && (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-paper px-4 py-6 text-center text-sm text-muted">
          Ingen aktive delingslenker.
        </p>
      )}
      {items !== null && items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <Row
              key={item.key}
              label={`${item.kind}: ${item.label}`}
              sub={item.sub}
              href={item.href}
              expiresAt={item.expiresAt}
              onRevoke={() => revoke(item)}
              revoking={revoking === item.key}
            />
          ))}
        </div>
      )}
    </div>
  )
}
