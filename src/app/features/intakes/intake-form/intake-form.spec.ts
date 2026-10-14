import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Intake } from '../../../core/models/intake.model';
import { CurrentUser } from '../../../core/models/user.model';
import { IntakeService } from '../../../core/services/intake.service';
import { IntakeForm } from './intake-form';

describe('IntakeForm', () => {
  let fixture: ComponentFixture<IntakeForm>;
  let element: HTMLElement;
  let intakeService: { submit: ReturnType<typeof vi.fn> };

  const savedIntake: Intake = {
    id: '3f1c2a4e-0000-4000-8000-000000000001',
    patientId: 'google-anna',
    patientName: 'Anna de Vries',
    patientEmail: 'anna@example.com',
    description: 'Back pain since Monday',
    status: 'SUBMITTED',
    submittedAt: '2026-10-07T09:00:00Z',
  };

  const patient: CurrentUser = { id: 'google-anna', name: 'Anna de Vries', email: 'anna@example.com', role: 'PATIENT' };

  beforeEach(async () => {
    intakeService = { submit: vi.fn().mockReturnValue(of(savedIntake)) };

    await TestBed.configureTestingModule({
      imports: [IntakeForm],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: intakeService },
        { provide: AuthService, useValue: { user: signal<CurrentUser>(patient) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntakeForm);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  function typeDescription(value: string): void {
    const textarea = element.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
  }

  async function submitForm(): Promise<void> {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('greets the patient by first name', () => {
    expect(element.querySelector('.greeting')?.textContent).toContain('Hi Anna');
  });

  it('does not send an empty description and shows an error', async () => {
    await submitForm();

    expect(intakeService.submit).not.toHaveBeenCalled();
    expect(element.querySelector('.error')?.textContent).toContain('Please describe your complaint.');
  });

  it('does not send a description of only spaces', async () => {
    typeDescription('   ');
    await submitForm();

    expect(intakeService.submit).not.toHaveBeenCalled();
  });

  it('sends a valid description and shows the confirmation', async () => {
    typeDescription('Back pain since Monday');
    await submitForm();

    expect(intakeService.submit).toHaveBeenCalledWith({ description: 'Back pain since Monday' });
    expect(element.querySelector('h1')?.textContent).toContain('Your question has been sent');
    expect(element.querySelector('.sent-at')?.textContent).toContain('Sent on');
    expect(element.textContent).not.toContain(savedIntake.id);
  });
});
