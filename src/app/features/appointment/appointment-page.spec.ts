import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FreeSlot } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentPage } from './appointment-page';

describe('[component] AppointmentPage', () => {
  let fixture: ComponentFixture<AppointmentPage>;
  let page: HTMLElement;
  let appointments: { free: ReturnType<typeof vi.fn>; book: ReturnType<typeof vi.fn> };

  const slots: FreeSlot[] = [
    { start: '2026-12-01T09:00:00Z', day: 'Tuesday 1 December 2026', time: '10:00' },
    { start: '2026-12-01T09:15:00Z', day: 'Tuesday 1 December 2026', time: '10:15' },
    { start: '2026-12-02T08:00:00Z', day: 'Wednesday 2 December 2026', time: '09:00' },
  ];

  async function render(reply?: string): Promise<void> {
    appointments = {
      free: vi.fn().mockReturnValue(of(slots)),
      book: vi
        .fn()
        .mockReturnValue(
          of({
            id: 'appointment-1',
            questionId: 'question-1',
            start: slots[1].start,
            day: slots[1].day,
            time: '10:15',
            patientName: 'Anna',
          }),
        ),
    };
    await TestBed.configureTestingModule({
      imports: [AppointmentPage],
      providers: [provideRouter([]), { provide: AppointmentService, useValue: appointments }],
    }).compileComponents();
    fixture = TestBed.createComponent(AppointmentPage);
    if (reply) {
      fixture.componentRef.setInput('reply', reply);
    }
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function pick(time: string): Promise<void> {
    Array.from(page.querySelectorAll<HTMLInputElement>('input[type=radio]'))
      .find((radio) => radio.labels?.[0].textContent?.trim() === time)!
      .click();
    await fixture.whenStable();
  }

  async function confirm(): Promise<void> {
    page.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('User story nr 10: without an invitation it explains that the GP invites first', async () => {
    await render();

    expect(page.textContent).toContain('You can make an appointment once your GP has invited you.');
    expect(appointments.free).not.toHaveBeenCalled();
  });

  it('User story nr 10 AC1: shows the free times grouped by day', async () => {
    await render('reply-1');

    expect(Array.from(page.querySelectorAll('.day h2'), (el) => el.textContent?.trim())).toEqual([
      'Tuesday 1 December 2026',
      'Wednesday 2 December 2026',
    ]);
    expect(page.querySelectorAll('.day')[0].querySelectorAll('input[type=radio]')).toHaveLength(2);
  });

  it('User story nr 10 AC2: books the chosen time and goes back to the question', async () => {
    await render('reply-1');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await pick('10:15');
    expect(page.querySelector('.chosen')?.textContent).toContain('Tuesday 1 December 2026 at 10:15');
    await confirm();

    expect(appointments.book).toHaveBeenCalledWith('reply-1', '2026-12-01T09:15:00Z');
    expect(navigate).toHaveBeenCalledWith(['/questions', 'question-1']);
  });

  it('User story nr 10: asks to choose a time before confirming', async () => {
    await render('reply-1');

    await confirm();

    expect(appointments.book).not.toHaveBeenCalled();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('Please choose a time.');
  });

  it('User story nr 10 AC3: a time taken at the same moment shows the reason and fresh free times', async () => {
    await render('reply-1');
    appointments.book.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'This time was just taken. Please choose another.' },
          }),
      ),
    );

    await pick('10:15');
    await confirm();

    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'This time was just taken. Please choose another.',
    );
    expect(appointments.free).toHaveBeenCalledTimes(2);
  });

  it('User story nr 10: says so when no time is free', async () => {
    await render('reply-1');
    appointments.free.mockReturnValue(of([]));
    fixture.componentRef.setInput('reply', 'reply-2');
    await fixture.whenStable();

    expect(page.textContent).toContain('There are no free times in the next two weeks.');
  });

  it('User story nr 10: is honest that CareBridge is a student project', async () => {
    await render('reply-1');

    expect(page.querySelector('.notice')?.textContent).toContain('student project');
  });
});
