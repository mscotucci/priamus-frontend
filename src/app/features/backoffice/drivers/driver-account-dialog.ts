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
import { isValidPassword, isValidUsername } from '../users/user-credentials';
import { proposeUsername } from './driver-names';
import { DriversFacade } from './drivers-facade';

type Field = 'username' | 'password';
const FIELDS: Field[] = ['username', 'password'];

@Component({
  selector: 'app-driver-account-dialog',
  imports: [Dialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-account-dialog.html',
})
export class DriverAccountDialog {
  protected readonly facade = inject(DriversFacade);
  /** The names typed in the driver dialog. */
  readonly firstName = input.required<string>();
  readonly lastName = input.required<string>();
  /** Emits the id of the account created; the dialog is then closed by its owner. */
  readonly created = output<string>();
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly usernameInput = viewChild.required<ElementRef<HTMLInputElement>>('username');

  protected readonly forTarget = computed(() =>
    [this.firstName(), this.lastName()]
      .map((name) => name.trim())
      .filter((name) => name !== '')
      .join(' '),
  );

  /** The user name is proposed from the names the dialog opens with; it stays editable. */
  private readonly model = linkedSignal({
    source: () => ({ first: this.firstName(), last: this.lastName() }),
    computation: ({ first, last }) => ({ username: proposeUsername(first, last), password: '' }),
  });
  protected readonly accountForm = form(this.model, (f) => {
    validate(f.username, ({ value }) =>
      isValidUsername(value())
        ? undefined
        : { kind: 'username', message: 'users.create.username.invalid' },
    );
    validate(f.password, ({ value }) =>
      isValidPassword(value())
        ? undefined
        : { kind: 'password', message: 'users.create.password.invalid' },
    );
    disabled(f.username, { when: () => this.facade.creatingAccount() });
    disabled(f.password, { when: () => this.facade.creatingAccount() });
  });

  protected readonly showPassword = signal(false);
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

  protected readonly usernameError = this.errorOf('username');
  protected readonly passwordError = this.errorOf('password');

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && this.accountForm[field]().invalid()) {
        return { key: this.accountForm[field]().errors()[0].message! };
      }
      const refusal = this.refusal();
      const texts = refusal === null ? [] : fieldErrors(refusal, field);
      return texts.length > 0 ? { text: texts.join(' ') } : null;
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.facade.creatingAccount()) {
      return;
    }
    this.refusal.set(null);
    this.submitted.set(true);
    if (this.accountForm().invalid()) {
      return;
    }
    const { username, password } = this.model();
    const outcome = await this.facade.createAccount(username, password);
    if (outcome === 'ignored') {
      return;
    }
    if ('userId' in outcome) {
      this.created.emit(outcome.userId);
    } else {
      this.refusal.set(outcome);
      // the focused button was disabled during the save; the fields are enabled again only after the next render
      afterNextRender(() => this.usernameInput().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
