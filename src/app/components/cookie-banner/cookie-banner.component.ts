import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss']
})
export class CookieBannerComponent implements OnInit {

  visible = false;

  constructor(private cookieConsent: CookieConsentService) {}

  ngOnInit(): void {
    this.visible = this.cookieConsent.hasConsented() === null;
  }

  accept(): void {
    this.cookieConsent.accept();
    this.visible = false;
  }

  reject(): void {
    this.cookieConsent.reject();
    this.visible = false;
  }
}