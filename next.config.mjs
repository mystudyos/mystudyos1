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
