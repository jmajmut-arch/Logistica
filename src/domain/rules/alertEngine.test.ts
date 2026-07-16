import { computeAlerts } from '@/domain/rules/alertEngine';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import type { Substance } from '@/domain/entities/Substance';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';

const TODAY = new Date(2026, 0, 1);

function makeSubstance(overrides: Partial<Substance> = {}): Substance {
  return {
    id: 1,
    name: 'Ácido sulfúrico',
    hazardClass: 'class8_corrosives',
    quantity: 10,
    unit: 'l',
    zoneId: 1,
    expirationDate: '2026-06-01',
    sdsUri: null,
    createdBy: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const ZONES: Zone[] = [{ id: 1, name: 'Rack A1', code: 'A1' }];

describe('computeAlerts', () => {
  it('returns no candidates for a substance well within all thresholds', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance()],
      zones: ZONES,
      zoneClassLimits: [
        { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 100, unit: 'l' },
      ],
      compatibilityRules: [],
      today: TODAY,
    });
    expect(alerts).toEqual([]);
  });

  it('produces an expiration candidate identifying the substance by name and id', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance({ id: 5, name: 'Ácido sulfúrico', expirationDate: '2025-12-01' })],
      zones: ZONES,
      zoneClassLimits: [],
      compatibilityRules: [],
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'expiration',
        severity: 'critical',
        relatedSubstanceId: 5,
        relatedZoneId: 1,
      }),
    ]);
    expect(alerts[0].message).toContain('Ácido sulfúrico');
  });

  it('produces a limit_exceeded candidate aggregating quantities across substances', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance({ id: 1, quantity: 60 }), makeSubstance({ id: 2, quantity: 60 })],
      zones: ZONES,
      zoneClassLimits: [
        { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 100, unit: 'l' },
      ],
      compatibilityRules: [],
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'limit_exceeded',
        severity: 'medium',
        relatedSubstanceId: null,
        relatedZoneId: 1,
      }),
    ]);
  });

  it('produces a critical incompatibility candidate for co-located incompatible classes', () => {
    const rules: CompatibilityRule[] = [
      {
        id: 1,
        classA: 'class3_flammable_liquids',
        classB: 'class8_corrosives',
        status: 'incompatible',
      },
    ];
    const alerts = computeAlerts({
      substances: [
        makeSubstance({ id: 1, hazardClass: 'class8_corrosives' }),
        makeSubstance({ id: 2, hazardClass: 'class3_flammable_liquids' }),
      ],
      zones: ZONES,
      zoneClassLimits: [],
      compatibilityRules: rules,
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'incompatibility',
        severity: 'critical',
        relatedSubstanceId: null,
        relatedZoneId: 1,
      }),
    ]);
  });

  it('combines findings from all three rule types in a single pass', () => {
    const limits: ZoneClassLimit[] = [
      { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 10, unit: 'l' },
    ];
    const rules: CompatibilityRule[] = [
      {
        id: 1,
        classA: 'class3_flammable_liquids',
        classB: 'class8_corrosives',
        status: 'incompatible',
      },
    ];
    const alerts = computeAlerts({
      substances: [
        makeSubstance({
          id: 1,
          hazardClass: 'class8_corrosives',
          quantity: 20,
          expirationDate: '2025-12-01',
        }),
        makeSubstance({ id: 2, hazardClass: 'class3_flammable_liquids', quantity: 1 }),
      ],
      zones: ZONES,
      zoneClassLimits: limits,
      compatibilityRules: rules,
      today: TODAY,
    });

    expect(alerts.map((alert) => alert.type).sort()).toEqual([
      'expiration',
      'incompatibility',
      'limit_exceeded',
    ]);
  });
});
