const GROUPS = [
  {
    title: 'Nytt i studiehverdagen',
    items: [
      'Dagens plan samler aktuelle forelesninger, pensum, arbeidskrav, eksamener og repetisjoner.',
      'Fokusmodus gir en 25-minutters arbeidsøkt knyttet til det du vil fullføre.',
      'Repetisjonsplanen følger intervallene 1, 3, 7 og 14 dager.',
      'Ukemaler kan lagre en forelesningsstruktur og bruke den i en annen, også tom, uke.',
    ],
  },
  {
    title: 'Timeplan og eksamen',
    items: [
      'Overlappende forelesninger på samme dato får et tydelig kollisjonsvarsel.',
      'Eksamen viser nedtelling og beregnet faglig fremdrift fra fullført arbeid.',
      'Ukevelgerne dekker hele studieåret og dato- og ukevisningen er mer robust.',
    ],
  },
  {
    title: 'AI-verktøy',
    items: [
      'Lag øvingsspørsmål fra innlimte notater eller en PDF som leses lokalt.',
      'Legg AI-genererte spørsmål direkte til repetisjonsplanen.',
      'Bryt ned arbeidskrav med kort, standard eller grundig detaljnivå og valgfritt tidsbudsjett.',
      'Arbeidsplanen viser krav, tidsestimater, ferdigkriterier, avklaringer og avkryssbar fremdrift.',
      'Tidsestimatene holdes innenfor oppgitt totalramme, og planen kan kopieres.',
    ],
  },
  {
    title: 'Import og arbeidsflyt',
    items: [
      'iCal-import har bedre validering, duplikatkontroll og forhåndsvisning.',
      'Sikkerhetskopier støtter de nye repetisjonene og ukemalene, samtidig som eldre filer fortsatt kan importeres.',
      'Slettede fag, aktiviteter og kapitler kan angres uten å overskrive nyere endringer.',
      'Pensumsiden er forenklet og bruker den felles knapperaden øverst.',
    ],
  },
  {
    title: 'Design og tilgjengelighet',
    items: [
      'Hele grensesnittet har fått et roligere, mer minimalistisk uttrykk med Geist Sans.',
      'Lys modus bruker tydelige mørke hovedknapper, mens mørk modus har en dyp grå bakgrunn.',
      'Skjemaer, dialoger, filtre, tomtilstander og mobilvisning er gjort mer konsistente.',
    ],
  },
  {
    title: 'Sikkerhet og utvikling',
    items: [
      'Lokale gjestedata og innloggede brukerdata holdes strengt adskilt ved synkfeil og utlogging.',
      'AI-kall krever innlogging, valideres på serveren og har en daglig brukergrense.',
      'Filopplastinger, eksterne kalenderkall og delte fag har fått strengere validering.',
      'Prosjektet kan kjøres med en komplett, isolert Supabase-stakk for lokal testing.',
    ],
  },
]

export default function Changelog() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-muted">
        Samlet oversikt over endringene siden forrige publiserte versjon.
      </p>
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
            {group.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-secondary" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
