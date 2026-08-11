import {
  arrivalCompliance,
  cancelledCount,
  combinedCompliance,
  countByStatus,
  executedCount,
  pendingCount,
  scheduleAdherence,
} from '@/domain/rules/dashboardMetrics';

describe('countByStatus', () => {
  it('returns an empty map for no statuses', () => {
    expect(countByStatus([]).size).toBe(0);
  });

  it('counts each status independently', () => {
    const counts = countByStatus(['on_time', 'on_time', 'cancelled', 'pending']);
    expect(counts.get('on_time')).toBe(2);
    expect(counts.get('cancelled')).toBe(1);
    expect(counts.get('pending')).toBe(1);
    expect(counts.get('late')).toBeUndefined();
  });
});

describe('combinedCompliance', () => {
  it('returns null when nothing planned and nothing unplanned', () => {
    expect(combinedCompliance([], 0)).toBeNull();
  });

  it('is the on-time share of the total, including unplanned as extra denominator', () => {
    expect(combinedCompliance(['on_time', 'on_time'], 2)).toBe(50);
  });

  it('counts cancelled, pending and overdue as not on time', () => {
    expect(combinedCompliance(['on_time', 'cancelled', 'pending', 'overdue'], 0)).toBe(25);
  });
});

describe('arrivalCompliance', () => {
  it('returns null when nothing planned', () => {
    expect(arrivalCompliance([])).toBeNull();
  });

  it('counts on_time, late and early as arrived, regardless of punctuality', () => {
    expect(arrivalCompliance(['on_time', 'late', 'early', 'pending'])).toBe(75);
  });

  it('does not count a cancelled trip as arrived', () => {
    expect(arrivalCompliance(['on_time', 'cancelled'])).toBe(50);
  });

  it('is 0 when nothing ever arrived', () => {
    expect(arrivalCompliance(['pending', 'overdue', 'cancelled'])).toBe(0);
  });
});

describe('scheduleAdherence', () => {
  it('returns null when nobody arrived yet', () => {
    expect(scheduleAdherence(['pending', 'overdue', 'cancelled'])).toBeNull();
  });

  it('is the on-time share among only the ones that arrived', () => {
    // 1 on_time out of 2 arrived (late doesn't count as arrived-but-late here, it's the
    // denominator); the pending one must not dilute the ratio since it never arrived.
    expect(scheduleAdherence(['on_time', 'late', 'pending'])).toBe(50);
  });

  it('is 100 when every arrival was on time', () => {
    expect(scheduleAdherence(['on_time', 'on_time'])).toBe(100);
  });
});

describe('executedCount', () => {
  it('sums on_time, late and early', () => {
    const counts = countByStatus(['on_time', 'on_time', 'late', 'early']);
    expect(executedCount(counts)).toBe(4);
  });

  it('does not count a cancelled trip as executed', () => {
    // Regression test: a trip cancelled by the operator has no arrival, so it must never
    // be counted as "ejecutado" just because it also isn't "pendiente".
    const counts = countByStatus(['cancelled']);
    expect(executedCount(counts)).toBe(0);
  });

  it('does not count pending or overdue as executed', () => {
    const counts = countByStatus(['pending', 'overdue']);
    expect(executedCount(counts)).toBe(0);
  });

  it('is 0 for an empty map', () => {
    expect(executedCount(countByStatus([]))).toBe(0);
  });
});

describe('pendingCount', () => {
  it('sums pending and overdue', () => {
    const counts = countByStatus(['pending', 'pending', 'overdue']);
    expect(pendingCount(counts)).toBe(3);
  });

  it('does not count a cancelled trip as pending', () => {
    const counts = countByStatus(['cancelled']);
    expect(pendingCount(counts)).toBe(0);
  });
});

describe('cancelledCount', () => {
  it('counts only cancelled', () => {
    const counts = countByStatus(['cancelled', 'cancelled', 'on_time']);
    expect(cancelledCount(counts)).toBe(2);
  });

  it('is 0 when nothing was cancelled', () => {
    expect(cancelledCount(countByStatus(['on_time', 'pending']))).toBe(0);
  });
});
