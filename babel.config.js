module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inlinea el contenido de los .sql de src/data/db/migrations como texto,
      // requerido por drizzle-orm/expo-sqlite para aplicar migraciones en runtime.
      ['inline-import', { extensions: ['.sql'] }],
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
