import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GP, PATIENT } from '../testing/test-data';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { CurrentUser, isStaff } from './core/models/user.model';

describe('App (top bar)', () => {
  let signOut: ReturnType<typeof vi.fn>;

  async function render(user: CurrentUser | null) {
    signOut = vi.fn();
    const current = signal(user);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: current, isStaff: computed(() => isStaff(current())), signOut } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const menu = (page: HTMLElement) => Array.from(page.querySelectorAll('nav a'), (a) => a.textContent?.trim());

  it('shows only the brand before signing in', async () => {
    const page = await render(null);

    expect(page.querySelector('nav')).toBeNull();
    expect(page.querySelector('.sign-out')).toBeNull();
  });

  it('shows patients their own menu, name and role', async () => {
    const page = await render(PATIENT);

    expect(menu(page)).toEqual(['Ask a question', 'My questions']);
    expect(page.querySelector('.name')?.textContent).toContain('Anna de Vries');
    expect(page.querySelector('.role')?.textContent).toContain('Patient');
  });

  it('shows practice staff the queue', async () => {
    const page = await render(GP);

    expect(menu(page)).toEqual(['Queue', 'All questions']);
    expect(page.querySelector('.role')?.textContent).toContain('GP');
  });

  it('signs out from the top bar', async () => {
    const page = await render(PATIENT);

    page.querySelector<HTMLButtonElement>('.sign-out')!.click();

    expect(signOut).toHaveBeenCalled();
  });
});
