import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ContractsApi, SimulatePriceRequest } from './contracts-api';

describe('ContractsApi', () => {
  it('simulate posts the request to the simulation endpoint and returns the answer', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const request: SimulatePriceRequest = {
      pricingMode: 'ByTrip',
      nightSurcharge: true,
      dayPrice: 120,
      nightPrice: 150,
      nightCallFee: 20,
      minimumRule: null,
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
      vehicleRates: [],
      vehicleId: null,
      startTime: '23:00',
      endTime: null,
      kilograms: null,
      kilometres: null,
    };

    const result = firstValueFrom(TestBed.inject(ContractsApi).simulate(request));
    const call = http.expectOne('/api/registry/contracts/simulation');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toBe(request);
    call.flush({ total: 12.5 });

    expect(await result).toEqual({ total: 12.5 });
  });
});
