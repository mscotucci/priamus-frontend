import { TranslateService } from '@ngx-translate/core';
import { ContractStatus, RequiredDocument } from './contracts-api';

export const CONTRACT_STATUS_PILL: Record<ContractStatus, string> = {
  Current: 'pt-pill--success',
  Upcoming: 'pt-pill--info',
  Expired: '',
};

/** The required documents as a sentence, first letter uppercase; "Nessuno" when there are none. */
export function documentsSentence(
  documents: readonly RequiredDocument[],
  translate: TranslateService,
): string {
  if (documents.length === 0) {
    return translate.instant('customers.contracts.document.none');
  }
  const names = documents
    .map((document) => translate.instant('customers.contracts.document.' + document.toLowerCase()))
    .join(', ');
  return names.charAt(0).toUpperCase() + names.slice(1);
}
