import { getPlanItemStatus } from '@/domain/rules/complianceStatus';

describe('getPlanItemStatus', () => {
  it('is pending when there is no arrival yet', () => {
    expect(getPlanItemStatus({ scheduledAt: 1_000_000 }, undefined)).toBe('pending');
  });

  it('is on time within the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt }, { arrivedAt: scheduledAt + 10 * 60_000 }),
    ).toBe('on_time');
    expect(
      getPlanItemStatus({ scheduledAt }, { arrivedAt: scheduledAt - 10 * 60_000 }),
    ).toBe('on_time');
  });

  it('is late past the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt }, { arrivedAt: scheduledAt + 16 * 60_000 }),
    ).toBe('late');
  });

  it('is early well before the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt }, { arrivedAt: scheduledAt - 16 * 60_000 }),
    ).toBe('early');
  });
});
