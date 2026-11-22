import { Routes } from '@angular/router';

export const locationsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./location-list').then((m) => m.LocationList),
  },
];
