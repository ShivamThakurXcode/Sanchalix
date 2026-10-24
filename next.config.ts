import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  experimental: { authInterrupts: true },
  // The container image runs a self-contained server. Left off elsewhere, so `next start` keeps working.
  ...(process.env.BUILD_STANDALONE && { output: 'standalone' as const }),
  // pdfkit reads its font files from its own folder at run time, which a bundled copy can't find.
  serverExternalPackages: ['pdfkit'],
  // The PDFs' font is read from disk when one is drawn, so it has to travel with those routes when deployed.
  outputFileTracingIncludes: {
    '/api/v1/payments/[id]/receipt': ['./assets/fonts/*.ttf'],
    '/api/v1/students/[id]/transfer-certificate': ['./assets/fonts/*.ttf'],
  },
  // Cloudscape optimization - bundle all Cloudscape components together
  webpack: (config, { isServer }) => {
    // Reduce Cloudscape chunking
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Bundle all Cloudscape components into one chunk
            cloudscape: {
              test: /[\\/]node_modules[\\/](@cloudscape-design)/,
              name: 'cloudscape',
              priority: 10,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
  // Development performance optimizations
  ...(isDev && {
    // Faster hot reload
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Disable source maps in dev for faster builds
    productionBrowserSourceMaps: false,
    // Optimize package imports - Cloudscape is tree-shakeable
    optimizePackageImports: [
      '@cloudscape-design/components',
      '@cloudscape-design/global-styles',
      '@cloudscape-design/design-tokens',
    ],
  }),
  // Speed up compilation
  swcMinify: true,
  // Reduce build time by skipping unnecessary steps
  ...(isDev && {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
  }),
  // Production optimizations
  ...(!isDev && {
    // Disable source maps in production for smaller bundles
    productionBrowserSourceMaps: false,
    // Compress static assets
    compress: true,
  }),
};

export default createNextIntlPlugin()(nextConfig);
