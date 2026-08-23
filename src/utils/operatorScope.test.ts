import { matchesOperatorScope } from '@/utils/operatorScope';

describe('matchesOperatorScope', () => {
  it('shows everything when no scope is set', () => {
    expect(matchesOperatorScope('carga_subida', null)).toBe(true);
    expect(matchesOperatorScope('home_delivery', null)).toBe(true);
  });

  it('plan_transporte only matches carga_subida and retiro_carga', () => {
    expect(matchesOperatorScope('carga_subida', 'plan_transporte')).toBe(true);
    expect(matchesOperatorScope('retiro_carga', 'plan_transporte')).toBe(true);
    expect(matchesOperatorScope('home_delivery', 'plan_transporte')).toBe(false);
  });

  it('home_delivery only matches home_delivery', () => {
    expect(matchesOperatorScope('home_delivery', 'home_delivery')).toBe(true);
    expect(matchesOperatorScope('carga_subida', 'home_delivery')).toBe(false);
    expect(matchesOperatorScope('retiro_carga', 'home_delivery')).toBe(false);
  });
});
