const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// drizzle-kit (driver: 'expo') genera migraciones que importan archivos .sql
// como texto — ver src/data/db/migrations/migrations.js.
config.resolver.sourceExts.push('sql');

module.exports = config;
