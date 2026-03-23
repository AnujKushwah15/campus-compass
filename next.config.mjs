/** @type {import('next').NextConfig} */
const nextConfig = {
    // ── Images ────────────────────────────────────────────────────────────────
    // Allow Next.js <Image> to load profile pictures from Firebase Storage
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
        ],
    },

    // ── Rewrites ─────────────────────────────────────────────────────────────
    // Proxy /api and /stream requests to the VPS in local development
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://thanganat25.com/api/:path*',
            },
            {
                source: '/stream/:path*',
                destination: 'https://thanganat25.com/stream/:path*',
            },
        ];
    },

    // ── Security Headers ──────────────────────────────────────────────────────
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                ],
            },
        ];
    },
};

export default nextConfig;
