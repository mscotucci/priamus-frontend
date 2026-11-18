import {
  isTaxCode,
  isVatNumberFormat,
  normalizeTaxCode,
  normalizeVatNumber,
} from './customer-codes';

describe('customer codes', () => {
  it.each([
    ['spaces inside', '0145 5280 683', '01455280683'],
    ['a leading IT', 'IT01455280683', '01455280683'],
    ['a leading it in lowercase and spaces', ' it 0145 5280683 ', '01455280683'],
    ['a mixed-case prefix', 'iT01455280683', '01455280683'],
    ['only one prefix', 'ITIT01455280683', 'IT01455280683'],
    ['an IT that is not leading', '0145IT5280683', '0145IT5280683'],
  ])('the VAT number normal form removes %s', (_name, text, expected) => {
    expect(normalizeVatNumber(text)).toBe(expected);
  });

  it.each([
    ['eleven digits', '01455280683', true],
    ['eleven digits with spaces and prefix', 'IT 0145 5280683', true],
    ['ten digits', '0145528068', false],
    ['twelve digits', '014552806831', false],
    ['a letter among the digits', '0145528068A', false],
    ['an empty value', '', false],
    ['Arabic-Indic digits', '٠١٤٥٥٢٨٠٦٨٣', false],
    ['a final newline', '01455280683\n', false],
  ])('a VAT number of %s: format is %s', (_name, text, valid) => {
    expect(isVatNumberFormat(text)).toBe(valid);
  });

  it('the tax code normal form removes spaces and uppercases ASCII letters only', () => {
    expect(normalizeTaxCode(' mrc gli72d45g438k ')).toBe('MRCGLI72D45G438K');
    expect(normalizeTaxCode('ßı')).toBe('ßı');
  });

  it.each([
    ['sixteen letters and digits', 'MRCGLI72D45G438K', true],
    ['sixteen letters and digits in lowercase with spaces', 'mrcgli 72d45 g438k', true],
    ['eleven digits', '01455280683', true],
    ['fifteen characters', 'MRCGLI72D45G438', false],
    ['seventeen characters', 'MRCGLI72D45G438KA', false],
    ['ten digits', '0145528068', false],
    ['eleven characters with a letter', '0145528068A', false],
    ['a punctuation mark', 'MRCGLI72D45G438.', false],
    ['an accented letter', 'MRCGLI72D45G438À', false],
    ['an eszett that uppercases to SS', 'ßßRCGLI72D45G438', false],
    ['an empty value', '', false],
  ])('a tax code of %s: format is %s', (_name, text, valid) => {
    expect(isTaxCode(text)).toBe(valid);
  });
});
