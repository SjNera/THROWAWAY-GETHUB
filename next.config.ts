import type { NextConfig } from 'next';

// Static export → deployed to Cloudflare Pages (see the team tech stack).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
