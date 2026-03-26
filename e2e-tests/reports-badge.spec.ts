/**
 * Playwright e2e tests for GrünBilanz report generation and sustainability badge.
 *
 * Covers UAT test plan steps 10–12:
 *   Step 10 — GHG Protocol PDF report: button present and API responds
 *   Step 11 — CSRD questionnaire PDF: button present and API responds
 *   Step 12 — Sustainability badge: SVG, PNG, HTML endpoints respond correctly
 */

import { test, expect } from '@playwright/test';

// ── Step 10: GHG Report button ────────────────────────────────────────────

test.describe('Reports — GHG Protocol (Step 10)', () => {
  test('Step 10 — "GHG-Bericht erstellen" button is visible on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const ghgButton = page
      .locator('button')
      .filter({ hasText: /GHG-Bericht|GHG Bericht|GHG/i })
      .first();
    await expect(ghgButton).toBeVisible();
  });

  test('Step 10 — GHG button is enabled (not disabled) before clicking', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const ghgButton = page
      .locator('button')
      .filter({ hasText: /GHG/i })
      .first();
    await expect(ghgButton).not.toBeDisabled();
  });

  test('Step 10 — POST /api/reports with GHG_PROTOCOL returns a response', async ({ request }) => {
    // First get the latest reporting year ID
    const yearsResp = await request.get('/api/years');
    expect(yearsResp.ok()).toBeTruthy();
    const years = await yearsResp.json() as Array<{ id: number; year: number }>;
    expect(years.length).toBeGreaterThan(0);

    const reportingYearId = years[0].id;

    const reportResp = await request.post('/api/reports', {
      data: { reportingYearId, type: 'GHG_PROTOCOL' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 with PDF content
    expect(reportResp.ok()).toBeTruthy();
    const contentType = reportResp.headers()['content-type'] ?? '';
    expect(contentType).toContain('pdf');
  });

  test('Step 10 — GHG report PDF has non-zero content length', async ({ request }) => {
    const yearsResp = await request.get('/api/years');
    const years = await yearsResp.json() as Array<{ id: number; year: number }>;
    const reportingYearId = years[0].id;

    const reportResp = await request.post('/api/reports', {
      data: { reportingYearId, type: 'GHG_PROTOCOL' },
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await reportResp.body();
    expect(body.length).toBeGreaterThan(1000); // PDF should be at least 1 KB
  });
});

// ── Step 11: CSRD report button ───────────────────────────────────────────

test.describe('Reports — CSRD Questionnaire (Step 11)', () => {
  test('Step 11 — CSRD-Fragebogen button is visible on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/CSRD/);
  });

  test('Step 11 — POST /api/reports with CSRD_QUESTIONNAIRE returns a PDF', async ({
    request,
  }) => {
    const yearsResp = await request.get('/api/years');
    const years = await yearsResp.json() as Array<{ id: number; year: number }>;
    const reportingYearId = years[0].id;

    const reportResp = await request.post('/api/reports', {
      data: { reportingYearId, type: 'CSRD_QUESTIONNAIRE' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(reportResp.ok()).toBeTruthy();
    const contentType = reportResp.headers()['content-type'] ?? '';
    expect(contentType).toContain('pdf');
  });
});

// ── Step 12: Sustainability badge ─────────────────────────────────────────

test.describe('Reports — Sustainability Badge (Step 12)', () => {
  test('Step 12 — GET /api/badge?format=svg returns an SVG image', async ({ request }) => {
    const resp = await request.get('/api/badge?format=svg');
    expect(resp.ok()).toBeTruthy();

    const contentType = resp.headers()['content-type'] ?? '';
    expect(contentType).toContain('svg');

    const body = await resp.text();
    expect(body).toContain('<svg');
    expect(body).toContain('GrünBilanz');
  });

  test('Step 12 — SVG badge contains company CO₂e value and year', async ({ request }) => {
    const resp = await request.get('/api/badge?format=svg');
    const body = await resp.text();

    // Badge should include a year (2023 or 2024)
    expect(body).toMatch(/202[0-9]/);
    // Badge should include CO2e text
    expect(body).toContain('CO2e');
  });

  test('Step 12 — GET /api/badge?format=png returns a PNG image', async ({ request }) => {
    const resp = await request.get('/api/badge?format=png');
    expect(resp.ok()).toBeTruthy();

    const contentType = resp.headers()['content-type'] ?? '';
    expect(contentType).toContain('png');

    const body = await resp.body();
    // PNG files start with the PNG magic bytes: 89 50 4E 47
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50); // P
    expect(body[2]).toBe(0x4e); // N
    expect(body[3]).toBe(0x47); // G
  });

  test('Step 12 — GET /api/badge?format=html returns an HTML snippet', async ({ request }) => {
    const resp = await request.get('/api/badge?format=html');
    expect(resp.ok()).toBeTruthy();

    const contentType = resp.headers()['content-type'] ?? '';
    expect(contentType).toContain('html');

    const body = await resp.text();
    // HTML embed snippet should contain an img tag or embed code
    expect(body).toMatch(/<img|<div|<section|GrünBilanz/i);
  });

  test('Step 12 — GET /api/badge (no format) defaults to SVG', async ({ request }) => {
    const resp = await request.get('/api/badge');
    expect(resp.ok()).toBeTruthy();

    // Default format should be SVG
    const contentType = resp.headers()['content-type'] ?? '';
    const body = await resp.text();
    expect(contentType + body).toMatch(/svg/i);
  });

  test('Step 12 — badge SVG is navigable in browser and renders visually', async ({ page }) => {
    await page.goto('/api/badge?format=svg');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/error|500/);
    // The browser should display SVG content
    const svgElement = page.locator('svg').first();
    await expect(svgElement).toBeVisible();
  });
});

// ── API: /api/years ───────────────────────────────────────────────────────

test.describe('API — /api/years endpoint', () => {
  test('GET /api/years returns a JSON array with at least 2 years', async ({ request }) => {
    const resp = await request.get('/api/years');
    expect(resp.ok()).toBeTruthy();

    const years = await resp.json() as Array<{ id: number; year: number }>;
    expect(Array.isArray(years)).toBeTruthy();
    expect(years.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/years includes 2023 and 2024 from seed data', async ({ request }) => {
    const resp = await request.get('/api/years');
    const years = await resp.json() as Array<{ id: number; year: number }>;
    const yearNumbers = years.map((y) => y.year);
    expect(yearNumbers).toContain(2024);
    expect(yearNumbers).toContain(2023);
  });
});

// ── API: /api/entries ─────────────────────────────────────────────────────

test.describe('API — /api/entries endpoint', () => {
  test('GET /api/entries returns a valid JSON response', async ({ request }) => {
    // Get the latest year id
    const yearsResp = await request.get('/api/years');
    const years = await yearsResp.json() as Array<{ id: number; year: number }>;
    const reportingYearId = years[0].id;

    const resp = await request.get(`/api/entries?reportingYearId=${reportingYearId}`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/entries contains seeded emission entries for 2024', async ({ request }) => {
    const yearsResp = await request.get('/api/years');
    const years = await yearsResp.json() as Array<{ id: number; year: number }>;
    const year2024 = years.find((y) => y.year === 2024);
    expect(year2024).toBeDefined();

    const resp = await request.get(`/api/entries?reportingYearId=${year2024!.id}`);
    const entries = await resp.json() as Array<{ category: string; quantity: number }>;
    expect(entries.length).toBeGreaterThan(0);
  });
});
