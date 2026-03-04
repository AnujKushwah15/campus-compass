---
phase: 3
plan: 2
wave: 2
depends_on: "3.1"
---

# Phase 3.2: Update Frontend — Remove Stream Token Fetch

## Objective
Remove the `getStreamToken` fetch call and the `/api/stream-token` dependency from the
frontend entirely. The stream URL is now built directly from the Firebase idToken that
the user already has after logging in.

## Tasks

<task type="auto">
  <name>Rewrite StreamContext.jsx — remove getStreamToken</name>
  <files>context/StreamContext.jsx</files>
  <action>
    1. Remove `getStreamToken` useCallback function entirely (lines ~104–157).
    2. Remove `streamToken`, `tokenLoading`, `tokenError`, `tokenRefreshTimer` state/refs.
    3. Remove the auto-request token `useEffect` (lines ~160–168).
    4. Remove `VPS_URL` constant (no longer needed for API calls).
    5. Add a new `useCallback` named `buildStreamUrl` that:
       - Gets `auth.currentUser.getIdToken()` (short-lived Firebase token, valid ~1 hour)
       - Returns `https://${VPS_DOMAIN}/stream/${pathName}/?token=${idToken}`
    6. Expose `buildStreamUrl` in context value.
    Keep `VPS_DOMAIN`, `directStreamUrl`, RTDB subscriptions, and all status state.
  </action>
  <verify>grep -n "stream-token\|getStreamToken\|VPS_URL" context/StreamContext.jsx returns nothing.</verify>
  <done>Context compiles. No reference to old stream-token API remains.</done>
</task>

<task type="auto">
  <name>Update VideoPlayer.jsx — use buildStreamUrl</name>
  <files>components/streaming/VideoPlayer.jsx</files>
  <action>
    Wherever the component previously called `getStreamToken()` or used `streamToken`,
    replace it with `await buildStreamUrl(pathName)` from context.
    The resulting URL already contains the Firebase idToken as a query param for MediaMTX.
  </action>
  <verify>No imports or usage of streamToken/getStreamToken in VideoPlayer.jsx.</verify>
  <done>Player correctly requests the stream URL with idToken appended.</done>
</task>

<task type="auto">
  <name>Remove tokenError / tokenLoading UI states</name>
  <files>Any component using tokenLoading or tokenError from useStream()</files>
  <action>
    grep -r "tokenLoading\|tokenError" app/ components/ — update any UI that was
    checking those flags. Replace with simpler loading/error handling from
    the stream fetch itself.
  </action>
  <verify>Build completes with zero TypeScript/ESLint errors.</verify>
  <done>All old token state references removed from UI.</done>
</task>

## Verification
- `npm run build` completes with no errors.
- In the browser (dev mode), opening a stream page does NOT result in a POST to `/api/stream-token`.
- The stream URL in the browser network tab shows `?token=eyJ...` (a Firebase idToken).
