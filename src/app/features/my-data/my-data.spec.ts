import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MyData } from '../../core/models/my-data.model';
import { MyDataService } from '../../core/services/my-data.service';
import { testIntake } from '../../../testing/test-data';
import { MyDataPage } from './my-data';

describe('[component] MyDataPage', () => {
  let fixture: ComponentFixture<MyDataPage>;
  let page: HTMLElement;
  let myData: { load: ReturnType<typeof vi.fn>; deleteEverything: ReturnType<typeof vi.fn> };
  let auth: { signOut: ReturnType<typeof vi.fn> };

  const data: MyData = {
    user: { id: 'account-1', name: 'Anna de Vries', email: 'anna@example.com' },
    account: { name: 'Anna de Vries', email: 'anna@example.com', emailVerified: true, createdAt: '2026-11-01T09:00:00Z' },
    privacyConsent: { version: '2026-11-11', acceptedAt: '2026-11-11T10:00:00Z' },
    questions: [
      { question: testIntake(), openedBy: [{ staffName: 'Dr. Jansen', role: 'GP', viewedAt: '2026-11-11T11:00:00Z' }] },
      { question: testIntake({ id: 'question-2', description: 'Cough' }), openedBy: [] },
    ],
  };

  async function render(result: MyData | HttpErrorResponse = data) {
    myData = {
      load: vi.fn().mockReturnValue(result instanceof HttpErrorResponse ? throwError(() => result) : of(result)),
      deleteEverything: vi.fn().mockReturnValue(of(undefined)),
    };
    auth = { signOut: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [MyDataPage],
      providers: [
        { provide: MyDataService, useValue: myData },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MyDataPage);
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  const button = (name: string) =>
    Array.from(page.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === name)!;

  it('shows the details, the permission and every question with who opened it', async () => {
    await render();

    expect(page.textContent).toContain('anna@example.com');
    expect(page.textContent).toContain('Confirmed');
    expect(page.textContent).toContain('11 November 2026');
    expect(page.textContent).toContain('Opened by Dr. Jansen (GP)');
    expect(page.textContent).toContain('Nobody at the practice has opened this question yet.');
  });

  it('explains when the data cannot be loaded', async () => {
    await render(new HttpErrorResponse({ status: 0 }));

    expect(page.querySelector('[role=alert]')?.textContent).toContain('cannot be reached');
  });

  it('downloads everything as one JSON file', async () => {
    await render();
    const createObjectURL = vi.fn().mockReturnValue('blob:my-data');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    button('Download my data').click();

    const file = createObjectURL.mock.calls[0][0] as Blob;
    expect(file.type).toBe('application/json');
    expect(JSON.parse(await file.text()).questions).toHaveLength(2);
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toMatch(/^carebridge-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:my-data');
    click.mockRestore();
  });

  it('does not delete anything before the user confirms', async () => {
    await render();

    button('Delete my account').click();
    await fixture.whenStable();

    expect(myData.deleteEverything).not.toHaveBeenCalled();
    expect(page.querySelector('.error')?.textContent).toContain('Please confirm that you understand this cannot be undone.');
  });

  it('deletes everything after confirming and signs the user out', async () => {
    await render();

    page.querySelector<HTMLInputElement>('#confirm-delete')!.click();
    button('Delete my account').click();
    await fixture.whenStable();

    expect(myData.deleteEverything).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledWith('account-deleted');
  });

  it('explains when deleting fails and keeps the user signed in', async () => {
    await render();
    myData.deleteEverything.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    page.querySelector<HTMLInputElement>('#confirm-delete')!.click();
    button('Delete my account').click();
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('Something went wrong');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
