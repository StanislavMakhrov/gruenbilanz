/**
 * GET /api/profile — Returns the singleton CompanyProfile (id=1).
 *
 * Returns the full profile record including logoPath so the Firmenprofil
 * wizard screen can pre-fill the form and display the existing logo on mount.
 * Returns null (HTTP 200) when no profile row exists yet.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  try {
    const profile = await prisma.companyProfile.findUnique({ where: { id: 1 } });
    // Return null when no profile exists yet — client treats this as "empty form"
    return NextResponse.json(profile ?? null);
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json({ error: 'Profil konnte nicht geladen werden.' }, { status: 500 });
  }
}
