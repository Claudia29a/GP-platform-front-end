import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppointmentPage } from './appointment-page';

describe('[component] AppointmentPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [AppointmentPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppointmentPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('User story nr 9: tells the patient how to make an appointment, without any health details', async () => {
    const page = await render();

    expect(page.querySelector('h1')?.textContent).toBe('Make an appointment');
    expect(page.textContent).toContain('Your GP would like to see you');
    expect(page.textContent).toContain('call your GP practice');
  });

  it('User story nr 9: explains that a real practice links its own booking system here', async () => {
    const page = await render();

    expect(page.querySelector('.notice')?.textContent).toContain('student project');
    expect(page.querySelector('.notice')?.textContent).toContain('booking system');
    expect(page.querySelector('a.back')?.getAttribute('href')).toBe('/');
  });
});
