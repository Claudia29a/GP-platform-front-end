import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentsList, today } from './appointments-list';

describe('[component] AppointmentsList', () => {
  let fixture: ComponentFixture<AppointmentsList>;
  let page: HTMLElement;
  let onDay: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    onDay = vi
      .fn()
      .mockReturnValue(
        of([
          {
            id: 'a1',
            questionId: 'question-1',
            start: '2026-12-01T09:00:00Z',
            day: 'Tuesday 1 December 2026',
            time: '10:00',
            patientName: 'Anna de Vries',
          },
        ]),
      );
    await TestBed.configureTestingModule({
      imports: [AppointmentsList],
      providers: [provideRouter([]), { provide: AppointmentService, useValue: { onDay } }],
    }).compileComponents();
    fixture = TestBed.createComponent(AppointmentsList);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  it("User story nr 10 AC6: starts with today's appointments, with time, patient and a link to the question", () => {
    expect(onDay).toHaveBeenCalledWith(today());
    const row = page.querySelector('.appointment')!;
    expect(row.textContent).toContain('10:00');
    expect(row.textContent).toContain('Anna de Vries');
    expect(row.querySelector('a')?.getAttribute('href')).toBe('/questions/question-1');
  });

  it('User story nr 10 AC6: shows another day when the date changes', async () => {
    onDay.mockReturnValue(of([]));
    const date = page.querySelector<HTMLInputElement>('input[type=date]')!;
    date.value = '2026-12-02';
    date.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(onDay).toHaveBeenLastCalledWith('2026-12-02');
    expect(page.textContent).toContain('No appointments on this day.');
  });

  it('User story nr 10: today is the date of this computer', () => {
    expect(today(new Date(2026, 11, 1, 23, 30))).toBe('2026-12-01');
  });
});
