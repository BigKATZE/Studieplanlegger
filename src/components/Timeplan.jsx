import { useMemo, useState } from 'react'
import { isoWeek, weekRangeByWeek, weekdayShort } from '../lib/date'
import { SubjectChip, WeekFilter } from './ui'

export default function Timeplan({ lectures, subjects, onToggleLecture, onToggleChapter, onUpdateChapter, onRemoveChapter, onRemoveLecture, onEditLecture }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])
  const [week, setWeek] = useState(null)
  const [editingChapter, setEditingChapter] = useState(null)
  const [chapterText, setChapterText] = useState('')

  const groups = useMemo(() => {
    const m = new Map()
    lectures.forEach((l) => {
      const w = isoWeek(new Date(l.date))
      if (!m.has(w)) m.set(w, { week: w, date: new Date(l.date), lectures: [] })
      m.get(w).lectures.push(l)
    })
    const arr = [...m.values()].sort((a, b) => a.date - b.date)
    arr.forEach((g) => g.lectures.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)))
    return arr
  }, [lectures])

  const groupsByWeek = useMemo(() => new Map(groups.map((g) => [g.week, g])), [groups])
  const weeks = useMemo(() => groups.map((g) => g.week), [groups])
  // Kun uker som faktisk har forelesninger vises som standard, ellers ville siden
  // vise ~43 tomme «Uke N»-seksjoner for hele skoleåret (DEFAULT_WEEKS).
  const renderWeeks = week == null ? weeks : [week]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Uke for uke</h2>
        <WeekFilter weeks={weeks} active={week} onChange={setWeek} />
      </div>
      {lectures.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          Ingen forelesninger ennå. Importer en timeplan eller legg til manuelt.
        </p>
      )}
      <div className="mt-3 space-y-6">
        {renderWeeks.map((w) => {
          const g = groupsByWeek.get(w)
          return (
            <div key={w}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-lg font-semibold">Uke {w}</h3>
                <span className="text-xs text-muted">{weekRangeByWeek(w)}</span>
              </div>
              <div className="mt-2 space-y-2">
                {g?.lectures.map((l) => {
                const date = new Date(l.date)
                const subject = subjectById[l.subjectId]
                return (
                  <div key={l.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm" title="Merket forelesning = deltatt / gjennomgått">
                        <input
                          type="checkbox"
                          checked={l.done}
                          onChange={() => onToggleLecture(l.id)}
                          className="h-4 w-4 accent-secondary"
                        />
                        <span className="w-28 font-medium">
                          {weekdayShort(date)} {date.getDate()}.{date.getMonth() + 1}.
                        </span>
                      </label>
                      <span className="text-sm">{l.start}–{l.end}</span>
                      {subject && <SubjectChip subject={subject} />}
                      {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
                      {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditLecture(l)}
                          className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => onRemoveLecture(l.id)}
                          className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:border-danger hover:text-danger"
                        >
                          Fjern
                        </button>
                      </div>
                    </div>
                    {l.topic && <p className="mt-1 pl-6 text-sm text-muted">{l.topic}</p>}
                    {l.chapters.length > 0 && (
                      <ul className="mt-2 space-y-1 pl-6">
                        {l.chapters.map((c) => (
                          <li key={c.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={c.done}
                              onChange={() => onToggleChapter(l.id, c.id)}
                              className="h-4 w-4 accent-secondary"
                            />
                            {editingChapter === c.id ? (
                              <>
                                <input
                                  value={chapterText}
                                  onChange={(e) => setChapterText(e.target.value)}
                                  className="flex-1 rounded-md border border-line bg-paper px-2 py-1 text-sm focus:border-secondary focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    if (chapterText.trim()) onUpdateChapter(l.id, c.id, chapterText.trim())
                                    setEditingChapter(null)
                                  }}
                                  className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                                >
                                  Lagre
                                </button>
                                <button
                                  onClick={() => setEditingChapter(null)}
                                  className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-ink"
                                >
                                  Avbryt
                                </button>
                              </>
                            ) : (
                              <>
                                <span className={`flex-1 text-sm ${c.done ? 'text-muted line-through' : ''}`}>{c.text}</span>
                                <button
                                  onClick={() => {
                                    setEditingChapter(c.id)
                                    setChapterText(c.text)
                                  }}
                                  className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:border-primary hover:text-primary"
                                >
                                  Rediger
                                </button>
                                <button
                                  onClick={() => onRemoveChapter(l.id, c.id)}
                                  className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:border-danger hover:text-danger"
                                >
                                  Fjern
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}