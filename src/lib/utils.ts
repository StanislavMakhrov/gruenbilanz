/**
 * Shared utility functions for GrünBilanz.
 * German locale formatters, CSS class merger, and shared helpers.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names, resolving conflicts correctly.
 * Based on clsx + tailwind-merge for safe dynamic class application.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number using German locale conventions.
 * Example: 1234.56 → "1.234,56"
 */
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/**
 * Formats a number as German tonnes CO₂e with appropriate precision.
 * Values < 1 t shown with 3 decimals; values ≥ 1 t shown with 2 decimals.
 */
export function formatCO2e(kgCO2e: number): string {
  const tonnes = kgCO2e / 1000;
  const decimals = Math.abs(tonnes) < 1 ? 3 : 2;
  return `${formatNumber(tonnes, decimals)} t CO₂e`;
}

/**
 * Formats a Date using German locale date format.
 * Example: 2026-03-21 → "21.03.2026"
 */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a Date with time component for audit log display.
 * Example: "21.03.2026, 14:32"
 */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Clamps a number to the specified range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts kg CO₂e to tonnes CO₂e.
 */
export function kgToTonnes(kg: number): number {
  return kg / 1000;
}
