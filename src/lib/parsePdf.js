import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { parseTimeEdit, detectCourseCode } from './parseTimeEdit'

GlobalWorkerOptions.workerSrc = workerUrl

export async function extractLecturesFromPdf(file) {
  const text = await extractTextFromPdf(file)
  return { lectures: parseTimeEdit(text), courseCode: detectCourseCode(text), text }
}

export async function extractTextFromPdf(file) {
  const data = await file.arrayBuffer()
  // ponytail: herd PDF – deaktiver eval/XFA, begrens sider og total tekst for å hindre OOM/ZIP-bombe
  const doc = await getDocument({ data, isEvalSupported: false, disableXfa: true, maxImageSize: 8_388_608, verbosity: 0 }).promise
  if (doc.numPages > 200) {
    doc.destroy()
    throw new Error('PDF-en har for mange sider (maks 200).')
  }
  let text = ''
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent({ disableCombineTextItems: false })
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
      if (text.length > 200_000) throw new Error('PDF-teksten er for stor (over 200 000 tegn).')
    }
  } finally {
    doc.destroy()
  }
  return text
}
