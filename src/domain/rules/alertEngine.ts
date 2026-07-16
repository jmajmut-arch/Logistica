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
import type { Alert } from '@/domain/entities/Alert';
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

export interface AlertUpdate {
  id: number;
  severity: AlertSeverity;
  message: string;
}

export interface AlertDiff {
  toCreate: AlertCandidate[];
  toUpdate: AlertUpdate[];
  toResolve: Alert[];
}

/**
 * Reconcilia las alertas pendientes ya persistidas contra los candidatos recién
 * calculados, para que recalcular no duplique alertas ni pierda el historial:
 * - un candidato sin alerta pendiente equivalente → toCreate
 * - una alerta pendiente cuyo candidato cambió de severidad/mensaje → toUpdate
 * - una alerta pendiente sin candidato que la sostenga → toResolve (ya no aplica)
 * Dos alertas se consideran "la misma" si comparten type + sustancia/zona relacionada;
 * alertas ya resueltas nunca entran acá, quedan como registro histórico/de auditoría.
 */
export function diffAlerts(pendingAlerts: Alert[], candidates: AlertCandidate[]): AlertDiff {
  const pendingByKey = new Map(pendingAlerts.map((alert) => [alertKey(alert), alert]));
  const candidateKeys = new Set<string>();

  const toCreate: AlertCandidate[] = [];
  const toUpdate: AlertUpdate[] = [];

  for (const candidate of candidates) {
    const key = alertKey(candidate);
    candidateKeys.add(key);
    const existing = pendingByKey.get(key);
    if (!existing) {
      toCreate.push(candidate);
    } else if (existing.severity !== candidate.severity || existing.message !== candidate.message) {
      toUpdate.push({ id: existing.id, severity: candidate.severity, message: candidate.message });
    }
  }

  const toResolve = pendingAlerts.filter((alert) => !candidateKeys.has(alertKey(alert)));

  return { toCreate, toUpdate, toResolve };
}

function alertKey(alert: {
  type: AlertType;
  relatedSubstanceId: number | null;
  relatedZoneId: number | null;
}): string {
  return `${alert.type}:${alert.relatedSubstanceId ?? '-'}:${alert.relatedZoneId ?? '-'}`;
}
