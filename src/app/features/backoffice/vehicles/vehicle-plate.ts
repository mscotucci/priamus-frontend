/** Checked on the typed text, not on its uppercase: `toUpperCase` turns `ß` into `SS` and `ı` into `I`. */
const PLATE = /^[A-Za-z0-9]{2,10}$/;

/** The plate's normal form as the backend stores it: uppercase, spaces and hyphens removed. */
export function normalizePlate(text: string): string {
  return text.toUpperCase().replace(/[ -]/g, '');
}

export function isValidPlate(text: string): boolean {
  return PLATE.test(text.replace(/[ -]/g, ''));
}
