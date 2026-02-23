import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPage } from './dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardPage }
];

@NgModule({
  imports: [
    DashboardPage,
    RouterModule.forChild(routes)
  ]
})
export class DashboardPageModule {}