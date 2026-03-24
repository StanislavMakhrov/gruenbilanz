'use server';

/**
 * Server Actions for StagingEntry confirmation (OCR/CSV import flow).
 * StagingEntry holds unconfirmed OCR/CSV values until the user approves.
 * confirmStagingEntry: moves staging → EmissionEntry in a single transaction.
 */
import { prisma } from '@/lib/prisma';
import type { ActionResult } from './entries';

/**
 * Confirms a single staging entry: promotes it to an EmissionEntry
 * and deletes the staging row in an atomic transaction.
 */
export async function confirmStagingEntry(
  stagingId: number,
  documentId?: number,
): Promise<ActionResult> {
  try {
    const staging = await prisma.stagingEntry.findUnique({ where: { id: stagingId } });
    if (!staging) {
      return { success: false, error: 'Staging-Eintrag nicht gefunden.' };
    }

    // Check if entry already exists (update) or needs to be created
    const existingEntry = await prisma.emissionEntry.findFirst({
      where: {
        reportingYearId: staging.reportingYearId,
        scope: staging.scope,
        category: staging.category,
        billingMonth: null,
        providerName: null,
      },
    });

    const inputMethod = staging.source === 'OCR' ? 'OCR' : 'CSV';

    if (existingEntry) {
      await prisma.$transaction([
        prisma.emissionEntry.update({
          where: { id: existingEntry.id },
          data: { quantity: staging.quantity, inputMethod },
        }),
        prisma.stagingEntry.delete({ where: { id: stagingId } }),
        prisma.auditLog.create({
          data: {
            entityType: 'EmissionEntry',
            entityId: existingEntry.id,
            action: 'UPDATE',
            fieldName: 'quantity',
            oldValue: String(existingEntry.quantity),
            newValue: String(staging.quantity),
            inputMethod,
            documentId: documentId ?? null,
            emissionEntryId: existingEntry.id,
          },
        }),
      ]);
      return { success: true, id: existingEntry.id };
    }

    // Wrap EmissionEntry creation, StagingEntry deletion, and AuditLog in a single
    // atomic transaction so a mid-operation failure cannot produce orphaned entries.
    let createdId: number | undefined;
    await prisma.$transaction(async (tx) => {
      const created = await tx.emissionEntry.create({
        data: {
          reportingYearId: staging.reportingYearId,
          scope: staging.scope,
          category: staging.category,
          quantity: staging.quantity,
          inputMethod,
          isFinalAnnual: false,
        },
      });
      createdId = created.id;
      await tx.stagingEntry.delete({ where: { id: stagingId } });
      await tx.auditLog.create({
        data: {
          entityType: 'EmissionEntry',
          entityId: created.id,
          action: 'CREATE',
          fieldName: 'quantity',
          newValue: String(staging.quantity),
          inputMethod,
          documentId: documentId ?? null,
          emissionEntryId: created.id,
        },
      });
    });

    return { success: true, id: createdId };
  } catch (error) {
    console.error('confirmStagingEntry error:', error);
    return { success: false, error: 'Bestätigung fehlgeschlagen. Bitte erneut versuchen.' };
  }
}

/**
 * Confirms all non-expired staging entries for a given reporting year.
 */
export async function confirmAllStaging(reportingYearId: number): Promise<ActionResult> {
  try {
    const stagingEntries = await prisma.stagingEntry.findMany({
      where: {
        reportingYearId,
        expiresAt: { gt: new Date() },
      },
    });

    for (const staging of stagingEntries) {
      await confirmStagingEntry(staging.id);
    }

    return { success: true };
  } catch (error) {
    console.error('confirmAllStaging error:', error);
    return { success: false, error: 'Massenbestätigung fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
