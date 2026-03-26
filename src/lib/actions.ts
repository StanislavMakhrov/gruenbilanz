/**
 * Barrel re-export for all GrünBilanz Server Actions.
 * Components import from "@/lib/actions" without needing to know the internal split.
 */
export { saveEntry, deleteEntry } from './actions/entries';
export type { SaveEntryInput, ActionResult } from './actions/entries';
export { saveMaterialEntry, deleteMaterialEntry } from './actions/materials';
export type { SaveMaterialEntryInput } from './actions/materials';
export { saveCompanyProfile } from './actions/profile';
export type { SaveCompanyProfileInput } from './actions/profile';
export { confirmStagingEntry, confirmAllStaging } from './actions/staging';
export { createReportingYear, deleteReportingYear } from './actions/years';
