import type { NextConfig } from 'next';

// Production response security is applied by worker.ts with a per-request nonce.
const nextConfig: NextConfig = { poweredByHeader: false };
export default nextConfig;
