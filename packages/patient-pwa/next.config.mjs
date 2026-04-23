import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const enablePushInDev = process.env.ENABLE_PUSH_IN_DEV === 'true';

const connectSrc = isProd ? "connect-src 'self' https: wss:" : "connect-src 'self' http: https: ws: wss:";

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js uses inline scripts; keep this as report-only to avoid breaking the app.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  connectSrc,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=15552000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Allow dev requests from these exact origins (include scheme)
  allowedDevOrigins: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false,
  sw: 'sw.js',
  importScripts: ['/notifications-sw.js'],
  // Keep SW/PWA off in dev by default; opt in explicitly when testing push locally.
  disable: process.env.NODE_ENV === 'development' && !enablePushInDev,
})(nextConfig);
