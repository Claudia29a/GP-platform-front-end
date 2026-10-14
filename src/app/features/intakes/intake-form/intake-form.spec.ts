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
    complaintArea: 'SKIN',
    complaintAreaOther: null,
    duration: 'ONE_TO_FOUR_WEEKS',
    severity: 4,
    symptoms: ['RASH_ITCHING'],
    symptomsOther: null,
    takesMedication: false,
    currentMedication: null,
    triedTreatment: false,
    treatmentTried: null,
    description: 'Itchy rash on my arm',
    status: 'SUBMITTED',
    submittedAt: '2026-10-14T09:00:00Z',
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

  async function click(id: string): Promise<void> {
    element.querySelector<HTMLInputElement>(`#${id}`)!.click();
    await fixture.whenStable();
  }

  async function type(id: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submitForm(): Promise<void> {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  /** Answers every required question with the simplest valid answer. */
  async function answerRequiredQuestions(): Promise<void> {
    await click('area-SKIN');
    await click('duration-ONE_TO_FOUR_WEEKS');
    await click('severity-4');
    await click('medication-no');
    await click('tried-no');
    await type('description', 'Itchy rash on my arm');
  }

  function errors(): string[] {
    return Array.from(element.querySelectorAll('.error'), (el) => el.textContent!.trim()).filter(Boolean);
  }

  it('greets the patient by first name', () => {
    expect(element.querySelector('.greeting')?.textContent).toContain('Hi Anna');
  });

  it('does not send an empty form and says what is missing', async () => {
    await submitForm();

    expect(intakeService.submit).not.toHaveBeenCalled();
    expect(errors()).toEqual([
      'Please choose where the problem is.',
      'Please choose how long it has been going on.',
      'Please choose a number from 1 to 10.',
      'Please answer yes or no.',
      'Please answer yes or no.',
      'Please describe your question.',
    ]);
  });

  it('only asks "where exactly" when the area is Other, and then requires it', async () => {
    await answerRequiredQuestions();
    expect(element.querySelector('#complaintAreaOther')).toBeNull();

    await click('area-OTHER');
    expect(element.querySelector('#complaintAreaOther')).not.toBeNull();

    await submitForm();
    expect(intakeService.submit).not.toHaveBeenCalled();
    expect(errors()).toContain('Please say where the problem is.');
  });

  it('asks which medication only after "yes", and then requires it', async () => {
    await answerRequiredQuestions();
    expect(element.querySelector('#currentMedication')).toBeNull();

    await click('medication-yes');
    await submitForm();

    expect(intakeService.submit).not.toHaveBeenCalled();
    expect(errors()).toContain('Please say which medication or treatment you take.');
  });

  it('no longer requires the follow-up after switching back to "no"', async () => {
    await answerRequiredQuestions();
    await click('tried-yes');
    await click('tried-no');
    await submitForm();

    expect(intakeService.submit).toHaveBeenCalled();
  });

  it('sends all answers and shows the confirmation', async () => {
    await answerRequiredQuestions();
    await click('symptom-RASH_ITCHING');
    await click('symptom-FEVER');
    await type('symptomsOther', ' Dry skin ');
    await click('medication-yes');
    await type('currentMedication', 'Antihistamine');
    await submitForm();

    expect(intakeService.submit).toHaveBeenCalledWith({
      complaintArea: 'SKIN',
      complaintAreaOther: null,
      duration: 'ONE_TO_FOUR_WEEKS',
      severity: 4,
      symptoms: ['FEVER', 'RASH_ITCHING'],
      symptomsOther: 'Dry skin',
      takesMedication: true,
      currentMedication: 'Antihistamine',
      triedTreatment: false,
      treatmentTried: null,
      description: 'Itchy rash on my arm',
    });
    expect(element.querySelector('h1')?.textContent).toContain('Your question has been sent');
    expect(element.textContent).not.toContain(savedIntake.id);
  });
});
