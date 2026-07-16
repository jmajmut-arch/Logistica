import type { Database } from '@/data/db/client';
import { compatibilityRules, users, zoneClassLimits, zones } from '@/data/db/schema';
import { normalizeClassPair } from '@/domain/rules/compatibilityRules';
import type { CompatibilityStatus, HazardClass } from '@/types/enums';

// Pares representativos de la matriz de compatibilidad GHS. No es exhaustivo:
// HSE puede editar/ampliar estas reglas desde la pantalla de configuración (Fase 7).
const SEED_COMPATIBILITY_PAIRS: [HazardClass, HazardClass, CompatibilityStatus][] = [
  ['class3_flammable_liquids', 'class5_oxidizers', 'incompatible'],
  ['class3_flammable_liquids', 'class8_corrosives', 'incompatible'],
  ['class4_flammable_solids', 'class5_oxidizers', 'incompatible'],
  ['class5_oxidizers', 'class6_toxic', 'incompatible'],
  ['class8_corrosives', 'class1_explosives', 'incompatible'],
  ['class3_flammable_liquids', 'class9_misc', 'compatible'],
  ['class8_corrosives', 'class9_misc', 'compatible'],
];

export async function seedDatabaseIfEmpty(db: Database) {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    return;
  }

  await db.insert(users).values([
    { name: 'Bodega Demo', role: 'warehouse' },
    { name: 'Supervisor Demo', role: 'supervisor' },
    { name: 'HSE Demo', role: 'hse' },
  ]);

  const insertedZones = await db
    .insert(zones)
    .values([
      { name: 'Rack A1', code: 'A1' },
      { name: 'Rack A2', code: 'A2' },
      { name: 'Rack B1', code: 'B1' },
    ])
    .returning();

  const zoneLimits = insertedZones.flatMap((zone) => [
    {
      zoneId: zone.id,
      hazardClass: 'class3_flammable_liquids' as HazardClass,
      maxQuantity: 200,
      unit: 'l',
    },
    {
      zoneId: zone.id,
      hazardClass: 'class8_corrosives' as HazardClass,
      maxQuantity: 100,
      unit: 'l',
    },
  ]);
  await db.insert(zoneClassLimits).values(zoneLimits);

  await db.insert(compatibilityRules).values(
    SEED_COMPATIBILITY_PAIRS.map(([classA, classB, status]) => {
      const [normalizedA, normalizedB] = normalizeClassPair(classA, classB);
      return { classA: normalizedA, classB: normalizedB, status };
    }),
  );
}
