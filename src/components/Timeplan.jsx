import { useMemo, useState } from 'react'
import { isoWeek, weekRangeByWeek, weekdayShort, fmtShort, DEFAULT_WEEKS } from '../lib/date'
import { CompletedFilterButton, SubjectChip, WeekFilter } from './ui'
import { findLectureConflictIds } from '../lib/plannerFeatures'
import WeekTemplates from './WeekTemplates'

export default function Timeplan({ lectures, subjects, week, onWeekChange, onToggleLecture, onSetLectureAttendance, onToggleChapter, onUpdateChapter, onRemoveChapter, onRemoveLecture, onEditLecture, weekTemplates = [], onSaveTemplate, onApplyTemplate, onRemoveTemplate, conflictIds: suppliedConflictIds, hideCompleted = false, onToggleHideCompleted }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects])
  const [editingChapter, setEditingChapter] = useState(null)
  const [chapterText, setChapterText] = useState('')
  const completedCount = useMemo(() => lectures.reduce((total, lecture) => total + (lecture.done ? 1 : lecture.chapters.filter((chapter) => chapter.done).length), 0), [lectures])
  const visibleLectures = useMemo(() => hideCompleted ? lectures.filter((lecture) => !lecture.done) : lectures, [hideCompleted, lectures])
  const detectedConflictIds = useMemo(() => findLectureConflictIds(visibleLectures), [visibleLectures])
  const conflictIds = suppliedConflictIds ?? detectedConflictIds

  const groups = useMemo(() => {
    const m = new Map()
    visibleLectures.forEach((l) => {
      const w = isoWeek(new Date(l.date))
      if (!m.has(w)) m.set(w, { week: w, date: new Date(l.date), lectures: [] })
      m.get(w).lectures.push(l)
    })
    const arr = [...m.values()].sort((a, b) => a.date - b.date)
    arr.forEach((g) => g.lectures.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)))
    return arr
  }, [visibleLectures])

  const groupsByWeek = useMemo(() => new Map(groups.map((g) => [g.week, g])), [groups])
  const weeks = DEFAULT_WEEKS
  const renderWeeks = week == null ? DEFAULT_WEEKS : [week]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">Uke for uke</h2>
        <div className="flex items-center justify-end gap-2">
          <CompletedFilterButton active={hideCompleted} count={completedCount} onChange={onToggleHideCompleted} />
          <WeekFilter weeks={weeks} active={week} onChange={onWeekChange} />
        </div>
      </div>
      <WeekTemplates week={week} templates={weekTemplates} onSave={onSaveTemplate} onApply={onApplyTemplate} onRemove={onRemoveTemplate} />
      {visibleLectures.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          {hideCompleted && lectures.length > 0 ? 'Alle fullførte forelesninger er skjult.' : 'Ingen forelesninger ennå. Importer en timeplan eller legg til manuelt.'}
        </p>
      )}
      <div className="mt-3 space-y-6">
        {renderWeeks.map((w) => {
          const g = groupsByWeek.get(w)
          return (
            <div key={w}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-semibold">Uke {w}</h3>
                  <span className="text-xs text-muted">{weekRangeByWeek(w)}</span>
                </div>
                {g?.lectures.length > 0 && onSetLectureAttendance && (() => {
                  const allDone = g.lectures.every((l) => l.done)
                  return (
                    <button
                      onClick={() => onSetLectureAttendance(g.lectures.map((l) => l.id), !allDone)}
                      title={allDone ? 'Fjern markering for uken' : 'Marker alle i uken som deltatt'}
                      aria-label={allDone ? `Fjern markering for uke ${w}` : `Marker alle i uke ${w} som deltatt`}
                      className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium transition-all duration-200 active:scale-95 ${allDone ? 'border-secondary bg-secondary text-white shadow-sm' : 'border-line bg-surface text-muted hover:border-secondary/40 hover:text-ink'}`}
                    >
                      {allDone ? 'Fjern alle' : 'Marker alle'}
                    </button>
                  )
                })()}
              </div>
              <div className="mt-2 space-y-2">
                {g?.lectures.map((l) => {
                const date = new Date(l.date)
                const subject = subjectById[l.subjectId]
                const chapters = hideCompleted ? l.chapters.filter((chapter) => !chapter.done) : l.chapters
                return (
                  <div key={l.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <button
                        onClick={() => onToggleLecture(l.id)}
                        aria-pressed={l.done}
                        aria-label={l.done ? 'Fjern deltakelse' : 'Marker som deltatt'}
                        title={l.done ? 'Fjern deltakelse' : 'Marker som deltatt'}
                        className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all duration-200 active:scale-95 ${l.done ? 'border-secondary bg-secondary text-white shadow-sm' : 'border-line bg-surface text-muted hover:border-secondary/40 hover:text-ink'}`}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-3 w-3 transition-opacity ${l.done ? 'opacity-100' : 'opacity-45'}`}>
                          <path d="M2.8 6.2 5 8.4 9.2 3.6" />
                        </svg>
                        {l.done ? 'Deltatt' : null}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {weekdayShort(date)} {fmtShort(date)}
                        </span>
                        <span className="text-sm">{l.start}-{l.end}</span>
                      </div>
                      {subject && <SubjectChip subject={subject} />}
                      {l.room && <span className="font-mono text-xs text-muted">{l.room}</span>}
                      {l.lecturer && <span className="text-xs text-muted">{l.lecturer}</span>}
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => onEditLecture(l)}
                          className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                          aria-label="Rediger forelesning"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => onRemoveLecture(l.id)}
                          className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                          aria-label="Fjern forelesning"
                        >
                          Fjern
                        </button>
                      </div>
                    </div>
                    {l.topic && <p className="mt-1 pl-6 text-sm text-muted">{l.topic}</p>}
                    {conflictIds.has(l.id) && <p role="alert" className="mt-2 pl-6 text-sm text-warning">Tidskonflikt med en annen forelesning denne dagen.</p>}
                    {chapters.length > 0 && (
                      <div className="mt-2 pl-6">
                        <p className="mb-1 text-xs font-medium text-muted">
                          {chapters.length === 1 ? 'Kapittel' : 'Kapitler'}
                        </p>
                        <ul className="space-y-1">
                        {chapters.map((c) => (
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
                                  className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-ink"
                                  aria-label="Rediger kapittel"
                                >
                                  Rediger
                                </button>
                                <button
                                  onClick={() => onRemoveChapter(l.id, c.id)}
                                  className="rounded p-1 text-xs text-muted hover:bg-paper hover:text-danger"
                                  aria-label="Fjern kapittel"
                                >
                                  Fjern
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                        </ul>
                      </div>
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
