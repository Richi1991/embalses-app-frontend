import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CookieBannerComponent {

  visible = false;

  constructor(private cookieConsent: CookieConsentService) {
    // Solo mostrar si nunca ha respondido (null = primera visita)
    this.visible = this.cookieConsent.hasConsented() === null;
  }

  accept() {
    this.cookieConsent.accept();
    this.visible = false;
  }

  reject() {
    this.cookieConsent.reject();
    this.visible = false;
  }
}
