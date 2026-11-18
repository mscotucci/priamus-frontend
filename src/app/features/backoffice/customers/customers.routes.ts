import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../../shared/guards/unsaved-changes-guard';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./customer-list').then((m) => m.CustomerList),
  },
  {
    path: ':customerId/contracts/new',
    loadComponent: () => import('./contract-page').then((m) => m.ContractPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':customerId/contracts/:contractId',
    loadComponent: () => import('./contract-page').then((m) => m.ContractPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':customerId',
    loadComponent: () => import('./customer-page').then((m) => m.CustomerPage),
  },
];
