const RELEASES = [
  {
    version: 'v1.2', date: '2026-08-21', dateLabel: '21. august 2026', title: 'AI-støtte som holder seg til planen og kildene dine', summary: 'Nye verktøy for øving, kildearbeid, eksamensøving, oppfølging og deling av arbeidsplaner.', groups: [
      { title: 'Øving og kilder', items: ['Private kilder kan lagres per fag og brukes i et avgrenset, kildehenvist AI-søk.', 'Øvingsspørsmål kan vurderes fra egne svar, og svake svar kan legges til repetisjon.', 'Lag sammendrag med hovedpunkter, begreper og spørsmål til repetisjon.', 'Eksamensøving har nedtelling og studiefeedback etter innlevering.', 'Eksamen og forelesninger flyttes ikke av omplanleggingsforslag.'] },
      { title: 'Plan og deling', items: ['Forslag til nye datoer må godkjennes før noe endres.', 'Arbeidsplaner kan lagres med avkryssbare steg.', 'Innloggede brukere kan dele en skrivebeskyttet arbeidsplan med en egen lenke.', 'Ukerapporten bygger på en begrenset oversikt over inneværende uke.'] },
    ],
  },
  {
    version: 'v1.1',
    date: '2026-08-21',
    dateLabel: '21. august 2026',
    title: 'Et roligere grensesnitt og smartere studiestøtte',
    summary: 'Denne versjonen samler designløftet, nye planleggingsverktøy og en tryggere lokal AI-flyt.',
    groups: [
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
    ],
  },
]

export default function Changelog() {
  return (
    <section className="mt-8" aria-labelledby="changelog-heading">
      <header className="max-w-2xl">
        <h2 id="changelog-heading" className="font-display text-3xl font-bold tracking-[-.03em] text-ink sm:text-4xl">
          Changelog
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          Her finner du en samlet oversikt over nye funksjoner, forbedringer og tekniske endringer. Nyeste versjon vises først.
        </p>
      </header>

      <div className="mt-10 space-y-14">
        {RELEASES.map((release, releaseIndex) => (
          <article key={release.version} className="grid gap-6 border-t border-line pt-7 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-10">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-[-.02em] text-ink">{release.version}</h3>
              <p className="mt-1 text-xs font-semibold text-secondary">
                {releaseIndex === 0 ? 'Nyeste versjon' : 'Tidligere versjon'}
              </p>
              <time dateTime={release.date} className="mt-3 block text-sm text-muted">
                {release.dateLabel}
              </time>
            </div>

            <div className="min-w-0">
              <p className="font-display text-xl font-semibold tracking-[-.02em] text-ink sm:text-2xl">
                {release.title}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                {release.summary}
              </p>

              <div className="mt-9 grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {release.groups.map((group) => (
                  <section key={group.title} className="border-t border-line pt-4">
                    <h4 className="text-sm font-semibold text-ink">{group.title}</h4>
                    <ul className="mt-3 list-disc space-y-2.5 pl-4 text-sm leading-6 text-muted marker:text-secondary">
                      {group.items.map((item) => (
                        <li key={item} className="pl-1">{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
