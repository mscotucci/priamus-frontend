import { Routes } from '@angular/router';

export const vehiclesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./vehicle-list').then((m) => m.VehicleList),
  },
];
