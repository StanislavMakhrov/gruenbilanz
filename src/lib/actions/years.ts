'use server';

/**
 * Server Actions for ReportingYear management.
 * Create and delete reporting years; delete cascades to all child rows.
 */
import { prisma } from '@/lib/prisma';
import type { ActionResult } from './entries';

/**
 * Creates a new ReportingYear if it does not already exist.
 */
export async function createReportingYear(year: number): Promise<ActionResult> {
  try {
    const existing = await prisma.reportingYear.findUnique({ where: { year } });
    if (existing) {
      return { success: false, error: `Berichtsjahr ${year} existiert bereits.` };
    }

    const created = await prisma.reportingYear.create({ data: { year } });
    return { success: true, id: created.id };
  } catch (error) {
    console.error('createReportingYear error:', error);
    return { success: false, error: 'Berichtsjahr konnte nicht erstellt werden.' };
  }
}

/**
 * Deletes a ReportingYear and cascades to all child entries/reports.
 * AuditLog rows are NOT deleted (audit trail is immutable).
 */
export async function deleteReportingYear(id: number): Promise<ActionResult> {
  try {
    await prisma.reportingYear.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('deleteReportingYear error:', error);
    return { success: false, error: 'Berichtsjahr konnte nicht gelöscht werden.' };
  }
}
