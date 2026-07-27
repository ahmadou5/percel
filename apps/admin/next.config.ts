import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  transpilePackages: ['@percel/shared'],
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  org: "sentry",
  project: "percel",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
