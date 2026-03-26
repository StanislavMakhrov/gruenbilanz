/**
 * ScopeTable — reusable emission table for GHG Protocol PDF reports.
 *
 * Extracted from GHGReport.tsx to keep that file within the 300-line convention.
 * Used by GHGReport for Scope 1, 2, and 3 emission sections.
 */
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Brand colour constants (must match GHGReport.tsx)
const GREEN = '#2D6A4F';
const BORDER = '#E5E7EB';
const BLACK = '#111827';
const GREY = '#6B7280';

const s = StyleSheet.create({
  tblHeader: { flexDirection: 'row', backgroundColor: GREEN, padding: 5 },
  tblHCell: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tblRow: { flexDirection: 'row', borderBottomColor: BORDER, borderBottomWidth: 1, padding: 5 },
  tblRowAlt: { backgroundColor: '#F9FAFB' },
  tblCell: { fontSize: 8, color: BLACK },
  tblMuted: { fontSize: 8, color: GREY },
});

/** Reusable scope emissions table for PDF reports */
export function ScopeTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ cells: string[]; widths: number[] }>;
}): React.ReactElement {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={s.tblHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[s.tblHCell, { flex: i === 0 ? 3 : 1 }]}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.tblRow, ri % 2 === 1 ? s.tblRowAlt : {}]}>
          {row.cells.map((cell, ci) => (
            <Text key={ci} style={[ci === 0 ? s.tblCell : s.tblMuted, { flex: ci === 0 ? 3 : 1 }]}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
