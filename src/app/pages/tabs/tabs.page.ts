import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonIcon, IonTabButton, IonTabBar, IonTabs } from '@ionic/angular/standalone';
import { waterOutline, mapOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';


@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, 
    FormsModule, IonLabel, IonIcon, IonTabButton, IonTabBar, IonTabs ]
})
export class TabsPage implements OnInit {

  constructor() { 
    addIcons({ waterOutline, mapOutline });
  }

  ngOnInit() {
  }

}
