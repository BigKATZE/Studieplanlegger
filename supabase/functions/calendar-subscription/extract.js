import { exportCalendar } from '../_shared/calendarExport.js'

export const EVENT_TYPES = ['lectures', 'assignments', 'exams', 'reviews']
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const identifier = (value) => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : ''
const temporal = (value) => value == null || value === '' ? '' : typeof value === 'string' && value.length <= 10 ? value : 'invalid'

export function validScope(subjectIds, types) {
  return Array.isArray(subjectIds) && subjectIds.length > 0 && subjectIds.length <= 100
    && subjectIds.every(identifier) && new Set(subjectIds).size === subjectIds.length
    && Array.isArray(types) && types.length > 0 && types.length <= EVENT_TYPES.length
    && types.every((type) => EVENT_TYPES.includes(type)) && new Set(types).size === types.length
}

export function extractCalendar(data, subjectIds, types) {
  if (!record(data) || !validScope(subjectIds, types)) throw new Error('invalid-data')
  const collection = (key) => {
    if (data[key] === undefined) return []
    if (!Array.isArray(data[key]) || data[key].length > 10_000) throw new Error('invalid-collection')
    return data[key]
  }
  const selected = new Set(subjectIds)
  const subjects = new Map()
  for (const item of collection('subjects')) {
    if (!record(item) || !identifier(item.id) || !selected.has(item.id)) continue
    if (subjects.has(item.id)) throw new Error('duplicate-subject')
    subjects.set(item.id, { id: item.id, name: text(item.name, 300), short: text(item.short, 100) })
  }
  const result = { subjects: [...subjects.values()] }
  let count = 0
  for (const type of types) {
    const ids = new Set()
    result[type] = []
    for (const item of collection(type)) {
      if (!record(item) || !subjects.has(item.subjectId) || !identifier(item.id)) continue
      if (ids.has(item.id)) throw new Error('duplicate-event')
      ids.add(item.id)
      if (++count > 2000) throw new Error('too-many-events')
      const event = { id: item.id, subjectId: item.subjectId }
      // Only these fields ever reach the serializer; no notes, archives or object spreads.
      if (type === 'lectures') Object.assign(event, { date: temporal(item.date), start: temporal(item.start), end: temporal(item.end), topic: text(item.topic, 500), room: text(item.room, 200) })
      if (type === 'assignments') Object.assign(event, { deadline: temporal(item.deadline), title: text(item.title, 500) })
      if (type === 'exams') Object.assign(event, { date: temporal(item.date), time: temporal(item.time), title: text(item.title, 500) })
      if (type === 'reviews') Object.assign(event, { nextReview: temporal(item.nextReview), title: text(item.title, 500) })
      result[type].push(event)
    }
  }
  return result
}

export function subscriptionCalendar(row, subscription) {
  const timestamps = [row.updated_at, subscription.created_at].map((value) => typeof value === 'string' ? Date.parse(value) : NaN)
  if (timestamps.some((value) => !Number.isFinite(value))) throw new Error('invalid-timestamp')
  const projected = extractCalendar(row.data, subscription.subject_ids, subscription.event_types)
  const result = exportCalendar(projected, { types: subscription.event_types, includeCompleted: true, uidNamespace: subscription.id }, new Date(Math.max(...timestamps)))
  if (new TextEncoder().encode(result.text).length > 4 * 1024 * 1024) throw new Error('feed-too-large')
  return result.text
}
