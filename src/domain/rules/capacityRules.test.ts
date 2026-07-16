import {
  checkCapacity,
  findCapacityFindings,
  sumQuantityByZoneAndClass,
  type ZoneClassTotal,
} from '@/domain/rules/capacityRules';
import type { Substance } from '@/domain/entities/Substance';
import type { ZoneClassLimit } from '@/domain/entities/Zone';

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

function makeLimit(overrides: Partial<ZoneClassLimit> = {}): ZoneClassLimit {
  return {
    id: 1,
    zoneId: 1,
    hazardClass: 'class8_corrosives',
    maxQuantity: 100,
    unit: 'l',
    ...overrides,
  };
}

describe('sumQuantityByZoneAndClass', () => {
  it('sums quantities for the same zone+class and keeps other combinations separate', () => {
    const substances = [
      makeSubstance({ zoneId: 1, hazardClass: 'class8_corrosives', quantity: 10 }),
      makeSubstance({ zoneId: 1, hazardClass: 'class8_corrosives', quantity: 15 }),
      makeSubstance({ zoneId: 1, hazardClass: 'class3_flammable_liquids', quantity: 5 }),
      makeSubstance({ zoneId: 2, hazardClass: 'class8_corrosives', quantity: 7 }),
    ];

    const totals = sumQuantityByZoneAndClass(substances);

    expect(totals).toEqual(
      expect.arrayContaining<ZoneClassTotal>([
        { zoneId: 1, hazardClass: 'class8_corrosives', totalQuantity: 25 },
        { zoneId: 1, hazardClass: 'class3_flammable_liquids', totalQuantity: 5 },
        { zoneId: 2, hazardClass: 'class8_corrosives', totalQuantity: 7 },
      ]),
    );
    expect(totals).toHaveLength(3);
  });
});

describe('checkCapacity', () => {
  it('returns null when at or under the limit', () => {
    const total: ZoneClassTotal = {
      zoneId: 1,
      hazardClass: 'class8_corrosives',
      totalQuantity: 100,
    };
    expect(checkCapacity(total, makeLimit({ maxQuantity: 100 }))).toBeNull();
  });

  it('is medium severity for a small overage', () => {
    const total: ZoneClassTotal = {
      zoneId: 1,
      hazardClass: 'class8_corrosives',
      totalQuantity: 110,
    };
    expect(checkCapacity(total, makeLimit({ maxQuantity: 100 }))?.severity).toBe('medium');
  });

  it('is high severity at exactly the 25% overage threshold', () => {
    const total: ZoneClassTotal = {
      zoneId: 1,
      hazardClass: 'class8_corrosives',
      totalQuantity: 125,
    };
    expect(checkCapacity(total, makeLimit({ maxQuantity: 100 }))?.severity).toBe('high');
  });

  it('is critical at exactly the 50% overage threshold', () => {
    const total: ZoneClassTotal = {
      zoneId: 1,
      hazardClass: 'class8_corrosives',
      totalQuantity: 150,
    };
    expect(checkCapacity(total, makeLimit({ maxQuantity: 100 }))?.severity).toBe('critical');
  });
});

describe('findCapacityFindings', () => {
  it('skips zone+class combinations without a configured limit', () => {
    const totals: ZoneClassTotal[] = [
      { zoneId: 1, hazardClass: 'class3_flammable_liquids', totalQuantity: 999 },
    ];
    expect(findCapacityFindings(totals, [makeLimit({ hazardClass: 'class8_corrosives' })])).toEqual(
      [],
    );
  });
});
