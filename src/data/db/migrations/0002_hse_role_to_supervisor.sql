-- El rol 'hse' se fusiona con 'supervisor' (ver src/utils/permissions.ts):
-- cualquier usuario ya sembrado con role='hse' en una base existente pasa a supervisor
-- para no perder el acceso ni quedar con un rol que ya no existe en el tipo Role.
UPDATE `users` SET `role` = 'supervisor' WHERE `role` = 'hse';
