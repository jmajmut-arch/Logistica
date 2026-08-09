import { findMatchingPlanItem } from '@/domain/rules/planItemMatching';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';

const DAY_START = new Date(2026, 0, 12, 0, 0, 0, 0).getTime();
const DAY_END = DAY_START + 24 * 60 * 60 * 1000;

function makePlanItem(overrides: Partial<TransportPlanItem> = {}): TransportPlanItem {
  return {
    id: 1,
    operationType: 'carga_subida',
    siteId: 1,
    scheduledAt: DAY_START + 9 * 60 * 60 * 1000, // 09:00
    carrier: null,
    reference: null,
    notes: null,
    createdBy: 1,
    createdAt: 0,
    ...overrides,
  };
}

describe('findMatchingPlanItem', () => {
  it('matches a single candidate with the same site, day and block', () => {
    const item = makePlanItem();
    const result = findMatchingPlanItem([item], new Set(), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 9 * 60,
    });
    expect(result).toBe(item);
  });

  it('ignores items from a different site', () => {
    const item = makePlanItem({ siteId: 2 });
    const result = findMatchingPlanItem([item], new Set(), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 9 * 60,
    });
    expect(result).toBeNull();
  });

  it('ignores items outside the given day', () => {
    const item = makePlanItem({ scheduledAt: DAY_END + 60_000 });
    const result = findMatchingPlanItem([item], new Set(), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 0,
    });
    expect(result).toBeNull();
  });

  it('ignores items already matched to another arrival', () => {
    const item = makePlanItem({ id: 5 });
    const result = findMatchingPlanItem([item], new Set([5]), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 9 * 60,
    });
    expect(result).toBeNull();
  });

  it('does not match a different time block', () => {
    const item = makePlanItem();
    const result = findMatchingPlanItem([item], new Set(), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 10 * 60,
    });
    expect(result).toBeNull();
  });

  it('returns null when more than one candidate matches (ambiguous)', () => {
    const items = [makePlanItem({ id: 1 }), makePlanItem({ id: 2 })];
    const result = findMatchingPlanItem(items, new Set(), {
      siteId: 1,
      dayStart: DAY_START,
      dayEnd: DAY_END,
      blockMinutes: 9 * 60,
    });
    expect(result).toBeNull();
  });
});
