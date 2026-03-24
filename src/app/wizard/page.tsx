/**
 * /wizard — redirects immediately to the first wizard screen (Firmenprofil).
 * This keeps the URL structure clean; all actual wizard content is at /wizard/[screen].
 */
import { redirect } from 'next/navigation';

export default function WizardIndexPage() {
  redirect('/wizard/firmenprofil');
}
