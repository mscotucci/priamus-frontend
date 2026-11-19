import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LeaveConfirmable, unsavedChangesGuard } from './unsaved-changes-guard';

let answer = true;
let asked = 0;

@Component({ template: '' })
class Form implements LeaveConfirmable {
  async confirmLeave(): Promise<boolean> {
    asked++;
    return answer;
  }
}

@Component({ template: '' })
class Other {}

describe('unsavedChangesGuard', () => {
  const setup = async () => {
    answer = true;
    asked = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'form', component: Form, canDeactivate: [unsavedChangesGuard] },
          { path: 'other', component: Other },
          { path: 'login', component: Other },
        ]),
      ],
    });
    await RouterTestingHarness.create('/form');
    return TestBed.inject(Router);
  };

  it('leaves when the page confirms', async () => {
    const router = await setup();

    await router.navigateByUrl('/other');

    expect(asked).toBe(1);
    expect(router.url).toBe('/other');
  });

  it('stays when the page does not confirm', async () => {
    const router = await setup();
    answer = false;

    await router.navigateByUrl('/other');

    expect(asked).toBe(1);
    expect(router.url).toBe('/form');
  });

  it('going to the login is never asked about', async () => {
    const router = await setup();
    answer = false;

    await router.navigate(['/login'], { queryParams: { returnUrl: '/form' } });

    expect(asked).toBe(0);
    expect(router.url).toBe('/login?returnUrl=%2Fform');
  });
});
