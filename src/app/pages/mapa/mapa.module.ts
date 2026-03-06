import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MapaPage } from './mapa.page';
import { MapaRoutingModule } from './mapa-routing.module';
import { CaudalComponent } from './caudal/caudal.component';



@NgModule({
  declarations: [],
  imports: [
    MapaPage,
    CaudalComponent,
    CommonModule,
    IonicModule,
    MapaRoutingModule
  ]
})
export class MapaModule { }
