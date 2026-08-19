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
    return false
  }
  const low = ip.toLowerCase()
  if (low === '::1') return true // loopback
  if (low.startsWith('fe80:')) return true // link-local
  if (low.startsWith('fc') || low.startsWith('fd')) return true // unique local
  return false
}

async function isBlockedTarget(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) return true
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) return isPrivateIp(lower)
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

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return jsonError('Ugyldig URL.', 400, origin)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return jsonError('Kun http/https-URL-er er støttet.', 400, origin)
  }
  if (await isBlockedTarget(parsed.hostname)) {
    return jsonError('Denne adressen kan ikke hentes.', 400, origin)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(parsed, { redirect: 'follow', signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return jsonError(`Feed svarte ${res.status}.`, 502, origin)

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return jsonError('Feeden er for stor (over 2 MB).', 413, origin)

    return new Response(buf, {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'text/calendar; charset=utf-8' },
    })
  } catch (err) {
    clearTimeout(timeout)
    const aborted = err instanceof Error && err.name === 'AbortError'
    return jsonError(aborted ? 'Tidsavbrudd ved henting av feed.' : 'Kunne ikke hente feeden.', 502, origin)
  }
})
