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
    symptoms: ['SWELLING', 'RASH_ITCHING'],
    description: `Question ${id}\nSecond line ${id}`,
    submittedAt: '2026-10-14T09:00:00Z',
  };
}

describe('[component] QueueList', () => {
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

  it('shows the queue in order with each urgency and score', async () => {
    await create();

    expect(patients()).toEqual(['Anna', 'Bram', 'Cem']);
    expect(element.querySelector('.urgency')?.textContent).toContain('High');
    expect(element.querySelector('.urgency')?.textContent).toContain('80');
    expect(element.querySelector('.urgency')?.classList).toContain('high');
  });

  it('User story 8 AC1: shows every question in the same fixed pattern', async () => {
    await create();
    const first = element.querySelector('.queue-item')!;
    const parts = Array.from(first.querySelectorAll('[data-pattern]'), (el) => el.getAttribute('data-pattern'));

    expect(parts).toEqual(['urgency', 'patient', 'waiting', 'where', 'how-long', 'bothers', 'symptoms', 'question']);
    expect(first.querySelector('[data-pattern=where]')?.textContent).toContain('Skin');
    expect(first.querySelector('[data-pattern=how-long]')?.textContent).toContain('1–4 weeks');
    expect(first.querySelector('[data-pattern=bothers]')?.textContent).toContain('Bothers 4/10');
    expect(Array.from(first.querySelectorAll('[data-pattern=symptoms] .tag'), (el) => el.textContent?.trim())).toEqual([
      'Swelling',
      'Rash or itching',
    ]);
    expect(first.querySelector('[data-pattern=waiting]')?.textContent).toMatch(/Waiting \d+ days?/);
  });

  it('User story 8 AC1: shows only the first line of the question', async () => {
    await create();
    const question = element.querySelector('.queue-item [data-pattern=question]')!;

    expect(question.textContent?.trim()).toBe('Question a');
  });

  it('User story 8 AC1: says so when no symptoms were ticked', async () => {
    queueService.getQueue.mockReturnValue(of([{ ...queue[0], symptoms: [] }]));
    await create();

    expect(element.querySelector('[data-pattern=symptoms]')?.textContent).toContain('No symptoms ticked');
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

  it('stops refreshing when the user leaves the queue page', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      await create();
      fixture.destroy();

      vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 3);

      expect(queueService.getQueue).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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
