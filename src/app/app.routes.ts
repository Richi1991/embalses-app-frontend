import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full'},
  { path: 'dashboard', loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule)},
  { path: 'mapa', loadChildren: () => import('./pages/mapa/mapa.module').then(m => m.MapaModule) },
  { path: 'embalse/:id', loadComponent: () => import('./pages/embalse/embalse.page').then(m => m.EmbalsePage) }
];
