# ics-proxy

Server-side proxy for henting av eksterne iCal-feeds (Canvas m.fl.).

## Hvorfor

`vercel.json` sin CSP (`connect-src`) tillater kun kall til `'self'` og
Supabase-prosjektets URL. Et direkte `fetch()` fra nettleseren mot en
vilkårlig ekstern kalender-URL (f.eks. Canvas) blir derfor blokkert av
nettleseren selv, uavhengig av CORS. Denne Edge Function-en kjører på
Supabase-domenet – som allerede er hvitelistet – og gjør selve
hentingen server-side. CSP-en i `vercel.json` trenger **ingen endring**.

## Deploy

Krever [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref icihdeerjveozgotyqbm
supabase functions deploy ics-proxy
```

Funksjonen krever gyldig innlogging som standard (Supabase verifiserer
JWT-en i `Authorization`-headeren automatisk før funksjonen kalles).
Ikke deploy med `--no-verify-jwt` med mindre du bevisst vil åpne den opp.

## Test lokalt

```bash
supabase functions serve ics-proxy
curl "http://localhost:54321/functions/v1/ics-proxy?url=https://example.com/kalender.ics" \
  -H "Authorization: Bearer <en-gyldig-bruker-jwt>" \
  -H "apikey: <din-anon-key>"
```

## Kjente begrensninger

- SSRF-beskyttelsen slår opp DNS og avviser private/lokale IP-er, men er
  ikke vanntett mot DNS-rebinding (target kan i teorien svare med én IP
  ved sjekk og en annen ved selve fetch-en). For et fag som kun peker mot
  et fåtall kjente LMS-domener (Canvas, itslearning, Feide …) er en
  fast allow-list et sterkere alternativ – vurder å legge det til hvis
  funksjonen skal håndtere mer sensitiv trafikk.
- Følger redirects (`redirect: 'follow'`) uten å re-validere target
  etter hver hopp – samme DNS-rebinding-forbehold som over.
