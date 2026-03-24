'use client';

/**
 * StatusBadge — small coloured pill indicating data capture status for a wizard screen.
 * Green = fully captured, Yellow = partially captured, Gray = not started.
 * Used in the wizard sidebar and on each screen header.
 */
import { cn } from '@/lib/utils';

export type StatusLevel = 'erfasst' | 'teilweise' | 'nicht_erfasst';

interface StatusBadgeProps {
  status: StatusLevel;
  /** Optional short label override; defaults to German status name */
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<StatusLevel, { label: string; className: string }> = {
  erfasst: {
    label: 'Erfasst',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  teilweise: {
    label: 'Teilweise',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  nicht_erfasst: {
    label: 'Nicht erfasst',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { label: defaultLabel, className: statusClass } = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        statusClass,
        className,
      )}
    >
      {label ?? defaultLabel}
    </span>
  );
}
