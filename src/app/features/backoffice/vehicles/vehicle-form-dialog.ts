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
import { VehicleListItem, VehicleType } from './vehicles-api';
import { isValidPlate } from './vehicle-plate';
import { VehiclesFacade } from './vehicles-facade';

const MAX_DESCRIPTION = 100;

type Field = 'licensePlate' | 'description' | 'type' | 'requiresTrailer';
const FIELDS: Field[] = ['licensePlate', 'description', 'type', 'requiresTrailer'];

@Component({
  selector: 'app-vehicle-form-dialog',
  imports: [Dialog, FormField, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vehicle-form-dialog.html',
})
export class VehicleFormDialog {
  protected readonly facade = inject(VehiclesFacade);
  /** The vehicle being edited; absent when creating. */
  readonly vehicle = input<VehicleListItem | null>(null);
  readonly closed = output<void>();
  private readonly injector = inject(Injector);
  private readonly plateInput = viewChild.required<ElementRef<HTMLInputElement>>('plate');

  private readonly model = linkedSignal<{
    licensePlate: string;
    description: string;
    type: VehicleType | '';
    requiresTrailer: boolean;
  }>(() => {
    const vehicle = this.vehicle();
    return {
      licensePlate: vehicle?.licensePlate ?? '',
      description: vehicle?.description ?? '',
      type: vehicle?.type ?? '',
      requiresTrailer: vehicle?.requiresTrailer ?? false,
    };
  });
  protected readonly vehicleForm = form(this.model, (f) => {
    validate(f.licensePlate, ({ value }) =>
      isValidPlate(value())
        ? undefined
        : { kind: 'licensePlate', message: 'vehicles.form.plate.invalid' },
    );
    validate(f.description, ({ value }) => {
      const length = value().trim().length;
      return length > 0 && length <= MAX_DESCRIPTION
        ? undefined
        : { kind: 'description', message: 'vehicles.form.description.invalid' };
    });
    validate(f.type, ({ value }) =>
      value() !== '' ? undefined : { kind: 'type', message: 'vehicles.form.type.invalid' },
    );
    disabled(f.licensePlate, { when: () => this.facade.saving() });
    disabled(f.description, { when: () => this.facade.saving() });
    disabled(f.type, { when: () => this.facade.saving() });
    disabled(f.requiresTrailer, { when: () => this.facade.saving() });
  });

  private readonly submitted = signal(false);
  private readonly refusal = signal<ApiError | null>(null);

  protected readonly isTractor = computed(() => this.model().type === 'Tractor');

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

  protected readonly plateError = this.errorOf('licensePlate');
  protected readonly descriptionError = this.errorOf('description');
  protected readonly typeError = this.errorOf('type');
  protected readonly requiresTrailerError = this.errorOf('requiresTrailer');

  /** The frontend's message after a submit, else the backend's messages for the field. */
  private errorOf(field: Field) {
    return computed<{ key: string } | { text: string } | null>(() => {
      if (this.submitted() && field !== 'requiresTrailer' && this.vehicleForm[field]().invalid()) {
        return { key: this.vehicleForm[field]().errors()[0].message! };
      }
      const refusal = this.refusal();
      const texts = refusal === null ? [] : fieldErrors(refusal, field);
      return texts.length > 0 ? { text: texts.join(' ') } : null;
    });
  }

  /** The trailer question belongs to a tractor only: changing the type clears it. */
  protected onTypeChange(): void {
    this.model.update((model) => ({ ...model, requiresTrailer: false }));
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.facade.saving()) {
      return;
    }
    this.refusal.set(null);
    this.submitted.set(true);
    if (this.vehicleForm().invalid()) {
      return;
    }
    const { licensePlate, description, type, requiresTrailer } = this.model();
    const outcome = await this.facade.save(this.vehicle(), {
      licensePlate,
      description: description.trim(),
      type: type as VehicleType,
      requiresTrailer: type === 'Tractor' && requiresTrailer,
    });
    if (outcome === 'saved') {
      this.closed.emit();
    } else if (outcome !== 'ignored') {
      this.refusal.set(outcome);
      // the focused button was disabled during the save; the fields are enabled again only after the next render
      afterNextRender(() => this.plateInput().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
