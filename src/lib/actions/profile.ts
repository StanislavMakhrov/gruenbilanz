'use server';

/**
 * Server Action for CompanyProfile updates.
 * Always upserts at id=1 (single-row pattern).
 * Writes an AuditLog row for each field changed.
 */
import { prisma } from '@/lib/prisma';
import type { Branche } from '@/types';
import type { ActionResult } from './entries';

export interface SaveCompanyProfileInput {
  firmenname?: string;
  branche?: Branche;
  mitarbeiter?: number;
  standort?: string;
  logoBase64?: string | null; // base64-encoded JPEG or PNG
  logoMimeType?: string | null;
  reportingBoundaryNotes?: string | null;
  exclusions?: string | null;
}

const LOGO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_LOGO_MIMES = ['image/jpeg', 'image/png'];

/**
 * Saves (upserts) the CompanyProfile at id=1 and logs all field changes to AuditLog.
 */
export async function saveCompanyProfile(input: SaveCompanyProfileInput): Promise<ActionResult> {
  try {
    // Validate logo if provided
    if (input.logoBase64) {
      if (input.logoMimeType && !ALLOWED_LOGO_MIMES.includes(input.logoMimeType)) {
        return { success: false, error: 'Logo muss im JPEG- oder PNG-Format vorliegen.' };
      }
      const byteLength = Buffer.from(input.logoBase64, 'base64').length;
      if (byteLength > LOGO_MAX_BYTES) {
        return { success: false, error: 'Logo darf nicht größer als 10 MB sein.' };
      }
    }

    const existing = await prisma.companyProfile.findUnique({ where: { id: 1 } });

    const logoPath = input.logoBase64
      ? `data:${input.logoMimeType ?? 'image/png'};base64,${input.logoBase64}`
      : undefined;

    const updateData: Record<string, unknown> = {};
    if (input.firmenname !== undefined) updateData.firmenname = input.firmenname;
    if (input.branche !== undefined) updateData.branche = input.branche;
    if (input.mitarbeiter !== undefined) updateData.mitarbeiter = input.mitarbeiter;
    if (input.standort !== undefined) updateData.standort = input.standort;
    if (logoPath !== undefined) updateData.logoPath = logoPath;
    if (input.reportingBoundaryNotes !== undefined) updateData.reportingBoundaryNotes = input.reportingBoundaryNotes;
    if (input.exclusions !== undefined) updateData.exclusions = input.exclusions;

    const profile = await prisma.companyProfile.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        firmenname: input.firmenname ?? 'Mein Unternehmen',
        branche: input.branche ?? 'SONSTIGES',
        mitarbeiter: input.mitarbeiter ?? 1,
        standort: input.standort ?? '',
        logoPath: logoPath,
        reportingBoundaryNotes: input.reportingBoundaryNotes,
        exclusions: input.exclusions,
      },
      update: updateData,
    });

    // Write AuditLog entries for changed fields
    const auditEntries: ReturnType<typeof prisma.auditLog.create>[] = [];
    const fieldNames = ['firmenname', 'branche', 'mitarbeiter', 'standort', 'logoPath', 'reportingBoundaryNotes', 'exclusions'] as const;

    for (const field of fieldNames) {
      if (updateData[field] !== undefined && existing) {
        const oldVal = String((existing as Record<string, unknown>)[field] ?? '');
        const newVal = String(updateData[field] ?? '');
        if (oldVal !== newVal) {
          auditEntries.push(
            prisma.auditLog.create({
              data: {
                entityType: 'CompanyProfile',
                entityId: 1,
                action: existing ? 'UPDATE' : 'CREATE',
                fieldName: field,
                oldValue: oldVal,
                newValue: newVal,
                inputMethod: 'MANUAL',
              },
            }),
          );
        }
      }
    }

    if (auditEntries.length > 0) {
      await prisma.$transaction(auditEntries);
    }

    return { success: true, id: profile.id };
  } catch (error) {
    console.error('saveCompanyProfile error:', error);
    return { success: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
