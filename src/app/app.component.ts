import { Component, OnInit, AfterViewInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CookieConsentService } from './services/cookie-consent.service';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component'; // ← esta línea


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true, 
  imports: [IonApp, IonRouterOutlet, CookieBannerComponent],  // ← añadir aquí
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(private cookieConsent: CookieConsentService) {}

  ngOnInit() {
    try {
      this.cookieConsent.initAnalyticsIfConsented();
    } catch (e) {
      console.warn('[AppComponent] Analytics init failed:', e);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.hideSplash(), 300);
  }

  private hideSplash() {
    const splash = document.getElementById('app-splash');
    if (!splash) return;
    splash.classList.add('hidden');
    setTimeout(() => splash.parentNode?.removeChild(splash), 600);
  }
}