import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type Contract = Schemas['ContractDto'];
export type ContractStatus = Schemas['ContractStatus'];
export type BillingLevel = Schemas['BillingLevel'];
export type PricingMode = Schemas['PricingMode'];
export type RequiredDocument = Schemas['RequiredDocument'];
export type CreateContractRequest = Schemas['CreateContractRequest'];
export type UpdateContractRequest = Schemas['UpdateContractRequest'];

const url = (customerId: string) => `/api/registry/customers/${customerId}/contracts`;

@Injectable({ providedIn: 'root' })
export class ContractsApi {
  private readonly http = inject(HttpClient);

  list(customerId: string): HttpResourceRequest {
    return { url: url(customerId) };
  }

  get(customerId: string, contractId: string): HttpResourceRequest {
    return { url: `${url(customerId)}/${contractId}` };
  }

  create(customerId: string, request: CreateContractRequest): Observable<Contract> {
    return this.http.post<Contract>(url(customerId), request);
  }

  update(customerId: string, contractId: string, request: UpdateContractRequest): Observable<void> {
    return this.http.put<void>(`${url(customerId)}/${contractId}`, request);
  }
}
