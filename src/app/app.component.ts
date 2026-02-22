import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { environment } from '../environments/environment';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor() {}

   ngOnInit() {
    const app       = initializeApp(environment.firebase);
    const analytics = getAnalytics(app);
    logEvent(analytics, 'app_open');
  }
}
