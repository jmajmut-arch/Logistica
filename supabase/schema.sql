-- Limpia por completo el esquema anterior de SUSPEL (registro de sustancias peligrosas):
-- este proyecto pasó a ser exclusivamente control de planificación de transporte de carga.
drop table if exists dispatch_issues cascade;
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
  role text not null check (role in ('operator', 'supervisor', 'admin'))
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

-- Reglas de planificación permanente (ej. "todos los lunes 10:00"), hoy usadas solo por
-- el Administrador para home delivery. Cada regla no se muestra directamente en la
-- agenda: genera items concretos en transport_plan_items (ver recurrence_rule_id abajo),
-- que es lo único que el operador ve y contra lo que registra llegadas.
create table recurring_plan_rules (
  id bigint generated always as identity primary key,
  operation_type text not null check (operation_type in ('carga_subida', 'retiro_carga', 'home_delivery')),
  site_id bigint not null references sites (id) on delete restrict,
  carrier_id bigint references carriers (id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = lunes ... 6 = domingo
  block_minutes integer not null check (block_minutes between 0 and 1439),
  requires_heavy_crane boolean not null default false,
  reference text,
  notes text,
  active boolean not null default true,
  created_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- El plan de transporte semanal: cada fila es un viaje concreto (fecha + hora), no una
-- plantilla recurrente. "Semanal" describe la cadencia con la que el planificador lo carga,
-- no la forma de guardarlo — así se puede filtrar/agrupar por semana en la UI sin modelar
-- semanas como entidad aparte. Un item puede venir de una regla permanente
-- (recurrence_rule_id no nulo); editarlo o eliminarlo solo afecta esa fecha puntual, nunca
-- a la regla ni a las demás ocurrencias futuras. Eliminar una ocurrencia de una regla la
-- cancela (cancelled = true) en vez de borrarla, para que la sincronización no la regenere
-- al ver esa semana "libre"; un item cancelado se excluye de toda la app salvo del propio
-- chequeo de sincronización.
create table transport_plan_items (
  id bigint generated always as identity primary key,
  operation_type text not null check (operation_type in ('carga_subida', 'retiro_carga', 'home_delivery')),
  site_id bigint not null references sites (id) on delete restrict,
  carrier_id bigint references carriers (id) on delete set null,
  scheduled_at bigint not null,
  has_no_schedule boolean not null default false,
  reference text,
  notes text,
  requires_heavy_crane boolean not null default false,
  recurrence_rule_id bigint references recurring_plan_rules (id) on delete set null,
  cancelled boolean not null default false,
  created_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index transport_plan_items_scheduled_idx on transport_plan_items (scheduled_at);
create index transport_plan_items_site_idx on transport_plan_items (site_id);
create index transport_plan_items_recurrence_idx on transport_plan_items (recurrence_rule_id);

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

-- Incidencias de guías de despacho con problemas (no ingresadas por el operador logístico,
-- u otro motivo): el supervisor de logística las levanta al detectar el problema y las
-- cierra una vez regularizadas, dejando notas de cómo se resolvió. guide_file_url apunta al
-- documento adjunto (PDF o foto de la guía) en el bucket público "dispatch-guides".
create table dispatch_issues (
  id bigint generated always as identity primary key,
  guide_number text not null,
  site_id bigint not null references sites (id) on delete restrict,
  carrier_id bigint references carriers (id) on delete set null,
  issue_type text not null check (issue_type in ('no_ingresada', 'otro')),
  description text not null,
  guide_file_url text,
  guide_file_name text,
  status text not null default 'open' check (status in ('open', 'closed')),
  raised_by bigint not null references users (id) on delete restrict,
  raised_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  closed_by bigint references users (id) on delete set null,
  closed_at bigint,
  resolution_notes text
);
create index dispatch_issues_status_idx on dispatch_issues (status);
create index dispatch_issues_site_idx on dispatch_issues (site_id);

alter table users disable row level security;
alter table sites disable row level security;
alter table carriers disable row level security;
alter table recurring_plan_rules disable row level security;
alter table transport_plan_items disable row level security;
alter table load_arrivals disable row level security;
alter table dispatch_issues disable row level security;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Bucket público para las guías de despacho adjuntas a una incidencia (dispatch_issues).
insert into storage.buckets (id, name, public)
values ('dispatch-guides', 'dispatch-guides', true)
on conflict (id) do nothing;

drop policy if exists "dispatch_guides_public_read" on storage.objects;
drop policy if exists "dispatch_guides_public_insert" on storage.objects;
drop policy if exists "dispatch_guides_public_update" on storage.objects;
drop policy if exists "dispatch_guides_public_delete" on storage.objects;
drop policy if exists "dispatch_guides_bucket_select" on storage.buckets;

create policy "dispatch_guides_public_read" on storage.objects
  for select using (bucket_id = 'dispatch-guides');
create policy "dispatch_guides_public_insert" on storage.objects
  for insert with check (bucket_id = 'dispatch-guides');
create policy "dispatch_guides_public_update" on storage.objects
  for update using (bucket_id = 'dispatch-guides');
create policy "dispatch_guides_public_delete" on storage.objects
  for delete using (bucket_id = 'dispatch-guides');
-- storage.buckets también tiene RLS habilitado por defecto: sin esta policy, el rol anon
-- no puede ver que el bucket existe y la subida falla con 400 antes de llegar a objects.
create policy "dispatch_guides_bucket_select" on storage.buckets
  for select using (id = 'dispatch-guides');

insert into users (name, role) values
  ('Operador', 'operator'),
  ('Supervisor', 'supervisor'),
  ('Administrador', 'admin');

insert into sites (name, type) values
  ('Bodega Central', 'bodega'),
  ('Patio Norte', 'patio');

insert into carriers (name) values
  ('Empresa Uno'),
  ('Empresa Dos'),
  ('Empresa Tres');
