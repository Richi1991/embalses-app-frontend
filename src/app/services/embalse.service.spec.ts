import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { EmbalseService } from './embalse.service'; // Importamos la CLASE del servicio

describe('EmbalseService', () => {
  let service: EmbalseService; // El tipo es la clase del servicio

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmbalseService,
        provideHttpClient() // Necesario porque el servicio usa HttpClient
      ]
    });
    service = TestBed.inject(EmbalseService); // Ahora sí usamos la clase como valor
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});