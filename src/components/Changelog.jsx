const RELEASES = [
  {
    version: 'v1.2.6', date: '2026-08-24', dateLabel: '24. august 2026', title: 'Del hele semesteret med én lenke', summary: 'Ny delingslenke som gir en skrivebeskyttet oversikt over alle fagene dine - timeplan, pensum, arbeidskrav og eksamener.', groups: [
      { title: 'Deling', items: ['Ny knapp «Del hele oversikten» på Oversikt-fanen lager en skrivebeskyttet lenke til alle fagene dine.', 'Mottakeren ser timeplan, pensum, arbeidskrav og eksamener per fag, med fullføringsstatus.', 'Lenken viser alltid gjeldende plan, utløper etter 30 dager og kan tilbakekalles når som helst.'] },
      { title: 'Sikkerhet', items: ['Ulike sikkerhetsoppdateringer.'] },
    ],
  },
  {
    version: 'v1.2.5', date: '2026-08-23', dateLabel: '23. august 2026', title: 'Raskere markering og roligere toppbar', summary: 'Timeplan får uke-markering, navigasjonen er tilbake til stille linje uten animasjon, og toppbaren får helhetlige bokser i lys og mørk modus.', groups: [
      { title: 'Timeplan', items: ['Ny knapp per uke: «Marker alle» / «Fjern alle» for deltakelse — setter alle forelesninger i uken som deltatt på én gang.', '«Deltatt»-knappen er tom når ikke deltatt og viser hake + «Deltatt» først når den er aktiv.'] },
      { title: 'Navigasjon', items: ['Hovedfanene er tilbake til underline (stille struktur) — ingen ytre pill-container.', 'Fjernet scale-animasjon på aktiv strek og slide-animasjon ved fanebytte — bytte er nå instant.'] },
      { title: 'Toppbar', items: ['«Lagret lokalt/Synkronisert» har fått samme boks som GitHub/søk (h-9 rounded-xl, border/shadow) — egen stil ved synkfeil.', '«Changelog», «Logg inn», «Endre passord» og «Logg ut» har fått helhetlige bokser i lys og mørk modus.', 'Sol-toggle i lys modus har ikke lenger svart sirkel — hvit pill med amber sol, mørk beholder grønn pill.', 'Strek under «Studieplanlegger» er nå #141414 (samme som bakgrunnen i mørk modus).', 'Primærfarge i lys modus er myknet: #141414 → #1e1e1e.'] },
    ],
  },
  {
    version: 'v1.2.4', date: '2026-08-22', dateLabel: '22. august 2026', title: 'Mykere detaljer og ryddigere menyer', summary: 'Små visuelle justeringer som gjør navigering og valg roligere, uten å endre flyten.', groups: [
      { title: 'Bevegelse', items: ['Myk innflyvning ved bytte av fane og ved filtrering (I dag/Neste 7 dager, fag-filter).', 'Knapper gir et lite trykk-svar ved klikk.'] },
      { title: 'Design', items: ['Kortene i Oversikt har fått et litt tydeligere, men fortsatt subtilt glassuttrykk med svake bakgrunnsflekker og lett løft ved hover.', 'Vinduer og rullefelt har fått roligere avrunding, skygge og tynn, stilren scrollbar som matcher det minimalistiske uttrykket.'] },
      { title: 'Menyer', items: ['Alle nedtrekksmenyer deler nå samme heldekkende stil, med tydelig markering og hake for valgt rad — slik som i ukevelgeren.', 'Menyen for kunnskapsnivå legger seg ikke lenger bak neste kort.'] },
      { title: 'Fag', items: ['Fargevelgeren i Nytt/Rediger fag viser en egen liten boks med fargekoden når du holder over en farge, i samme stil som resten av siden.', 'Valgt fagfilter får en myk, lys markering med svakt hint av fagfargen i stedet for heldekkende mørk pille.'] },
    ],
  },
  {
    version: 'v1.2.3', date: '2026-08-22', dateLabel: '22. august 2026', title: 'Bedre mobilopplevelse', summary: 'Oversikt og AI-verktøy er justert for mindre skjermer.', groups: [
      { title: 'Mobil', items: ['Fag- og fremdriftskortene tilpasser seg bedre på mobil og unngår horisontal scrolling.', 'AI-fanene ligger nå under hverandre på mobil, som resten av knapperadene.'] },
    ],
  },
  {
    version: 'v1.2.2', date: '2026-08-22', dateLabel: '22. august 2026', title: 'Chat med egne kilder', summary: 'Still oppfølgingsspørsmål til notatene dine uten å lime inn på nytt.', groups: [
      { title: 'Nyhet', items: ['Ny fane «Chat med kilder» som husker siste 10 meldinger og svarer kun fra kildene dine med kildehenvisning.'] },
      { title: 'Kildehåndtering', items: ['Samme avgrensede utdrag (maks 30/12 000 tegn) som i Søk i kilder.'] },
    ],
  },
  {
    version: 'v1.2.1', date: '2026-08-22', dateLabel: '22. august 2026', title: 'Små forbedringer i øving og arbeidsplan', summary: 'Mer stabil flyt ved generering av spørsmål, vurdering og arbeidsplaner.', groups: [
      { title: 'Øving', items: ['Øvingsspørsmål vurderes nå samlet — alle svar sendes likt i én forespørsel.', 'Tomme felt blir automatisk “pass” og får tilbakemelding på hva som skulle stått.', 'Vanskelighetsgrad og antall spørsmål har fått mer robust validering.'] },
      { title: 'Arbeidsplan', items: ['Detaljnivået «grundig» gir nå alltid 8–10 steg, med nytt forsøk ved avvik.', 'Innlogging og filopplasting har fått stabilitetsforbedringer.'] },
    ],
  },
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
              <p className={`mt-1 text-xs font-semibold ${releaseIndex === 0 ? 'text-secondary' : 'text-muted'}`}>
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
