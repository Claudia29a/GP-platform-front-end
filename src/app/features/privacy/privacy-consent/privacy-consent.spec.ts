import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { PrivacyService } from '../../../core/services/privacy.service';
import { PrivacyConsent } from './privacy-consent';

describe('[component] PrivacyConsent', () => {
  let fixture: ComponentFixture<PrivacyConsent>;
  let page: HTMLElement;
  let auth: { setPrivacyConsentNeeded: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };
  let privacy: { allow: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    auth = { setPrivacyConsentNeeded: vi.fn(), signOut: vi.fn() };
    privacy = { allow: vi.fn().mockReturnValue(of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [PrivacyConsent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PrivacyService, useValue: privacy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PrivacyConsent);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  const button = (name: string) =>
    Array.from(page.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === name)!;

  it('explains what is done with the data and that it is safe', () => {
    expect(page.textContent).toContain('your GP practice can review your question');
    expect(page.textContent).toContain('Your data is safe');
    expect(page.textContent).toContain('encrypted');
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/privacy');
  });

  it('remembers the choice after Allow', async () => {
    button('Allow').click();
    await fixture.whenStable();

    expect(privacy.allow).toHaveBeenCalled();
    expect(auth.setPrivacyConsentNeeded).toHaveBeenCalledWith(false);
  });

  it('stays open and explains when saving the choice fails', async () => {
    privacy.allow.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    button('Allow').click();
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('cannot be reached');
    expect(auth.setPrivacyConsentNeeded).not.toHaveBeenCalled();
  });

  it('signs the patient out after Do not allow, without saving anything', () => {
    button('Do not allow').click();

    expect(auth.signOut).toHaveBeenCalledWith('consent-declined');
    expect(privacy.allow).not.toHaveBeenCalled();
  });

  it('cannot be closed with the Escape key without choosing', () => {
    const cancel = new Event('cancel', { cancelable: true });

    page.querySelector('dialog')!.dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(true);
  });
});
