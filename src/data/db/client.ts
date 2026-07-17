import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { openDatabaseAsync, type SQLiteBindParams, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

// La API síncrona de expo-sqlite (usada por el driver drizzle-orm/expo-sqlite) depende en
// web de un puente Worker + Atomics.wait que expo-sqlite reconoce como inestable
// ("Sync operation timeout", https://github.com/expo/expo/issues/36392). La API asíncrona
// no tiene ese problema en ninguna plataforma, así que este cliente usa siempre
// drizzle-orm/sqlite-proxy sobre openDatabaseAsync en vez del driver sync de expo-sqlite.
let expoDbPromise: Promise<SQLiteDatabase> | null = null;

export function getExpoDb(): Promise<SQLiteDatabase> {
  if (!expoDbPromise) {
    expoDbPromise = openDatabaseAsync('suspel.db', { enableChangeListener: true }).then(
      async (database) => {
        await database.execAsync('PRAGMA foreign_keys = ON;');
        return database;
      },
    );
  }
  return expoDbPromise;
}

type ProxyMethod = 'run' | 'all' | 'values' | 'get';

async function proxy(sql: string, params: any[], method: ProxyMethod): Promise<{ rows: any }> {
  const database = await getExpoDb();
  const statement = await database.prepareAsync(sql);
  try {
    if (method === 'run') {
      await statement.executeAsync(params as SQLiteBindParams);
      return { rows: [] };
    }
    const result = await statement.executeForRawResultAsync(params as SQLiteBindParams);
    if (method === 'get') {
      // null cuando no hay fila: drizzle lo trata como "sin resultado", no como fila vacía.
      return { rows: await result.getFirstAsync() };
    }
    return { rows: await result.getAllAsync() };
  } finally {
    await statement.finalizeAsync();
  }
}

export const db = drizzle(proxy, { schema });

export type Database = typeof db;
