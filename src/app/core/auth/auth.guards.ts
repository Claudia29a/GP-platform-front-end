import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

/** Pages that need a signed-in user whose email address is confirmed. */
export const signedInGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  const router = inject(Router);
  if (!user) {
    return router.createUrlTree(['/sign-in']);
  }
  return user.emailVerified || router.createUrlTree(['/verify-email']);
};

/** The code screen is only for a signed-in user whose address still has to be confirmed. */
export const verifyEmailGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  const router = inject(Router);
  if (!user) {
    return router.createUrlTree(['/sign-in']);
  }
  return !user.emailVerified || router.createUrlTree(['/']);
};

/** The sign-in page is only for users who are not signed in yet. */
export const signedOutGuard: CanActivateFn = () =>
  !inject(AuthService).isSignedIn() || inject(Router).createUrlTree(['/']);

/** Pages for some roles only; others go to their own start page. The back-end checks the same rules. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const user = inject(AuthService).user();
    const router = inject(Router);
    if (!user) {
      return router.createUrlTree(['/sign-in']);
    }
    if (!user.emailVerified) {
      return router.createUrlTree(['/verify-email']);
    }
    return roles.includes(user.role) || router.createUrlTree(['/']);
  };
}

/** The start page depends on the role: patients ask a question, practice staff see the queue. */
export const homeGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  const router = inject(Router);
  if (!user) {
    return router.createUrlTree(['/sign-in']);
  }
  if (!user.emailVerified) {
    return router.createUrlTree(['/verify-email']);
  }
  return router.createUrlTree([user.role === 'PATIENT' ? '/ask' : '/queue']);
};
