import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../../shared/guards/unsaved-changes-guard';

export const tripsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./driver-home').then((m) => m.DriverHome),
  },
  {
    path: 'new-trip',
    loadComponent: () => import('./new-trip-page').then((m) => m.NewTripPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'trips/:tripId',
    loadComponent: () => import('./planned-trip-page').then((m) => m.PlannedTripPage),
  },
  {
    path: 'trips/:tripId/end',
    loadComponent: () => import('./end-trip-page').then((m) => m.EndTripPage),
  },
  {
    path: 'my-trips',
    loadComponent: () => import('./my-trips-page').then((m) => m.MyTripsPage),
  },
  {
    path: 'ended',
    loadComponent: () => import('./trip-ended').then((m) => m.TripEnded),
  },
];
