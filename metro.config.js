const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// drizzle-kit (driver: 'expo') genera migraciones que importan archivos .sql
// como texto — ver src/data/db/migrations/migrations.js.
config.resolver.sourceExts.push('sql');

// expo-sqlite en web corre sobre wa-sqlite (WASM) — sin esto Metro no resuelve
// el import de wa-sqlite.wasm y el bundle web falla.
config.resolver.assetExts.push('wasm');

// wa-sqlite necesita SharedArrayBuffer, que el navegador solo expone en un
// contexto cross-origin isolado (COOP/COEP). El servidor de dev de Metro no
// los envía por defecto, así que sin esto la app crashea con
// "SharedArrayBuffer is not defined" apenas intenta abrir la base de datos.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    middleware(req, res, next);
  },
};

module.exports = config;
