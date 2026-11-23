import { firstLine, scoreLevel, urgencyLabel, waitingLabel, waitingTime } from './queue.model';

describe('[unit] scoreLevel', () => {
  it('groups scores for colouring', () => {
    expect(scoreLevel(100)).toBe('high');
    expect(scoreLevel(60)).toBe('high');
    expect(scoreLevel(59)).toBe('medium');
    expect(scoreLevel(30)).toBe('medium');
    expect(scoreLevel(29)).toBe('low');
    expect(scoreLevel(0)).toBe('low');
  });
});

describe('[unit] User story 8: the fixed pattern', () => {
  it('names the urgency from the score, using the same groups as the colours', () => {
    expect(urgencyLabel(84)).toBe('High');
    expect(urgencyLabel(44)).toBe('Medium');
    expect(urgencyLabel(10)).toBe('Low');
  });

  it('says how long a question has been waiting, in the largest whole unit', () => {
    const now = new Date('2026-11-23T12:00:00Z');

    expect(waitingLabel('2026-11-23T11:59:40Z', now)).toBe('Waiting under a minute');
    expect(waitingLabel('2026-11-23T11:45:00Z', now)).toBe('Waiting 15 min');
    expect(waitingLabel('2026-11-23T09:00:00Z', now)).toBe('Waiting 3 h');
    expect(waitingLabel('2026-11-22T12:00:00Z', now)).toBe('Waiting 1 day');
    expect(waitingLabel('2026-11-20T08:00:00Z', now)).toBe('Waiting 3 days');
  });

  it('gives the bare waiting time for the question page', () => {
    expect(waitingTime('2026-11-23T09:00:00Z', new Date('2026-11-23T12:00:00Z'))).toBe('3 h');
  });

  it('never shows a negative waiting time when the clocks differ a little', () => {
    expect(waitingLabel('2026-11-23T12:00:05Z', new Date('2026-11-23T12:00:00Z'))).toBe(
      'Waiting under a minute',
    );
  });

  it('keeps only the first line of a question', () => {
    expect(firstLine('My arm itches.\nIt started last week.\n\nShould I come in?')).toBe(
      'My arm itches.',
    );
    expect(firstLine('\n  Only one line  ')).toBe('Only one line');
  });
});
