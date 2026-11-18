import { Routes } from '@angular/router';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./customer-list').then((m) => m.CustomerList),
  },
];
