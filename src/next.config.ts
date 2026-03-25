import type { NextConfig } from 'next';
import { createRequire } from 'module';
import path from 'path';

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
      // as React Server Components by Next.js, which uses the RSC-vendored React
      // (next/dist/compiled/next-server/app-page.runtime.prod.js → vendored["react-rsc"].React).
      //
      // The standard `react/jsx-runtime.js` accesses React internals at module load time:
      //   r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
      // The RSC-vendored React does NOT expose __SECRET_INTERNALS, so this throws
      // TypeError at request time when the PDF chunks are loaded, causing a 500.
      //
      // Fix: alias 'react/jsx-runtime' for PDF component files to a custom runtime
      // (lib/pdf-jsx-runtime.js) that creates standard React elements WITHOUT touching
      // React internals. The custom runtime produces elements with
      //   $$typeof: Symbol.for("react.element")
      // which @react-pdf/reconciler accepts correctly.
      //
      // Note: this rule is pushed AFTER Next.js configures its RSC aliases so it
      // takes precedence for files matching the test pattern.

      const pdfJsxRuntime = path.resolve(
        path.dirname(require.resolve('./package.json')),
        'lib/pdf-jsx-runtime.js',
      );

      config.module.rules.push({
        // Match the PDF component source files AND lib/pdf.tsx.
        //
        // lib/pdf.tsx is also included (exact match, not a prefix) because `import React from 'react'`
        // in a server module resolves to the RSC-vendored React 19 canary, whose createElement
        // produces elements with `$$typeof: Symbol.for("react.transitional.element")`.
        // @react-pdf/renderer (built against React 18) only recognises
        // `Symbol.for("react.element")`, so the top-level createElement call in pdf.tsx
        // must also use our custom runtime — achieved by writing JSX there and aliasing
        // react/jsx-runtime to pdf-jsx-runtime.js via this rule.
        //
        // Using `test` (not `issuer`) ensures the alias applies to each file's own
        // imports, regardless of which module imported them.
        test: /lib[/\\]pdf\.tsx?$|components[/\\]reports[/\\].*\.tsx?$/,
        resolve: {
          alias: {
            // Replace the standard react/jsx-runtime with our internal-free version.
            // The custom runtime does not access React.__SECRET_INTERNALS, avoiding
            // the TypeError thrown when the RSC-vendored React is used as the React
            // instance in the webpack server bundle.
            'react/jsx-runtime$': pdfJsxRuntime,
            'react/jsx-dev-runtime$': pdfJsxRuntime,
          },
        },
      });
    }
    return config;
  },
};

export default nextConfig;
