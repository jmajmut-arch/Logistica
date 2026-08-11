import { getCompliancePercentage, getDisplayStatus, getPlanItemStatus } from '@/domain/rules/complianceStatus';

describe('getPlanItemStatus', () => {
  it('is pending when there is no arrival yet', () => {
    expect(getPlanItemStatus({ scheduledAt: 1_000_000, hasNoSchedule: false }, undefined)).toBe(
      'pending',
    );
  });

  it('is on time within the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt, hasNoSchedule: false }, { arrivedAt: scheduledAt + 10 * 60_000 }),
    ).toBe('on_time');
    expect(
      getPlanItemStatus({ scheduledAt, hasNoSchedule: false }, { arrivedAt: scheduledAt - 10 * 60_000 }),
    ).toBe('on_time');
  });

  it('is late past the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt, hasNoSchedule: false }, { arrivedAt: scheduledAt + 16 * 60_000 }),
    ).toBe('late');
  });

  it('is early well before the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt, hasNoSchedule: false }, { arrivedAt: scheduledAt - 16 * 60_000 }),
    ).toBe('early');
  });

  it('is on time regardless of the hour when the item has no schedule', () => {
    const scheduledAt = 1_000_000;
    expect(
      getPlanItemStatus({ scheduledAt, hasNoSchedule: true }, { arrivedAt: scheduledAt + 5 * 60 * 60_000 }),
    ).toBe('on_time');
  });

  it('is pending (not on time) when there is no arrival, even with no schedule', () => {
    expect(getPlanItemStatus({ scheduledAt: 1_000_000, hasNoSchedule: true }, undefined)).toBe(
      'pending',
    );
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
    expect(
      getDisplayStatus({ scheduledAt, hasNoSchedule: false }, undefined, scheduledAt + 60_000),
    ).toBe('overdue');
  });

  it('is pending when not yet due', () => {
    expect(
      getDisplayStatus({ scheduledAt, hasNoSchedule: false }, undefined, scheduledAt - 60_000),
    ).toBe('pending');
  });

  it('passes through resolved statuses unchanged regardless of now', () => {
    expect(
      getDisplayStatus({ scheduledAt, hasNoSchedule: false }, { arrivedAt: scheduledAt }, scheduledAt + 60_000),
    ).toBe('on_time');
  });

  it('never becomes overdue when the item has no schedule, no matter how much time passed', () => {
    expect(
      getDisplayStatus({ scheduledAt, hasNoSchedule: true }, undefined, scheduledAt + 10 * 24 * 60 * 60_000),
    ).toBe('pending');
  });

  it('is cancelled when the operator marked it as such, even if overdue', () => {
    expect(
      getDisplayStatus(
        { scheduledAt, hasNoSchedule: false, cancelledByOperator: true },
        undefined,
        scheduledAt + 60_000,
      ),
    ).toBe('cancelled');
  });

  it('passes through resolved statuses even when cancelledByOperator is set', () => {
    expect(
      getDisplayStatus(
        { scheduledAt, hasNoSchedule: false, cancelledByOperator: true },
        { arrivedAt: scheduledAt },
        scheduledAt + 60_000,
      ),
    ).toBe('on_time');
  });
});
