# Studieplanlegger

En personlig studieplanlegger for timeplan, pensum, arbeidskrav og eksamener – uke for uke. Bygget med React + Vite + Tailwind CSS v4, med innlogging og synk på tvers av enheter via Supabase.

## Funksjoner

- Uke-for-uke-visning av forelesninger, pensum, gjøremål og eksamener (skoleåret krysser kalenderår, uke 34 → 24)
- Naturlig språk-input: «arbeidskrav 1 i forretningsjus, frist 1. oktober» → legger til oppgave med riktig fag og frist
- PDF- og ICS-import, inkludert eksterne kalenderfeeder via en Supabase Edge Function (`ics-proxy`)
- Gjestemodus uten konto, eller innlogging for synk på tvers av enheter (realtime via Supabase)
- Angre-toast ved sletting, dark/light-modus, tilgjengelighetsstøtte

## Komme i gang

```bash
npm install
npm run dev
```

## Miljøvariabler

Kopier inn verdiene dine i `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://<prosjektref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon-nøkkel>
```

Finner du disse i Supabase-dashboardet under **Project Settings → API**. `service_role`-nøkkelen skal aldri brukes i frontend.

## Supabase-oppsett

1. Opprett prosjektet i Supabase-dashboardet.
2. Sett `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` som beskrevet over, både lokalt og i Vercel-prosjektets env-variabler.
3. Opprett tabellen `user_data` og aktiver RLS – SQL-en ligger i [`supabase/migrations/20260819000000_user_data_rls.sql`](supabase/migrations/20260819000000_user_data_rls.sql) og kan kjøres i **SQL Editor**. Den er idempotent.
4. Deploy Edge Function for kalenderfeeder:
   ```bash
   supabase functions deploy ics-proxy
   ```

## Scripts

| Kommando           | Beskrivelse                                   |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Utviklingsserver                              |
| `npm run build`    | Produksjonsbygging                            |
| `npm run preview`  | Forhåndsvis bygget                                              |
| `npm run lint`     | Oxlint                                         |
| `npm test`         | Kjører enhetstestene i `src/lib/*.test.mjs`    |
| `npx playwright test e2e` | E2E-tester (smoke + sikkerhet)         |

## Deploy

Pushet til `main` deployer automatisk til Vercel (se `vercel.json` for sikkerhetsheadere).