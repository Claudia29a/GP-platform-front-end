import { Routes } from '@angular/router';

import { homeGuard, roleGuard, signedInGuard, signedOutGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // Sends each user to their own start page, or to sign-in.
  { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
  {
    path: 'sign-in',
    title: 'Sign in · CareBridge',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./features/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'ask',
    title: 'Ask a question · CareBridge',
    canActivate: [roleGuard('PATIENT')],
    loadComponent: () => import('./features/intakes/intake-form/intake-form').then((m) => m.IntakeForm),
  },
  {
    path: 'questions',
    title: 'Questions · CareBridge',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/intakes/intake-list/intake-list').then((m) => m.IntakeList),
  },
  {
    path: 'questions/:id',
    title: 'Question · CareBridge',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/intakes/intake-detail/intake-detail').then((m) => m.IntakeDetail),
  },
  { path: '**', redirectTo: '' },
];
