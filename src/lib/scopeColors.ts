/**
 * Shared scope colour palette used across all dashboard charts.
 * Centralised here so every chart (donut, bar, year-over-year) uses
 * the same three colours — deep green, teal, amber — making scopes
 * immediately recognisable throughout the UI.
 */
export const SCOPE_COLORS = {
  SCOPE1: '#166534', // deep forest green — direct emissions
  SCOPE2: '#0d9488', // teal-green      — energy/electricity
  SCOPE3: '#d97706', // amber            — indirect/supply chain
} as const;
