import { getTruckArrivalStatus } from '@/domain/rules/truckArrivalStatus';

describe('getTruckArrivalStatus', () => {
  it('is unscheduled when there is no planned time', () => {
    expect(getTruckArrivalStatus({ scheduledAt: null, arrivedAt: 1_000 })).toBe('unscheduled');
  });

  it('is on time within the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(getTruckArrivalStatus({ scheduledAt, arrivedAt: scheduledAt + 10 * 60_000 })).toBe(
      'on_time',
    );
    expect(getTruckArrivalStatus({ scheduledAt, arrivedAt: scheduledAt - 10 * 60_000 })).toBe(
      'on_time',
    );
  });

  it('is late past the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(getTruckArrivalStatus({ scheduledAt, arrivedAt: scheduledAt + 16 * 60_000 })).toBe(
      'late',
    );
  });

  it('is early well before the tolerance window', () => {
    const scheduledAt = 1_000_000;
    expect(getTruckArrivalStatus({ scheduledAt, arrivedAt: scheduledAt - 16 * 60_000 })).toBe(
      'early',
    );
  });
});
