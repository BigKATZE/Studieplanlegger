# shared-plan

Public Edge Function for a read-only, token-scoped work-plan view. Creation and revocation require the authenticated owner. The function uses the service role only to read the matching owner row, then returns the sanitised output from `extract.js`.
