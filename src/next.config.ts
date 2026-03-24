import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@prisma/client'],
  },
};

export default nextConfig;
