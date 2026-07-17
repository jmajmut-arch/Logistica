-- La migración 0002 convirtió el ROL 'hse' a 'supervisor', pero dejó el NOMBRE del usuario
-- sembrado tal cual ('HSE Demo'), así que cualquier navegador que ya tuviera la base local
-- sembrada desde antes de que se sacara el rol HSE lo seguía viendo en el login como
-- "HSE Demo (Supervisor)". Acá se corrige el nombre para que no quede rastro de HSE.
UPDATE `users` SET `name` = 'Supervisor Demo 2' WHERE `name` = 'HSE Demo';
