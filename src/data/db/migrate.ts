import { getExpoDb } from './client';
import migrationsConfig from './migrations/migrations';

const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Reimplementa lo que hacía `drizzle-orm/expo-sqlite/migrator`'s `useMigrations`, pero sobre
 * la API asíncrona de expo-sqlite (ver client.ts para el motivo). Cada entrada del journal
 * puede traer varios statements separados por '--> statement-breakpoint'; se aplican dentro
 * de una transacción junto con el registro en __drizzle_migrations para que un fallo a mitad
 * de camino no deje la migración a medio aplicar.
 */
export async function runMigrationsAsync(): Promise<void> {
  const database = await getExpoDb();

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)`,
  );
  const lastMigration = await database.getFirstAsync<{ created_at: number }>(
    `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
  );
  const lastAppliedAt = lastMigration?.created_at ?? 0;

  for (const entry of migrationsConfig.journal.entries) {
    if (entry.when <= lastAppliedAt) {
      continue;
    }

    const migrationKey =
      `m${String(entry.idx).padStart(4, '0')}` as keyof typeof migrationsConfig.migrations;
    const sqlText = migrationsConfig.migrations[migrationKey];
    if (!sqlText) {
      throw new Error(`Missing migration: ${entry.tag}`);
    }
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((statement: string) => statement.trim())
      .filter(Boolean);

    await database.withTransactionAsync(async () => {
      for (const statement of statements) {
        await database.execAsync(statement);
      }
      await database.runAsync(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
        entry.tag,
        entry.when,
      );
    });
  }
}
