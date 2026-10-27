import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ASSISTANT, PATIENT, testIntake } from '../../../../testing/test-data';
import { AuthService } from '../../../core/auth/auth.service';
import { Intake } from '../../../core/models/intake.model';
import { CurrentUser, isStaff } from '../../../core/models/user.model';
import { IntakeService } from '../../../core/services/intake.service';
import { IntakeList } from './intake-list';

describe('IntakeList', () => {
  async function render(user: CurrentUser, intakes: Intake[] | HttpErrorResponse) {
    const getAll = vi.fn().mockReturnValue(intakes instanceof HttpErrorResponse ? throwError(() => intakes) : of(intakes));
    const current = signal(user);
    await TestBed.configureTestingModule({
      imports: [IntakeList],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: { getAll } },
        { provide: AuthService, useValue: { isStaff: computed(() => isStaff(current())) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(IntakeList);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a patient their own questions without patient names', async () => {
    const page = await render(PATIENT, [testIntake()]);

    expect(page.querySelector('h1')?.textContent).toContain('My questions');
    expect(page.querySelector('.description')?.textContent).toContain('Itchy rash on my left arm');
    expect(page.querySelector('.meta')?.textContent).toContain('Skin');
    expect(page.querySelector('.patient')).toBeNull();
  });

  it('shows staff all questions with the patient name', async () => {
    const page = await render(ASSISTANT, [testIntake(), testIntake({ id: 'second', patientName: 'Bram' })]);

    expect(page.querySelector('h1')?.textContent).toContain('All questions');
    expect(Array.from(page.querySelectorAll('.patient'), (el) => el.textContent?.trim())).toEqual(['Anna de Vries', 'Bram']);
  });

  it('invites a patient without questions to ask one', async () => {
    const page = await render(PATIENT, []);

    expect(page.querySelector('.empty')?.textContent).toContain('You have not asked any questions yet');
  });

  it('explains when the questions cannot be loaded', async () => {
    const page = await render(PATIENT, new HttpErrorResponse({ status: 0 }));

    expect(page.querySelector('.alert')?.textContent).toContain('cannot be reached');
  });
});
