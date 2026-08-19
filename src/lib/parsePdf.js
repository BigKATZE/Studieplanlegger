import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { parseTimeEdit, detectCourseCode } from './parseTimeEdit'

GlobalWorkerOptions.workerSrc = workerUrl

export async function extractLecturesFromPdf(file) {
  const data = await file.arrayBuffer()
  const doc = await getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const items = content.items
      .filter((it) => it.str)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    let cur = null
    const lines = []
    for (const it of items) {
      const y = Math.round(it.y)
      if (!cur || Math.abs(y - cur.y) > 2) {
        cur = { y, parts: [] }
        lines.push(cur)
      }
      cur.parts.push(it.str)
    }
    text += lines.map((l) => l.parts.join(' ')).join('\n') + '\n'
  }
  return { lectures: parseTimeEdit(text), courseCode: detectCourseCode(text), text }
}