/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}
module.exports = nextConfig
