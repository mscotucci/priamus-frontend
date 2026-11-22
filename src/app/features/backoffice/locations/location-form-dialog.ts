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
import { LocationListItem } from './locations-api';
import { LocationsFacade } from './locations-facade';

const MAX_NAME = 100;
const MAX_MUNICIPALITY = 100;
const MAX_ADDRESS = 200;

type Field = 'name' | 'municipality' | 'address';
const FIELDS: Field[] = ['name', 'municipality', 'address'];

@Component({
  selector: 'app-location-form-dialog',
  imports: [Dialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-form-dialog.html',
})
export class LocationFormDialog {
  protected readonly facade = inject(LocationsFacade);
  /** The location being edited; absent when creating. */
  readonly location = input<LocationListItem | null>(null);
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('name');

  private readonly model = linkedSignal<Record<Field, string>>(() => {
    const location = this.location();
    return {
      name: location?.name ?? '',
      municipality: location?.municipality ?? '',
      address: location?.address ?? '',
    };
  });
  protected readonly locationForm = form(this.model, (f) => {
    validate(f.name, ({ value }) => {
      const length = value().trim().length;
      if (length === 0) {
        return { kind: 'name', message: 'locations.form.name.required' };
      }
      return length <= MAX_NAME
        ? undefined
        : { kind: 'name', message: 'locations.form.name.toolong' };
    });
    validate(f.municipality, ({ value }) => {
      const length = value().trim().length;
      if (length === 0) {
        return { kind: 'municipality', message: 'locations.form.municipality.required' };
      }
      return length <= MAX_MUNICIPALITY
        ? undefined
        : { kind: 'municipality', message: 'locations.form.municipality.toolong' };
    });
    validate(f.address, ({ value }) =>
      value().trim().length <= MAX_ADDRESS
        ? undefined
        : { kind: 'address', message: 'locations.form.address.toolong' },
    );
    disabled(f.name, { when: () => this.facade.saving() });
    disabled(f.municipality, { when: () => this.facade.saving() });
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

  protected readonly nameError = this.errorOf('name');
  protected readonly municipalityError = this.errorOf('municipality');
  protected readonly addressError = this.errorOf('address');

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && this.locationForm[field]().invalid()) {
        return { key: this.locationForm[field]().errors()[0].message! };
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
    if (this.locationForm().invalid()) {
      return;
    }
    const { name, municipality, address } = this.model();
    const outcome = await this.facade.save(this.location(), {
      name: name.trim(),
      municipality: municipality.trim(),
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
