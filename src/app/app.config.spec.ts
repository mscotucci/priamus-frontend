import { Location } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { historyKeptOnRefusal } from './app.config';
import { LeaveConfirmable, unsavedChangesGuard } from './shared/guards/unsaved-changes-guard';

let leave = false;

// the browser's history moves in a task of its own, then the router navigates
const settle = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await new Promise((resolve) => setTimeout(resolve, 20));
  await TestBed.inject(ApplicationRef).whenStable();
};

@Component({ template: '' })
class Form implements LeaveConfirmable {
  async confirmLeave(): Promise<boolean> {
    return leave;
  }
}

@Component({ template: '' })
class Page {}

describe('historyKeptOnRefusal', () => {
  it('"Indietro" refused with "Resta sulla pagina" keeps the history, so the next "Indietro" reaches the page before', async () => {
    leave = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'list', component: Page },
            { path: 'customer', component: Page },
            { path: 'form', component: Form, canDeactivate: [unsavedChangesGuard] },
          ],
          historyKeptOnRefusal,
        ),
      ],
    });
    const harness = await RouterTestingHarness.create('/list');
    const location = TestBed.inject(Location);
    // in the application the router listens to the browser's history from the first navigation
    TestBed.inject(Router).setUpLocationChangeListener();
    await harness.navigateByUrl('/customer');
    await harness.navigateByUrl('/form', Form);

    for (let refused = 0; refused < 2; refused++) {
      location.back();
      await settle();
      expect(location.path()).toBe('/form');
    }

    leave = true;
    location.back();
    await settle();
    expect(location.path()).toBe('/customer');
    location.back();
    await settle();
    expect(location.path()).toBe('/list');
  });
});
