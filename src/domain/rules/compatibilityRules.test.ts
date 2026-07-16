import { normalizeClassPair } from '@/domain/rules/compatibilityRules';

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
