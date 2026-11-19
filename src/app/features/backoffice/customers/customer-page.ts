import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Topbar } from '../../../core/layout/topbar';
import { Notice } from '../../../shared/components/notice/notice';
import { CONTRACT_STATUS_PILL, dayPriceSummary, documentsSentence } from './contract-labels';
import { Contract } from './contracts-api';
import { CustomerDeactivateDialog } from './customer-deactivate-dialog';
import { CustomerFormDialog } from './customer-form-dialog';
import type { CustomerListItem } from './customers-api';
import { CustomersFacade } from './customers-facade';

@Component({
  selector: 'app-customer-page',
  imports: [
    Topbar,
    DatePipe,
    RouterLink,
    TranslatePipe,
    Notice,
    CustomerFormDialog,
    CustomerDeactivateDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './customer-page.html',
})
export class CustomerPage {
  protected readonly facade = inject(CustomersFacade);
  private readonly translate = inject(TranslateService);
  protected readonly formTarget = signal<CustomerListItem | null>(null);
  protected readonly deactivateTarget = signal<CustomerListItem | null>(null);
  protected readonly statusPill = CONTRACT_STATUS_PILL;

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.facade.clearReactivateNotice();
        this.facade.openCustomer(params.get('customerId')!);
      });
  }

  protected dayPriceOf(contract: Contract): string | null {
    return dayPriceSummary(contract, this.translate);
  }

  protected documents(contract: Contract): string {
    return documentsSentence(contract.requiredDocuments, this.translate);
  }
}
