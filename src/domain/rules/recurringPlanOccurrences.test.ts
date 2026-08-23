import { computeUpcomingScheduledDates } from '@/domain/rules/recurringPlanOccurrences';

describe('computeUpcomingScheduledDates', () => {
  it('generates one date per week from this week through the horizon, inclusive', () => {
    // Lunes 12 de enero de 2026, 09:00 — el bloque de las 10:00 de hoy todavía no pasó.
    const now = new Date(2026, 0, 12, 9, 0, 0, 0).getTime();
    // Lunes (0) a las 10:00 (600 minutos).
    const dates = computeUpcomingScheduledDates(0, 600, now, 3);

    expect(dates).toHaveLength(4); // semana actual + 3 más
    for (const date of dates) {
      const d = new Date(date);
      expect(d.getDay()).toBe(1); // lunes
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(0);
    }
    // Deben ser lunes consecutivos, una semana de diferencia.
    expect(dates[1] - dates[0]).toBe(7 * 24 * 60 * 60 * 1000);
    expect(dates[2] - dates[1]).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('skips this week when the target day already fully passed', () => {
    // Viernes 16 de enero de 2026 — el lunes de esa semana (12 de enero) ya pasó.
    const now = new Date(2026, 0, 16, 9, 0, 0, 0).getTime();
    const dates = computeUpcomingScheduledDates(0, 600, now, 1);

    // Solo debería quedar el lunes de la semana siguiente.
    expect(dates).toHaveLength(1);
    expect(new Date(dates[0]).getDate()).toBe(19);
  });

  it('includes today even if the scheduled time of day already passed', () => {
    // Lunes 12 de enero de 2026, 23:00 — mucho después del bloque de las 10:00.
    const now = new Date(2026, 0, 12, 23, 0, 0, 0).getTime();
    const dates = computeUpcomingScheduledDates(0, 600, now, 0);

    expect(dates).toHaveLength(1);
    expect(new Date(dates[0]).getDate()).toBe(12);
  });
});
