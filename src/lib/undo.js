export function restoreItem(data, key, item, index) {
  if (!item || data[key].some((x) => x.id === item.id)) return data
  const items = [...data[key]]
  items.splice(Math.min(index, items.length), 0, item)
  return { ...data, [key]: items }
}

export function restoreChapter(data, lectureId, chapter, index) {
  if (!chapter) return data
  return {
    ...data,
    lectures: data.lectures.map((lecture) => {
      if (lecture.id !== lectureId || lecture.chapters.some((c) => c.id === chapter.id)) return lecture
      const chapters = [...lecture.chapters]
      chapters.splice(Math.min(index, chapters.length), 0, chapter)
      return { ...lecture, chapters }
    }),
  }
}

export function restoreSubject(data, removed) {
  if (!removed.subject || data.subjects.some((s) => s.id === removed.subject.id)) return data
  return Object.entries(removed.items).reduce(
    (next, [key, items]) => items.reduce((current, item) => restoreItem(current, key, item, current[key].length), next),
    restoreItem(data, 'subjects', removed.subject, removed.index),
  )
}
