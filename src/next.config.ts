import type { NextConfig } from 'next';
import { createRequire } from 'module';

// Use createRequire so module resolution works from this config file's directory.
// require.resolve() finds the canonical path regardless of package manager layout
// (npm, pnpm symlinks, Yarn PnP, etc.) and is more robust than path.resolve().
const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  output: 'standalone',
  // Moved from experimental.serverComponentsExternalPackages (deprecated in Next.js 15)
  serverExternalPackages: ['@react-pdf/renderer', '@prisma/client'],

  webpack(config, { isServer }) {
    if (isServer) {
      // PDF report components (GHGReport, CSRDQuestionnaire, ScopeTable) are compiled
      // as React Server Components by Next.js, which aliases 'react/jsx-runtime' to the
      // RSC bundled version (vendored["react-rsc"].ReactJsxRuntime). The RSC JSX runtime
      // produces elements with $$typeof = Symbol(react.transitional.element), which
      // @react-pdf/reconciler does not recognise — it only handles standard React elements
      // (Symbol(react.element)), causing React Error #31 inside renderToBuffer.
      //
      // Fix: add a webpack module rule that overrides the resolve.alias for react and
      // react/jsx-runtime ONLY for files in components/reports/.
      // This forces those files to use the real node_modules React (which produces
      // Symbol(react.element) elements) while all other server code continues to use the
      // RSC-vendored React required for correct Server Component rendering.
      //
      // Note: this rule must be pushed AFTER Next.js configures its RSC aliases so it
      // takes precedence for files matching the test pattern.

      const realReact = require.resolve('react');
      const realReactJsx = require.resolve('react/jsx-runtime');

      config.module.rules.push({
        // Match the PDF component source files directly, regardless of who imports them.
        // Using `test` (not `issuer`) ensures the alias applies to each component's own
        // imports — GHGReport.tsx is imported from lib/pdf.ts which is outside this
        // directory, so an `issuer` condition on components/reports/ would miss it.
        test: /components[/\\]reports[/\\].*\.(tsx?|js)$/,
        resolve: {
          alias: {
            react$: realReact,
            'react/jsx-runtime$': realReactJsx,
          },
        },
      });
    }
    return config;
  },
};

export default nextConfig;
