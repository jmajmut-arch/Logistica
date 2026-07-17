// PostgREST devuelve columnas snake_case (mismo nombre que en Postgres), pero el resto de
// la app (entidades de dominio, pantallas) usa camelCase — igual que antes con Drizzle, que
// hacía esta traducción automáticamente a partir del schema. Acá se hace a mano en el borde
// del repositorio para no tener que tocar el resto de la app.

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export function rowToCamelCase<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [snakeToCamel(key), value]),
  ) as T;
}

export function rowsToCamelCase<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => rowToCamelCase<T>(row));
}

export function objectToSnakeCase(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [camelToSnake(key), value]),
  );
}
