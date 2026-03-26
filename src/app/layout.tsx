/**
 * Root layout for GrünBilanz.
 * Provides the HTML shell, global navigation, and toast notifications.
 * Language is set to "de" to trigger correct browser hyphenation and spell-check.
 * Inter is declared via --font-inter CSS variable in globals.css; the browser
 * uses Inter if available on the user's system, then falls back to ui-sans-serif.
 */
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'GrünBilanz',
  description: 'CO₂-Bilanzierung für Handwerksbetriebe – GHG Protocol konform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {/* Global navigation — clean white bar for a modern, professional look */}
        <nav className="sticky top-0 z-50 bg-white border-b border-border px-4 h-14 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2 min-h-[44px] px-1">
            <span className="text-primary font-bold text-xl leading-none">🌿 GrünBilanz</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/wizard"
              className="text-sm text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted min-h-[44px] flex items-center transition-colors font-medium"
            >
              Erfassung
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-muted text-foreground/60 hover:text-foreground min-h-[44px] flex items-center transition-colors"
              aria-label="Einstellungen"
            >
              {/* lucide-react Settings icon — consistent with WizardLayoutInner */}
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        {/* Toast notifications via sonner — positioned top-right, with colour coding */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
