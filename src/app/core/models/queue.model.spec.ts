import { scoreLevel } from './queue.model';

describe('scoreLevel', () => {
  it('groups scores for colouring', () => {
    expect(scoreLevel(100)).toBe('high');
    expect(scoreLevel(60)).toBe('high');
    expect(scoreLevel(59)).toBe('medium');
    expect(scoreLevel(30)).toBe('medium');
    expect(scoreLevel(29)).toBe('low');
    expect(scoreLevel(0)).toBe('low');
  });
});
