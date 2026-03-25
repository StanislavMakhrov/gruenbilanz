/**
 * GET /api/badge — Returns a GrünBilanz sustainability badge.
 *
 * Supports three output formats via `?format=` query parameter:
 *   svg  — SVG badge (default)
 *   png  — PNG raster image (converted via sharp)
 *   html — HTML embed snippet with <img> and optional <a> tags
 *
 * Optional query parameters:
 *   year — reporting year (defaults to most recent year in DB)
 *
 * Badge design: green background, "GrünBilanz ✓", company CO₂e value, year.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTotalCO2e } from '@/lib/emissions';

/** Builds the SVG string for the badge */
function buildSvg(companyName: string, co2eTonnesStr: string, year: number): string {
  const w = 240;
  const h = 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="GrünBilanz ${co2eTonnesStr} t CO2e ${year}">
  <title>GrünBilanz — ${companyName} — ${co2eTonnesStr} t CO2e (${year})</title>
  <defs>
    <linearGradient id="gb-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2D6A4F"/>
      <stop offset="1" stop-color="#1B4332"/>
    </linearGradient>
    <clipPath id="gb-clip">
      <rect width="${w}" height="${h}" rx="8"/>
    </clipPath>
  </defs>
  <g clip-path="url(#gb-clip)">
    <rect width="${w}" height="${h}" fill="url(#gb-grad)"/>
    <rect x="0" y="0" width="4" height="${h}" fill="#52B788"/>
    <text x="14" y="22" font-family="DejaVu Sans,Helvetica,Arial,sans-serif" font-size="11" font-weight="bold" fill="#D8F3DC">GrünBilanz</text>
    <text x="14" y="40" font-family="DejaVu Sans,Helvetica,Arial,sans-serif" font-size="16" font-weight="bold" fill="white">${co2eTonnesStr} t CO2e</text>
    <rect x="${w - 44}" y="14" width="34" height="16" rx="8" fill="#52B788" opacity="0.6"/>
    <text x="${w - 27}" y="26" font-family="DejaVu Sans,Helvetica,Arial,sans-serif" font-size="9" fill="white" text-anchor="middle">${year}</text>
  </g>
</svg>`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') ?? 'svg';
    const yearParam = searchParams.get('year');

    // Resolve reporting year — explicit year param or fall back to most recent
    let reportingYear: { id: number; year: number } | null = null;
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (!isNaN(y)) {
        reportingYear = await prisma.reportingYear.findUnique({ where: { year: y } });
      }
    }
    if (!reportingYear) {
      reportingYear = await prisma.reportingYear.findFirst({ orderBy: { year: 'desc' } });
    }

    let co2eTonnesStr = '0,00';
    let displayYear = new Date().getFullYear();
    let companyName = 'GrünBilanz';

    if (reportingYear) {
      displayYear = reportingYear.year;

      const [company, entries, materialEntries] = await Promise.all([
        prisma.companyProfile.findUnique({ where: { id: 1 } }),
        prisma.emissionEntry.findMany({ where: { reportingYearId: reportingYear.id } }),
        prisma.materialEntry.findMany({ where: { reportingYearId: reportingYear.id } }),
      ]);

      if (company) companyName = company.firmenname;

      // Combine emission entries and material entries for total CO₂e calculation.
      // Type annotations removed — Prisma infers the correct types from findMany() return values.
      const allEntries = [
        ...entries.map((e) => ({ category: e.category as string, quantity: e.quantity, isOekostrom: e.isOekostrom })),
        ...materialEntries.map((m) => ({ category: m.material as string, quantity: m.quantityKg })),
      ];

      if (allEntries.length > 0) {
        const totalKg = await calculateTotalCO2e(allEntries, reportingYear.year);
        co2eTonnesStr = new Intl.NumberFormat('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(totalKg / 1000);
      }
    }

    const svgContent = buildSvg(companyName, co2eTonnesStr, displayYear);

    // ── SVG ──────────────────────────────────────────────────────────────────
    if (format === 'svg') {
      return new NextResponse(svgContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // ── PNG — convert SVG using sharp ─────────────────────────────────────────
    if (format === 'png') {
      const sharp = (await import('sharp')).default;
      const pngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();
      // Buffer extends Uint8Array; cast through unknown to satisfy NextResponse's BodyInit
      return new NextResponse(pngBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // ── HTML embed snippet ────────────────────────────────────────────────────
    if (format === 'html') {
      const baseUrl = request.nextUrl.origin;
      const badgeUrl = `${baseUrl}/api/badge?format=svg&year=${displayYear}`;
      const html = `<!-- GrünBilanz Nachhaltigkeitsbadge — ${companyName} ${displayYear} -->
<a href="${baseUrl}" rel="noopener noreferrer" target="_blank">
  <img src="${badgeUrl}"
       alt="GrünBilanz: ${co2eTonnesStr} t CO2e (${displayYear})"
       width="240" height="60"
       style="border:0;display:inline-block;" />
</a>`;
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json(
      { error: `Unbekanntes Format: "${format}". Erlaubt: svg, png, html` },
      { status: 400 },
    );
  } catch (error) {
    console.error('badge generation error:', error);
    return NextResponse.json(
      { error: 'Badge konnte nicht erstellt werden.' },
      { status: 500 },
    );
  }
}
