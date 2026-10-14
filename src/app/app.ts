import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { ROLE_LABELS } from './core/models/user.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabel = computed(() => {
    const user = this.auth.user();
    return user ? ROLE_LABELS[user.role] : '';
  });

  protected signOut(): void {
    this.auth.signOut();
  }
}
