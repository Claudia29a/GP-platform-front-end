import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { GoogleIdentityService } from './google-identity.service';

describe('GoogleIdentityService', () => {
  let service: GoogleIdentityService;
  let accountsId: {
    initialize: ReturnType<typeof vi.fn>;
    renderButton: ReturnType<typeof vi.fn>;
    disableAutoSelect: ReturnType<typeof vi.fn>;
  };

  /** Puts a fake Google Identity Services object on the page, as Google's script would. */
  function installGoogle(): void {
    (window as unknown as { google: unknown }).google = { accounts: { id: accountsId } };
  }

  beforeEach(() => {
    accountsId = { initialize: vi.fn(), renderButton: vi.fn(), disableAutoSelect: vi.fn() };
    service = TestBed.inject(GoogleIdentityService);
  });

  afterEach(() => {
    delete window.google;
    document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((script) => script.remove());
  });

  it('shows the button for the CareBridge client and hands over the token after sign-in', async () => {
    installGoogle();
    const onSignIn = vi.fn();
    const parent = document.createElement('div');

    await service.renderButton(parent, onSignIn);

    expect(accountsId.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: environment.googleClientId }));
    expect(accountsId.renderButton).toHaveBeenCalledWith(parent, expect.objectContaining({ locale: 'en' }));

    const { callback } = accountsId.initialize.mock.calls[0][0];
    callback({ credential: 'the-id-token' });
    expect(onSignIn).toHaveBeenCalledWith('the-id-token');
  });

  it("loads Google's script once when it is not on the page yet", async () => {
    const shown = service.renderButton(document.createElement('div'), vi.fn());

    const scripts = document.head.querySelectorAll<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client?hl=en"]');
    expect(scripts).toHaveLength(1);
    installGoogle();
    scripts[0].onload!(new Event('load'));
    await shown;

    expect(accountsId.renderButton).toHaveBeenCalled();
  });

  it('reports when the script cannot be loaded, so the page can show an error', async () => {
    const shown = service.renderButton(document.createElement('div'), vi.fn());

    document.head.querySelector<HTMLScriptElement>('script[src*="accounts.google.com"]')!.onerror!(new Event('error'));

    await expect(shown).rejects.toThrow('Google sign-in could not be loaded');
  });

  it('turns off automatic sign-in after signing out', () => {
    installGoogle();

    service.disableAutoSelect();

    expect(accountsId.disableAutoSelect).toHaveBeenCalled();
  });

  it('does nothing on sign-out when Google was never loaded', () => {
    expect(() => service.disableAutoSelect()).not.toThrow();
  });
});
