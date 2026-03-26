'use server';

/**
 * Server Actions for MaterialEntry CRUD operations (Scope 3 Category 1).
 * MaterialEntry allows multiple rows per year per material (no unique constraint).
 * All mutations write an AuditLog entry.
 */
import { prisma } from '@/lib/prisma';
import type { MaterialCategory, InputMethod } from '@/types';
import type { ActionResult } from './entries';

export interface SaveMaterialEntryInput {
  id?: number; // If provided: update; otherwise: create
  reportingYearId: number;
  material: MaterialCategory;
  quantityKg: number;
  supplierName?: string | null;
  inputMethod?: InputMethod;
}

/**
 * Creates or updates a MaterialEntry and writes an AuditLog row.
 */
export async function saveMaterialEntry(input: SaveMaterialEntryInput): Promise<ActionResult> {
  try {
    const { id, reportingYearId, material, quantityKg, supplierName, inputMethod = 'MANUAL' } = input;

    if (id) {
      // UPDATE
      const existing = await prisma.materialEntry.findUnique({ where: { id } });
      if (!existing) return { success: false, error: 'Material-Eintrag nicht gefunden.' };

      const [updated] = await prisma.$transaction([
        prisma.materialEntry.update({
          where: { id },
          data: { quantityKg, supplierName, inputMethod },
        }),
        prisma.auditLog.create({
          data: {
            entityType: 'MaterialEntry',
            entityId: id,
            action: 'UPDATE',
            fieldName: 'quantityKg',
            oldValue: String(existing.quantityKg),
            newValue: String(quantityKg),
            inputMethod,
            materialEntryId: id,
          },
        }),
      ]);
      return { success: true, id: updated.id };
    }

    // CREATE
    const created = await prisma.materialEntry.create({
      data: { reportingYearId, material, quantityKg, supplierName, inputMethod },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'MaterialEntry',
        entityId: created.id,
        action: 'CREATE',
        fieldName: 'quantityKg',
        newValue: String(quantityKg),
        inputMethod,
        materialEntryId: created.id,
      },
    });

    return { success: true, id: created.id };
  } catch (error) {
    console.error('saveMaterialEntry error:', error);
    return { success: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
}

/**
 * Deletes a MaterialEntry and writes an AuditLog row.
 */
export async function deleteMaterialEntry(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.materialEntry.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Material-Eintrag nicht gefunden.' };

    await prisma.$transaction([
      prisma.materialEntry.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          entityType: 'MaterialEntry',
          entityId: id,
          action: 'DELETE',
          fieldName: 'quantityKg',
          oldValue: String(existing.quantityKg),
          inputMethod: existing.inputMethod,
          materialEntryId: null,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('deleteMaterialEntry error:', error);
    return { success: false, error: 'Löschen fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
