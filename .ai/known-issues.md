# Known Issues — Deferred

Issues found during review that were **deliberately not fixed** when they were
found, with the evidence that established them. Each entry separates what was
measured from what is inferred, so a later reader can tell how much to trust it
without re-doing the work.

---

## 1. Every signed-in page is client-only, so a hard refresh is blank for ~490ms

**Priority: high.** This is the one a user actually feels.

### What happens

[lib/auth/provider.tsx:27-28](lib/auth/provider.tsx#L27-L28) starts at
`session = null` / `isLoading = true` and only learns the session inside a client
`useEffect`. So during SSR there is no user, `userId` is null, and
[lib/repositories/provider.tsx:44-46](lib/repositories/provider.tsx#L44-L46)
takes its `if (!value)` branch, which renders no page content for any route
except `/login`. The server therefore renders nothing at all for a signed-in
page.

Note that branch returns `<RedirectToLogin />`, not a bare `null` — see the
comment at [lib/repositories/provider.tsx:55-66](lib/repositories/provider.tsx#L55-L66)
for why a bare `null` was itself a bug. That distinction does not change this
issue: `RedirectToLogin` renders `null` and only fires a client-side effect, so
the SSR pass is still empty either way.

### Measured

Confirmed in a real browser against the local Supabase stack, warm dev server,
localhost:

- Fetching `/` **with a valid session cookie** returns **HTTP 200**, but the HTML
  contains no `Workout Plans` heading, no `Sign out`, no nav — the `<body>` holds
  only bootstrap scripts.
- On a real hard reload of `/`: **first content at 489ms**, blank from commit
  through 455ms.

The 200 is what makes this easy to miss — nothing errors, and the page is
correct once hydration finishes.

### Why it is worse than "SSR can't know the user"

The information is being thrown away, not missing. The server already **has** the
session: the proxy reads it via `getUser()` in
[lib/supabase/middleware.ts:36-37](lib/supabase/middleware.ts#L36-L37) on the
same request, which is how the redirect decision gets made at all. SSR could
render the shell.

There is also no `loading.tsx` and no `error.tsx` anywhere under `app/` — nothing
softens the gap. Verified: the only files in `app/` are `layout.tsx`,
`globals.css`, `favicon.ico`, and the 10 `page.tsx` routes.

### Cost

On localhost with a warm server it reads as a flicker. On a cold cache or a slow
connection it reads as a broken load, since there is no shell, no spinner and no
skeleton — just an empty page holding steady until JS boots.

### Why it is deferred and not patched

This is a direct consequence of a decision the app made on purpose — see
**"Client-side Supabase, not server actions"** in
[.ai/implementation-plan.md:46-48](.ai/implementation-plan.md#L46-L48). Every
page is a client component and RLS is the authorization boundary. The blank SSR
pass is the price of that model, so removing it is an architectural
conversation, not a bug fix.

### Plausible directions — none chosen

Ordered cheapest first. The first is a mitigation, the last two are fixes.

1. **Add a `loading.tsx` shell.** Cheap, local, no architectural change. Turns a
   blank page into a skeleton. It does **not** make the content arrive sooner —
   it only stops the wait from looking like a failure. Partial mitigation, and
   honestly the best effort-to-benefit ratio here.
2. **Read the session server-side and seed the client provider with it.** The
   server component layout reads the session from the cookie (the proxy already
   proves this works) and passes it to `AuthProvider` as an initial value, so the
   first client render already has a user instead of `null`. A real fix for the
   blank shell, and much smaller than a full port: `AuthProvider` keeps its
   `onAuthStateChange` subscription and only its *initial* state changes.
   Unmeasured risk: `layout.tsx` becomes a server component, and everything about
   how the providers are composed under it has to be re-checked.
3. **Move the shell to server components.** Nav, headings and page chrome render
   on the server; only the interactive data views stay client-side. The largest
   move, and the one that actually reconsiders the key decision above. Would need
   its own plan.

Option 2 is the interesting one because it keeps the client-side data model
intact and only fixes the *auth* handoff, which is the part that is genuinely
lossy. It has not been prototyped.

---

## 2. Signed-out 404s are unreachable

**Priority: low.** A correctness wart, not a broken flow.

The proxy matcher in [proxy.ts:10-12](proxy.ts#L10-L12) covers unknown paths, so
[lib/supabase/middleware.ts:41-45](lib/supabase/middleware.ts#L41-L45) redirects
a signed-out user off *any* URL that is not `/login` — including URLs that do not
exist.

Measured:

- `/nope-does-not-exist` **signed out** → `307` → `/login`.
- The same URL **signed in** → the 404 renders correctly. So the 404 page works;
  it is simply unreachable without a session.
- `/login?next=/exercise` → `307` → `/?next=%2Fexercise`. The redirect carries the
  query string along mechanically but nothing consumes it, so the intent is lost:
  after signing in the user lands on `/`, not on the page they asked for.

**Consequence:** a bad bookmark and an expired session produce the identical
outcome — bounced to `/login`, then dropped on `/`. The user cannot tell a typo
from a timeout, and a correct deep link is silently downgraded to the home page.

Not fixed because the redirect is doing its actual job (keeping signed-out users
out of app routes) and the fix has a design question in it: whether to preserve
the original path as a `next` parameter and honour it after sign-in, which is a
feature, not a repair.

---

## 3. Repo hygiene: tool scratch output is tracked

**Priority: low.** Already noted at
[.ai/implementation-plan.md:1189-1194](.ai/implementation-plan.md#L1189-L1194)
and deferred across phases. Recorded here so it stops living only inside a phase
that is closed.

`.gitignore` has no entry for `test-results/` or `.playwright-mcp/`, and both are
tracked:

- `test-results/.last-run.json` (committed by accident in `5a8d4df`)
- **18 tracked PNGs** under `.playwright-mcp/`

More scratch accumulates on every run — a `console-*.log` and two
`error-context.md` files were untracked-but-present at the time of writing.

Fix is 2 lines in `.gitignore` plus `git rm --cached`, and belongs in **its own
commit** rather than folded into feature work, so the deletion of ~19 binary
files does not bury a real diff.

---

## 4. No unit tests remain repo-wide

**Priority: watch.** Not a defect, a trajectory.

`lib/import-local-data.test.ts` was the only non-e2e test in the repo, and it was
deleted along with the import in Phase 6. There is no vitest and no jest in
`package.json` — the only test dependency is `@playwright/test`, and the only
test script is `"test:e2e": "playwright test"`.

So the **entire** test strategy is now a single E2E suite that takes ~3.5 minutes,
requires Docker and a running Supabase stack, and runs at `workers: 1` because it
shares one seeded user
([playwright.config.ts:22-25](playwright.config.ts#L22-L25)).

This is not a Phase 6 defect — deleting the import correctly deleted its test, and
the E2E suite genuinely covers the app's behaviour. Flagged because of where it
points: there is now no test that can run without Docker, no place to put a fast
check on a pure function, and the cheapest possible test costs 3.5 minutes and a
container. The first time someone needs to unit-test a mapper or a sort, they
will have to add a test runner before they can add the test.

No action proposed. Revisit when something non-trivial and non-UI needs covering.
