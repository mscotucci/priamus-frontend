import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom } from 'rxjs';
import {
  ApiError,
  isStale,
  NoticeContent,
  noticeOf,
  toApiError,
} from '../../../core/api/api-error';
import { Toast } from '../../../core/toast/toast';
import {
  ChangeContractFromDateRequest,
  Contract,
  ContractsApi,
  CreateContractRequest,
} from './contracts-api';
import {
  CreateCustomerRequest,
  CustomerListItem,
  CustomerListPage,
  CustomerStatus,
  CustomersApi,
  CustomersQuery,
  SortColumn,
  SortDirection,
} from './customers-api';

export type SaveOutcome = 'saved' | 'ignored' | ApiError;
export type DeactivateOutcome = 'deactivated' | 'ignored' | ApiError;
export type SaveContractOutcome = 'created' | 'updated' | 'ignored' | ApiError;
export type ChangeContractOutcome = 'changed' | 'ignored' | ApiError;

const NOT_FOUND = 404;

const isNotFound = (error: unknown) =>
  error instanceof HttpErrorResponse && error.status === NOT_FOUND;

@Injectable()
export class CustomersFacade {
  private readonly api = inject(CustomersApi);
  private readonly contractsApi = inject(ContractsApi);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  private readonly searchState = signal('');
  private readonly statusState = signal<CustomerStatus | null>(null);
  private readonly sortColumnState = signal<SortColumn>('companyName');
  private readonly sortDirectionState = signal<SortDirection>('Ascending');
  private readonly pageState = signal(1);

  readonly search = this.searchState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly query = computed<CustomersQuery>(() => ({
    search: this.searchState(),
    status: this.statusState(),
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
    page: this.pageState(),
  }));

  private readonly savingState = signal(false);
  readonly saving = this.savingState.asReadonly();
  private readonly deactivatingState = signal(false);
  readonly deactivating = this.deactivatingState.asReadonly();
  private readonly reactivatingIdState = signal<string | null>(null);
  readonly reactivatingId = this.reactivatingIdState.asReadonly();
  private readonly reactivateNoticeState = signal<NoticeContent | null>(null);
  readonly reactivateNotice = this.reactivateNoticeState.asReadonly();

  private readonly list = httpResource<CustomerListPage>(() => this.api.list(this.query()));

  readonly items = computed<CustomerListItem[]>(() =>
    this.list.hasValue() ? this.list.value().data : [],
  );
  readonly total = computed(() => (this.list.hasValue() ? this.list.value().totalCount : 0));
  readonly loaded = computed(() => this.list.hasValue());
  /** The list is read for the first time or for a new query: nothing current to show. */
  readonly loading = computed(
    () =>
      this.list.status() === 'loading' ||
      (this.list.status() === 'reloading' && !this.list.hasValue()),
  );
  /** The same list is read again (after a write): the rows on screen stay until the answer. */
  readonly reloading = computed(() => this.list.status() === 'reloading' && this.list.hasValue());
  readonly failed = computed(() => this.list.status() === 'error');

  setSearch(search: string): void {
    const trimmed = search.trim();
    if (trimmed === this.searchState()) {
      return;
    }
    this.reactivateNoticeState.set(null);
    this.searchState.set(trimmed);
    this.pageState.set(1);
  }

  setStatus(status: CustomerStatus | null): void {
    this.reactivateNoticeState.set(null);
    this.statusState.set(status);
    this.pageState.set(1);
  }

  setSort(column: SortColumn, direction: SortDirection): void {
    this.reactivateNoticeState.set(null);
    this.sortColumnState.set(column);
    this.sortDirectionState.set(direction);
    this.pageState.set(1);
  }

  setPage(page: number): void {
    this.reactivateNoticeState.set(null);
    this.pageState.set(page);
  }

  clearReactivateNotice(): void {
    this.reactivateNoticeState.set(null);
  }

  reload(): void {
    this.list.reload();
    this.customerResource.reload();
  }

  /** A write refused with 409 means the list is stale: it is read again, keeping its state. */
  private refused(error: unknown): ApiError {
    const apiError = toApiError(error);
    if (isStale(apiError)) {
      this.reload();
    }
    return apiError;
  }

  /** Creates the customer, or updates `customer` when given, sending the version it was read at. */
  async save(
    customer: CustomerListItem | null,
    values: CreateCustomerRequest,
  ): Promise<SaveOutcome> {
    if (this.savingState()) {
      return 'ignored';
    }
    this.savingState.set(true);
    try {
      let companyName: string;
      try {
        if (customer === null) {
          companyName = (await firstValueFrom(this.api.create(values))).companyName;
        } else {
          await firstValueFrom(
            this.api.update(customer.id, { ...values, version: customer.version }),
          );
          companyName = values.companyName;
        }
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant(
          customer === null ? 'customers.form.create.done' : 'customers.form.edit.done',
          { companyName },
        ),
      );
      this.reload();
      return 'saved';
    } finally {
      this.savingState.set(false);
    }
  }

  async deactivate(customer: CustomerListItem): Promise<DeactivateOutcome> {
    if (this.deactivatingState()) {
      return 'ignored';
    }
    this.deactivatingState.set(true);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.deactivate(customer.id, customer.version));
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant('customers.deactivate.done', { companyName: customer.companyName }),
      );
      this.reload();
      return 'deactivated';
    } finally {
      this.deactivatingState.set(false);
    }
  }

  async reactivate(customer: CustomerListItem): Promise<void> {
    if (this.reactivatingIdState() !== null) {
      return;
    }
    this.reactivatingIdState.set(customer.id);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.reactivate(customer.id, customer.version));
      } catch (error) {
        this.reactivateNoticeState.set(noticeOf(this.refused(error)));
        return;
      }
      this.toast.success(
        this.translate.instant('customers.reactivate.done', { companyName: customer.companyName }),
      );
      this.reload();
    } finally {
      this.reactivatingIdState.set(null);
    }
  }

  // --- Customer page and contracts ---

  private readonly customerIdState = signal<string | null>(null);
  private readonly contractIdState = signal<string | null>(null);
  private readonly savingContractState = signal(false);
  readonly savingContract = this.savingContractState.asReadonly();

  private readonly customerResource = httpResource<CustomerListItem>(() => {
    const id = this.customerIdState();
    return id === null ? undefined : this.api.get(id);
  });
  private readonly contractsResource = httpResource<Contract[]>(() => {
    const id = this.customerIdState();
    return id === null ? undefined : this.contractsApi.list(id);
  });
  private readonly contractResource = httpResource<Contract>(() => {
    const customerId = this.customerIdState();
    const contractId = this.contractIdState();
    return customerId === null || contractId === null
      ? undefined
      : this.contractsApi.get(customerId, contractId);
  });

  readonly customer = this.customerResource.asReadonly();
  readonly contracts = this.contractsResource.asReadonly();
  readonly contract = this.contractResource.asReadonly();
  readonly customerNotFound = computed(() => isNotFound(this.customerResource.error()));
  readonly contractNotFound = computed(() => isNotFound(this.contractResource.error()));

  /** Opening a customer always reads it fresh, also when it is the one already held. */
  openCustomer(id: string): void {
    if (id === this.customerIdState()) {
      this.reloadCustomer();
    } else {
      this.customerIdState.set(id);
      this.contractIdState.set(null);
    }
  }

  /** Reads the customer and its contracts again: a page that failed to load failed on both. */
  reloadCustomer(): void {
    this.customerResource.reload();
    this.contractsResource.reload();
  }

  /** Reads the contract to edit; `null` is the page that creates one. */
  openContract(id: string | null): void {
    if (id !== null && id === this.contractIdState()) {
      this.contractResource.reload();
    } else {
      this.contractIdState.set(id);
    }
  }

  reloadContracts(): void {
    this.contractsResource.reload();
  }

  reloadContract(): void {
    this.contractResource.reload();
  }

  /** A write refused with 409 means what is on screen is stale: the contracts are read again. */
  private refusedContract(error: unknown): ApiError {
    const apiError = toApiError(error);
    if (isStale(apiError)) {
      this.contractsResource.reload();
      this.contractResource.reload();
    }
    return apiError;
  }

  /**
   * Creates the contract, or updates `contract` when given, sending the version it was read at;
   * a saved contract shows the toast and returns to the customer page.
   */
  async saveContract(
    customerId: string,
    contract: Contract | null,
    values: CreateContractRequest,
  ): Promise<SaveContractOutcome> {
    const outcome = await this.writeContract(customerId, () =>
      contract === null
        ? this.contractsApi.create(customerId, values)
        : this.contractsApi.update(customerId, contract.id, {
            ...values,
            version: contract.version,
          }),
    );
    if (outcome !== 'done') {
      return outcome;
    }
    return contract === null ? 'created' : 'updated';
  }

  /**
   * Cuts `contract` at `changeFrom`: it ends the day before and a new one starts that day with
   * `values`, sending the version the contract was read at; handled like a save.
   */
  async changeContractFromDate(
    customerId: string,
    contract: Contract,
    values: CreateContractRequest,
    changeFrom: string,
  ): Promise<ChangeContractOutcome> {
    const request: ChangeContractFromDateRequest = {
      ...values,
      version: contract.version,
      changeFrom,
    };
    const outcome = await this.writeContract(customerId, () =>
      this.contractsApi.changeFromDate(customerId, contract.id, request),
    );
    return outcome === 'done' ? 'changed' : outcome;
  }

  /** The busy flag, the refusal, the toast and the return to the customer page of a contract write. */
  private async writeContract(
    customerId: string,
    send: () => Observable<unknown>,
  ): Promise<'done' | 'ignored' | ApiError> {
    if (this.savingContractState()) {
      return 'ignored';
    }
    this.savingContractState.set(true);
    try {
      try {
        await firstValueFrom(send());
      } catch (error) {
        return this.refusedContract(error);
      }
      this.toast.success(this.translate.instant('contracts.form.saved'));
      void this.router.navigate(['/customers', customerId]);
      return 'done';
    } finally {
      this.savingContractState.set(false);
    }
  }
}
