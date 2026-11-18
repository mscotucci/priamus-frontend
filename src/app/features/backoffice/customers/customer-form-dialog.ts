import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, validate } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, fieldErrors, noticeOf } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Notice } from '../../../shared/components/notice/notice';
import { isTaxCode, isVatNumberFormat } from './customer-codes';
import { CustomerListItem } from './customers-api';
import { CustomersFacade } from './customers-facade';

const MAX_COMPANY_NAME = 150;
const MAX_ADDRESS = 200;

type Field = 'companyName' | 'vatNumber' | 'taxCode' | 'address';
const FIELDS: Field[] = ['companyName', 'vatNumber', 'taxCode', 'address'];

@Component({
  selector: 'app-customer-form-dialog',
  imports: [Dialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-form-dialog.html',
})
export class CustomerFormDialog {
  protected readonly facade = inject(CustomersFacade);
  /** The customer being edited; absent when creating. */
  readonly customer = input<CustomerListItem | null>(null);
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('name');

  private readonly model = linkedSignal<Record<Field, string>>(() => {
    const customer = this.customer();
    return {
      companyName: customer?.companyName ?? '',
      vatNumber: customer?.vatNumber ?? '',
      taxCode: customer?.taxCode ?? '',
      address: customer?.address ?? '',
    };
  });
  protected readonly customerForm = form(this.model, (f) => {
    validate(f.companyName, ({ value }) => {
      const length = value().trim().length;
      if (length === 0) {
        return { kind: 'companyName', message: 'customers.form.companyname.required' };
      }
      return length <= MAX_COMPANY_NAME
        ? undefined
        : { kind: 'companyName', message: 'customers.form.companyname.toolong' };
    });
    validate(f.vatNumber, ({ value }) =>
      value().trim() === '' || isVatNumberFormat(value())
        ? undefined
        : { kind: 'vatNumber', message: 'customers.form.vatnumber.invalid' },
    );
    validate(f.taxCode, ({ value }) =>
      value().trim() === '' || isTaxCode(value())
        ? undefined
        : { kind: 'taxCode', message: 'customers.form.taxcode.invalid' },
    );
    validate(f.address, ({ value }) =>
      value().trim().length <= MAX_ADDRESS
        ? undefined
        : { kind: 'address', message: 'customers.form.address.toolong' },
    );
    disabled(f.companyName, { when: () => this.facade.saving() });
    disabled(f.vatNumber, { when: () => this.facade.saving() });
    disabled(f.taxCode, { when: () => this.facade.saving() });
    disabled(f.address, { when: () => this.facade.saving() });
  });

  private readonly submitted = signal(false);
  private readonly refusal = signal<ApiError | null>(null);

  protected readonly notice = computed(() => {
    const refusal = this.refusal();
    if (refusal === null) {
      return null;
    }
    if (FIELDS.some((field) => fieldErrors(refusal, field).length > 0)) {
      return null;
    }
    return noticeOf(refusal);
  });

  protected readonly companyNameError = this.errorOf('companyName');
  protected readonly vatNumberError = this.errorOf('vatNumber');
  protected readonly taxCodeError = this.errorOf('taxCode');
  protected readonly addressError = this.errorOf('address');

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && this.customerForm[field]().invalid()) {
        return { key: this.customerForm[field]().errors()[0].message! };
      }
      const refusal = this.refusal();
      const texts = refusal === null ? [] : fieldErrors(refusal, field);
      return texts.length > 0 ? { text: texts.join(' ') } : null;
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.facade.saving()) {
      return;
    }
    this.refusal.set(null);
    this.submitted.set(true);
    if (this.customerForm().invalid()) {
      return;
    }
    const { companyName, vatNumber, taxCode, address } = this.model();
    const outcome = await this.facade.save(this.customer(), {
      companyName: companyName.trim(),
      vatNumber: vatNumber.trim() === '' ? null : vatNumber,
      taxCode: taxCode.trim() === '' ? null : taxCode,
      address: address.trim() === '' ? null : address.trim(),
    });
    if (outcome === 'saved') {
      this.closed.emit();
    } else if (outcome !== 'ignored') {
      this.refusal.set(outcome);
      // the focused button was disabled during the save; the fields are enabled again only after the next render
      afterNextRender(() => this.nameInput().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
