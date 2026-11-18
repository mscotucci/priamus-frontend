/** Eleven ASCII digits: the format only, the check digit is the backend's. */
const VAT_NUMBER = /^[0-9]{11}$/;
/** Sixteen ASCII letters and digits for a person, eleven digits for a company or an entity. */
const TAX_CODE = /^(?:[A-Z0-9]{16}|[0-9]{11})$/;

/** The VAT number as the backend stores it: spaces and one leading "IT", in any case, removed. */
export function normalizeVatNumber(text: string): string {
  return text.replace(/ /g, '').replace(/^[Ii][Tt]/, '');
}

export function isVatNumberFormat(text: string): boolean {
  return VAT_NUMBER.test(normalizeVatNumber(text));
}

/** The tax code as the backend stores it: spaces removed, ASCII letters uppercased (never `toUpperCase`). */
export function normalizeTaxCode(text: string): string {
  return text.replace(/ /g, '').replace(/[a-z]/g, (letter) => letter.toUpperCase());
}

export function isTaxCode(text: string): boolean {
  return TAX_CODE.test(normalizeTaxCode(text));
}
