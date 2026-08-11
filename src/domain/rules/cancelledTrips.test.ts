import { splitCancelledByOperator } from '@/domain/rules/cancelledTrips';

type Item = { id: number; cancelledByOperator: boolean; cancelledAt: number | null };

function item(id: number, cancelledByOperator: boolean, cancelledAt: number | null = null): Item {
  return { id, cancelledByOperator, cancelledAt };
}

describe('splitCancelledByOperator', () => {
  it('returns empty lists for no items', () => {
    expect(splitCancelledByOperator([])).toEqual({ pending: [], cancelled: [] });
  });

  it('keeps non-cancelled items in pending, in their original order', () => {
    const items = [item(1, false), item(2, false)];
    const { pending, cancelled } = splitCancelledByOperator(items);
    expect(pending.map((i) => i.id)).toEqual([1, 2]);
    expect(cancelled).toEqual([]);
  });

  it('moves cancelled items out of pending entirely', () => {
    // Regression test: a cancelled trip must never appear in the pending list, since it's
    // no longer actionable and the pending count on screen excludes it too.
    const items = [item(1, false), item(2, true), item(3, false)];
    const { pending, cancelled } = splitCancelledByOperator(items);
    expect(pending.map((i) => i.id)).toEqual([1, 3]);
    expect(cancelled.map((i) => i.id)).toEqual([2]);
  });

  it('sorts cancelled items by cancelledAt, most recent first', () => {
    const items = [item(1, true, 1000), item(2, true, 3000), item(3, true, 2000)];
    const { cancelled } = splitCancelledByOperator(items);
    expect(cancelled.map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it('sorts items with no cancelledAt last', () => {
    const items = [item(1, true, null), item(2, true, 1000)];
    const { cancelled } = splitCancelledByOperator(items);
    expect(cancelled.map((i) => i.id)).toEqual([2, 1]);
  });
});
