export function checkFile(file, { maxBytes, types = [], extensions = [] }) {
  if (!file) return null
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!types.includes(file.type) && !extensions.includes(ext)) {
    return `Ugyldig filtype («${file.name}»).`
  }
  if (file.size > maxBytes) {
    return `Filen er for stor (${Math.ceil(file.size / (1024 * 1024))} MB). Maks ${maxBytes / (1024 * 1024)} MB.`
  }
  return null
}