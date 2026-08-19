import { useState } from 'react'
import { Modal } from './Modals'
import { canvasFetchAssignments, mapCanvasRows } from '../lib/canvas'

const inputCls =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20'

export default function CanvasModal({ subjects, onImport, onClose }) {
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [state, setState] = useState('config') // config | loading | review
  const [error, setError] = useState('')
  const [groups, setGroups] = useState([])

  const connect = async (e) => {
    e.preventDefault()
    if (!baseUrl.trim() || !token.trim()) return
    setState('loading')
    setError('')
    try {
      const { courses, assignmentsByCourse } = await canvasFetchAssignments(baseUrl.trim(), token.trim())
      const rows = mapCanvasRows(courses, assignmentsByCourse, subjects)
      if (rows.length === 0) {
        setError('Fant ingen oppgaver med frist. Er token-en gyldig og skolen koblet til riktig URL?')
        setState('config')
        return
      }
      const byCourse = new Map()
      for (const r of rows) {
        if (!byCourse.has(r.courseCode)) byCourse.set(r.courseCode, { ...r, rows: [] })
        byCourse.get(r.courseCode).rows.push({ include: true, title: r.title, deadline: r.deadline })
      }
      setGroups([...byCourse.values()].map((g) => ({
        courseCode: g.courseCode,
        courseName: g.courseName,
        subjectValue: g.subjectId ?? 'new',
        rows: g.rows,
      })))
      setState('review')
    } catch (err) {
      console.error(err)
      setError(
        err instanceof TypeError
          ? 'Kunne ikke nå Canvas. Sjekk at URL-en er riktig og at skolen tillater tilgang fra nettleser (CORS).'
          : err.message,
      )
      setState('config')
    }
  }

  const patchRow = (gi, ri, fields) =>
    setGroups((gs) =>
      gs.map((g, i) => (i === gi ? { ...g, rows: g.rows.map((r, j) => (j === ri ? { ...r, ...fields } : r)) } : g)),
    )
  const patchGroup = (gi, fields) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...fields } : g)))

  const confirm = () => {
    onImport(groups)
    onClose()
  }

  return (
    <Modal title="Importer fra Canvas" onClose={onClose}>
      {state !== 'review' ? (
        <form onSubmit={connect} className="space-y-4">
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Canvas-URL (din skole)</span>
            <input
              className={inputCls}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://skolen.instructure.com"
              required
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Access token</span>
            <input
              type="password"
              className={inputCls}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="~token~"
              required
            />
            <p className="mt-1 text-xs text-muted">
              Token-en finner du i Canvas under Konto → Innstillinger → «New Access Token». Den lagres ikke i programmet.
            </p>
          </div>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {state === 'loading' && <p className="text-sm text-muted">Henter kurs og oppgaver fra Canvas…</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="submit" className="btn-primary" disabled={state === 'loading'}>
              {state === 'loading' ? 'Kobler til…' : 'Koble til'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Fant arbeidskrav i {groups.length} kurs. Fag kobles automatisk mot eksisterende fag – eller opprettes som nytt fag. Gjennomgå før import.
          </p>
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <div key={g.courseCode} className="rounded-md border border-line bg-paper/60 p-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{g.courseName || g.courseCode}</span>
                  <select
                    value={g.subjectValue}
                    onChange={(e) => patchGroup(gi, { subjectValue: e.target.value })}
                    className={`${inputCls} ml-auto w-48`}
                    aria-label={`Fag for ${g.courseName}`}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.short}</option>
                    ))}
                    <option value="new">Nytt fag: {g.courseName || g.courseCode}</option>
                  </select>
                </div>
                {g.rows.map((r, ri) => (
                  <div key={ri} className="flex flex-wrap items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => patchRow(gi, ri, { include: e.target.checked })}
                      className="h-4 w-4 accent-secondary"
                      aria-label={`Inkluder ${r.title}`}
                    />
                    <input
                      type="text"
                      value={r.title}
                      onChange={(e) => patchRow(gi, ri, { title: e.target.value })}
                      className={`${inputCls} min-w-32 flex-1`}
                    />
                    <input
                      type="date"
                      value={r.deadline}
                      onChange={(e) => patchRow(gi, ri, { deadline: e.target.value })}
                      className={`${inputCls} w-36`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="button" onClick={confirm} className="btn-primary">Importer valgte</button>
          </div>
        </div>
      )}
    </Modal>
  )
}