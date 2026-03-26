'use client';

/**
 * SaveButton — submit button with loading state for wizard screens.
 * Prevents double-submission by disabling during the async save operation.
 */
import { cn } from '@/lib/utils';

interface SaveButtonProps {
  isSaving: boolean;
  onClick?: () => void;
  /** Optional label override; defaults to "Speichern" */
  label?: string;
  className?: string;
}

export default function SaveButton({
  isSaving,
  onClick,
  label = 'Speichern',
  className,
}: SaveButtonProps) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={isSaving}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground',
        'px-6 py-3 text-sm font-medium min-h-[44px]',
        'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        className,
      )}
    >
      {isSaving && (
        <span
          className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {isSaving ? 'Wird gespeichert…' : label}
    </button>
  );
}
