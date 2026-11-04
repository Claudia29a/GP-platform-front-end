import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface RuntimeConfig {
  googleClientId: string;
}

/**
 * Settings that differ per environment, read from /config.json when the app starts. They are not
 * built into the code, so one image can move between environments. nginx fills in the values from
 * the environment; during `npm start` they come from public/config.json.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly http = inject(HttpClient);
  private config: RuntimeConfig | null = null;

  async load(): Promise<void> {
    try {
      this.config = await firstValueFrom(this.http.get<RuntimeConfig>('/config.json'));
    } catch {
      this.config = null;
    }
  }

  /** Null when the settings could not be read; the sign-in page then says Google is unavailable. */
  get googleClientId(): string | null {
    return this.config?.googleClientId || null;
  }
}
