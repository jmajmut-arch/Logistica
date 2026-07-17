import { getPermissions } from '@/utils/permissions';

describe('getPermissions', () => {
  it('only allows supervisor to configure rules', () => {
    expect(getPermissions('supervisor').configureRules).toBe(true);
    expect(getPermissions('warehouse').configureRules).toBe(false);
  });

  it('allows warehouse and supervisor to manage substances', () => {
    expect(getPermissions('warehouse').manageSubstances).toBe(true);
    expect(getPermissions('supervisor').manageSubstances).toBe(true);
  });
});
