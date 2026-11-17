import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ASSISTANT, GP, PATIENT, testIntake } from '../../../../testing/test-data';
import { AuthService } from '../../../core/auth/auth.service';
import { Intake } from '../../../core/models/intake.model';
import { CurrentUser, isStaff } from '../../../core/models/user.model';
import { IntakeService } from '../../../core/services/intake.service';
import { ReplyService } from '../../../core/services/reply.service';
import { IntakeDetail } from './intake-detail';

describe('[component] IntakeDetail', () => {
  let fixture: ComponentFixture<IntakeDetail>;
  let getById: ReturnType<typeof vi.fn>;
  let getAccessLog: ReturnType<typeof vi.fn>;
  let replies: { getReplies: ReturnType<typeof vi.fn>; reply: ReturnType<typeof vi.fn> };

  async function render(user: CurrentUser, result: Intake | HttpErrorResponse) {
    getById = vi.fn().mockReturnValue(result instanceof HttpErrorResponse ? throwError(() => result) : of(result));
    getAccessLog = vi.fn().mockReturnValue(of([{ staffName: 'Sam Bakker', role: 'GP_ASSISTANT', viewedAt: '2026-11-11T10:00:00Z' }]));
    replies = {
      getReplies: vi.fn().mockReturnValue(of([])),
      reply: vi.fn().mockReturnValue(of({ id: 'reply-1', questionId: 'question-1', authorName: 'Dr. Jansen', text: 'Use the cream.', createdAt: '2026-11-17T10:00:00Z' })),
    };
    const current = signal(user);
    await TestBed.configureTestingModule({
      imports: [IntakeDetail],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: { getById, getAccessLog } },
        { provide: ReplyService, useValue: replies },
        { provide: AuthService, useValue: { user: current, isStaff: computed(() => isStaff(current())) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(IntakeDetail);
    fixture.componentRef.setInput('id', 'question-1');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('loads the question from the address and shows every answer', async () => {
    const page = await render(PATIENT, testIntake());
    const text = page.textContent!;

    expect(getById).toHaveBeenCalledWith('question-1');
    expect(page.querySelector('.badge')?.textContent).toBe('In review');
    expect(text).toContain('Skin');
    expect(text).toContain('1–4 weeks');
    expect(text).toContain('4 / 10');
    expect(Array.from(page.querySelectorAll('.tag'), (el) => el.textContent?.trim())).toEqual(['Swelling', 'Rash or itching']);
    expect(text).toContain('Yes: Antihistamine');
    expect(page.querySelector('.description')?.textContent).toContain('Itchy rash on my left arm');
  });

  it('shows staff who asked the question; a patient does not see that row', async () => {
    const staffPage = await render(GP, testIntake());
    expect(staffPage.textContent).toContain('anna@example.com');
    expect(staffPage.querySelector('.back')?.textContent).toContain('Queue');
  });

  it('hides the patient row and links back to My questions for patients', async () => {
    const page = await render(PATIENT, testIntake());

    expect(page.textContent).not.toContain('anna@example.com');
    expect(page.querySelector('.back')?.textContent).toContain('My questions');
  });

  it('says so when no symptoms were ticked and nothing was tried', async () => {
    const page = await render(PATIENT, testIntake({ symptoms: [], takesMedication: false, currentMedication: null }));

    expect(page.textContent).toContain('None ticked');
    expect(Array.from(page.querySelectorAll('.none'), (el) => el.textContent?.trim())).toContain('No');
  });

  it('shows a clear message for a question that does not exist or belongs to someone else', async () => {
    const page = await render(PATIENT, new HttpErrorResponse({ status: 404 }));

    expect(page.querySelector('.alert')?.textContent).toContain('could not be found');
  });

  it('shows the GP who opened the question and when', async () => {
    const page = await render(GP, testIntake());

    expect(getAccessLog).toHaveBeenCalledWith('question-1');
    expect(page.querySelector('.access-log')?.textContent).toContain('Sam Bakker');
    expect(page.querySelector('.access-log')?.textContent).toContain('GP assistant');
  });

  it('shows the access log to nobody but the GP', async () => {
    const assistantPage = await render(ASSISTANT, testIntake());

    expect(getAccessLog).not.toHaveBeenCalled();
    expect(assistantPage.querySelector('.access-log')).toBeNull();
  });

  describe('replies', () => {
    async function write(page: HTMLElement, text: string): Promise<void> {
      const box = page.querySelector<HTMLTextAreaElement>('#reply-text')!;
      box.value = text;
      box.dispatchEvent(new Event('input'));
      page.querySelector<HTMLFormElement>('.reply-form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    }

    it('shows the patient the replies to their question', async () => {
      const page = await renderWithReplies(PATIENT);

      expect(page.querySelector('.replies')?.textContent).toContain('Use the cream twice a day.');
      expect(page.querySelector('.replies')?.textContent).toContain('Dr. Jansen');
      expect(page.querySelector('.reply-form')).toBeNull();
    });

    it('tells the patient when there is no reply yet', async () => {
      const page = await render(PATIENT, testIntake());

      expect(page.querySelector('.replies')?.textContent).toContain('No reply yet.');
    });

    it('lets only the GP reply', async () => {
      expect((await render(GP, testIntake())).querySelector('.reply-form')).not.toBeNull();
      TestBed.resetTestingModule();
      expect((await render(ASSISTANT, testIntake())).querySelector('.reply-form')).toBeNull();
    });

    it('sends the reply, shows it and says the patient gets an email', async () => {
      const page = await render(GP, testIntake());

      await write(page, '  Use the cream. ');

      expect(replies.reply).toHaveBeenCalledWith('question-1', 'Use the cream.');
      expect(page.querySelector('.replies')?.textContent).toContain('Use the cream.');
      expect(page.querySelector('[role=status]')?.textContent).toContain('The patient gets an email');
    });

    it('asks for a reply before sending an empty one', async () => {
      const page = await render(GP, testIntake());

      await write(page, '   ');

      expect(replies.reply).not.toHaveBeenCalled();
      expect(page.querySelector('.reply-error')?.textContent).toContain('Please write a reply.');
    });

    it('explains when sending fails', async () => {
      const page = await render(GP, testIntake());
      replies.reply.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      await write(page, 'Use the cream.');

      expect(page.querySelector('[role=alert]')?.textContent).toContain('cannot be reached');
    });

    async function renderWithReplies(user: CurrentUser): Promise<HTMLElement> {
      const page = await render(user, testIntake());
      replies.getReplies.mockReturnValue(
        of([{ id: 'reply-1', questionId: 'question-1', authorName: 'Dr. Jansen', text: 'Use the cream twice a day.', createdAt: '2026-11-17T10:00:00Z' }]),
      );
      TestBed.resetTestingModule();
      return render2(user, replies.getReplies);
    }

    async function render2(user: CurrentUser, getReplies: ReturnType<typeof vi.fn>): Promise<HTMLElement> {
      getById = vi.fn().mockReturnValue(of(testIntake()));
      getAccessLog = vi.fn().mockReturnValue(of([]));
      replies = { getReplies, reply: vi.fn() };
      const current = signal(user);
      await TestBed.configureTestingModule({
        imports: [IntakeDetail],
        providers: [
          provideRouter([]),
          { provide: IntakeService, useValue: { getById, getAccessLog } },
          { provide: ReplyService, useValue: replies },
          { provide: AuthService, useValue: { user: current, isStaff: computed(() => isStaff(current())) } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(IntakeDetail);
      fixture.componentRef.setInput('id', 'question-1');
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    }
  });
});
