import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Moved from experimental.serverComponentsExternalPackages (deprecated in Next.js 15)
  serverExternalPackages: ['@react-pdf/renderer', '@prisma/client'],
};

export default nextConfig;
