import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, validate } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, fieldErrors, noticeOf } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Notice } from '../../../shared/components/notice/notice';
import { DriverAccountDialog } from './driver-account-dialog';
import { DriverAccount, DriverListItem } from './drivers-api';
import { DriversFacade } from './drivers-facade';

const MAX_NAME = 60;
const MAX_PHONE = 20;
const PHONE_FORMAT = /^\+?[0-9 ]+$/;

type Field = 'firstName' | 'lastName' | 'phone' | 'userId';
const FIELDS: Field[] = ['firstName', 'lastName', 'phone', 'userId'];

@Component({
  selector: 'app-driver-form-dialog',
  imports: [Dialog, DriverAccountDialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-form-dialog.html',
})
export class DriverFormDialog implements OnInit, OnDestroy {
  protected readonly facade = inject(DriversFacade);
  /** The driver being edited; absent when creating. */
  readonly driver = input<DriverListItem | null>(null);
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly firstNameInput = viewChild.required<ElementRef<HTMLInputElement>>('firstName');
  private readonly accountSelect = viewChild.required<ElementRef<HTMLSelectElement>>('account');
  protected readonly accountOpen = signal(false);

  protected readonly model = linkedSignal<Record<Field, string>>(() => {
    const driver = this.driver();
    return {
      firstName: driver?.firstName ?? '',
      lastName: driver?.lastName ?? '',
      phone: driver?.phone ?? '',
      // '' is "Nessun accesso"
      userId: driver?.account?.userId ?? '',
    };
  });
  protected readonly driverForm = form(this.model, (f) => {
    const nameRule =
      (kind: 'firstName' | 'lastName') =>
      ({ value }: { value: () => string }) => {
        const length = value().trim().length;
        if (length === 0) {
          return { kind, message: `drivers.form.${kind.toLowerCase()}.required` };
        }
        return length <= MAX_NAME
          ? undefined
          : { kind, message: `drivers.form.${kind.toLowerCase()}.toolong` };
      };
    validate(f.firstName, nameRule('firstName'));
    validate(f.lastName, nameRule('lastName'));
    validate(f.phone, ({ value }) => {
      const phone = value().trim();
      if (phone.length > MAX_PHONE) {
        return { kind: 'phone', message: 'drivers.form.phone.toolong' };
      }
      return phone === '' || PHONE_FORMAT.test(phone)
        ? undefined
        : { kind: 'phone', message: 'drivers.form.phone.invalid' };
    });
    disabled(f.firstName, { when: () => this.facade.saving() });
    disabled(f.lastName, { when: () => this.facade.saving() });
    disabled(f.phone, { when: () => this.facade.saving() });
    disabled(f.userId, { when: () => this.facade.saving() });
  });

  /**
   * The accounts to choose from; until they are read, the account the driver holds now. An account
   * still chosen that a new reading no longer offers (refused as taken or disabled) stays listed, so
   * the select keeps showing what the form would send.
   */
  protected readonly accounts = linkedSignal<DriverAccount[] | null, DriverAccount[]>({
    source: this.facade.linkableAccounts,
    computation: (read, previous) => {
      if (read === null) {
        const current = this.driver()?.account;
        return current ? [current] : [];
      }
      const chosen = untracked(() => this.model().userId);
      const kept = read.some((account) => account.userId === chosen)
        ? undefined
        : previous?.value.find((account) => account.userId === chosen);
      if (kept === undefined) {
        return read;
      }
      const at = read.findIndex((account) => account.username > kept.username);
      return at === -1 ? [...read, kept] : [...read.slice(0, at), kept, ...read.slice(at)];
    },
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

  protected readonly firstNameError = this.errorOf('firstName');
  protected readonly lastNameError = this.errorOf('lastName');
  protected readonly phoneError = this.errorOf('phone');

  ngOnInit(): void {
    this.facade.readAccounts(this.driver()?.id ?? null);
  }

  ngOnDestroy(): void {
    this.facade.stopReadingAccounts();
  }

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && this.driverForm[field]().invalid()) {
        return { key: this.driverForm[field]().errors()[0].message! };
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
    if (this.driverForm().invalid()) {
      return;
    }
    const { firstName, lastName, phone, userId } = this.model();
    const outcome = await this.facade.save(this.driver(), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() === '' ? null : phone.trim(),
      userId: userId === '' ? null : userId,
    });
    if (outcome === 'saved') {
      this.closed.emit();
    } else if (outcome !== 'ignored') {
      this.refusal.set(outcome);
      // the focused button was disabled during the save; the fields are enabled again only after the next render
      afterNextRender(() => this.firstNameInput().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  /** The second dialog gives the focus back to "Nuovo account", the control that opened it. */
  protected closeAccount(): void {
    this.accountOpen.set(false);
  }

  /** Selects the new account; the focus goes to the Account select once the second dialog is gone. */
  protected onAccountCreated(userId: string): void {
    this.model.update((model) => ({ ...model, userId }));
    this.accountOpen.set(false);
    afterNextRender(() => this.accountSelect().nativeElement.focus(), { injector: this.injector });
  }

  protected close(): void {
    this.closed.emit();
  }
}
