import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmbalseHistoricoComponent } from './components/embalse-historico/embalse-historico.component'; 

export const routes: Routes = [
  { path: 'home', loadComponent: () => import('./home/home.page').then((m) => m.HomePage),},
  { path: 'embalse-historico/:id', component: EmbalseHistoricoComponent},
  { path: '', redirectTo: 'home', pathMatch: 'full',},
];
