import { useState } from 'react'
import { parseSmartInput } from '../lib/parseSmartInput'
import { fmtShort } from '../lib/date'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

export default function SmartInput({ subjects, onApply }) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    setResult(parseSmartInput(value, subjects))
    setMsg(null)
  }

  const apply = () => {
    const res = result.actions.map((a) => onApply(a))
    const failed = res.find((r) => !r.ok)
    if (failed) {
      setMsg(failed)
      return
    }
    setMsg({ ok: true, message: res.map((r) => r.message).join(' ') })
    setValue('')
    setResult(null)
  }

  return (
    <div className="mt-6">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Skriv naturlig - f.eks. «arbeidskrav 1 i forretningsjus, frist 1. oktober», «eksamen i bedøk 1. november og 3. november» eller «pensum kapittel 3 i forretningsjus». Skill flere med komma."
          className={inputCls}
          aria-label="Generell input"
        />
        <button className="btn-primary" type="submit">Tolk</button>
      </form>

      {result && !result.ok && (
        <p className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{result.error}</p>
      )}
      {result && result.ok && !msg && (
        <div className="mt-2 rounded-md border border-line bg-surface px-3 py-2">
          <ul className="space-y-1">
            {result.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 text-sm">
                <Preview action={a} />
              </li>
            ))}
          </ul>
          <button onClick={apply} className="btn-primary mt-2">Legg til ({result.actions.length})</button>
        </div>
      )}
      {msg && (
        <p className={`mt-2 rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {msg.ok ? msg.message : msg.error}
        </p>
      )}
    </div>
  )
}

function Preview({ action }) {
  if (action.type === 'assignment') {
    return (
      <span>
        Arbeidskrav <b>{action.title}</b> i {action.subject.short}, frist {fmtShort(action.date)}
      </span>
    )
  }
  if (action.type === 'exam') {
    return (
      <span>
        Eksamen: <b>{action.title}</b> i {action.subject.short} {fmtShort(action.date)}
        {action.time ? ` kl. ${action.time}` : ''}
      </span>
    )
  }
  if (action.type === 'reading') {
    return (
      <span>
        Pensum: <b>{action.label}</b> i {action.subject.short}
        {action.date ? `, til ${fmtShort(action.date)}` : ''}
      </span>
    )
  }
  if (action.type === 'lecture') {
    return (
      <span>
        Forelesning i <b>{action.subject.short}</b> {fmtShort(action.date)} kl. {action.time}
        {action.topic ? ` - ${action.topic}` : ''}
      </span>
    )
  }
  return (
    <span>
      Kapittel <b>{action.label}</b>
      {action.subject ? ` i ${action.subject.short}` : ''}
      {action.date ? ` (${fmtShort(action.date)})` : ''} - legges til nærmeste forelesning
    </span>
  )
}
