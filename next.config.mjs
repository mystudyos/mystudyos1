import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/landing/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/exams/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/dashboard",
        destination: "/",
      },
      {
        source: "/auth",
        destination: "/",
      },
      {
        source: "/__/auth/:path*",
        destination: "https://studyos-a4977.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://studyos-a4977.firebaseapp.com/__/firebase/:path*",
      },
    ]
  },
  webpack(config, { dev, isServer }) {
    if (dev) {
      try {
        config.cache = { type: 'memory' }
      } catch (e) {}
    }
    return config
  },
}

export default nextConfig
