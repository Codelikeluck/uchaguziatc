/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ethers'],
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
