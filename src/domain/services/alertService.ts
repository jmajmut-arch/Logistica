import { alertRepository } from '@/data/repositories/alertRepository';
import { ruleRepository } from '@/data/repositories/ruleRepository';
import { substanceRepository } from '@/data/repositories/substanceRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import { computeAlerts, diffAlerts } from '@/domain/rules/alertEngine';

/**
 * Recalcula el estado completo de alertas a partir de los datos actuales en SQLite.
 * Se llama después de cualquier mutación que pueda afectar vencimientos, límites o
 * compatibilidad (CRUD de sustancias, cambios de límites/reglas por HSE).
 *
 * Es intencionalmente global (no por zona): con el volumen de datos de este MVP
 * recalcular todo es barato y evita bugs por invalidar el scope equivocado.
 */
export async function recalculateAlerts(): Promise<void> {
  const [substances, zones, zoneClassLimits, compatibilityRules, pendingAlerts] = await Promise.all(
    [
      substanceRepository.findAll(),
      zoneRepository.findAll(),
      zoneRepository.findAllClassLimits(),
      ruleRepository.findAll(),
      alertRepository.findByStatus('pending'),
    ],
  );

  const candidates = computeAlerts({ substances, zones, zoneClassLimits, compatibilityRules });
  const { toCreate, toUpdate, toResolve } = diffAlerts(pendingAlerts, candidates);

  await Promise.all([
    ...toCreate.map((candidate) => alertRepository.create(candidate)),
    ...toUpdate.map((update) =>
      alertRepository.updateContent(update.id, {
        severity: update.severity,
        message: update.message,
      }),
    ),
    ...toResolve.map((alert) => alertRepository.resolve(alert.id, null)),
  ]);
}
