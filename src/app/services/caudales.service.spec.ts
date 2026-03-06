import { TestBed } from '@angular/core/testing';

import { CaudalesService } from './caudales.service';

describe('Caudales', () => {
  let service: CaudalesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CaudalesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
