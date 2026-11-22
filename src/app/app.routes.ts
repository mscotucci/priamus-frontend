import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth-guard';
import { guestGuard } from './shared/guards/guest-guard';
import { landingGuard } from './shared/guards/landing-guard';
import { roleGuard } from './shared/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    children: [],
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'customers',
        canActivate: [roleGuard('BackOffice', 'Admin')],
        loadComponent: () =>
          import('./features/backoffice/customers/customers').then((m) => m.Customers),
        loadChildren: () =>
          import('./features/backoffice/customers/customers.routes').then((m) => m.customersRoutes),
      },
      {
        path: 'locations',
        canActivate: [roleGuard('BackOffice', 'Admin')],
        loadComponent: () =>
          import('./features/backoffice/locations/locations').then((m) => m.Locations),
        loadChildren: () =>
          import('./features/backoffice/locations/locations.routes').then((m) => m.locationsRoutes),
      },
      {
        path: 'drivers',
        canActivate: [roleGuard('BackOffice', 'Admin')],
        loadComponent: () => import('./features/backoffice/drivers/drivers').then((m) => m.Drivers),
        loadChildren: () =>
          import('./features/backoffice/drivers/drivers.routes').then((m) => m.driversRoutes),
      },
      {
        path: 'vehicles',
        canActivate: [roleGuard('BackOffice', 'Admin')],
        loadComponent: () =>
          import('./features/backoffice/vehicles/vehicles').then((m) => m.Vehicles),
        loadChildren: () =>
          import('./features/backoffice/vehicles/vehicles.routes').then((m) => m.vehiclesRoutes),
      },
      {
        path: 'users',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/backoffice/users/users').then((m) => m.Users),
        loadChildren: () =>
          import('./features/backoffice/users/users.routes').then((m) => m.usersRoutes),
      },
      {
        path: 'settings',
        canActivate: [roleGuard('Admin')],
        loadComponent: () =>
          import('./features/backoffice/settings/settings').then((m) => m.Settings),
        loadChildren: () =>
          import('./features/backoffice/settings/settings.routes').then((m) => m.settingsRoutes),
      },
    ],
  },
  {
    path: 'design-system',
    loadComponent: () => import('./features/design-system/gallery').then((m) => m.Gallery),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
