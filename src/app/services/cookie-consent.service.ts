import { Injectable } from '@angular/core';
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {

  private readonly STORAGE_KEY = 'cookie_consent';

  hasConsented(): boolean | null {
    const value = localStorage.getItem(this.STORAGE_KEY);
    if (value === null) return null; // nunca ha respondido
    return value === 'true';
  }

  accept(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
    this.initAnalytics();
  }

  reject(): void {
    localStorage.setItem(this.STORAGE_KEY, 'false');
  }

  initAnalyticsIfConsented(): void {
    if (this.hasConsented() === true) {
      this.initAnalytics();
    }
  }

  private initAnalytics(): void {
    const app = initializeApp(environment.firebase);
    getAnalytics(app);
  }
}