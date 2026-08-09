-- Limpia por completo el esquema anterior de SUSPEL (registro de sustancias peligrosas):
-- este proyecto pasó a ser exclusivamente control de planificación de transporte de carga.
drop table if exists load_arrivals cascade;
drop table if exists transport_plan_items cascade;
drop table if exists carriers cascade;
drop table if exists sites cascade;
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

-- Catálogo de patios y bodegas propias: es el "área" que el operador elige al registrar
-- una llegada, y a la que el supervisor asocia cada item del plan semanal.
create table sites (
  id bigint generated always as identity primary key,
  name text not null unique,
  type text not null check (type in ('patio', 'bodega')),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Catálogo de empresas de transporte: se selecciona desde acá tanto al planificar como al
-- registrar un viaje no planificado, en vez de escribir el nombre a mano.
create table carriers (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- El plan de transporte semanal: cada fila es un viaje concreto (fecha + hora), no una
-- plantilla recurrente. "Semanal" describe la cadencia con la que el supervisor lo carga,
-- no la forma de guardarlo — así se puede filtrar/agrupar por semana en la UI sin modelar
-- semanas como entidad aparte.
create table transport_plan_items (
  id bigint generated always as identity primary key,
  operation_type text not null check (operation_type in ('carga_subida', 'retiro_carga', 'home_delivery')),
  site_id bigint not null references sites (id) on delete restrict,
  carrier_id bigint references carriers (id) on delete set null,
  scheduled_at bigint not null,
  reference text,
  notes text,
  created_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index transport_plan_items_scheduled_idx on transport_plan_items (scheduled_at);
create index transport_plan_items_site_idx on transport_plan_items (site_id);

-- Registro del operador: elige el área (sitio) y, o bien confirma un item del plan de hoy
-- (a tiempo o con otro horario), o marca un viaje no planificado (con su propia empresa,
-- ya que no hay un item de plan del que heredarla). El día siempre es hoy.
create table load_arrivals (
  id bigint generated always as identity primary key,
  site_id bigint not null references sites (id) on delete restrict,
  carrier_id bigint references carriers (id) on delete set null,
  arrived_at bigint not null,
  plan_item_id bigint references transport_plan_items (id) on delete set null,
  registered_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index load_arrivals_arrived_idx on load_arrivals (arrived_at);
create index load_arrivals_site_idx on load_arrivals (site_id);
create unique index load_arrivals_plan_item_unique on load_arrivals (plan_item_id) where plan_item_id is not null;

alter table users disable row level security;
alter table sites disable row level security;
alter table carriers disable row level security;
alter table transport_plan_items disable row level security;
alter table load_arrivals disable row level security;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into users (name, role) values
  ('Operador', 'operator'),
  ('Supervisor', 'supervisor');

insert into sites (name, type) values
  ('Bodega Central', 'bodega'),
  ('Patio Norte', 'patio');

insert into carriers (name) values
  ('Empresa Uno'),
  ('Empresa Dos'),
  ('Empresa Tres');
