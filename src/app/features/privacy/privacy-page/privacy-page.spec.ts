import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GP, PATIENT } from '../../../../testing/test-data';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentUser } from '../../../core/models/user.model';
import { PrivacyService } from '../../../core/services/privacy.service';
import { PrivacyPage } from './privacy-page';

describe('[component] PrivacyPage', () => {
  let fixture: ComponentFixture<PrivacyPage>;
  let page: HTMLElement;
  let auth: { user: ReturnType<typeof signal<CurrentUser | null>>; setPrivacyConsentNeeded: ReturnType<typeof vi.fn> };
  let privacy: { withdraw: ReturnType<typeof vi.fn> };

  async function render(user: CurrentUser | null) {
    auth = { user: signal(user), setPrivacyConsentNeeded: vi.fn() };
    privacy = { withdraw: vi.fn().mockReturnValue(of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [PrivacyPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: PrivacyService, useValue: privacy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PrivacyPage);
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  const withdrawButton = () => page.querySelector<HTMLButtonElement>('button');

  it('tells everyone what is stored, why, who sees it and how long', async () => {
    await render(null);

    for (const heading of ['What we store', 'Why we need it', 'Who can see it', 'How your data is protected', 'How long we keep it', 'Your rights']) {
      expect(page.textContent).toContain(heading);
    }
  });

  it('offers withdrawing only to a patient who allowed it', async () => {
    await render(PATIENT);
    expect(withdrawButton()?.textContent).toContain('Withdraw my permission');
  });

  it('offers nothing to withdraw to someone who is not signed in', async () => {
    await render(null);
    expect(withdrawButton()).toBeNull();
  });

  it('offers nothing to withdraw to staff', async () => {
    await render(GP);
    expect(withdrawButton()).toBeNull();
  });

  it('asks the patient again after withdrawing', async () => {
    await render(PATIENT);

    withdrawButton()!.click();
    await fixture.whenStable();

    expect(privacy.withdraw).toHaveBeenCalled();
    expect(auth.setPrivacyConsentNeeded).toHaveBeenCalledWith(true);
  });

  it('explains when withdrawing fails', async () => {
    await render(PATIENT);
    privacy.withdraw.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    withdrawButton()!.click();
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('Something went wrong');
    expect(auth.setPrivacyConsentNeeded).not.toHaveBeenCalled();
  });
});
