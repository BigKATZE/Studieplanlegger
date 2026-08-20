# shared-subject

Offentlig, skrivebeskyttet deling av **ett fag** (timeplan + pensum) via
`https://studieplanlegger.vercel.app/?del=<token>`.

## Sikkerhetsmodell

`user_data` lagrer hele planleggeren (alle fag, gjøremål, eksamener) i én
rad per bruker. Delingslenken må derfor **aldri** gi tilgang til den raden:

- **Anonyme roller har aldri RLS-tilgang** til `user_data` eller
  `shared_links` (se `migrations/20260820000000_shared_links.sql`).
- All offentlig lesing går utelukkende gjennom denne Edge Function-en, som
  leser med **service-role-nøkkelen** server-side.
- Funksjonen slår opp token-et i `shared_links`, sjekker at den ikke er
  tilbakekalt (`revoked = false`), og henter deretter kun eierens rad.
- `extractSharedSubject` (`extract.js`) plukker kun faget, forelesningene
  og pensum-et som lenken peker på. Gjøremål, eksamener, andre fag,
  `user_id` og all annen kontoinformasjon filtreres bort **server-side** og
  finnes aldri i svaret. Kjernen er testet i `src/lib/sharedSubject.test.mjs`.

## Deploy

Merk forskjellen fra `ics-proxy`: denne funksjonen må være åpen for alle
(den er selve mottakeren av delingslenken), så den deployes med
`--no-verify-jwt`:

```bash
supabase login
supabase link --project-ref icihdeerjveozgotyqbm
supabase functions deploy shared-subject --no-verify-jwt
```

## Test lokalt

```bash
supabase functions serve shared-subject
curl "http://localhost:54321/functions/v1/shared-subject?token=<token>" \
  -H "apikey: <din-anon-key>"
```

## Kjente begrensninger

- Token-et genereres klient-side og sendes via RLS-beskyttet `insert` inn i
  `shared_links` (192 bits tilfeldighet fra `crypto.getRandomValues`).
- En tilbakekalt lenke er permanent tilbakekalt – det er ikke mulig å
  gjenopprette den, kun å lage en ny.