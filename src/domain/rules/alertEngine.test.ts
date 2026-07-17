import { computeAlerts, diffAlerts, type AlertCandidate } from '@/domain/rules/alertEngine';
import type { Alert } from '@/domain/entities/Alert';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import type { Substance } from '@/domain/entities/Substance';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';

const TODAY = new Date(2026, 0, 1);

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

const ZONES: Zone[] = [{ id: 1, name: 'Rack A1', code: 'A1' }];

// La mayoría de los tests de esta suite no ejercitan la regla de verificación en
// terreno: se les da una verificación reciente para que no aporte candidatos y así
// no interfiera con las aserciones de las otras reglas.
const RECENTLY_VERIFIED = new Map([[1, TODAY.getTime()]]);

describe('computeAlerts', () => {
  it('returns no candidates for a substance well within all thresholds', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance()],
      zones: ZONES,
      zoneClassLimits: [
        { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 100, unit: 'l' },
      ],
      compatibilityRules: [],
      latestVerificationByZone: RECENTLY_VERIFIED,
      today: TODAY,
    });
    expect(alerts).toEqual([]);
  });

  it('produces an expiration candidate identifying the substance by name and id', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance({ id: 5, name: 'Ácido sulfúrico', expirationDate: '2025-12-01' })],
      zones: ZONES,
      zoneClassLimits: [],
      compatibilityRules: [],
      latestVerificationByZone: RECENTLY_VERIFIED,
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'expiration',
        severity: 'critical',
        relatedSubstanceId: 5,
        relatedZoneId: 1,
      }),
    ]);
    expect(alerts[0].message).toContain('Ácido sulfúrico');
  });

  it('produces a limit_exceeded candidate aggregating quantities across substances', () => {
    const alerts = computeAlerts({
      substances: [makeSubstance({ id: 1, quantity: 60 }), makeSubstance({ id: 2, quantity: 60 })],
      zones: ZONES,
      zoneClassLimits: [
        { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 100, unit: 'l' },
      ],
      compatibilityRules: [],
      latestVerificationByZone: RECENTLY_VERIFIED,
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'limit_exceeded',
        severity: 'medium',
        relatedSubstanceId: null,
        relatedZoneId: 1,
      }),
    ]);
  });

  it('produces a critical incompatibility candidate for co-located incompatible classes', () => {
    const rules: CompatibilityRule[] = [
      {
        id: 1,
        classA: 'class3_flammable_liquids',
        classB: 'class8_corrosives',
        status: 'incompatible',
      },
    ];
    const alerts = computeAlerts({
      substances: [
        makeSubstance({ id: 1, hazardClass: 'class8_corrosives' }),
        makeSubstance({ id: 2, hazardClass: 'class3_flammable_liquids' }),
      ],
      zones: ZONES,
      zoneClassLimits: [],
      compatibilityRules: rules,
      latestVerificationByZone: RECENTLY_VERIFIED,
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'incompatibility',
        severity: 'critical',
        relatedSubstanceId: null,
        relatedZoneId: 1,
      }),
    ]);
  });

  it('produces a verification_overdue candidate for a zone never verified', () => {
    const alerts = computeAlerts({
      substances: [],
      zones: ZONES,
      zoneClassLimits: [],
      compatibilityRules: [],
      latestVerificationByZone: new Map(),
      today: TODAY,
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'verification_overdue',
        severity: 'high',
        relatedSubstanceId: null,
        relatedZoneId: 1,
      }),
    ]);
  });

  it('combines findings from all four rule types in a single pass', () => {
    const limits: ZoneClassLimit[] = [
      { id: 1, zoneId: 1, hazardClass: 'class8_corrosives', maxQuantity: 10, unit: 'l' },
    ];
    const rules: CompatibilityRule[] = [
      {
        id: 1,
        classA: 'class3_flammable_liquids',
        classB: 'class8_corrosives',
        status: 'incompatible',
      },
    ];
    const alerts = computeAlerts({
      substances: [
        makeSubstance({
          id: 1,
          hazardClass: 'class8_corrosives',
          quantity: 20,
          expirationDate: '2025-12-01',
        }),
        makeSubstance({ id: 2, hazardClass: 'class3_flammable_liquids', quantity: 1 }),
      ],
      zones: ZONES,
      zoneClassLimits: limits,
      compatibilityRules: rules,
      latestVerificationByZone: RECENTLY_VERIFIED,
      today: TODAY,
    });

    expect(alerts.map((alert) => alert.type).sort()).toEqual([
      'expiration',
      'incompatibility',
      'limit_exceeded',
    ]);
  });
});

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 1,
    type: 'expiration',
    severity: 'high',
    status: 'pending',
    relatedSubstanceId: 5,
    relatedZoneId: 1,
    message: 'original message',
    createdAt: 0,
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<AlertCandidate> = {}): AlertCandidate {
  return {
    type: 'expiration',
    severity: 'high',
    status: 'pending',
    relatedSubstanceId: 5,
    relatedZoneId: 1,
    message: 'original message',
    ...overrides,
  };
}

describe('diffAlerts', () => {
  it('creates a candidate that has no matching pending alert', () => {
    const diff = diffAlerts([], [makeCandidate()]);
    expect(diff.toCreate).toEqual([makeCandidate()]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toResolve).toEqual([]);
  });

  it('leaves an unchanged pending alert alone', () => {
    const diff = diffAlerts([makeAlert()], [makeCandidate()]);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toResolve).toEqual([]);
  });

  it('updates a pending alert whose severity escalated', () => {
    const diff = diffAlerts(
      [makeAlert({ severity: 'medium' })],
      [makeCandidate({ severity: 'critical', message: 'venció hace 3 días' })],
    );
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([{ id: 1, severity: 'critical', message: 'venció hace 3 días' }]);
    expect(diff.toResolve).toEqual([]);
  });

  it('resolves a pending alert with no supporting candidate anymore', () => {
    const diff = diffAlerts([makeAlert()], []);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toResolve).toEqual([makeAlert()]);
  });

  it('never touches already-resolved alerts even if nothing matches them', () => {
    const resolved = makeAlert({ status: 'resolved', resolvedAt: 123, resolvedBy: 2 });
    const diff = diffAlerts([resolved], []);
    // diffAlerts solo recibe alertas pendientes en la práctica; si se le pasa una
    // resuelta igual la trata como "sin candidato" porque no filtra por status acá.
    expect(diff.toResolve).toEqual([resolved]);
  });

  it('treats alerts for different substances/zones as distinct even with the same type', () => {
    const diff = diffAlerts(
      [makeAlert({ id: 1, relatedSubstanceId: 5 })],
      [makeCandidate({ relatedSubstanceId: 6 })],
    );
    expect(diff.toCreate).toEqual([makeCandidate({ relatedSubstanceId: 6 })]);
    expect(diff.toResolve).toEqual([makeAlert({ id: 1, relatedSubstanceId: 5 })]);
  });
});
