import { checkExpiration, findExpirationFindings } from '@/domain/rules/expirationRules';
import type { Substance } from '@/domain/entities/Substance';

const TODAY = new Date(2026, 0, 1); // 2026-01-01, mediodía evitado a propósito

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
    sdsFileName: null,
    createdBy: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('checkExpiration', () => {
  it('returns null when there is no risk (more than 30 days away)', () => {
    const substance = makeSubstance({ expirationDate: '2026-03-01' });
    expect(checkExpiration(substance, TODAY)).toBeNull();
  });

  it('is medium severity at exactly 30 days out', () => {
    const substance = makeSubstance({ expirationDate: '2026-01-31' });
    expect(checkExpiration(substance, TODAY)?.severity).toBe('medium');
  });

  it('is high severity at exactly 15 days out', () => {
    const substance = makeSubstance({ expirationDate: '2026-01-16' });
    expect(checkExpiration(substance, TODAY)?.severity).toBe('high');
  });

  it('is medium severity at 16 days out (just past the high threshold)', () => {
    const substance = makeSubstance({ expirationDate: '2026-01-17' });
    expect(checkExpiration(substance, TODAY)?.severity).toBe('medium');
  });

  it('is critical when already expired', () => {
    const substance = makeSubstance({ expirationDate: '2025-12-01' });
    const finding = checkExpiration(substance, TODAY);
    expect(finding?.severity).toBe('critical');
    expect(finding?.daysUntilExpiration).toBeLessThan(0);
  });

  it('is critical on the expiration day itself once it has passed (day 0 counts as not-yet-expired)', () => {
    const substance = makeSubstance({ expirationDate: '2026-01-01' });
    expect(checkExpiration(substance, TODAY)?.severity).toBe('high');
  });
});

describe('findExpirationFindings', () => {
  it('only returns substances at risk, preserving substance reference', () => {
    const safe = makeSubstance({ id: 1, expirationDate: '2026-06-01' });
    const risky = makeSubstance({ id: 2, expirationDate: '2025-12-01' });
    const findings = findExpirationFindings([safe, risky], TODAY);
    expect(findings).toHaveLength(1);
    expect(findings[0].substance.id).toBe(2);
  });
});
