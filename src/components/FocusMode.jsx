import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modals'

export default function FocusMode({ items, initialTarget, onClose, onComplete }) {
  const [targetId, setTargetId] = useState(initialTarget ?? items[0]?.key ?? '')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const target = useMemo(() => items.find((item) => item.key === targetId), [items, targetId])
  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { setRunning(false); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [running])
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <Modal title="Fokusøkt" onClose={onClose}>
    <div className="space-y-4">
      {items.length === 0 ? <p role="status" className="rounded-md bg-paper p-4 text-sm text-muted">Ingen åpne oppgaver å fokusere på. Legg til eller åpne en aktivitet først.</p> : <>
        <label className="block text-sm font-medium" htmlFor="focus-target">Velg oppgave</label>
        <select id="focus-target" value={targetId} onChange={(event) => setTargetId(event.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
          {items.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
        </select>
        <p role="status" aria-live="polite" className="text-center font-mono text-5xl font-semibold tabular-nums">{display}</p>
        <p className="text-center text-sm text-muted">{running ? 'Fokusøkten pågår.' : seconds === 0 ? 'Tiden er ute.' : 'Klar for 25 minutter med fokus.'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Start'}</button>
          <button className="btn-ghost" onClick={() => { setRunning(false); setSeconds(25 * 60) }}>Nullstill</button>
          {target && target.type !== 'exam' && <button className="btn-ghost" onClick={() => { onComplete(target); onClose() }}>Marker ferdig</button>}
        </div>
      </>}
    </div>
  </Modal>
}
