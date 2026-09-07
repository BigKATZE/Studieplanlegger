# Studieplanlegger

Nettbasert studieplanlegger for timeplan, pensum, arbeidskrav, eksamener og repetisjon, med AI-verktøy for øving og arbeidsplaner.

## Kom i gang

```bash
npm install
npm run dev
```

## Bygg og tester

```bash
npm run build
npm test
npx playwright test
```

## Drift

Krever `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` for innlogging og synkronisering. Uten disse kjører appen som gjest med lokal lagring. Edge-funksjoner og migreringer i `supabase/` publiseres med Supabase CLI.
