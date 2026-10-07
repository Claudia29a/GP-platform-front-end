import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ask' },
  {
    path: 'ask',
    title: 'Ask a question · CareBridge',
    loadComponent: () => import('./features/intakes/intake-form/intake-form').then((m) => m.IntakeForm),
  },
  {
    path: 'intakes',
    title: 'Incoming questions · CareBridge',
    loadComponent: () => import('./features/intakes/intake-list/intake-list').then((m) => m.IntakeList),
  },
  {
    path: 'intakes/:id',
    title: 'Question · CareBridge',
    loadComponent: () => import('./features/intakes/intake-detail/intake-detail').then((m) => m.IntakeDetail),
  },
  { path: '**', redirectTo: 'ask' },
];
