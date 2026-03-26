/**
 * prisma/seed.ts
 *
 * Database seed script — runs on first container startup via healthcheck.sh.
 * Populates all reference data (emission factors, industry benchmarks) and
 * demo data (company profile, reporting years, emission entries, material entries).
 *
 * All inserts use upsert/createMany with skipDuplicates so the script is safe
 * to run multiple times without creating duplicate rows.
 */

import { PrismaClient, Branche, Scope } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ─────────────────────────────────────────────────────────────────────────
  // Company Profile (single row, id = 1)
  // Demo data for Mustermann Elektro GmbH — used in all screenshots and PDFs
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.companyProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      firmenname: "Mustermann Elektro GmbH",
      branche: Branche.ELEKTROHANDWERK,
      mitarbeiter: 12,
      standort: "München, Bayern",
    },
  });
  console.log("✓ CompanyProfile seeded");

  // ─────────────────────────────────────────────────────────────────────────
  // Reporting Years
  // ─────────────────────────────────────────────────────────────────────────
  const year2023 = await prisma.reportingYear.upsert({
    where: { year: 2023 },
    update: {},
    create: { year: 2023 },
  });

  const year2024 = await prisma.reportingYear.upsert({
    where: { year: 2024 },
    update: {},
    create: { year: 2024 },
  });
  console.log("✓ ReportingYears seeded (2023, 2024)");

  // ─────────────────────────────────────────────────────────────────────────
  // Emission Factors — UBA 2024
  // All factors are versioned with validYear=2024. Negative factors (Altmetall)
  // represent avoided emissions (recycling credits).
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.emissionFactor.createMany({
    skipDuplicates: true,
    data: [
      // ── Scope 1 — Direct combustion ────────────────────────────────────
      {
        key: "ERDGAS",
        validYear: 2024,
        factorKg: 2.0,
        unit: "m³",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "HEIZOEL",
        validYear: 2024,
        factorKg: 2.636,
        unit: "L",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "FLUESSIGGAS",
        validYear: 2024,
        factorKg: 1.653,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "DIESEL_FUHRPARK",
        validYear: 2024,
        factorKg: 2.65,
        unit: "L",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "BENZIN_FUHRPARK",
        validYear: 2024,
        factorKg: 2.33,
        unit: "L",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "PKW_BENZIN_KM",
        validYear: 2024,
        factorKg: 0.19,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "PKW_DIESEL_KM",
        validYear: 2024,
        factorKg: 0.168,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "TRANSPORTER_KM",
        validYear: 2024,
        factorKg: 0.24,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "LKW_KM",
        validYear: 2024,
        factorKg: 0.9,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      // ── Scope 1 — Refrigerant leaks (GWP factors from IPCC AR6) ─────────
      {
        key: "R410A_KAELTEMITTEL",
        validYear: 2024,
        factorKg: 2088.0,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "R32_KAELTEMITTEL",
        validYear: 2024,
        factorKg: 675.0,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "R134A_KAELTEMITTEL",
        validYear: 2024,
        factorKg: 1430.0,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      {
        key: "SONSTIGE_KAELTEMITTEL",
        validYear: 2024,
        factorKg: 2000.0,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE1,
      },
      // ── Scope 2 — Indirect energy ────────────────────────────────────────
      // STROM_MIX: German grid average; STROM_OEKOSTROM: certified green tariff
      {
        key: "STROM_MIX",
        validYear: 2024,
        factorKg: 0.38,
        unit: "kWh",
        source: "UBA 2024",
        scope: Scope.SCOPE2,
      },
      {
        key: "STROM_OEKOSTROM",
        validYear: 2024,
        factorKg: 0.025,
        unit: "kWh",
        source: "UBA 2024",
        scope: Scope.SCOPE2,
      },
      {
        key: "FERNWAERME",
        validYear: 2024,
        factorKg: 0.21,
        unit: "kWh",
        source: "UBA 2024",
        scope: Scope.SCOPE2,
      },
      // ── Scope 3 — Business travel & commuting ───────────────────────────
      {
        key: "GESCHAEFTSREISEN_FLUG",
        validYear: 2024,
        factorKg: 0.255,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "GESCHAEFTSREISEN_BAHN",
        validYear: 2024,
        factorKg: 0.032,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "PENDLERVERKEHR",
        validYear: 2024,
        factorKg: 0.15,
        unit: "km",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      // ── Scope 3 — Waste ──────────────────────────────────────────────────
      {
        key: "ABFALL_RESTMUELL",
        validYear: 2024,
        factorKg: 0.48,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "ABFALL_BAUSCHUTT",
        validYear: 2024,
        factorKg: 0.008,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      // Negative factor: recycling Altmetall avoids virgin material production
      {
        key: "ABFALL_ALTMETALL",
        validYear: 2024,
        factorKg: -0.04,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "ABFALL_SONSTIGES",
        validYear: 2024,
        factorKg: 0.1,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      // ── Scope 3 — Purchased materials (Cat. 1) ──────────────────────────
      {
        key: "KUPFER",
        validYear: 2024,
        factorKg: 3.8,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "STAHL",
        validYear: 2024,
        factorKg: 1.85,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "ALUMINIUM",
        validYear: 2024,
        factorKg: 11.5,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "HOLZ",
        validYear: 2024,
        factorKg: 0.38,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "KUNSTSTOFF_PVC",
        validYear: 2024,
        factorKg: 3.1,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "BETON",
        validYear: 2024,
        factorKg: 0.13,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "FARBEN_LACKE",
        validYear: 2024,
        factorKg: 2.7,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
      {
        key: "MATERIAL_SONSTIGE",
        validYear: 2024,
        factorKg: 1.0,
        unit: "kg",
        source: "UBA 2024",
        scope: Scope.SCOPE3,
      },
    ],
  });
  console.log("✓ EmissionFactors seeded (UBA 2024, 31 factors)");

  // ─────────────────────────────────────────────────────────────────────────
  // Industry Benchmarks
  // Source: UBA sector averages, kg CO₂e per employee per year
  // ─────────────────────────────────────────────────────────────────────────
  for (const [branche, value] of [
    [Branche.ELEKTROHANDWERK, 3200.0],
    [Branche.SHK, 4100.0],
    [Branche.BAUGEWERBE, 5500.0],
    [Branche.TISCHLER, 2800.0],
    [Branche.KFZ_WERKSTATT, 3900.0],
    [Branche.MALER, 2500.0],
    [Branche.SONSTIGES, 3500.0],
  ] as [Branche, number][]) {
    await prisma.industryBenchmark.upsert({
      where: { branche },
      update: {},
      create: { branche, co2ePerEmployeePerYear: value },
    });
  }
  console.log("✓ IndustryBenchmarks seeded (7 Branchen)");

  // ─────────────────────────────────────────────────────────────────────────
  // Emission Entries — 2023 (reportingYearId = year2023.id)
  // Annual entries for all tracked categories.
  // ─────────────────────────────────────────────────────────────────────────
  const emissionEntries2023 = [
    // Scope 1 — direct combustion / fleet
    {
      scope: Scope.SCOPE1,
      category: "ERDGAS" as const,
      quantity: 8000,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE1,
      category: "HEIZOEL" as const,
      quantity: 0,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE1,
      category: "DIESEL_FUHRPARK" as const,
      quantity: 2800,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE1,
      category: "BENZIN_FUHRPARK" as const,
      quantity: 400,
      isOekostrom: false,
    },
    // Scope 2 — energy
    {
      scope: Scope.SCOPE2,
      category: "STROM" as const,
      quantity: 42000,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE2,
      category: "FERNWAERME" as const,
      quantity: 10000,
      isOekostrom: false,
    },
    // Scope 3 — travel, commute, waste
    {
      scope: Scope.SCOPE3,
      category: "GESCHAEFTSREISEN_FLUG" as const,
      quantity: 7000,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "GESCHAEFTSREISEN_BAHN" as const,
      quantity: 2800,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "PENDLERVERKEHR" as const,
      quantity: 24000,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "ABFALL_RESTMUELL" as const,
      quantity: 750,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "ABFALL_BAUSCHUTT" as const,
      quantity: 200,
      isOekostrom: false,
    },
  ];

  for (const entry of emissionEntries2023) {
    // Prisma does not support null in composite unique where clauses, so we
    // use findFirst + create instead of upsert (same pattern as MaterialEntry).
    const existing = await prisma.emissionEntry.findFirst({
      where: {
        reportingYearId: year2023.id,
        scope: entry.scope,
        category: entry.category,
        billingMonth: null,
        providerName: null,
      },
    });
    if (!existing) {
      await prisma.emissionEntry.create({
        data: {
          reportingYearId: year2023.id,
          scope: entry.scope,
          category: entry.category,
          quantity: entry.quantity,
          isOekostrom: entry.isOekostrom,
        },
      });
    }
  }
  console.log(`✓ EmissionEntries 2023 seeded (${emissionEntries2023.length} entries)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Emission Entries — 2024
  // ─────────────────────────────────────────────────────────────────────────
  const emissionEntries2024 = [
    // Scope 1
    {
      scope: Scope.SCOPE1,
      category: "ERDGAS" as const,
      quantity: 8500,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE1,
      category: "DIESEL_FUHRPARK" as const,
      quantity: 3200,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE1,
      category: "BENZIN_FUHRPARK" as const,
      quantity: 500,
      isOekostrom: false,
    },
    // Scope 2
    {
      scope: Scope.SCOPE2,
      category: "STROM" as const,
      quantity: 45000,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE2,
      category: "FERNWAERME" as const,
      quantity: 12000,
      isOekostrom: false,
    },
    // Scope 3
    {
      scope: Scope.SCOPE3,
      category: "GESCHAEFTSREISEN_FLUG" as const,
      quantity: 8500,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "GESCHAEFTSREISEN_BAHN" as const,
      quantity: 3200,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "PENDLERVERKEHR" as const,
      quantity: 26400,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "ABFALL_RESTMUELL" as const,
      quantity: 800,
      isOekostrom: false,
    },
    {
      scope: Scope.SCOPE3,
      category: "ABFALL_ALTMETALL" as const,
      quantity: 150,
      isOekostrom: false,
    },
  ];

  for (const entry of emissionEntries2024) {
    // Prisma does not support null in composite unique where clauses, so we
    // use findFirst + create instead of upsert (same pattern as MaterialEntry).
    const existing = await prisma.emissionEntry.findFirst({
      where: {
        reportingYearId: year2024.id,
        scope: entry.scope,
        category: entry.category,
        billingMonth: null,
        providerName: null,
      },
    });
    if (!existing) {
      await prisma.emissionEntry.create({
        data: {
          reportingYearId: year2024.id,
          scope: entry.scope,
          category: entry.category,
          quantity: entry.quantity,
          isOekostrom: entry.isOekostrom,
        },
      });
    }
  }
  console.log(`✓ EmissionEntries 2024 seeded (${emissionEntries2024.length} entries)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Material Entries — 2023
  // Scope 3 Cat. 1 purchased materials for Mustermann Elektro GmbH
  // ─────────────────────────────────────────────────────────────────────────
  const materialEntries2023 = [
    { material: "KUPFER" as const, quantityKg: 420 },
    { material: "STAHL" as const, quantityKg: 180 },
    { material: "ALUMINIUM" as const, quantityKg: 35 },
  ];

  for (const entry of materialEntries2023) {
    // MaterialEntry has no unique constraint; check before inserting
    const existing = await prisma.materialEntry.findFirst({
      where: {
        reportingYearId: year2023.id,
        material: entry.material,
      },
    });
    if (!existing) {
      await prisma.materialEntry.create({
        data: {
          reportingYearId: year2023.id,
          material: entry.material,
          quantityKg: entry.quantityKg,
        },
      });
    }
  }
  console.log(`✓ MaterialEntries 2023 seeded (${materialEntries2023.length} entries)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Material Entries — 2024
  // ─────────────────────────────────────────────────────────────────────────
  const materialEntries2024 = [
    { material: "KUPFER" as const, quantityKg: 480 },
    { material: "STAHL" as const, quantityKg: 210 },
    { material: "ALUMINIUM" as const, quantityKg: 42 },
    { material: "HOLZ" as const, quantityKg: 120 },
  ];

  for (const entry of materialEntries2024) {
    const existing = await prisma.materialEntry.findFirst({
      where: {
        reportingYearId: year2024.id,
        material: entry.material,
      },
    });
    if (!existing) {
      await prisma.materialEntry.create({
        data: {
          reportingYearId: year2024.id,
          material: entry.material,
          quantityKg: entry.quantityKg,
        },
      });
    }
  }
  console.log(`✓ MaterialEntries 2024 seeded (${materialEntries2024.length} entries)`);

  console.log("🎉 Database seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
