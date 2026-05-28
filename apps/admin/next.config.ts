import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@percel/shared'],
  reactStrictMode: true,
};

export default nextConfig;
