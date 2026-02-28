import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmbalsePage } from './embalse.page';

describe('EmbalsePage', () => {
  let component: EmbalsePage;
  let fixture: ComponentFixture<EmbalsePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmbalsePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
