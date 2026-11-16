import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, validate } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, noticeOf } from '../../../core/api/api-error';
import { Notice } from '../../../shared/components/notice/notice';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { UserRole } from './users-api';
import { UsersFacade } from './users-facade';

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const LETTER = /[a-zA-Z]/;
const DIGIT = /[0-9]/;
const SPECIAL = /[!-/:-@[-`{-~]/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

type Field = 'username' | 'password' | 'role';
const FIELDS: Field[] = ['username', 'password', 'role'];

@Component({
  selector: 'app-user-create-dialog',
  imports: [Dialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-create-dialog.html',
})
export class UserCreateDialog {
  protected readonly facade = inject(UsersFacade);
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly usernameInput = viewChild.required<ElementRef<HTMLInputElement>>('username');

  private readonly model = signal<{ username: string; password: string; role: UserRole | '' }>({
    username: '',
    password: '',
    role: '',
  });
  protected readonly createForm = form(this.model, (f) => {
    validate(f.username, ({ value }) =>
      USERNAME.test(value())
        ? undefined
        : { kind: 'username', message: 'users.create.username.invalid' },
    );
    validate(f.password, ({ value }) => {
      const password = value();
      const valid =
        password.length >= MIN_PASSWORD &&
        password.length <= MAX_PASSWORD &&
        LETTER.test(password) &&
        DIGIT.test(password) &&
        SPECIAL.test(password);
      return valid ? undefined : { kind: 'password', message: 'users.create.password.invalid' };
    });
    validate(f.role, ({ value }) =>
      value() !== '' ? undefined : { kind: 'role', message: 'users.create.role.invalid' },
    );
    disabled(f.username, { when: () => this.facade.creating() });
    disabled(f.password, { when: () => this.facade.creating() });
    disabled(f.role, { when: () => this.facade.creating() });
  });

  protected readonly showPassword = signal(false);
  private readonly submitted = signal(false);
  private readonly refusal = signal<ApiError | null>(null);

  protected readonly notice = computed(() => {
    const refusal = this.refusal();
    if (refusal === null) {
      return null;
    }
    if (
      refusal.kind === 'validation' &&
      FIELDS.some((field) => this.backendTexts(refusal.errors, field).length > 0)
    ) {
      return null;
    }
    return noticeOf(refusal);
  });

  protected readonly usernameError = this.errorOf('username');
  protected readonly passwordError = this.errorOf('password');
  protected readonly roleError = this.errorOf('role');

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && this.createForm[field]().invalid()) {
        return { key: this.createForm[field]().errors()[0].message! };
      }
      const refusal = this.refusal();
      if (refusal?.kind === 'validation') {
        const texts = this.backendTexts(refusal.errors, field);
        return texts.length > 0 ? { text: texts.join(' ') } : null;
      }
      return null;
    });
  }

  private backendTexts(errors: Record<string, string[]>, field: Field): string[] {
    return Object.entries(errors)
      .filter(([name]) => name.toLowerCase() === field)
      .flatMap(([, messages]) => messages);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.facade.creating()) {
      return;
    }
    this.refusal.set(null);
    this.submitted.set(true);
    if (this.createForm().invalid()) {
      return;
    }
    const { username, password, role } = this.model();
    const outcome = await this.facade.create(username, password, role as UserRole);
    if (outcome === 'created') {
      this.closed.emit();
    } else if (outcome !== 'ignored') {
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
