import { getPermissions } from '@/utils/permissions';

describe('getPermissions', () => {
  it('only allows admin (planificador) to manage the transport plan', () => {
    expect(getPermissions('admin').managePlan).toBe(true);
    expect(getPermissions('supervisor').managePlan).toBe(false);
    expect(getPermissions('operator').managePlan).toBe(false);
  });

  it('only allows operator to register arrivals', () => {
    expect(getPermissions('operator').registerArrivals).toBe(true);
    expect(getPermissions('supervisor').registerArrivals).toBe(false);
  });

  it('only allows admin to manage the catalog (personas, sitios, empresas)', () => {
    expect(getPermissions('admin').manageCatalog).toBe(true);
    expect(getPermissions('supervisor').manageCatalog).toBe(false);
    expect(getPermissions('operator').manageCatalog).toBe(false);
  });
});
