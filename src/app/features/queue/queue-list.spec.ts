import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { QueueItem } from '../../core/models/queue.model';
import { QueueService } from '../../core/services/queue.service';
import { QueueList, REFRESH_INTERVAL_MS } from './queue-list';

function item(id: string, position: number, score: number, patientName = `Patient ${id}`): QueueItem {
  return {
    id,
    position,
    severityScore: score,
    patientName,
    complaintArea: 'SKIN',
    complaintAreaOther: null,
    duration: 'ONE_TO_FOUR_WEEKS',
    severity: 4,
    description: `Question ${id}`,
    submittedAt: '2026-10-14T09:00:00Z',
  };
}

describe('QueueList', () => {
  let fixture: ComponentFixture<QueueList>;
  let element: HTMLElement;
  let queueService: { getQueue: ReturnType<typeof vi.fn>; saveOrder: ReturnType<typeof vi.fn> };

  const queue = [item('a', 1, 80, 'Anna'), item('b', 2, 50, 'Bram'), item('c', 3, 20, 'Cem')];

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [QueueList],
      providers: [provideRouter([]), { provide: QueueService, useValue: queueService }],
    }).compileComponents();
    fixture = TestBed.createComponent(QueueList);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    queueService = {
      getQueue: vi.fn().mockReturnValue(of(queue)),
      saveOrder: vi.fn((ids: string[]) =>
        of(ids.map((id, index) => ({ ...queue.find((q) => q.id === id)!, position: index + 1 }))),
      ),
    };
  });

  function patients(): string[] {
    return Array.from(element.querySelectorAll('.patient'), (el) => el.textContent!.trim());
  }

  async function clickButton(label: string): Promise<void> {
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    await fixture.whenStable();
  }

  it('shows the queue in order with each score', async () => {
    await create();

    expect(patients()).toEqual(['Anna', 'Bram', 'Cem']);
    expect(element.querySelector('.score')?.textContent).toContain('Score 80');
    expect(element.querySelector('.score')?.classList).toContain('high');
  });

  it('moves a question down and saves the new order', async () => {
    await create();

    await clickButton('Move Anna down');

    expect(queueService.saveOrder).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(patients()).toEqual(['Bram', 'Anna', 'Cem']);
    expect(element.querySelector('[aria-live]')?.textContent).toContain('Anna moved to position 2 of 3');
  });

  it('cannot move the first question up or the last one down', async () => {
    await create();

    expect(element.querySelector<HTMLButtonElement>('button[aria-label="Move Anna up"]')!.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('button[aria-label="Move Cem down"]')!.disabled).toBe(true);
  });

  it('reloads and explains when the queue changed in the meantime', async () => {
    queueService.saveOrder.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await create();

    await clickButton('Move Anna down');

    expect(queueService.getQueue).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.info')?.textContent).toContain('The queue changed while you were sorting');
    expect(patients()).toEqual(['Anna', 'Bram', 'Cem']);
  });

  it('refreshes by itself every 30 seconds, but not while an order is being saved', async () => {
    // Only the repeating timer is faked; Angular's own scheduling keeps running normally.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      await create();
      expect(queueService.getQueue).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
      expect(queueService.getQueue).toHaveBeenCalledTimes(2);

      const pending = new Subject<QueueItem[]>();
      queueService.saveOrder.mockReturnValue(pending);
      element.querySelector<HTMLButtonElement>('button[aria-label="Move Anna down"]')!.click();
      vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
      expect(queueService.getQueue).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
