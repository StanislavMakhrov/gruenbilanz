/**
 * GHG Protocol PDF Report component for GrünBilanz.
 *
 * Renders a GHG Protocol Corporate Standard compliant PDF using @react-pdf/renderer.
 * Must be rendered on Node.js runtime only (never Edge runtime).
 * All text is in German; numbers use German locale formatting.
 *
 * Sections follow the GHG Protocol reporting structure:
 *   1. Company header   2. Firmenprofil   3. Executive Summary
 *   4–6. Scope 1/2/3 tables   7. Berichtsgrenzen
 *   8. Methodology   9. Nicht erfasste Kategorien (footnotes)
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/pdf';
import { ScopeTable } from './ScopeTable';

// ─── Brand colours ────────────────────────────────────────────────────────────
const GREEN = '#2D6A4F';
const GREEN_LIGHT = '#D8F3DC';
const GREY = '#6B7280';
const BORDER = '#E5E7EB';
const BLACK = '#111827';

// ─── German display labels per category ───────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; unit: string }> = {
  ERDGAS: { label: 'Erdgas', unit: 'm³' },
  HEIZOEL: { label: 'Heizöl', unit: 'L' },
  FLUESSIGGAS: { label: 'Flüssiggas', unit: 'kg' },
  DIESEL_FUHRPARK: { label: 'Diesel (Fuhrpark)', unit: 'L' },
  BENZIN_FUHRPARK: { label: 'Benzin (Fuhrpark)', unit: 'L' },
  PKW_BENZIN_KM: { label: 'PKW Benzin', unit: 'km' },
  PKW_DIESEL_KM: { label: 'PKW Diesel', unit: 'km' },
  TRANSPORTER_KM: { label: 'Transporter', unit: 'km' },
  LKW_KM: { label: 'LKW', unit: 'km' },
  R410A_KAELTEMITTEL: { label: 'Kältemittel R410A', unit: 'kg' },
  R32_KAELTEMITTEL: { label: 'Kältemittel R32', unit: 'kg' },
  R134A_KAELTEMITTEL: { label: 'Kältemittel R134A', unit: 'kg' },
  SONSTIGE_KAELTEMITTEL: { label: 'Kältemittel Sonstige', unit: 'kg' },
  STROM: { label: 'Strom', unit: 'kWh' },
  FERNWAERME: { label: 'Fernwärme', unit: 'kWh' },
  GESCHAEFTSREISEN_FLUG: { label: 'Geschäftsreisen (Flug)', unit: 'km' },
  GESCHAEFTSREISEN_BAHN: { label: 'Geschäftsreisen (Bahn)', unit: 'km' },
  PENDLERVERKEHR: { label: 'Pendlerverkehr', unit: 'km' },
  ABFALL_RESTMUELL: { label: 'Abfall: Restmüll', unit: 'kg' },
  ABFALL_BAUSCHUTT: { label: 'Abfall: Bauschutt', unit: 'kg' },
  ABFALL_ALTMETALL: { label: 'Abfall: Altmetall (Gutschrift)', unit: 'kg' },
  ABFALL_SONSTIGES: { label: 'Abfall: Sonstiges', unit: 'kg' },
};

const MATERIAL_LABELS: Record<string, string> = {
  KUPFER: 'Kupfer',
  STAHL: 'Stahl',
  ALUMINIUM: 'Aluminium',
  HOLZ: 'Holz',
  KUNSTSTOFF_PVC: 'Kunststoff/PVC',
  BETON: 'Beton',
  FARBEN_LACKE: 'Farben & Lacke',
  SONSTIGE: 'Sonstige Materialien',
};

const BRANCHE_LABELS: Record<string, string> = {
  ELEKTROHANDWERK: 'Elektrohandwerk',
  SHK: 'SHK (Sanitär, Heizung, Klima)',
  BAUGEWERBE: 'Baugewerbe',
  TISCHLER: 'Tischler',
  KFZ_WERKSTATT: 'KFZ-Werkstatt',
  MALER: 'Maler',
  SONSTIGES: 'Sonstiges',
};

// ─── Scope category lists for "nicht erfasst" footnotes ───────────────────────
const SCOPE1_CATEGORIES = [
  'ERDGAS', 'HEIZOEL', 'FLUESSIGGAS', 'DIESEL_FUHRPARK', 'BENZIN_FUHRPARK',
  'PKW_BENZIN_KM', 'PKW_DIESEL_KM', 'TRANSPORTER_KM', 'LKW_KM',
  'R410A_KAELTEMITTEL', 'R32_KAELTEMITTEL', 'R134A_KAELTEMITTEL', 'SONSTIGE_KAELTEMITTEL',
];
const SCOPE2_CATEGORIES = ['STROM', 'FERNWAERME'];
const SCOPE3_CATEGORIES = [
  'GESCHAEFTSREISEN_FLUG', 'GESCHAEFTSREISEN_BAHN', 'PENDLERVERKEHR',
  'ABFALL_RESTMUELL', 'ABFALL_BAUSCHUTT', 'ABFALL_ALTMETALL', 'ABFALL_SONSTIGES',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats kg CO₂e as German-locale tonnes (e.g. "1.234,56") */
function fmtTonnes(kg: number): string {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    kg / 1000,
  );
}

/** Formats a number in German locale with configurable decimal places */
function fmtNum(n: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 40, color: BLACK },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 12, borderBottomColor: GREEN, borderBottomWidth: 2 },
  logo: { width: 60, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN },
  reportTitle: { fontSize: 11, color: GREY, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GREEN, marginTop: 16, marginBottom: 8, paddingBottom: 3, borderBottomColor: GREEN_LIGHT, borderBottomWidth: 1 },
  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: GREEN_LIGHT, borderRadius: 4, padding: 8 },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: GREEN },
  summaryLabel: { fontSize: 7, color: GREY, marginTop: 2 },
  tblHeader: { flexDirection: 'row', backgroundColor: GREEN, padding: 5 },
  tblHCell: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tblRow: { flexDirection: 'row', borderBottomColor: BORDER, borderBottomWidth: 1, padding: 5 },
  tblRowAlt: { backgroundColor: '#F9FAFB' },
  tblCell: { fontSize: 8, color: BLACK },
  tblMuted: { fontSize: 8, color: GREY },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 140, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREY },
  infoValue: { flex: 1, fontSize: 9, color: BLACK },
  bold: { fontFamily: 'Helvetica-Bold' },
  green: { color: GREEN },
  bodyText: { fontSize: 9, color: BLACK, lineHeight: 1.5, marginBottom: 8 },
  footnote: { fontSize: 8, color: GREY, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: GREY, borderTopColor: BORDER, borderTopWidth: 1, paddingTop: 3 },
  pageNum: { position: 'absolute', bottom: 20, right: 40, fontSize: 7, color: GREY },
});

// ─── Main component ───────────────────────────────────────────────────────────
export interface GHGReportProps {
  data: ReportData;
}

export function GHGReport({ data }: GHGReportProps): React.ReactElement {
  const { company, year, entries, materialEntries, scope1TotalKg, scope2TotalKg, scope3TotalKg, generatedAt } = data;
  const totalKg = scope1TotalKg + scope2TotalKg + scope3TotalKg;
  const perEmployeeKg = company.mitarbeiter > 0 ? totalKg / company.mitarbeiter : 0;

  const scope1Entries = entries.filter((e) => e.scope === 'SCOPE1');
  const scope2Entries = entries.filter((e) => e.scope === 'SCOPE2');
  const scope3Entries = entries.filter((e) => e.scope === 'SCOPE3');

  // Determine categories with no recorded entries for footnotes
  const recorded = new Set(entries.map((e) => e.category as string));
  const notRecorded = [
    ...SCOPE1_CATEGORIES, ...SCOPE2_CATEGORIES, ...SCOPE3_CATEGORIES,
  ].filter((c) => !recorded.has(c));

  const dateStr = new Intl.DateTimeFormat('de-DE').format(generatedAt);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* 1. Company header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{company.firmenname}</Text>
            <Text style={s.reportTitle}>THG-Bericht {year.year} · GHG Protocol Corporate Standard</Text>
          </View>
          {company.logoPath && <Image style={s.logo} src={company.logoPath} />}
        </View>

        {/* 2. Firmenprofil */}
        <Text style={s.sectionTitle}>Firmenprofil</Text>
        {[
          ['Branche:', BRANCHE_LABELS[company.branche] ?? company.branche],
          ['Mitarbeiter:', String(company.mitarbeiter)],
          ['Standort:', company.standort],
          ['Berichtsjahr:', String(year.year)],
        ].map(([label, value]) => (
          <View key={label} style={s.infoRow}>
            <Text style={s.infoLabel}>{label}</Text>
            <Text style={s.infoValue}>{value}</Text>
          </View>
        ))}

        {/* 3. Executive Summary */}
        <Text style={s.sectionTitle}>Executive Summary</Text>
        <View style={s.summaryRow}>
          {[
            { value: `${fmtTonnes(totalKg)} t`, label: 'Gesamt CO₂e' },
            { value: `${fmtTonnes(perEmployeeKg)} t`, label: 'CO₂e / Mitarbeiter' },
            { value: `${fmtTonnes(scope1TotalKg)} t`, label: 'Scope 1' },
            { value: `${fmtTonnes(scope2TotalKg)} t`, label: 'Scope 2' },
            { value: `${fmtTonnes(scope3TotalKg)} t`, label: 'Scope 3' },
          ].map(({ value, label }) => (
            <View key={label} style={s.summaryCard}>
              <Text style={s.summaryValue}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* 4. Scope 1 table */}
        <Text style={s.sectionTitle}>Scope 1 — Direkte Emissionen</Text>
        {scope1Entries.length === 0 ? (
          <Text style={s.bodyText}>Keine Scope-1-Einträge erfasst.</Text>
        ) : (
          <ScopeTable
            headers={['Kategorie', 'Menge', 'Einheit', 'Quelle']}
            rows={scope1Entries.map((e) => {
              const info = CATEGORY_LABELS[e.category] ?? { label: e.category, unit: '—' };
              return { cells: [info.label, fmtNum(e.quantity, 1), info.unit, 'UBA 2024'], widths: [3, 1, 1, 2] };
            })}
          />
        )}
        <View style={[s.infoRow, { marginBottom: 8 }]}>
          <Text style={s.infoLabel}>Scope 1 Gesamt:</Text>
          <Text style={[s.infoValue, s.bold, s.green]}>{fmtTonnes(scope1TotalKg)} t CO₂e</Text>
        </View>

        {/* 5. Scope 2 table */}
        <Text style={s.sectionTitle}>Scope 2 — Indirekte Energieemissionen</Text>
        {scope2Entries.length === 0 ? (
          <Text style={s.bodyText}>Keine Scope-2-Einträge erfasst.</Text>
        ) : (
          <ScopeTable
            headers={['Kategorie', 'Menge', 'Einheit', 'Hinweis']}
            rows={scope2Entries.map((e) => {
              const info = CATEGORY_LABELS[e.category] ?? { label: e.category, unit: '—' };
              const note = e.category === 'STROM' ? (e.isOekostrom ? 'Ökostrom (verifiziert)' : 'Strommix (UBA 2024)') : 'Fernwärme (UBA 2024)';
              return { cells: [info.label, fmtNum(e.quantity, 1), info.unit, note], widths: [3, 1, 1, 2] };
            })}
          />
        )}
        <View style={[s.infoRow, { marginBottom: 8 }]}>
          <Text style={s.infoLabel}>Scope 2 Gesamt:</Text>
          <Text style={[s.infoValue, s.bold, s.green]}>{fmtTonnes(scope2TotalKg)} t CO₂e</Text>
        </View>

        {/* 6. Scope 3 table */}
        <Text style={s.sectionTitle}>Scope 3 — Reisen, Materialien & Abfall</Text>
        {scope3Entries.length === 0 && materialEntries.length === 0 ? (
          <Text style={s.bodyText}>Keine Scope-3-Einträge erfasst.</Text>
        ) : (
          <ScopeTable
            headers={['Kategorie', 'Menge', 'Einheit', 'Typ']}
            rows={[
              ...scope3Entries.map((e) => {
                const info = CATEGORY_LABELS[e.category] ?? { label: e.category, unit: '—' };
                return { cells: [info.label, fmtNum(e.quantity, 1), info.unit, 'Aktivität'], widths: [3, 1, 1, 1] };
              }),
              ...materialEntries.map((m) => ({
                cells: [MATERIAL_LABELS[m.material] ?? m.material, fmtNum(m.quantityKg, 1), 'kg', 'Material (Kat. 1)'],
                widths: [3, 1, 1, 1],
              })),
            ]}
          />
        )}
        <View style={[s.infoRow, { marginBottom: 8 }]}>
          <Text style={s.infoLabel}>Scope 3 Gesamt:</Text>
          <Text style={[s.infoValue, s.bold, s.green]}>{fmtTonnes(scope3TotalKg)} t CO₂e</Text>
        </View>

        {/* 7. Berichtsgrenzen */}
        <Text style={s.sectionTitle}>Berichtsgrenzen</Text>
        <Text style={s.bodyText}>
          {company.reportingBoundaryNotes ??
            'Keine besonderen Berichtsgrenzen angegeben. Alle bekannten Emissionsquellen wurden berücksichtigt.'}
        </Text>
        {company.exclusions && (
          <>
            <Text style={[s.bodyText, s.bold]}>Ausschlüsse:</Text>
            <Text style={s.bodyText}>{company.exclusions}</Text>
          </>
        )}

        {/* 8. Methodik */}
        <Text style={s.sectionTitle}>Methodik</Text>
        <Text style={s.bodyText}>
          Berechnungsgrundlage: UBA 2024-Emissionsfaktoren, GHG Protocol Corporate Standard.
          Alle Faktoren basieren auf offiziellen Werten des Umweltbundesamts (UBA) für das Jahr 2024.
          Berechnung nach Operational-Control-Ansatz; Treibhausgase als CO₂e gemäß IPCC AR6.
        </Text>

        {/* 9. Nicht erfasste Kategorien */}
        {notRecorded.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 8 }]}>Nicht erfasste Kategorien</Text>
            {notRecorded.map((cat) => (
              <Text key={cat} style={s.footnote}>
                • {CATEGORY_LABELS[cat]?.label ?? cat}: nicht erfasst
              </Text>
            ))}
          </>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          GrünBilanz · {company.firmenname} · Erstellt am {dateStr} · Vertraulich
        </Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
