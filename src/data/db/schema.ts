import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { FieldVerificationItemKey } from '@/domain/rules/fieldVerificationChecklist';
import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CompatibilityStatus,
  HazardClass,
  Role,
  VerificationResult,
} from '@/types/enums';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').$type<Role>().notNull(),
});

export const zones = sqliteTable('zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
});

export const zoneClassLimits = sqliteTable(
  'zone_class_limits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zoneId: integer('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'cascade' }),
    hazardClass: text('hazard_class').$type<HazardClass>().notNull(),
    maxQuantity: real('max_quantity').notNull(),
    unit: text('unit').notNull(),
  },
  (table) => [uniqueIndex('zone_class_limits_zone_class_idx').on(table.zoneId, table.hazardClass)],
);

// Un par de clases se guarda siempre normalizado (classA <= classB alfabéticamente)
// para no duplicar la regla A-B / B-A. Ver domain/rules/compatibilityRules.ts.
export const compatibilityRules = sqliteTable(
  'compatibility_rules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    classA: text('class_a').$type<HazardClass>().notNull(),
    classB: text('class_b').$type<HazardClass>().notNull(),
    status: text('status').$type<CompatibilityStatus>().notNull(),
  },
  (table) => [uniqueIndex('compatibility_rules_pair_idx').on(table.classA, table.classB)],
);

export const substances = sqliteTable(
  'substances',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    hazardClass: text('hazard_class').$type<HazardClass>().notNull(),
    quantity: real('quantity').notNull(),
    unit: text('unit').notNull(),
    zoneId: integer('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'restrict' }),
    expirationDate: text('expiration_date').notNull(), // ISO 8601 (YYYY-MM-DD)
    sdsUri: text('sds_uri'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
  },
  (table) => [
    index('substances_zone_idx').on(table.zoneId),
    index('substances_expiration_idx').on(table.expirationDate),
  ],
);

export const alerts = sqliteTable(
  'alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').$type<AlertType>().notNull(),
    severity: text('severity').$type<AlertSeverity>().notNull(),
    status: text('status').$type<AlertStatus>().notNull().default('pending'),
    relatedSubstanceId: integer('related_substance_id').references(() => substances.id, {
      onDelete: 'cascade',
    }),
    relatedZoneId: integer('related_zone_id').references(() => zones.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
    resolvedAt: integer('resolved_at'),
    resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [index('alerts_status_idx').on(table.status)],
);

export const zonesRelations = relations(zones, ({ many }) => ({
  classLimits: many(zoneClassLimits),
  substances: many(substances),
}));

export const substancesRelations = relations(substances, ({ one }) => ({
  zone: one(zones, { fields: [substances.zoneId], references: [zones.id] }),
  createdByUser: one(users, { fields: [substances.createdBy], references: [users.id] }),
}));

export const fieldVerifications = sqliteTable(
  'field_verifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zoneId: integer('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'restrict' }),
    performedBy: integer('performed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    performedAt: integer('performed_at')
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
    notes: text('notes'),
  },
  (table) => [
    index('field_verifications_zone_idx').on(table.zoneId),
    index('field_verifications_performed_at_idx').on(table.performedAt),
  ],
);

export const fieldVerificationItems = sqliteTable(
  'field_verification_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    verificationId: integer('verification_id')
      .notNull()
      .references(() => fieldVerifications.id, { onDelete: 'cascade' }),
    itemKey: text('item_key').$type<FieldVerificationItemKey>().notNull(),
    result: text('result').$type<VerificationResult>().notNull(),
    observation: text('observation'),
  },
  (table) => [index('field_verification_items_verification_idx').on(table.verificationId)],
);

export const fieldVerificationsRelations = relations(fieldVerifications, ({ one, many }) => ({
  zone: one(zones, { fields: [fieldVerifications.zoneId], references: [zones.id] }),
  performedByUser: one(users, {
    fields: [fieldVerifications.performedBy],
    references: [users.id],
  }),
  items: many(fieldVerificationItems),
}));

export const fieldVerificationItemsRelations = relations(fieldVerificationItems, ({ one }) => ({
  verification: one(fieldVerifications, {
    fields: [fieldVerificationItems.verificationId],
    references: [fieldVerifications.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  substance: one(substances, {
    fields: [alerts.relatedSubstanceId],
    references: [substances.id],
  }),
  zone: one(zones, { fields: [alerts.relatedZoneId], references: [zones.id] }),
  resolvedByUser: one(users, { fields: [alerts.resolvedBy], references: [users.id] }),
}));
