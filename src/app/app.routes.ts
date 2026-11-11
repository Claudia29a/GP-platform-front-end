import { Routes } from '@angular/router';

import { homeGuard, roleGuard, signedInGuard, signedOutGuard, verifyEmailGuard } from './core/auth/auth.guards';

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
    path: 'verify-email',
    title: 'Confirm your email · CareBridge',
    canActivate: [verifyEmailGuard],
    loadComponent: () => import('./features/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'ask',
    title: 'Ask a question · CareBridge',
    canActivate: [roleGuard('PATIENT')],
    loadComponent: () => import('./features/intakes/intake-form/intake-form').then((m) => m.IntakeForm),
  },
  {
    path: 'queue',
    title: 'Queue · CareBridge',
    canActivate: [roleGuard('GP_ASSISTANT', 'GP')],
    loadComponent: () => import('./features/queue/queue-list').then((m) => m.QueueList),
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
  {
    path: 'my-data',
    title: 'My data · CareBridge',
    canActivate: [roleGuard('PATIENT')],
    loadComponent: () => import('./features/my-data/my-data').then((m) => m.MyDataPage),
  },
  {
    path: 'privacy',
    title: 'Privacy · CareBridge',
    loadComponent: () => import('./features/privacy/privacy-page/privacy-page').then((m) => m.PrivacyPage),
  },
  { path: '**', redirectTo: '' },
];
