const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // CORS para app Samsung TV (origem pode ser file:// ou widget:// no .wgt)
      { source: '/api/tv/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/api/games', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/api/games/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/api/video/stream-playback', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
