import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';

import { areaLabel } from '../../core/models/intake.model';
import { QueueItem, scoreLevel } from '../../core/models/queue.model';
import { httpErrorMessage } from '../../core/services/http-error-message';
import { QueueService } from '../../core/services/queue.service';

/** How often the open queue reloads by itself (SAD v2, section 9: polling instead of WebSockets). */
export const REFRESH_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-queue-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, DatePipe, RouterLink],
  templateUrl: './queue-list.html',
  styleUrl: './queue-list.scss',
})
export class QueueList {
  private readonly queueService = inject(QueueService);

  protected readonly items = signal<QueueItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dragging = signal(false);
  protected readonly lastUpdated = signal<Date | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  /** Read out by screen readers after a move. */
  protected readonly announcement = signal('');

  protected readonly areaLabel = areaLabel;
  protected readonly scoreLevel = scoreLevel;

  constructor() {
    this.load();
    interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        // Never reload under someone's hands, and not while the tab is in the background.
        if (!this.saving() && !this.dragging() && !document.hidden) {
          this.load({ quiet: true });
        }
      });
  }

  protected load(options: { quiet?: boolean } = {}): void {
    if (!options.quiet) {
      this.loading.set(true);
      this.errorMessage.set(null);
    }
    this.queueService
      .getQueue()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.lastUpdated.set(new Date());
          this.errorMessage.set(null);
        },
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }

  protected drop(event: CdkDragDrop<QueueItem[]>): void {
    this.dragging.set(false);
    this.move(event.previousIndex, event.currentIndex);
  }

  /** Keyboard and touch alternative to dragging. */
  protected move(from: number, to: number): void {
    const items = this.items();
    if (from === to || to < 0 || to >= items.length || this.saving()) {
      return;
    }
    const reordered = [...items];
    moveItemInArray(reordered, from, to);
    const moved = reordered[to];
    this.items.set(reordered);
    this.save(reordered, `${moved.patientName} moved to position ${to + 1} of ${reordered.length}.`);
  }

  private save(reordered: QueueItem[], announcement: string): void {
    this.saving.set(true);
    this.notice.set(null);
    this.errorMessage.set(null);
    this.queueService
      .saveOrder(reordered.map((item) => item.id))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.items.set(saved);
          this.lastUpdated.set(new Date());
          this.announcement.set(announcement);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.notice.set('The queue changed while you were sorting, so it has been reloaded. Please try again.');
          } else {
            this.errorMessage.set(httpErrorMessage(error));
          }
          this.load({ quiet: true });
        },
      });
  }
}
