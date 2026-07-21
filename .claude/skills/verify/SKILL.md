---
name: verify
description: Drive mini-notion (Next.js App Router) in a real browser to verify a change end-to-end.
---

# Verify: mini-notion

Single Next.js app. Posts/nickname/avatar live in `localStorage`
(key `mini-notion-v1`) via `AppProvider` (`lib/store.tsx`); **auth is
real Google OAuth via Supabase** (`lib/supabase.ts`, session managed
by supabase-js in its own localStorage keys).

## Launch

```bash
npm install        # first run only
npm run dev         # Turbopack, http://localhost:3000, ready in <1s
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (present locally but
gitignored via `.env*`; publishable key is safe to expose). Kill with
`pkill -f "next dev"` (or `lsof -ti:3000 | xargs kill -9`) when done —
nothing else binds :3000.

## Get a browser

No Playwright/Puppeteer npm dependency in this repo. The playwright
*browser binary* is usually already cached at
`~/Library/Caches/ms-playwright/` (macOS) even when the npm package
isn't installed. To drive it:

```bash
mkdir -p /tmp/pw-verify && cd /tmp/pw-verify
npm init -y >/dev/null 2>&1
npm install playwright@1.61.1   # matches the cached CLI; fast, no browser download if cache hit
```

Then `require("playwright")` from a script in that scratch dir.
`npx playwright install chromium` also works but is slower and warns
about missing project deps (harmless, ignore the warning).

## Auth (real Google OAuth — no localStorage bypass)

Login is real Supabase Google OAuth. The old
`{ loggedIn: true }` localStorage seed **no longer works** — the
guard derives `loggedIn` from the Supabase session
(`onAuthStateChange`).

What a fresh automated browser CAN verify without credentials:
signed-out guard (`/` → `/login`), the login card, and that the
Google button navigates to `accounts.google.com` with no OAuth
config error (`redirect_uri_mismatch`, `invalid_client`, …).
Never type real Google credentials from automation.

To drive authenticated flows, either:
- sign in once manually in a **headed** persistent context
  (`chromium.launchPersistentContext(dir, { headless: false })`) and
  reuse that profile dir in later runs, or
- seed posts only (same JSON, minus `loggedIn`) and test
  `/posts/[id]` etc. after signing in, or
- rely on the vitest suite (`__tests__/auth-store.test.tsx`), which
  mocks `@/lib/supabase` for session-derived state.

Seeding posts still works (posts remain in localStorage):

```js
await page.goto("http://localhost:3000/login"); // establishes origin
await page.evaluate(() => {
  localStorage.setItem("mini-notion-v1", JSON.stringify({
    posts: [{ id: "verify-post-1", title: "t", content: "c", favorite: false, createdAt: Date.now() }],
    nickname: null, avatar: null,
  }));
});
```

## Flows worth driving

- **List page** `/` — composer, `/page` slash command, post cards, favorite/delete.
- **Post detail** `/posts/[id]` — title/content autosave (check
  `localStorage` after `fireEvent`/`fill`, not just the DOM), delete
  confirm, char-count badge, cover image (see below).
- **Cover image** (`components/PostCover.tsx`, `.detail-cover*`) —
  3-state machine (`loading` → `loaded`/`error`), fetches
  `https://cataas.com/cat/cute?t=<token>` on every mount (real
  network call, not mocked):
  - Loading: `[data-testid=cover-skeleton]` present, no spinner.
  - Loaded: `[data-testid=cover-image][data-loaded=true]`, confirm
    zero layout shift by comparing `.detail-title` `boundingBox()`
    before/after.
  - New random image per visit: compare the `?t=` token across two
    navigations to the same post — it must differ (cache-busting).
  - Failure: block the request with
    `page.route("**://cataas.com/**", r => r.abort())`, reload, and
    wait for `[data-testid=detail-cover]` to disappear entirely
    (collapse, no broken-image icon). Confirm the title input is
    still immediately editable afterward.
- **Mypage** `/mypage` — nickname save (1800ms saved-note timeout),
  avatar upload (`FileReader` → base64 in localStorage), logout.

## Gotchas

- This is a real external API call (cataas.com) — the loaded/blocked
  waits need real timeouts (10–15s), not instant assertions.
- `fireEvent`-style instant checks don't apply in a real browser;
  autosave is synchronous in React state but you're reading
  `localStorage` from a `useEffect`, so add a short
  `page.waitForTimeout(200)` after `.fill()` before asserting on
  storage.
- Vitest unit tests (`__tests__/*.test.tsx`) already cover the
  `PostCover` state machine via `fireEvent.load`/`fireEvent.error` in
  jsdom — the browser pass here is for layout-shift/visual/network
  behavior jsdom can't observe, not a re-check of logic.
