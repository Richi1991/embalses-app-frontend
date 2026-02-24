import { Component, OnInit, AfterViewInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CookieConsentService } from './services/cookie-consent.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(private cookieConsent: CookieConsentService) {}

  ngOnInit() {
    // Envuelto en try/catch por si Firebase falla (keys vacías, red, etc.)
    // Un crash aquí dejaba la pantalla negra en producción
    try {
      this.cookieConsent.initAnalyticsIfConsented();
    } catch (e) {
      console.warn('[AppComponent] Analytics init failed (non-fatal):', e);
    }
  }

  ngAfterViewInit() {
    // Angular + Ionic han renderizado el shell — ocultamos el splash
    // El delay de 300ms deja que ion-content pinte su fondo antes del fadeout
    setTimeout(() => this.hideSplash(), 300);
  }

  private hideSplash() {
    const splash = document.getElementById('app-splash');
    if (!splash) return;

    splash.classList.add('hidden');

    // Lo elimina del DOM tras el fade (0.5s transition en global.scss)
    setTimeout(() => {
      if (splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 600);
  }
}
