# Personal calendar subscription

One active, immutable subscription per authenticated (non-anonymous) user.
No automatic expiration. Revoke before creating a replacement with different scope.
Only a SHA-256 token hash is stored; the random 192-bit base64url token is returned
once on creation. A lost URL cannot be retrieved: revoke and create again.

## Deployment

Review and apply `supabase/migrations/20260907000000_calendar_subscriptions.sql`
with the project's normal migration process before deploying this function.
For a correctly linked target, the commands are `supabase db push` (review all
pending migrations first) and `supabase functions deploy calendar-subscription`.
These commands change the target environment; they were not run during implementation.
`supabase/config.toml` explicitly disables gateway JWT verification so calendar
clients can fetch without headers. Every management POST still verifies the user
with `auth.getUser(bearerToken)` inside the handler.

The runtime requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (standard Supabase Edge environment). Never expose the
service key in frontend configuration. The existing service-role SELECT grant on
`user_data` from the earlier migrations is also required.

Local serving: `supabase functions serve calendar-subscription` after applying
migrations to a disposable local Supabase instance. No remote deployment is needed
for the dependency-injected Node tests.

## HTTP contract

POST to `/functions/v1/calendar-subscription` using the authenticated user's bearer
JWT, normally through `supabase.functions.invoke('calendar-subscription', { body })`.

- Create body: `{ "action": "create", "subjectIds": ["subject-id"], "types": ["lectures", "exams"] }`
- Create response: `{ "subscription": { "id": "uuid", "subject_ids": ["subject-id"], "event_types": ["lectures", "exams"], "created_at": "timestamp" }, "token": "secret" }`
- List body: `{ "action": "list" }`
- List response: `{ "subscriptions": [{ "id": "uuid", "subject_ids": [], "event_types": [], "created_at": "timestamp" }] }` (zero or one active entry; stored selections are nonempty).
- Revoke body: `{ "action": "revoke", "id": "subscription-uuid" }`
- Revoke response: `{ "ok": true }`. Unknown, foreign or already-revoked IDs return 404.

All successful POST responses are 200. Errors are JSON `{ "error": "safe message" }`:
400 invalid input, 401 missing/invalid user, 404 unavailable subscription,
409 existing active subscription or unsynchronized selection, 503 backend/data failure.
Unsupported methods return 405. OPTIONS handles browser preflight.

Build the secret calendar URL from the configured Supabase URL:
`https://<project>.supabase.co/functions/v1/calendar-subscription?token=<token>`.
GET/HEAD need no Authorization or apikey. Additional query parameters are rejected.
HEAD uses the same checks and status as GET but never returns a body, including errors.
Valid feeds return `text/calendar; charset=utf-8` and `Cache-Control: private, no-store`.
Valid empty plans return an empty VCALENDAR, not 404. Missing user_data returns 404;
database or malformed/oversized collection failures return 503, never an empty 200.

## Scope and integration

Allowed kinds: `lectures`, `assignments`, `exams`, `reviews`. Subjects must be an
explicit unique list (1-100 string IDs, each 1-128 characters); kinds are unique
and nonempty. All subjects must exist in the saved remote row at creation.
The UI should gate creation on a real user and `syncStatus === 'saved'`, but allow
list/revoke during planner sync errors. No planner content is accepted in POST.
Unknown keys, malformed UTF-8/JSON, and bodies over 20,000 actual bytes are rejected.

Reads reflect current saved top-level data, not unsaved edits or archives. New
subjects are not automatically included. Deleted/archived subjects disappear;
restoring their IDs can restore events. Completed events remain for history.
Only subject names, event title/topic, date/time and lecture room are serialized.
Private notes, review details, chapters, AI sources, answers and work plans are
excluded. Titles/topics/rooms themselves may contain sensitive user-entered text.

Projection scans at most 10,000 entries per relevant collection and includes at
most 2,000 selected events. Exceeding limits fails the entire response rather than
silently truncating a calendar. Display text is bounded (subject 300/100, title/topic
500, room 200 characters); malformed event IDs are skipped, duplicate selected IDs
fail closed, and invalid dates/times are skipped by the shared serializer.
Serialized output is capped at 4 MiB. Raw JSONB retrieval still loads the saved row,
including unused fields, in server memory; these projection limits do not impose
a database row-size limit. No cross-request cache or durable request rate limiter
is included; monitor public endpoint traffic and apply platform limits as needed.

UIDs use the non-secret subscription ID, kind and item ID, remaining stable across
edits within a subscription. Recreating produces a new namespace; remove the old
calendar in the client. DTSTAMP is stable for unchanged saved data, using the later
of row updated_at and subscription created_at, not the fetch time. Row updated_at
is client-written metadata, not a security clock or monotonic revision counter.

Anyone possessing the URL can read its scope. Calendar providers retain URLs and
downloaded data. Revocation prevents future authorization, not retained copies or
an already-authorized in-flight response. Logout alone does not revoke. Account
deletion cascades. Avoid URL/token logging in infrastructure and error reporting.
Polling and removal timing are controlled by the calendar client, not this server.

## Verification

`npm test` includes the pure projection and dependency-injected HTTP tests in
`src/lib/calendarSubscription.test.mjs`, plus existing serializer regression tests.
With Deno installed: `deno check supabase/functions/calendar-subscription/index.ts`.
Before production, test the migration grants/unique index with two real users on a
disposable database, headerless GET on a local/deployed function, and refresh/removal
in actual calendar clients. The in-memory tests do not prove Postgres RLS/grants,
database concurrency, deployed bundling, or third-party calendar refresh behavior.
