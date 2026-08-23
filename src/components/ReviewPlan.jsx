import { useState } from 'react'
import { SubjectChip, Select } from './ui'
import { iso } from '../lib/date'

export default function ReviewPlan({ reviews, subjects, onAdd, onComplete, onDefer, onRemove }) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const today = iso(new Date())
  const submit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    onAdd({ title, details, subjectId })
    setTitle('')
    setDetails('')
    setSubjectId('')
  }
  const sorted = [...reviews].sort((a, b) => a.nextReview.localeCompare(b.nextReview))
  return (
    <section className="mt-8 rounded-lg card-glass p-4 card-lift">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Repetisjonsplan</h2>
      <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="sr-only" htmlFor="review-title">Hva vil du repetere?</label>
        <input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hva vil du repetere?" className="rounded-md border border-line bg-paper px-3 py-2 text-sm" required />
        <label className="sr-only" htmlFor="review-details">Notat eller svar</label>
        <input id="review-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Notat eller svar" className="rounded-md border border-line bg-paper px-3 py-2 text-sm" />
        <Select
          value={subjectId}
          onChange={setSubjectId}
          options={[{ value: '', label: 'Uten fag' }, ...subjects.map((subject) => ({ value: subject.id, label: subject.short || subject.name }))]}
          ariaLabel="Fag for repetisjon"
          placeholder="Uten fag"
          className="min-w-0"
        />
        <button className="btn-primary" type="submit">Legg til</button>
      </form>
      {sorted.length === 0 ? <p className="mt-3 text-sm text-muted">Ingen repetisjoner ennå. Legg til et spørsmål eller bruk AI-spørsmålene.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {sorted.map((review) => {
            const due = review.nextReview <= today
            return <li key={review.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className={`font-medium ${due ? 'text-warning' : 'text-muted'}`}>{due ? (review.nextReview < today ? 'Forfalt' : 'I dag') : review.nextReview}</span>
              <span className="font-medium">{review.title}</span>
              {review.details && <details className="text-muted"><summary className="cursor-default text-secondary">Vis notat</summary><p className="mt-1 max-w-prose whitespace-pre-wrap">{review.details}</p></details>}
              <SubjectChip subject={subjects.find((subject) => subject.id === review.subjectId)} />
              <div className="ml-auto flex gap-1">
                <button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs" onClick={() => onComplete(review.id)}>Ferdig</button>
                <button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs" onClick={() => onDefer(review.id)}>Utsett</button>
                <button className="btn-ghost !min-h-8 !px-2 !py-1 text-xs text-danger" onClick={() => onRemove(review.id)}>Fjern</button>
              </div>
            </li>
          })}
        </ul>
      )}
    </section>
  )
}
