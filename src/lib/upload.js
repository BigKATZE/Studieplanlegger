export function checkFile(file, { maxBytes, types: _types = [], extensions = [] }) {
  if (!file) return null
  const rawName = String(file.name || '')
  const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : ''
  // ponytail: MIME er klient-kontrollert – krev gyldig endelse, magic-byte valideres separat
  if (!extensions.includes(ext)) {
    return `Ugyldig filtype («${rawName}»).`
  }
  if (file.size > maxBytes) {
    return `Filen er for stor (${Math.ceil(file.size / (1024 * 1024))} MB). Maks ${maxBytes / (1024 * 1024)} MB.`
  }
  return null
}

export async function validateFileMagic(file) {
  const rawName = String(file.name || '')
  const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : ''
  try {
    const header = await file.slice(0, 2048).text()
    const trimmed = header.trimStart()
    if (ext === 'pdf' && !trimmed.startsWith('%PDF')) return `Filen ser ikke ut som en PDF («${rawName}»).`
    if ((ext === 'ics' || ext === 'ical') && !trimmed.includes('BEGIN:VCALENDAR')) return `Filen ser ikke ut som en iCal-fil («${rawName}»).`
    if (ext === 'json' && trimmed && !['{', '['].includes(trimmed[0])) return `Filen ser ikke ut som JSON («${rawName}»).`
  } catch {
    // hvis slicing feiler, la parsing feile senere med tydelig melding
  }
  return null
}