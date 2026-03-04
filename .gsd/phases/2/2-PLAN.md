---
phase: 2
plan: 2
wave: 2
depends_on: [1]
files_modified: [".env.local", "src/context/StreamContext.jsx", "src/components/VideoPlayer.jsx"]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Frontend URLs must point to HTTPS via the domain (thanganat25.com)"
  artifacts:
    - ".env.local contains updated NEXT_PUBLIC_API_URL and NEXT_PUBLIC_STREAM_URL (WSS)"
---

# Plan 2.2: Updating Frontend URLs to use HTTPS

<objective>
Update the Next.js frontend application to use the secure domain for all API and WebSocket (WebRTC) connections to resolve the Mixed Content errors on Vercel.

Purpose: Browsers block mixed content. Our backend and MediaMTX stream are now behind HTTPS via Cloudflare -> VPS Nginx. We need the frontend to point to these secure URLs.
Output: Updated .env and config to enforce `https://` and `wss://`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .env.local
- src/context/StreamContext.jsx
- src/components/VideoPlayer.jsx
</context>

<tasks>

<task type="auto">
  <name>Update API base URLs</name>
  <files>src/context/StreamContext.jsx, src/components/VideoPlayer.jsx</files>
  <action>
    Search for hardcoded `http://72.61.250.73` or `http://` patterns in fetching backend APIs. Replace them with `https://thanganat25.com/api`. Be careful to replace HTTP strings exactly, especially for the JWT token endpoint.
  </action>
  <verify>grep -r "thanganat25.com" src/</verify>
  <done>Frontend files use the domain explicitly and avoid raw IPs.</done>
</task>

<task type="auto">
  <name>Update WHEP stream URL</name>
  <files>src/components/VideoPlayer.jsx, src/context/StreamContext.jsx</files>
  <action>
    Update WebRTC URL from `http://...:8889` to `https://thanganat25.com/stream` or `https://thanganat25.com/whep`.
    MediaMTX's WebRTC relies on its `/stream/` mapping defined in Nginx. Ensure the `endpoint` or `url` passed to the WebRTC player component reads the secure URI.
  </action>
  <verify>grep -r "8889" src/ || echo "Port removed from code"</verify>
  <done>No hardcoded :8889 ports remain in the client code.</done>
</task>

<task type="auto">
  <name>Update environment variables</name>
  <files>.env.local</files>
  <action>
    Update local dot-env (and subsequently Vercel) variables referencing API and stream endpoints.
  </action>
  <verify>cat .env.local | grep "thanganat25.com"</verify>
  <done>Local environment points to the secure production backend.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] No mixed-content URLs exist for VPS endpoints
- [ ] Frontend builds successfully (`npm run build`)
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Ready for redeploy to Vercel
</success_criteria>
