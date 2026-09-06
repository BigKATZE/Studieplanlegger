# Studieplanlegger

En nettbasert studieplanlegger for timeplan, pensum, arbeidskrav, eksamener og repetisjon. Inneholder også AI-verktøy for øvingsspørsmål og arbeidsplaner.

## Lokal oppstart

```bash
npm install
npm run dev
```

## Feilsider og lokal verifisering

Åpne `/finnes-ikke` på den lokale serveren for å se 404-siden. Ukjente
adresser viser en vei tilbake til forsiden. Uventede renderfeil viser en
egen feilmelding med mulighet for å laste siden på nytt. Begge bruker
appens eksisterende tema og endrer ikke lagrede studiedata.

```bash
npm run build
npm test
npx playwright test e2e/app.spec.js e2e/improvements.spec.js e2e/errors.spec.js e2e/semester-calendar.spec.js
```

Byggskriptet lager også `dist/404.html` med de samme ressursene som appen.
Dette følger [Vercels støtte for egendefinerte 404-sider](https://vercel.com/kb/guide/custom-404-page).
Vite viser siden lokalt via sin SPA-fallback; HTTP-statusen der er ikke
en verifisering av Vercels 404-status. Ingen publisering skjer ved bygging.

## Semesterarkiv

Åpne **Arkiv**, gi semesteret et navn og velg **Arkiver semester**.
Etter bekreftelse flyttes hele den aktive planen til arkivet, inkludert
AI-kilder og arbeidsplaner, og den aktive planen tømmes. Arkivet støtter
inntil 20 semestre, med en størrelsesgrense for å beskytte nettleserlagringen.

**Gjenopprett** flytter semesteret tilbake til den aktive planen. Eventuelt
aktivt innhold arkiveres først automatisk. **Se innhold** er skrivebeskyttet;
**Last ned sikkerhetskopi** gir en JSON-fil med alle detaljene fra semesteret.
Den vanlige sikkerhetskopien under **Importer → Sikkerhetskopi** inkluderer
også hele semesterarkivet. Import og **Slett alt** erstatter/sletter også arkivet.

Som gjest lagres arkivet bare i denne nettleseren. Innloggede brukere bruker
vanlig kontosynkronisering. Ved synkfeil eller konflikt: last ned en komplett
sikkerhetskopi før siden oppdateres. Arkivendringer blokkeres til synk er klar.

## Kalendereksport

Velg **Eksporter kalender** ved siden av **Importer**. Filtrer på fag,
valgfri datoperiode og hendelsestyper, og velg **Last ned .ics**.
Eksporten tar med aktive forelesninger, arbeidskravfrister, eksamener og
repetisjoner, men ikke semesterarkivet eller private AI-kilder.

Klokkeslett tolkes i Europe/Oslo og eksporteres som UTC med korrekt
sommer-/vintertid. Datoer uten tid blir heldagshendelser. Ugyldige tider
utelates med beskjed; pensum og arbeidssteg uten dato eksporteres ikke.
Formatet følger [iCalendar (RFC 5545)](https://www.rfc-editor.org/rfc/rfc5545.html).
Filen er en manuell kopi, ikke en kalenderabonnementstjeneste. Gjentatt
import i en kalenderapp kan lage duplikater.
