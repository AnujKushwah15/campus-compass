/**
 * /app/api/whep/route.js — Server-side WHEP SDP proxy
 * =====================================================
 * Proxies the WebRTC/WHEP SDP offer/answer exchange to the VPS MediaMTX
 * server, bypassing all browser CORS restrictions.
 *
 * Why this exists:
 *   The browser can't POST directly to https://thanganat25.com/stream/.../whep
 *   from localhost:3000 because nginx can't reliably attach CORS headers to
 *   the proxied MediaMTX SDP response. This Next.js route acts as a
 *   same-origin proxy — the browser sees only this route (no CORS needed),
 *   and Next.js makes the server-to-server call to the VPS freely.
 *
 * Flow:
 *   1. VideoPlayer.jsx  →  POST /api/whep?stream=live_bus-1  (same origin ✓)
 *   2. This route       →  POST https://thanganat25.com/stream/live_bus-1/whep?token=<JWT>
 *   3. MediaMTX calls /stream-auth on backend to verify JWT
 *   4. SDP answer flows back through this proxy to the browser
 */

const VPS_DOMAIN = process.env.NEXT_PUBLIC_VPS_DOMAIN || 'thanganat25.com';

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream');
    const token  = searchParams.get('token');

    if (!stream || !token) {
        return new Response(JSON.stringify({ error: 'Missing stream or token' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Read the SDP offer body from the browser
    const sdpOffer = await request.text();

    const vpsWhepUrl = `https://${VPS_DOMAIN}/stream/${encodeURIComponent(stream)}/whep?token=${encodeURIComponent(token)}`;

    let vpsResponse;
    try {
        vpsResponse = await fetch(vpsWhepUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: sdpOffer,
        });
    } catch (err) {
        console.error('[/api/whep] Upstream fetch failed:', err.message);
        return new Response(JSON.stringify({ error: 'VPS unreachable', detail: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Pass useful response headers back (Location header is needed for WHEP)
    const headers = new Headers();
    headers.set('Content-Type', vpsResponse.headers.get('Content-Type') || 'application/sdp');
    const location = vpsResponse.headers.get('Location');
    if (location) headers.set('Location', location);
    const link = vpsResponse.headers.get('Link');
    if (link) headers.set('Link', link);

    const body = await vpsResponse.text();
    return new Response(body, { status: vpsResponse.status, headers });
}
