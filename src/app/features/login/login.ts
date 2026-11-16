import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../shared/components/icon/icon';
import { Notice } from '../../shared/components/notice/notice';
import { LoginFacade } from './login-facade';

@Component({
  selector: 'app-login',
  imports: [FormField, TranslatePipe, Icon, Notice],
  providers: [LoginFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
})
export class Login {
  protected readonly facade = inject(LoginFacade);
  private readonly injector = inject(Injector);
  private readonly passwordInput = viewChild.required<ElementRef<HTMLInputElement>>('password');

  private readonly model = signal({ username: '', password: '' });
  protected readonly loginForm = form(this.model, (f) => {
    required(f.username, { message: 'login.username.required' });
    required(f.password, { message: 'login.password.required' });
    disabled(f.username, { when: () => this.facade.pending() });
    disabled(f.password, { when: () => this.facade.pending() });
  });

  protected readonly usernameInvalid = computed(
    () => this.loginForm.username().touched() && this.loginForm.username().invalid(),
  );
  protected readonly passwordInvalid = computed(
    () => this.loginForm.password().touched() && this.loginForm.password().invalid(),
  );

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.loginForm().markAsTouched();
    if (this.loginForm().invalid()) {
      return;
    }
    const { username, password } = this.model();
    const outcome = await this.facade.submit(username, password);
    if (outcome === 'refused') {
      this.loginForm().reset({ username, password: '' });
      // the fields are enabled again only after the next render
      afterNextRender(() => this.passwordInput().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }
}
