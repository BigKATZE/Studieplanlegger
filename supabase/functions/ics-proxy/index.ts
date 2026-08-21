// supabase/functions/ics-proxy/index.ts
//
// Henter en ekstern iCal-feed (f.eks. Canvas-kalender) server-side og
// returnerer teksten til frontend. Løser to problemer med å gjøre dette
// direkte fra nettleseren:
//
//  1. CSP-en i vercel.json (connect-src) tillater kun kall til 'self' og
//     Supabase-prosjektets URL – ikke vilkårlige eksterne domener. Denne
//     funksjonen kjører på Supabase-URL-en, som allerede er hvitelistet,
//     så CSP-en trenger IKKE å utvides for at dette skal virke.
//  2. De fleste Canvas/skole-kalenderfeeder sender ingen CORS-headere,
//     så et direkte fetch() fra nettleseren ville feilet uansett – det
//     er derfor den gamle koden alltid falt tilbake til "last opp fil".
//
// Sikkerhet:
//  - Supabase verifiserer JWT-en i Authorization-headeren automatisk før
//    funksjonen kalles (med mindre "verify_jwt = false" er satt i
//    supabase/config.toml) – kun innloggede brukere kan altså nå denne.
//  - I tillegg gjør vi en enkel SSRF-sjekk: vi slår opp hostnavnet og
//    avviser private/lokale IP-er (loopback, RFC1918, link-local/
//    cloud-metadata). Merk: dette er ikke vanntett mot DNS-rebinding
//    (target kan i teorien endre DNS-svar mellom sjekk og faktisk
//    fetch) – for høyere sikkerhet bør en fast allow-list av kjente
//    LMS-domener (Canvas, itslearning, Feide osv.) vurderes i tillegg.
//  - Svarstørrelse og -tid er begrenset.

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB – matcher grensen i frontend
const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    Vary: 'Origin',
  }
}

function jsonError(message: string, status: number, origin: string | null) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 127 || a === 10 || a === 0) return true // loopback, 10/8, "this network"
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
    if (a === 192 && b === 168) return true // 192.168/16
    if (a === 169 && b === 254) return true // link-local (inkl. sky-metadata 169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64/10
    return false
  }
  const low = ip.toLowerCase()
  // håndter IPv4-mappet IPv6 ::ffff:127.0.0.1
  const mapped = low.startsWith('::ffff:') ? low.slice(7) : low
  if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) {
    const parts = mapped.split('.').map(Number)
    const a = parts[0]; const b = parts[1]
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  if (low === '::1') return true // loopback
  if (low.startsWith('fe80:')) return true // link-local
  if (low.startsWith('fc') || low.startsWith('fd')) return true // unique local
  return false
}

async function isBlockedTarget(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) return true
  if (lower.includes(':')) {
    // IPv6 literal uten brackets – sjekk direkte
    if (isPrivateIp(lower)) return true
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) return isPrivateIp(lower)
  // avvis userinfo-smugling: hostname skal ikke inneholde @, men sjekk også at lower ikke er tom
  if (!lower || lower.includes('@') || lower.includes('..')) return true
  try {
    const [a, aaaa] = await Promise.all([
      Deno.resolveDns(hostname, 'A').catch(() => []),
      Deno.resolveDns(hostname, 'AAAA').catch(() => []),
    ])
    const addrs = [...a, ...aaaa]
    if (addrs.length === 0) return true // kan ikke slås opp -> avvis
    return addrs.some(isPrivateIp)
  } catch {
    return true
  }
}

async function fetchValidated(start: URL, signal: AbortSignal): Promise<Response> {
  let url = start
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    if (await isBlockedTarget(url.hostname)) throw new Error('blocked-target')
    const response = await fetch(url, { redirect: 'manual', signal })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response
    const location = response.headers.get('location')
    if (!location || redirects === MAX_REDIRECTS) throw new Error('invalid-redirect')
    url = new URL(location, url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid-redirect')
  }
  throw new Error('invalid-redirect')
}

async function readLimited(response: Response): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get('content-length'))
  if (contentLength > MAX_BYTES) throw new Error('too-large')
  if (!response.body) return new Uint8Array()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new Error('too-large')
    }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }
  if (req.method !== 'GET') {
    return jsonError('Kun GET er støttet.', 405, origin)
  }

  const target = new URL(req.url).searchParams.get('url')
  if (!target) return jsonError('Mangler url-parameter.', 400, origin)
  if (target.length > 2048) return jsonError('URL-en er for lang.', 400, origin)
  if (target.includes('@')) return jsonError('Denne adressen kan ikke hentes.', 400, origin)

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return jsonError('Ugyldig URL.', 400, origin)
  }
  if (parsed.username || parsed.password) return jsonError('Denne adressen kan ikke hentes.', 400, origin)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return jsonError('Kun http/https-URL-er er støttet.', 400, origin)
  }
  if (parsed.port && !['80', '443', ''].includes(parsed.port)) {
    return jsonError('Kun port 80 og 443 er støttet.', 400, origin)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchValidated(parsed, controller.signal)
    if (!res.ok) return jsonError(`Feed svarte ${res.status}.`, 502, origin)

    const buf = await readLimited(res)

    return new Response(buf, {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'text/calendar; charset=utf-8' },
    })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    if (err instanceof Error && err.message === 'too-large') return jsonError('Feeden er for stor (over 2 MB).', 413, origin)
    if (err instanceof Error && err.message === 'blocked-target') return jsonError('Denne adressen kan ikke hentes.', 400, origin)
    return jsonError(aborted ? 'Tidsavbrudd ved henting av feed.' : 'Kunne ikke hente feeden.', 502, origin)
  } finally {
    clearTimeout(timeout)
  }
})
