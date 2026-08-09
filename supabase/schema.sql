-- Limpia por completo el esquema anterior de SUSPEL (registro de sustancias peligrosas):
-- este proyecto pasó a ser exclusivamente control de planificación de transporte de carga.
drop table if exists load_arrivals cascade;
drop table if exists transport_plan_items cascade;
drop table if exists truck_arrivals cascade;
drop table if exists field_verification_items cascade;
drop table if exists field_verifications cascade;
drop table if exists alerts cascade;
drop table if exists substances cascade;
drop table if exists compatibility_rules cascade;
drop table if exists zone_class_limits cascade;
drop table if exists zones cascade;
drop table if exists users cascade;

create table users (
  id bigint generated always as identity primary key,
  name text not null,
  role text not null check (role in ('operator', 'supervisor'))
);

-- El plan de transporte semanal: cada fila es un viaje concreto (fecha + hora), no una
-- plantilla recurrente. "Semanal" describe la cadencia con la que el supervisor lo carga,
-- no la forma de guardarlo — así se puede filtrar/agrupar por semana en la UI sin modelar
-- semanas como entidad aparte.
create table transport_plan_items (
  id bigint generated always as identity primary key,
  operation_type text not null check (operation_type in ('carga_subida', 'retiro_carga', 'home_delivery')),
  scheduled_at bigint not null,
  origin text,
  destination text,
  carrier text,
  reference text,
  notes text,
  created_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index transport_plan_items_scheduled_idx on transport_plan_items (scheduled_at);
create index transport_plan_items_type_idx on transport_plan_items (operation_type);

-- Registro simple del operador: hora real de llegada y lugar, vinculado a un item del plan
-- (a lo más un registro por item) para poder comparar cumplimiento en el dashboard.
create table load_arrivals (
  id bigint generated always as identity primary key,
  plan_item_id bigint not null references transport_plan_items (id) on delete cascade,
  arrived_at bigint not null,
  location text not null,
  registered_by bigint not null references users (id) on delete restrict,
  notes text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (plan_item_id)
);
create index load_arrivals_arrived_idx on load_arrivals (arrived_at);

alter table users disable row level security;
alter table transport_plan_items disable row level security;
alter table load_arrivals disable row level security;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into users (name, role) values
  ('Operador', 'operator'),
  ('Supervisor', 'supervisor');
