/**
 * /app/api/stream-token/route.js — Server-side stream token proxy
 * ================================================================
 * Proxies the stream token request to the VPS backend, bypassing all
 * browser CORS restrictions.
 *
 * Why this exists:
 *   VideoPlayer.jsx runs in the browser. When the app is on localhost:3000
 *   and the backend is on thanganat25.com, every cross-origin request needs
 *   CORS headers. Rather than managing nginx CORS config, this route acts
 *   as a transparent server-side proxy — the browser only ever talks to
 *   its own origin, and Next.js makes the VPS call server-side.
 *
 * Flow:
 *   Browser → GET /api/stream-token?stream=...  (same origin, no CORS)
 *             Authorization: Bearer <firebase-id-token>
 *   Next.js → GET https://thanganat25.com/api/stream-token?stream=...
 *             Authorization: Bearer <firebase-id-token>  (server-side, no CORS)
 *   ← { token, url, ttl } returned to browser
 */

const VPS_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL
    || `https://${process.env.NEXT_PUBLIC_VPS_DOMAIN || 'thanganat25.com'}`;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream');

    if (!stream) {
        return new Response(JSON.stringify({ error: 'Missing stream parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Forward the Authorization header from the browser to the VPS backend
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let vpsResponse;
    try {
        vpsResponse = await fetch(
            `${VPS_BACKEND}/api/stream-token?stream=${encodeURIComponent(stream)}`,
            { headers: { Authorization: authHeader } }
        );
    } catch (err) {
        console.error('[/api/stream-token] Upstream fetch failed:', err.message);
        return new Response(JSON.stringify({ error: 'VPS unreachable', detail: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const body = await vpsResponse.text();
    return new Response(body, {
        status: vpsResponse.status,
        headers: { 'Content-Type': 'application/json' },
    });
}
