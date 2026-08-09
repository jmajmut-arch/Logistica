import { getCompliancePercentage, getDisplayStatus, getPlanItemStatus } from '@/domain/rules/complianceStatus';

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

describe('getCompliancePercentage', () => {
  it('returns null when there is nothing planned', () => {
    expect(getCompliancePercentage([])).toBeNull();
  });

  it('counts every non-arrived item against compliance, pending or not', () => {
    expect(getCompliancePercentage(['pending', 'pending'])).toBe(0);
    expect(getCompliancePercentage(['on_time', 'pending'])).toBe(50);
  });

  it('rounds to the nearest percent', () => {
    expect(getCompliancePercentage(['on_time', 'late', 'early'])).toBe(33);
  });

  it('is 0 when nothing planned was on time', () => {
    expect(getCompliancePercentage(['late', 'early'])).toBe(0);
  });

  it('counts overdue against compliance same as pending', () => {
    expect(getCompliancePercentage(['on_time', 'overdue'])).toBe(50);
    expect(getCompliancePercentage(['overdue'])).toBe(0);
  });
});

describe('getDisplayStatus', () => {
  const scheduledAt = 1_000_000;

  it('is overdue when pending and the scheduled time already passed', () => {
    expect(getDisplayStatus({ scheduledAt }, undefined, scheduledAt + 60_000)).toBe('overdue');
  });

  it('is pending when not yet due', () => {
    expect(getDisplayStatus({ scheduledAt }, undefined, scheduledAt - 60_000)).toBe('pending');
  });

  it('passes through resolved statuses unchanged regardless of now', () => {
    expect(
      getDisplayStatus({ scheduledAt }, { arrivedAt: scheduledAt }, scheduledAt + 60_000),
    ).toBe('on_time');
  });
});
