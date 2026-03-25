
/**
 * CSRD Supplier Questionnaire PDF component for GrünBilanz.
 *
 * Renders a CSRD-compliant supplier questionnaire prefilled from company data.
 * Format follows standard CSRD Scope-1/2/3 disclosure questionnaire sections.
 * Must run on Node.js runtime only (via @react-pdf/renderer).
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/pdf';

// ─── Brand colours ────────────────────────────────────────────────────────────
const GREEN = '#1B4332';
const GREEN_LIGHT = '#D8F3DC';
const BLUE = '#1E40AF';
const GREY = '#6B7280';
const BORDER = '#E5E7EB';
const BLACK = '#111827';
const BG_SECTION = '#F0FDF4';

const BRANCHE_LABELS: Record<string, string> = {
  ELEKTROHANDWERK: 'Elektrohandwerk',
  SHK: 'SHK (Sanitär, Heizung, Klima)',
  BAUGEWERBE: 'Baugewerbe',
  TISCHLER: 'Tischler',
  KFZ_WERKSTATT: 'KFZ-Werkstatt',
  MALER: 'Maler',
  SONSTIGES: 'Sonstiges',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTonnes(kg: number): string {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    kg / 1000,
  ) + ' t CO₂e';
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('de-DE').format(d);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 45, color: BLACK },
  // Cover header
  coverBand: { backgroundColor: GREEN, padding: 20, marginBottom: 20, borderRadius: 4 },
  coverTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: 'white' },
  coverSubtitle: { fontSize: 11, color: GREEN_LIGHT, marginTop: 4 },
  coverMeta: { fontSize: 9, color: GREEN_LIGHT, marginTop: 8 },
  // Sections
  sectionBox: { backgroundColor: BG_SECTION, borderLeftColor: GREEN, borderLeftWidth: 3, padding: 10, marginBottom: 12 },
  sectionNum: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 8 },
  // Q&A rows
  qRow: { marginBottom: 8 },
  qLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREY, marginBottom: 2 },
  qAnswer: { fontSize: 10, color: BLACK, borderBottomColor: BORDER, borderBottomWidth: 1, paddingBottom: 3 },
  // CO₂e table
  co2Table: { marginBottom: 10 },
  co2Header: { flexDirection: 'row', backgroundColor: GREEN, padding: 5 },
  co2HCell: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  co2Row: { flexDirection: 'row', borderBottomColor: BORDER, borderBottomWidth: 1, padding: 5 },
  co2RowAlt: { backgroundColor: '#F9FAFB' },
  co2Cell: { fontSize: 9, color: BLACK },
  co2Total: { flexDirection: 'row', backgroundColor: GREEN_LIGHT, padding: 6 },
  co2TotalLabel: { flex: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN },
  co2TotalValue: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN, textAlign: 'right' },
  // Declaration box
  declarationBox: { borderColor: BLUE, borderWidth: 1, borderRadius: 4, padding: 10, marginTop: 16, marginBottom: 10 },
  declarationTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4 },
  declarationText: { fontSize: 9, color: BLACK, lineHeight: 1.5 },
  signatureRow: { flexDirection: 'row', marginTop: 16, gap: 20 },
  signatureField: { flex: 1, borderBottomColor: BLACK, borderBottomWidth: 1, paddingBottom: 20 },
  signatureLabel: { fontSize: 8, color: GREY, marginTop: 3 },
  // Misc
  bodyText: { fontSize: 9, color: BLACK, lineHeight: 1.5, marginBottom: 6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: GREY },
  footer: { position: 'absolute', bottom: 20, left: 45, right: 45, textAlign: 'center', fontSize: 7, color: GREY, borderTopColor: BORDER, borderTopWidth: 1, paddingTop: 3 },
  pageNum: { position: 'absolute', bottom: 20, right: 45, fontSize: 7, color: GREY },
});

// ─── Helper sub-component: Q&A field ─────────────────────────────────────────
function QField({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.qRow}>
      <Text style={s.qLabel}>{label}</Text>
      <Text style={s.qAnswer}>{value}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export interface CSRDQuestionnaireProps {
  data: ReportData;
}

export function CSRDQuestionnaire({ data }: CSRDQuestionnaireProps): React.ReactElement {
  const { company, year, entries, scope1TotalKg, scope2TotalKg, scope3TotalKg, generatedAt } = data;
  const totalKg = scope1TotalKg + scope2TotalKg + scope3TotalKg;
  const perEmployeeKg = company.mitarbeiter > 0 ? totalKg / company.mitarbeiter : 0;
  const hasOekostrom = entries.some((e) => e.category === 'STROM' && e.isOekostrom);
  const dateStr = fmtDate(generatedAt);

  const scopeRows = [
    { scope: 'Scope 1', description: 'Direkte Emissionen (Verbrennung, Kältemittel)', value: fmtTonnes(scope1TotalKg) },
    { scope: 'Scope 2', description: 'Indirekte Energieemissionen (Strom, Fernwärme)', value: fmtTonnes(scope2TotalKg) },
    { scope: 'Scope 3', description: 'Vorgelagerte Emissionen, Reisen, Abfall, Materialien', value: fmtTonnes(scope3TotalKg) },
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cover band */}
        <View style={s.coverBand}>
          <Text style={s.coverTitle}>CSRD-Lieferantenfragebogen</Text>
          <Text style={s.coverSubtitle}>Treibhausgas-Berichterstattung · Berichtsjahr {year.year}</Text>
          <Text style={s.coverMeta}>
            Unternehmen: {company.firmenname} · Erstellt: {dateStr}
          </Text>
        </View>

        {/* Section 1: Unternehmensinformationen */}
        <View style={s.sectionBox}>
          <Text style={s.sectionNum}>ABSCHNITT 1</Text>
          <Text style={s.sectionTitle}>Unternehmensinformationen</Text>
          <QField label="Unternehmensname" value={company.firmenname} />
          <QField label="Branche / Sektor" value={BRANCHE_LABELS[company.branche] ?? company.branche} />
          <QField label="Anzahl Mitarbeiter" value={String(company.mitarbeiter)} />
          <QField label="Standort (Hauptsitz)" value={company.standort} />
          <QField label="Berichtsjahr" value={String(year.year)} />
          <QField label="Berichtsrahmen" value="GHG Protocol Corporate Standard (Operational Control)" />
        </View>

        {/* Section 2: Gesamt-THG-Emissionen */}
        <View style={s.sectionBox}>
          <Text style={s.sectionNum}>ABSCHNITT 2</Text>
          <Text style={s.sectionTitle}>Treibhausgasemissionen (CO₂e)</Text>
          <View style={s.co2Table}>
            <View style={s.co2Header}>
              <Text style={[s.co2HCell, { flex: 1 }]}>Scope</Text>
              <Text style={[s.co2HCell, { flex: 2 }]}>Beschreibung</Text>
              <Text style={[s.co2HCell, { flex: 1, textAlign: 'right' }]}>CO₂e (t)</Text>
            </View>
            {scopeRows.map((row, i) => (
              <View key={row.scope} style={[s.co2Row, i % 2 === 1 ? s.co2RowAlt : {}]}>
                <Text style={[s.co2Cell, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{row.scope}</Text>
                <Text style={[s.co2Cell, s.muted, { flex: 2 }]}>{row.description}</Text>
                <Text style={[s.co2Cell, { flex: 1, textAlign: 'right' }]}>{row.value}</Text>
              </View>
            ))}
            <View style={s.co2Total}>
              <Text style={[s.co2TotalLabel, { flex: 3 }]}>Scope 1 + 2 + 3 Gesamt</Text>
              <Text style={[s.co2TotalValue]}>{fmtTonnes(totalKg)}</Text>
            </View>
          </View>
          <QField label="CO₂e pro Mitarbeiter" value={fmtTonnes(perEmployeeKg)} />
          <QField
            label="Ökostromnutzung"
            value={hasOekostrom ? 'Ja — verifizierter Ökostrom wird genutzt' : 'Nein — konventioneller Strommix'}
          />
        </View>

        {/* Section 3: Berichtsgrenzen & Ausschlüsse */}
        <View style={s.sectionBox}>
          <Text style={s.sectionNum}>ABSCHNITT 3</Text>
          <Text style={s.sectionTitle}>Berichtsgrenzen & Annahmen</Text>
          <QField
            label="Berichtsgrenzen"
            value={company.reportingBoundaryNotes ?? 'Alle wesentlichen Emissionsquellen wurden erfasst.'}
          />
          <QField
            label="Ausschlüsse & Begründung"
            value={company.exclusions ?? 'Keine Ausschlüsse.'}
          />
          <QField
            label="Emissionsfaktoren"
            value="UBA 2024 (Umweltbundesamt), Ecoinvent 3.10 für Materialien')}; IPCC AR6 GWP-Werte für Kältemittel"
          />
          <QField label="Überprüfung" value="Interne Überprüfung; externe Verifizierung auf Anfrage" />
        </View>

        {/* Section 4: Maßnahmen & Ziele */}
        <View style={s.sectionBox}>
          <Text style={s.sectionNum}>ABSCHNITT 4</Text>
          <Text style={s.sectionTitle}>Klimamaßnahmen & Ziele</Text>
          <QField label="Reduktionsziel" value="In Erarbeitung — Basisjahr: 2024" />
          <QField label="Geplante Maßnahmen" value="Angabe durch Unternehmen ausfüllen" />
          <QField label="Science-Based Targets (SBTi)" value="Noch nicht beigetreten" />
          <QField label="Netto-Null-Verpflichtung" value="Angabe durch Unternehmen ausfüllen" />
        </View>

        {/* Declaration */}
        <View style={s.declarationBox}>
          <Text style={s.declarationTitle}>Bestätigung der Richtigkeit</Text>
          <Text style={s.declarationText}>
            Ich bestätige, dass die in diesem Fragebogen gemachten Angaben nach bestem Wissen und
            Gewissen korrekt und vollständig sind. Die Treibhausgasemissionen wurden gemäß dem
            GHG Protocol Corporate Standard berechnet.
          </Text>
        </View>
        <View style={s.signatureRow}>
          <View style={s.signatureField}>
            <Text style={s.signatureLabel}>Datum</Text>
          </View>
          <View style={s.signatureField}>
            <Text style={s.signatureLabel}>Name (Druckbuchstaben)</Text>
          </View>
          <View style={s.signatureField}>
            <Text style={s.signatureLabel}>Unterschrift & Stempel</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          GrünBilanz · CSRD-Lieferantenfragebogen · {company.firmenname} · {year.year} · Vertraulich
        </Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
