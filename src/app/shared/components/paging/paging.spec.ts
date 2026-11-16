import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Paging } from './paging';

@Component({
  selector: 'app-paging-host',
  imports: [Paging],
  template: `
    <table>
      <tfoot>
        <tr>
          <td>
            <app-paging
              [page]="page()"
              [pageSize]="20"
              [total]="23"
              rangeKey="users.list.range"
              (pageChange)="asked.push($event)"
            />
          </td>
        </tr>
      </tfoot>
    </table>
  `,
})
class Host {
  readonly page = signal(1);
  readonly asked: number[] = [];
}

describe('Paging', () => {
  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  const texts = (fixture: ReturnType<typeof render>) => {
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('button'));
    return {
      range: element.querySelector('.pt-label')?.textContent,
      page: element.querySelector('.pt-paging .pt-muted')?.textContent,
      previous: buttons[0],
      next: buttons[1],
    };
  };

  it('on the first page shows the range and "Pagina 1 di 2", with "Precedente" disabled', () => {
    const view = texts(render());

    expect(view.range).toBe('Utenti 1–20 di 23');
    expect(view.page).toBe('Pagina 1 di 2');
    expect(view.previous.textContent?.trim()).toBe('Precedente');
    expect(view.previous.disabled).toBe(true);
    expect(view.next.textContent?.trim()).toBe('Successiva');
    expect(view.next.disabled).toBe(false);
  });

  it('on the last, shorter page the range ends at the total and "Successiva" is disabled', () => {
    const fixture = render();
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    const view = texts(fixture);

    expect(view.range).toBe('Utenti 21–23 di 23');
    expect(view.page).toBe('Pagina 2 di 2');
    expect(view.previous.disabled).toBe(false);
    expect(view.next.disabled).toBe(true);
  });

  it('asks for the next page, then for the previous one', () => {
    const fixture = render();
    texts(fixture).next.click();
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    texts(fixture).previous.click();

    expect(fixture.componentInstance.asked).toEqual([2, 1]);
  });
});
