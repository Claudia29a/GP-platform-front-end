import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';

import { Intake, MAX_DESCRIPTION_LENGTH } from '../../../core/models/intake.model';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { IntakeService } from '../../../core/services/intake.service';

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length === 0 ? { blank: true } : null;
}

@Component({
  selector: 'app-intake-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './intake-form.html',
  styleUrl: './intake-form.scss',
})
export class IntakeForm {
  private readonly intakeService = inject(IntakeService);

  protected readonly maxLength = MAX_DESCRIPTION_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    description: ['', [Validators.required, notBlank, Validators.maxLength(MAX_DESCRIPTION_LENGTH)]],
  });
  protected readonly length = toSignal(
    this.form.controls.description.valueChanges.pipe(map((value) => value.length)),
    { initialValue: 0 },
  );

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitted = signal<Intake | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.intakeService
      .submit(this.form.getRawValue())
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
}
