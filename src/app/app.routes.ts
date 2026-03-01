import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/dashboard', // Redirigimos al dashboard dentro de las tabs
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'mapa',
        loadChildren: () => import('./pages/mapa/mapa.module').then(m => m.MapaModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // Esta queda fuera si quieres que al ver un embalse se oculte la botonera
  { 
    path: 'embalse/:id', 
    loadComponent: () => import('./pages/embalse/embalse.page').then(m => m.EmbalsePage) 
  },
];
