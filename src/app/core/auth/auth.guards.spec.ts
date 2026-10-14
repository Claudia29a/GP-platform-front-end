import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { CurrentUser, Role } from '../models/user.model';
import { homeGuard, roleGuard, signedInGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const user = signal<CurrentUser | null>(null);

  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { user, isSignedIn: () => user() !== null } }],
    });
  });

  function signInAs(role: Role): void {
    user.set({ id: 'id', name: 'Name', email: 'name@example.com', role });
  }

  function run(guard: CanActivateFn): boolean | string {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }

  it('sends visitors who are not signed in to the sign-in page', () => {
    expect(run(signedInGuard)).toBe('/sign-in');
    expect(run(homeGuard)).toBe('/sign-in');
  });

  it('starts patients on the question form and staff on the queue', () => {
    signInAs('PATIENT');
    expect(run(homeGuard)).toBe('/ask');

    signInAs('GP_ASSISTANT');
    expect(run(homeGuard)).toBe('/queue');

    signInAs('GP');
    expect(run(homeGuard)).toBe('/queue');
  });

  it('keeps patients away from the queue', () => {
    signInAs('PATIENT');
    expect(run(roleGuard('GP_ASSISTANT', 'GP'))).toBe('/');

    signInAs('GP_ASSISTANT');
    expect(run(roleGuard('GP_ASSISTANT', 'GP'))).toBe(true);
  });

  it('keeps staff away from the patient form', () => {
    signInAs('GP');
    expect(run(roleGuard('PATIENT'))).toBe('/');

    signInAs('PATIENT');
    expect(run(roleGuard('PATIENT'))).toBe(true);
  });
});
