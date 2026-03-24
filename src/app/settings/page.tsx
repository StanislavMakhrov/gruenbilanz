/**
 * Settings page — placeholder for future configuration options.
 * Currently redirects back to the dashboard with a note.
 */
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Einstellungen</h1>
      <p className="text-muted-foreground mb-6">
        Einstellungen werden in einer zukünftigen Version bereitgestellt.
      </p>
      <Link
        href="/"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        ← Zurück zum Dashboard
      </Link>
    </div>
  );
}
