import { DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize, map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import {
  COMPLAINT_AREAS,
  ComplaintArea,
  ComplaintDuration,
  DURATIONS,
  Intake,
  MAX_LENGTH,
  SYMPTOMS,
  SubmitIntakeRequest,
} from '../../../core/models/intake.model';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { IntakeService } from '../../../core/services/intake.service';

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length === 0 ? { blank: true } : null;
}

/** Trimmed text, or null when the patient left it empty. */
function textOrNull(value: string): string | null {
  return value.trim() || null;
}

@Component({
  selector: 'app-intake-form',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './intake-form.html',
  styleUrl: './intake-form.scss',
})
export class IntakeForm {
  private readonly intakeService = inject(IntakeService);
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly areas = COMPLAINT_AREAS;
  protected readonly durations = DURATIONS;
  protected readonly symptomOptions = SYMPTOMS;
  protected readonly severities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly maxLength = MAX_LENGTH;

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  protected readonly form = this.fb.group({
    complaintArea: new FormControl<ComplaintArea | null>(null, Validators.required),
    complaintAreaOther: ['', Validators.maxLength(MAX_LENGTH.complaintAreaOther)],
    duration: new FormControl<ComplaintDuration | null>(null, Validators.required),
    severity: new FormControl<number | null>(null, Validators.required),
    symptoms: this.fb.group(Object.fromEntries(SYMPTOMS.map((option) => [option.value, false]))),
    symptomsOther: ['', Validators.maxLength(MAX_LENGTH.symptomsOther)],
    takesMedication: new FormControl<boolean | null>(null, Validators.required),
    currentMedication: ['', Validators.maxLength(MAX_LENGTH.currentMedication)],
    triedTreatment: new FormControl<boolean | null>(null, Validators.required),
    treatmentTried: ['', Validators.maxLength(MAX_LENGTH.treatmentTried)],
    description: ['', [Validators.required, notBlank, Validators.maxLength(MAX_LENGTH.description)]],
  });

  /** Follow-up fields are only shown, and only required, when their question applies. */
  protected readonly areaIsOther = this.watch(this.form.controls.complaintArea, (area) => area === 'OTHER');
  protected readonly takesMedication = this.watch(this.form.controls.takesMedication, (yes) => yes === true);
  protected readonly triedTreatment = this.watch(this.form.controls.triedTreatment, (yes) => yes === true);
  protected readonly descriptionLength = this.watch(this.form.controls.description, (value) => value.length);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitted = signal<Intake | null>(null);

  constructor() {
    this.requireWhen(this.form.controls.complaintAreaOther, this.form.controls.complaintArea, (area) => area === 'OTHER');
    this.requireWhen(this.form.controls.currentMedication, this.form.controls.takesMedication, (yes) => yes === true);
    this.requireWhen(this.form.controls.treatmentTried, this.form.controls.triedTreatment, (yes) => yes === true);
  }

  /** A field shows its error once the patient has been there or has tried to send the form. */
  protected showError(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstError();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.intakeService
      .submit(this.toRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (intake) => {
          this.submitted.set(intake);
          this.form.reset();
        },
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }

  protected startNew(): void {
    this.submitted.set(null);
  }

  private toRequest(): SubmitIntakeRequest {
    const value = this.form.getRawValue();
    return {
      complaintArea: value.complaintArea!,
      complaintAreaOther: value.complaintArea === 'OTHER' ? textOrNull(value.complaintAreaOther) : null,
      duration: value.duration!,
      severity: value.severity!,
      symptoms: SYMPTOMS.filter((option) => value.symptoms[option.value]).map((option) => option.value),
      symptomsOther: textOrNull(value.symptomsOther),
      takesMedication: value.takesMedication!,
      currentMedication: value.takesMedication ? textOrNull(value.currentMedication) : null,
      triedTreatment: value.triedTreatment!,
      treatmentTried: value.triedTreatment ? textOrNull(value.treatmentTried) : null,
      description: value.description.trim(),
    };
  }

  private watch<T, R>(control: AbstractControl<T>, read: (value: T) => R) {
    return toSignal((control.valueChanges as Observable<T>).pipe(map(read)), { initialValue: read(control.value) });
  }

  /** Makes `target` required while `condition` holds for the value of `source`. */
  private requireWhen<T>(target: AbstractControl<string>, source: AbstractControl<T>, condition: (value: T) => boolean): void {
    (source.valueChanges as Observable<T>).pipe(takeUntilDestroyed()).subscribe((value) => {
      if (condition(value)) {
        target.addValidators([Validators.required, notBlank]);
      } else {
        target.removeValidators([Validators.required, notBlank]);
      }
      target.updateValueAndValidity();
    });
  }

  /** Moves keyboard focus to the first answer that still needs attention. */
  private focusFirstError(): void {
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid')?.focus(),
    );
  }
}
