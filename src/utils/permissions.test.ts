import { getPermissions } from '@/utils/permissions';

describe('getPermissions', () => {
  it('only allows supervisor to manage the transport plan', () => {
    expect(getPermissions('supervisor').managePlan).toBe(true);
    expect(getPermissions('operator').managePlan).toBe(false);
  });

  it('only allows operator to register arrivals', () => {
    expect(getPermissions('operator').registerArrivals).toBe(true);
    expect(getPermissions('supervisor').registerArrivals).toBe(false);
  });
});
