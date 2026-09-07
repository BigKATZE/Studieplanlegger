import assert from 'node:assert/strict'
import { weeklyWorkload } from './plannerFeatures.js'
import { isValidBackupData, normalizeMinutes, normalizePlannerData, PLANNER_COLLECTIONS } from './store.js'
import { archiveSemester, restoreSemester, hasSemesterContent } from './semesterArchive.js'

const empty = { subjects: [], lectures: [] }
assert.equal(normalizePlannerData(empty).weeklyBudgetMinutes, null)
assert.equal(PLANNER_COLLECTIONS.includes('weeklyBudgetMinutes'), false)
for (const value of [undefined, null, -1, 1.5, 10081, NaN, Infinity, '60', '', true, [], {}]) {
  assert.equal(normalizeMinutes(value), null)
  const data = normalizePlannerData({ ...empty, weeklyBudgetMinutes: value, assignments: [{ id: 'a', estimatedMinutes: value }], readings: [{ id: 'r', estimatedMinutes: value }] })
  assert.equal(data.weeklyBudgetMinutes, null)
  assert.equal(data.assignments[0].estimatedMinutes, null)
  assert.equal(data.readings[0].estimatedMinutes, null)
  assert.equal(isValidBackupData({ ...empty, weeklyBudgetMinutes: value }), value === null)
}
assert.equal(isValidBackupData(empty), true)
for (const value of [0, 1, 60, 10080]) {
  const data = normalizePlannerData({ ...empty, weeklyBudgetMinutes: value, assignments: [{ id: 'a', estimatedMinutes: value }], readings: [{ id: 'r', estimatedMinutes: value }] })
  assert.equal(data.weeklyBudgetMinutes, value)
  assert.equal(data.assignments[0].estimatedMinutes, value)
  assert.equal(data.readings[0].estimatedMinutes, value)
  assert.equal(isValidBackupData(data), true)
  assert.deepEqual(normalizePlannerData(JSON.parse(JSON.stringify(data))), data)
}
assert.equal(isValidBackupData({ ...empty, surprise: 60 }), false)
assert.equal(isValidBackupData({ ...empty, readings: 60 }), false)

const now = new Date(2026, 8, 9, 12)
const data = normalizePlannerData({
  ...empty, weeklyBudgetMinutes: 180,
  assignments: [
    { id: 'mon', deadline: '2026-09-07', estimatedMinutes: 60 },
    { id: 'sun', deadline: '2026-09-13', estimatedMinutes: 30, status: 'in_progress' },
    { id: 'missing', deadline: '2026-09-09' },
    { id: 'zero', deadline: '2026-09-09', estimatedMinutes: 0 },
    { id: 'done', deadline: '2026-09-09', status: 'done', estimatedMinutes: 500 },
    { id: 'next', deadline: '2026-09-14', estimatedMinutes: 200 },
    { id: 'overdue', deadline: '2026-09-06', estimatedMinutes: 45 },
    { id: 'overdue-missing', deadline: '2026-09-05' },
    { id: 'undated' },
  ],
  readings: [
    { id: 'partial', week: 37, estimatedMinutes: 120, chapters: [{ text: 'A', done: true }, { text: 'B', done: false }] },
    { id: 'finished', week: 37, estimatedMinutes: 900, chapters: [{ text: 'A', done: true }] },
    { id: 'done', week: 37, done: true, estimatedMinutes: 900 },
    { id: 'unknown', week: 37 },
    { id: 'unplanned', week: null, estimatedMinutes: 20 },
  ],
  lectures: [{ id: 'l', date: '2026-09-09', start: '09:00', end: '12:00' }],
  workPlans: [{ id: 'p', title: 'Alternative plan', assignmentId: 'mon', steps: [{ id: 'step', title: 'Work', estimatedMinutes: 600 }] }],
})
const before = structuredClone(data)
const result = weeklyWorkload(data, now, now)
assert.equal(result.from, '2026-09-07')
assert.equal(result.to, '2026-09-13')
assert.deepEqual(result.assignments, { count: 4, minutes: 90, missing: 1 })
assert.deepEqual(result.readings, { count: 2, minutes: 120, missing: 1 })
assert.deepEqual(result.overdue, { count: 2, minutes: 45, missing: 1 })
assert.deepEqual(result.unplanned, { count: 2, minutes: 20, missing: 1 })
assert.equal(result.minutes, 210)
assert.equal(result.missing, 2)
assert.equal(result.availableMinutes, -30)
assert.deepEqual(data, before)
assert.equal(weeklyWorkload({ ...data, weeklyBudgetMinutes: null }, now, now).availableMinutes, null)
assert.equal(weeklyWorkload({ ...data, weeklyBudgetMinutes: 0 }, now, now).availableMinutes, -210)
assert.equal(weeklyWorkload({ ...empty, weeklyBudgetMinutes: 0 }, now, now).availableMinutes, 0)
assert.equal(weeklyWorkload({ ...data, weeklyBudgetMinutes: 300 }, now, now).availableMinutes, 90)
assert.deepEqual(weeklyWorkload(data, new Date(2026, 8, 13, 23, 59), now), result)
assert.equal(weeklyWorkload(data, new Date(2026, 8, 14), now).assignments.minutes, 200)
assert.equal(weeklyWorkload(data, new Date(2027, 8, 13), now).readings.count, 0)
assert.throws(() => weeklyWorkload(data, new Date(NaN), now), /dato/)

// ISO week 53 crosses calendar years but is still in the active school year.
const rollover = { ...empty, assignments: [{ deadline: '2027-01-03', estimatedMinutes: 10 }, { deadline: '2027-01-04', estimatedMinutes: 20 }], readings: [{ week: 53, estimatedMinutes: 30 }, { week: 1, estimatedMinutes: 40 }] }
const lastWeek = weeklyWorkload(rollover, new Date(2027, 0, 1), now)
assert.equal(lastWeek.from, '2026-12-28')
assert.equal(lastWeek.to, '2027-01-03')
assert.equal(lastWeek.minutes, 40)
assert.equal(weeklyWorkload(rollover, new Date(2027, 0, 4), now).minutes, 60)
assert.equal(weeklyWorkload(rollover, new Date(2026, 0, 1), now).readings.count, 0)
assert.equal(weeklyWorkload(rollover, new Date(2028, 0, 3), now).readings.count, 0)
const invalidWeek = weeklyWorkload({ ...empty, readings: [{ week: 53, estimatedMinutes: 25 }] }, now, new Date(2025, 8, 1))
assert.deepEqual(invalidWeek.unplanned, { count: 1, minutes: 25, missing: 0 })

// Summer weeks are supported; DST does not change local Monday/Sunday boundaries.
for (const [date, from, to, week] of [
  [new Date(2027, 2, 28), '2027-03-22', '2027-03-28', 12],
  [new Date(2026, 9, 25), '2026-10-19', '2026-10-25', 43],
  [new Date(2027, 6, 12), '2027-07-12', '2027-07-18', 28],
]) {
  const summary = weeklyWorkload({ ...empty, readings: [{ week, estimatedMinutes: 15 }] }, date, now)
  assert.equal(summary.from, from)
  assert.equal(summary.to, to)
  assert.equal(summary.readings.minutes, 15)
}

const archived = archiveSemester(data, 'Workload semester', 'archive', now)
assert.equal(archived.weeklyBudgetMinutes, null)
assert.equal(archived.semesterArchives[0].data.weeklyBudgetMinutes, 180)
assert.equal(isValidBackupData(archived), true)
assert.equal(isValidBackupData(archived.semesterArchives[0].data), true)
assert.deepEqual(restoreSemester(normalizePlannerData(JSON.parse(JSON.stringify(archived))), 'archive', 'unused', now), data)
assert.equal(hasSemesterContent(normalizePlannerData({ weeklyBudgetMinutes: 60 })), false)
archived.semesterArchives[0].data.weeklyBudgetMinutes = '180'
assert.equal(isValidBackupData(archived), false)
