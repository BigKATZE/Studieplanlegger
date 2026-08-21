import { useState } from 'react'

export default function WeekTemplates({ week, templates, onSave, onApply, onRemove }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const save = () => {
    const result = onSave(name)
    setMessage(result.message)
    if (result.ok) setName('')
  }
  const apply = (template) => setMessage(onApply(template).message)
  return <section className="mt-4 rounded-lg border border-line bg-surface p-4">
    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Ukemaler</h3>
    {week == null ? <p className="mt-2 text-sm text-muted">Velg en bestemt uke i filteret for å lagre eller bruke en mal.</p> : <>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="template-name">Navn på ukemal</label>
        <input id="template-name" value={name} onChange={(event) => setName(event.target.value)} maxLength="60" placeholder="Navn på ukemal" className="min-w-40 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm" />
        <button className="btn-ghost" onClick={save}>Lagre uke som mal</button>
      </div>
      {templates.length > 0 && <ul className="mt-3 space-y-2">{templates.map((template) => <li key={template.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{template.name}</span><span className="text-xs text-muted">{template.lectures.length} forelesninger</span><div className="ml-auto flex gap-1"><button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs" onClick={() => apply(template)}>Bruk i uke {week}</button><button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs text-danger" onClick={() => onRemove(template.id)}>Slett</button></div></li>)}</ul>}
    </>}
    {message && <p role={message.startsWith('Kunne') ? 'alert' : 'status'} className="mt-2 text-sm text-muted">{message}</p>}
  </section>
}
