import { normalizePlannerData, PLANNER_COLLECTIONS } from './store.js'

export const MAX_ARCHIVES = 20
export const hasSemesterContent = (data) => PLANNER_COLLECTIONS.some((key) => data[key]?.length > 0)
const snapshot = (data) => normalizePlannerData(data, false)

function entry(data, name, id, now) {
  if (!name?.trim()) throw new Error('Gi semesteret et navn.')
  return { id, name: name.trim().slice(0, 100), createdAt: now.toISOString(), data: snapshot(data) }
}

function checkSize(data) {
  // Leave headroom in browser storage and keep backups below the 5 MB import limit.
  if (new TextEncoder().encode(JSON.stringify(data, null, 2)).length > 4 * 1024 * 1024) {
    throw new Error('Planen og arkivet tar for mye plass. Last ned og fjern et eldre arkiv før du fortsetter.')
  }
  return data
}

export function archiveSemester(data, name, id, now = new Date()) {
  if (!hasSemesterContent(data)) throw new Error('Den aktive planen er tom.')
  const archives = data.semesterArchives ?? []
  if (archives.length >= MAX_ARCHIVES) throw new Error('Arkivet er fullt (20 semestre). Last ned og fjern et eldre arkiv først.')
  if (archives.some((item) => item.id === id)) throw new Error('Semesteret er allerede arkivert.')
  return checkSize({ ...snapshot({}), semesterArchives: [entry(data, name, id, now), ...archives] })
}

export function restoreSemester(data, archiveId, replacementId, now = new Date()) {
  const selected = data.semesterArchives?.find((item) => item.id === archiveId)
  if (!selected) throw new Error('Fant ikke semesteret. Oppdater siden og prøv igjen.')
  const remaining = data.semesterArchives.filter((item) => item.id !== archiveId)
  if (hasSemesterContent(data)) {
    if (remaining.some((item) => item.id === replacementId)) throw new Error('Kunne ikke lage et nytt arkiv. Prøv igjen.')
    remaining.unshift(entry(data, `Plan før gjenoppretting ${now.toLocaleDateString('nb-NO')}`, replacementId, now))
  }
  return checkSize({ ...snapshot(selected.data), semesterArchives: remaining })
}
