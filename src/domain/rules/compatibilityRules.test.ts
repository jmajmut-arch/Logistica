import {
  findIncompatibilities,
  findIncompatibilitiesInZone,
  normalizeClassPair,
} from '@/domain/rules/compatibilityRules';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import type { HazardClass } from '@/types/enums';

describe('normalizeClassPair', () => {
  it('returns the same order for pairs already sorted', () => {
    expect(normalizeClassPair('class3_flammable_liquids', 'class5_oxidizers')).toEqual([
      'class3_flammable_liquids',
      'class5_oxidizers',
    ]);
  });

  it('swaps the order so (A, B) and (B, A) normalize to the same pair', () => {
    const ab = normalizeClassPair('class5_oxidizers', 'class3_flammable_liquids');
    const ba = normalizeClassPair('class3_flammable_liquids', 'class5_oxidizers');
    expect(ab).toEqual(ba);
  });
});

function makeRule(overrides: Partial<CompatibilityRule> = {}): CompatibilityRule {
  return {
    id: 1,
    classA: 'class3_flammable_liquids',
    classB: 'class5_oxidizers',
    status: 'incompatible',
    ...overrides,
  };
}

describe('findIncompatibilitiesInZone', () => {
  it('flags a pair explicitly marked incompatible', () => {
    const findings = findIncompatibilitiesInZone(
      1,
      ['class3_flammable_liquids', 'class5_oxidizers'],
      [makeRule()],
    );
    expect(findings).toEqual([
      { zoneId: 1, classA: 'class3_flammable_liquids', classB: 'class5_oxidizers' },
    ]);
  });

  it('does not flag a pair explicitly marked compatible', () => {
    const findings = findIncompatibilitiesInZone(
      1,
      ['class3_flammable_liquids', 'class5_oxidizers'],
      [makeRule({ status: 'compatible' })],
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a pair with no configured rule at all', () => {
    const findings = findIncompatibilitiesInZone(
      1,
      ['class3_flammable_liquids', 'class9_misc'],
      [makeRule()],
    );
    expect(findings).toEqual([]);
  });

  it('detects the rule regardless of the order classes are found in the zone', () => {
    const findings = findIncompatibilitiesInZone(
      1,
      ['class5_oxidizers', 'class3_flammable_liquids'],
      [makeRule()],
    );
    expect(findings).toHaveLength(1);
  });

  it('ignores duplicate occurrences of the same class in a zone', () => {
    const findings = findIncompatibilitiesInZone(
      1,
      ['class3_flammable_liquids', 'class3_flammable_liquids'],
      [makeRule()],
    );
    expect(findings).toEqual([]);
  });
});

describe('findIncompatibilities', () => {
  it('checks each zone independently', () => {
    const hazardClassesByZone = new Map<number, HazardClass[]>([
      [1, ['class3_flammable_liquids', 'class5_oxidizers']],
      [2, ['class9_misc']],
    ]);
    const findings = findIncompatibilities(hazardClassesByZone, [makeRule()]);
    expect(findings).toEqual([
      { zoneId: 1, classA: 'class3_flammable_liquids', classB: 'class5_oxidizers' },
    ]);
  });
});
