/**
 * Root layout for GrünBilanz.
 * Provides the HTML shell, global navigation, and toast notifications.
 * Language is set to "de" to trigger correct browser hyphenation and spell-check.
 */
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'GrünBilanz',
  description: 'CO₂-Bilanzierung für Handwerksbetriebe – GHG Protocol konform',
};

/**
 * Settings icon as a simple inline SVG.
 * Avoids an external icon library dependency.
 */
function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background text-foreground">
        {/* Global navigation — sticky so it remains accessible during scroll */}
        <nav className="sticky top-0 z-50 bg-white border-b border-border px-4 h-14 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-2 min-h-[44px] px-1">
            <span className="text-primary font-bold text-lg leading-none">🌿 GrünBilanz</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/wizard"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-accent min-h-[44px] flex items-center transition-colors"
            >
              Erfassung
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground min-h-[44px] flex items-center transition-colors"
              aria-label="Einstellungen"
            >
              <SettingsIcon />
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
