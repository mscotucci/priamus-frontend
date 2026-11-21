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
export type MinimumRuleKind = NonNullable<Schemas['MinimumRuleKind']>;
export type ContractVehicleRate = Schemas['ContractVehicleRateDto'];
export type ContractVehicleRateRequest = Schemas['ContractVehicleRateRequest'];
export type CreateContractRequest = Schemas['CreateContractRequest'];
export type UpdateContractRequest = Schemas['UpdateContractRequest'];
export type ChangeContractFromDateRequest = Schemas['ChangeContractFromDateRequest'];
export type SimulatePriceRequest = Schemas['SimulatePriceRequest'];
export type PriceSimulation = Schemas['PriceSimulationDto'];

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

  changeFromDate(
    customerId: string,
    contractId: string,
    request: ChangeContractFromDateRequest,
  ): Observable<Contract> {
    return this.http.post<Contract>(`${url(customerId)}/${contractId}/change-from-date`, request);
  }

  simulate(request: SimulatePriceRequest): Observable<PriceSimulation> {
    return this.http.post<PriceSimulation>('/api/registry/contracts/simulation', request);
  }
}
