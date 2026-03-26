'use server';

/**
 * Server Actions for EmissionEntry CRUD operations.
 * All mutations write an immutable AuditLog entry in the same transaction.
 */
import { prisma } from '@/lib/prisma';
import type { EmissionCategory, InputMethod, Scope } from '@/types';

export interface ActionResult {
  success: boolean;
  id?: number;
  error?: string;
}

export interface SaveEntryInput {
  reportingYearId: number;
  scope: Scope;
  category: EmissionCategory;
  quantity: number;
  memo?: string;
  isOekostrom?: boolean;
  inputMethod?: InputMethod;
  billingMonth?: number | null;
  isFinalAnnual?: boolean;
  providerName?: string | null;
  documentId?: number;
}

/**
 * Upserts an EmissionEntry and writes an AuditLog row in a single transaction.
 * The unique key is (reportingYearId, scope, category, billingMonth, providerName).
 * Both billingMonth and providerName are nullable; PostgreSQL treats NULLs as distinct.
 */
export async function saveEntry(input: SaveEntryInput): Promise<ActionResult> {
  try {
    const {
      reportingYearId,
      scope,
      category,
      quantity,
      memo,
      isOekostrom = false,
      inputMethod = 'MANUAL',
      billingMonth = null,
      isFinalAnnual = false,
      providerName = null,
      documentId,
    } = input;

    // Check if entry already exists to determine action type
    const existing = await prisma.emissionEntry.findFirst({
      where: { reportingYearId, scope, category, billingMonth, providerName },
    });

    if (existing) {
      // UPDATE path
      const [updated] = await prisma.$transaction([
        prisma.emissionEntry.update({
          where: { id: existing.id },
          data: { quantity, memo, isOekostrom, inputMethod, isFinalAnnual },
        }),
        prisma.auditLog.create({
          data: {
            entityType: 'EmissionEntry',
            entityId: existing.id,
            action: 'UPDATE',
            fieldName: 'quantity',
            oldValue: String(existing.quantity),
            newValue: String(quantity),
            inputMethod,
            documentId: documentId ?? null,
            emissionEntryId: existing.id,
            // Store category in metadata so ScreenChangeLog can filter by screen
            metadata: JSON.stringify({ category }),
          },
        }),
      ]);
      return { success: true, id: updated.id };
    }

    // CREATE path
    const created = await prisma.emissionEntry.create({
      data: {
        reportingYearId,
        scope,
        category,
        quantity,
        memo,
        isOekostrom,
        inputMethod,
        billingMonth,
        isFinalAnnual,
        providerName,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'EmissionEntry',
        entityId: created.id,
        action: 'CREATE',
        fieldName: 'quantity',
        newValue: String(quantity),
        inputMethod,
        documentId: documentId ?? null,
        emissionEntryId: created.id,
        // Store category in metadata so ScreenChangeLog can filter by screen
        metadata: JSON.stringify({ category }),
      },
    });

    return { success: true, id: created.id };
  } catch (error) {
    console.error('saveEntry error:', error);
    return { success: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
}

/**
 * Deletes an EmissionEntry and writes an AuditLog row with action: DELETE.
 */
export async function deleteEntry(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.emissionEntry.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Eintrag nicht gefunden.' };
    }

    await prisma.$transaction([
      prisma.emissionEntry.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          entityType: 'EmissionEntry',
          entityId: id,
          action: 'DELETE',
          fieldName: 'quantity',
          oldValue: String(existing.quantity),
          inputMethod: existing.inputMethod,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('deleteEntry error:', error);
    return { success: false, error: 'Löschen fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
