import { Routes } from '@angular/router';

export const driversRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./driver-list').then((m) => m.DriverList),
  },
];
