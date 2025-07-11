import { TestBed } from '@angular/core/testing';

import { PetLocation } from './pet-location';

describe('PetLocation', () => {
  let service: PetLocation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PetLocation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
