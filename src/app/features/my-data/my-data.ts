import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { STATUS_LABELS, areaLabel } from '../../core/models/intake.model';
import { MyData } from '../../core/models/my-data.model';
import { ROLE_LABELS } from '../../core/models/user.model';
import { httpErrorMessage } from '../../core/services/http-error-message';
import { MyDataService } from '../../core/services/my-data.service';

/** "My data": see everything CareBridge stores, take it as a file, or delete it (GDPR Art. 15, 17, 20). */
@Component({
  selector: 'app-my-data',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './my-data.html',
  styleUrl: './my-data.scss',
})
export class MyDataPage implements OnInit {
  private readonly myData = inject(MyDataService);
  private readonly auth = inject(AuthService);

  protected readonly areaLabel = areaLabel;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly data = signal<MyData | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deleting = signal(false);
  protected readonly confirmMissing = signal(false);
  protected readonly confirmed = inject(NonNullableFormBuilder).control(false);
  protected readonly newName = inject(NonNullableFormBuilder).control('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly nameSaved = signal(false);
  protected readonly savingName = signal(false);

  ngOnInit(): void {
    this.myData.load().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(httpErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Correct my name (GDPR Art. 16); only for email accounts, a Google user's name comes from Google. */
  protected async saveName(): Promise<void> {
    const name = this.newName.value.trim();
    this.nameSaved.set(false);
    this.errorMessage.set(null);
    if (!name) {
      this.nameError.set('Please enter your name.');
      return;
    }
    if (name.length > 100) {
      this.nameError.set('Your name can be at most 100 characters.');
      return;
    }
    this.nameError.set(null);
    this.savingName.set(true);
    try {
      await this.myData.rename(name);
      this.data.update((data) => data && { ...data, user: { ...data.user, name }, account: data.account && { ...data.account, name } });
      this.nameSaved.set(true);
    } catch (error) {
      this.errorMessage.set(httpErrorMessage(error));
    } finally {
      this.savingName.set(false);
    }
  }

  protected repliesTo(questionId: string) {
    return this.data()?.replies.filter((reply) => reply.questionId === questionId) ?? [];
  }

  protected download(): void {
    const data = this.data();
    if (!data) {
      return;
    }
    const exportedAt = new Date().toISOString();
    const file = new Blob([JSON.stringify({ exportedAt, ...data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `carebridge-my-data-${exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected deleteEverything(): void {
    if (!this.confirmed.value) {
      this.confirmMissing.set(true);
      return;
    }
    this.confirmMissing.set(false);
    this.deleting.set(true);
    this.errorMessage.set(null);
    this.myData.deleteEverything().subscribe({
      next: () => this.auth.signOut('account-deleted'),
      error: (error) => {
        this.errorMessage.set(httpErrorMessage(error));
        this.deleting.set(false);
      },
    });
  }
}
