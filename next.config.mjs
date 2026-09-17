/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // ─── Bundle & Performance Optimizations ───
  compress: true,          // Enable Brotli/Gzip compression for all responses
  poweredByHeader: false,  // Remove X-Powered-By header (minor security + size win)

  experimental: {
    // Tree-shake large icon libraries — only bundle the icons actually imported.
    // Reduces client JS bundle by 50-200KB depending on icon usage.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
