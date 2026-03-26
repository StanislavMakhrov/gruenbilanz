/**
 * Wizard layout — server component wrapper that renders the client-side
 * WizardLayoutInner (which uses usePathname and localStorage for status tracking).
 * Kept as a server component at the top level to satisfy Next.js layout conventions.
 */
import WizardLayoutInner from './WizardLayoutInner';

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return <WizardLayoutInner>{children}</WizardLayoutInner>;
}
