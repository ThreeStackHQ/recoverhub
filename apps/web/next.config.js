/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@recoverhub/db'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'recoverhub.threestack.io']
    }
  },
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  }
}

module.exports = nextConfig
