import { Routes } from '@angular/router';

export const backofficeTripsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./trip-list').then((m) => m.TripList),
  },
];
