import { useEffect } from 'react'

// Recovery state in the existing visual system: one explanation, one clear way home.
// Keep this independent of authentication and storage so it also works when the app fails.
export default function ErrorPage({ notFound = false }) {
  const title = notFound ? 'Siden finnes ikke' : 'Noe gikk galt'

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${notFound ? '404 – ' : ''}${title} | Studieplanlegger`
    return () => { document.title = previousTitle }
  }, [notFound, title])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 sm:px-10">
      <header className="border-b border-line py-7">
        <a href="/" className="font-display text-base font-semibold tracking-tight">Studieplanlegger</a>
      </header>
      <main className="animate-enter flex flex-1 flex-col justify-center gap-8 py-16 sm:flex-row sm:items-center sm:gap-12" aria-labelledby="error-title">
        <div className="shrink-0 text-muted" aria-hidden="true">
          {notFound ? (
            <span className="font-display text-8xl font-semibold leading-none tracking-tight">404</span>
          ) : (
            <svg className="h-16 w-16 sm:h-24 sm:w-24" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="36" height="36" rx="8" />
              <path d="M24 15v12M24 33h.01" />
            </svg>
          )}
        </div>
        <div className="max-w-lg">
          <h1 id="error-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            {notFound
              ? 'Adressen kan være feil, eller siden kan ha blitt flyttet. Du kan fortsette planleggingen fra forsiden.'
              : 'Vi kunne ikke vise studieplanleggeren. Prøv å laste siden på nytt. Hvis feilen vedvarer, prøv igjen senere.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!notFound && <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Last inn på nytt</button>}
            <a href="/" className={notFound ? 'btn-primary' : 'btn-ghost'}>Til studieplanleggeren</a>
          </div>
        </div>
      </main>
      <footer className="border-t border-line py-5 text-sm text-muted">Timeplan, pensum og frister på ett sted.</footer>
    </div>
  )
}
