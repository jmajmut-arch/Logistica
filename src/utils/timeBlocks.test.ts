import { startOfWeek } from '@/utils/timeBlocks';

describe('startOfWeek', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the Monday of the current week at local midnight', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 14, 15, 30)); // Wednesday, Jan 14 2026
    expect(startOfWeek()).toBe(new Date(2026, 0, 12, 0, 0, 0, 0).getTime());
  });

  it('rolls back to the previous Monday when today is Sunday', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 18, 9, 0)); // Sunday, Jan 18 2026
    expect(startOfWeek()).toBe(new Date(2026, 0, 12, 0, 0, 0, 0).getTime());
  });

  it('returns the same day when today is Monday', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 12, 6, 0));
    expect(startOfWeek()).toBe(new Date(2026, 0, 12, 0, 0, 0, 0).getTime());
  });
});
