export function checkFile(file, { maxBytes, types: _types = [], extensions = [] }) {
  if (!file) return null
  const rawName = String(file.name || '')
  const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : ''
  // ponytail: MIME er klient-kontrollert – krev gyldig endelse, magic-byte valideres ved parsing
  if (!extensions.includes(ext)) {
    return `Ugyldig filtype («${rawName}»).`
  }
  if (file.size > maxBytes) {
    return `Filen er for stor (${Math.ceil(file.size / (1024 * 1024))} MB). Maks ${maxBytes / (1024 * 1024)} MB.`
  }
  return null
}