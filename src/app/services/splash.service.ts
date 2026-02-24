import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SplashService {
  private ready$ = new Subject<void>();

  markReady() {
    this.ready$.next();  // el dashboard llama esto cuando tiene datos
  }

  onReady(cb: () => void) {
    this.ready$.subscribe(cb);
  }
}