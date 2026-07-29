import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@percel/shared'],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Avoid webpack minify-plugin version conflict in pnpm monorepo
    config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
