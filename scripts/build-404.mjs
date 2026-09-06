import { readFile, writeFile } from 'node:fs/promises'

// Vercel serves this build artifact for missing paths with HTTP 404.
// Reuse Vite's hashed assets without introducing a catch-all HTTP 200 rewrite.
const index = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const notFound = index
  .replace('<title>Studieplanlegger</title>', '<title>404 – Siden finnes ikke | Studieplanlegger</title>')
  .replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>')
await writeFile(new URL('../dist/404.html', import.meta.url), notFound)
