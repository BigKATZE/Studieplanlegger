// supabase/functions/shared-subject/index.ts
//
// Offentlig, skrivebeskyttet deling av ETT fag (timeplan + pensum).
// Alle kan kalle denne med en token – ingen innlogging nødvendig.
//
// Sikkerhet – viktig:
//  - Denne funksjonen må deployes med `--no-verify-jwt` (den er ment å være
//    åpen), og autorisasjon skjer UTELUKKENDE gjennom token-et.
//  - Leser user_data med service-role-nøkkelen, men returnerer aldri rådata:
//    `extractSharedSubject` plukker kun faget/forelesningene/pensum-et som
//    lenken peker på. Gjøremål, eksamener, andre fag, user_id og all annen
//    kontoinformasjon filtreres bort server-side.
//  - Anonyme roller har aldri RLS-tilgang til shared_links eller user_data –
//    denne funksjonen er den eneste offentlige leseveien.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractSharedSubject } from './extract.js'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    Vary: 'Origin',
  }
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }
  if (req.method !== 'GET') {
    return jsonError('Kun GET er støttet.', 405, origin)
  }

  const token = new URL(req.url).searchParams.get('token')
  if (!token || !TOKEN_PATTERN.test(token)) {
    return jsonError('Mangler eller ugyldig token.', 400, origin)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: link, error: linkErr } = await supabase
    .from('shared_links')
    .select('user_id, subject_id, revoked')
    .eq('token', token)
    .maybeSingle()
  if (linkErr) {
    console.error('shared_links lookup:', linkErr.message)
    return jsonError('Kunne ikke hente delingen.', 500, origin)
  }
  if (!link || link.revoked) {
    return jsonError('Lenken finnes ikke eller er tilbakekalt.', 404, origin)
  }

  const { data: row, error: rowErr } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', link.user_id)
    .maybeSingle()
  if (rowErr) {
    console.error('user_data lookup:', rowErr.message)
    return jsonError('Kunne ikke hente faget.', 500, origin)
  }
  if (!row?.data) {
    return jsonError('Fant ikke faget.', 404, origin)
  }

  const result = extractSharedSubject(row.data, link.subject_id)
  if (!result) {
    return jsonError('Fant ikke faget.', 404, origin)
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
})