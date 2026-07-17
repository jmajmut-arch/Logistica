update users set name = 'Bodega' where name = 'Bodega Demo';
update users set name = 'Supervisor' where name = 'Supervisor Demo';

select id, name, role from users order by id;
