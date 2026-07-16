import { findExpirationFindings } from '@/domain/rules/expirationRules';
import {
  findCapacityFindings,
  sumQuantityByZoneAndClass,
  type CapacityFinding,
} from '@/domain/rules/capacityRules';
import {
  findIncompatibilities,
  type IncompatibilityFinding,
} from '@/domain/rules/compatibilityRules';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import type { Substance } from '@/domain/entities/Substance';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';
import { HAZARD_CLASS_LABELS } from '@/utils/hazardClassLabels';
import type { AlertSeverity, AlertType, HazardClass } from '@/types/enums';

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  status: 'pending';
  relatedSubstanceId: number | null;
  relatedZoneId: number | null;
  message: string;
}

export interface AlertEngineInput {
  substances: Substance[];
  zones: Zone[];
  zoneClassLimits: ZoneClassLimit[];
  compatibilityRules: CompatibilityRule[];
  /** Inyectable para tests; por defecto la fecha/hora actual. */
  today?: Date;
}

export function computeAlerts(input: AlertEngineInput): AlertCandidate[] {
  const today = input.today ?? new Date();
  const zoneLabel = buildZoneLabelLookup(input.zones);

  const expirationCandidates = findExpirationFindings(input.substances, today).map(
    (finding): AlertCandidate => ({
      type: 'expiration',
      severity: finding.severity,
      status: 'pending',
      relatedSubstanceId: finding.substance.id,
      relatedZoneId: finding.substance.zoneId,
      message:
        finding.daysUntilExpiration < 0
          ? `${finding.substance.name} venció hace ${Math.abs(finding.daysUntilExpiration)} día(s) (${finding.substance.expirationDate}).`
          : `${finding.substance.name} vence en ${finding.daysUntilExpiration} día(s) (${finding.substance.expirationDate}).`,
    }),
  );

  const totals = sumQuantityByZoneAndClass(input.substances);
  const capacityCandidates = findCapacityFindings(totals, input.zoneClassLimits).map(
    (finding): AlertCandidate => ({
      type: 'limit_exceeded',
      severity: finding.severity,
      status: 'pending',
      relatedSubstanceId: null,
      relatedZoneId: finding.zoneId,
      message: buildCapacityMessage(finding, zoneLabel),
    }),
  );

  const hazardClassesByZone = groupHazardClassesByZone(input.substances);
  const incompatibilityCandidates = findIncompatibilities(
    hazardClassesByZone,
    input.compatibilityRules,
  ).map((finding): AlertCandidate => ({
    type: 'incompatibility',
    severity: 'critical',
    status: 'pending',
    relatedSubstanceId: null,
    relatedZoneId: finding.zoneId,
    message: buildIncompatibilityMessage(finding, zoneLabel),
  }));

  return [...expirationCandidates, ...capacityCandidates, ...incompatibilityCandidates];
}

function groupHazardClassesByZone(substances: Substance[]): Map<number, HazardClass[]> {
  const map = new Map<number, HazardClass[]>();
  for (const substance of substances) {
    const classes = map.get(substance.zoneId) ?? [];
    classes.push(substance.hazardClass);
    map.set(substance.zoneId, classes);
  }
  return map;
}

function buildZoneLabelLookup(zones: Zone[]): (zoneId: number) => string {
  const byId = new Map(zones.map((zone) => [zone.id, `${zone.name} (${zone.code})`]));
  return (zoneId) => byId.get(zoneId) ?? `Zona #${zoneId}`;
}

function buildCapacityMessage(
  finding: CapacityFinding,
  zoneLabel: (zoneId: number) => string,
): string {
  const overagePercent = Math.round(finding.overageRatio * 100);
  return `${zoneLabel(finding.zoneId)}: ${HAZARD_CLASS_LABELS[finding.hazardClass]} excede el límite en ${overagePercent}% (${finding.totalQuantity}${finding.unit} / ${finding.maxQuantity}${finding.unit}).`;
}

function buildIncompatibilityMessage(
  finding: IncompatibilityFinding,
  zoneLabel: (zoneId: number) => string,
): string {
  return `${zoneLabel(finding.zoneId)}: ${HAZARD_CLASS_LABELS[finding.classA]} y ${HAZARD_CLASS_LABELS[finding.classB]} son incompatibles y están en la misma zona.`;
}
