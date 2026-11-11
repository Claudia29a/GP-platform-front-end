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
