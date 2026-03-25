/**
 * Root layout for GrünBilanz.
 * Provides the HTML shell, global navigation, and toast notifications.
 * Language is set to "de" to trigger correct browser hyphenation and spell-check.
 * System-UI font stack for premium SaaS typography without network dependency.
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
        {/* Global navigation — sticky, dark emerald gradient for premium SaaS look */}
        <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#064e3b] to-[#065f46] px-4 h-14 flex items-center justify-between shadow-lg shadow-emerald-900/20">
          <Link href="/" className="flex items-center gap-2 min-h-[44px] px-1">
            <span className="text-white font-bold text-xl leading-none">🌿 GrünBilanz</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/wizard"
              className="text-sm text-emerald-100 hover:text-white px-3 py-2 rounded-md hover:bg-white/10 min-h-[44px] flex items-center transition-colors"
            >
              Erfassung
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-md hover:bg-white/10 text-emerald-200 hover:text-white min-h-[44px] flex items-center transition-colors"
              aria-label="Einstellungen"
            >
              {/* lucide-react Settings icon — consistent with WizardLayoutInner (Bug 2 fix) */}
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
