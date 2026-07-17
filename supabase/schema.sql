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
  role text not null check (role in ('warehouse', 'supervisor'))
);

create table zones (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null unique
);

create table zone_class_limits (
  id bigint generated always as identity primary key,
  zone_id bigint not null references zones (id) on delete cascade,
  hazard_class text not null check (hazard_class in (
    'class1_explosives', 'class2_gases', 'class3_flammable_liquids',
    'class4_flammable_solids', 'class5_oxidizers', 'class6_toxic',
    'class7_radioactive', 'class8_corrosives', 'class9_misc'
  )),
  max_quantity double precision not null,
  unit text not null check (unit in ('l', 'ml', 'kg', 't')),
  unique (zone_id, hazard_class)
);

create table compatibility_rules (
  id bigint generated always as identity primary key,
  class_a text not null check (class_a in (
    'class1_explosives', 'class2_gases', 'class3_flammable_liquids',
    'class4_flammable_solids', 'class5_oxidizers', 'class6_toxic',
    'class7_radioactive', 'class8_corrosives', 'class9_misc'
  )),
  class_b text not null check (class_b in (
    'class1_explosives', 'class2_gases', 'class3_flammable_liquids',
    'class4_flammable_solids', 'class5_oxidizers', 'class6_toxic',
    'class7_radioactive', 'class8_corrosives', 'class9_misc'
  )),
  status text not null check (status in ('compatible', 'incompatible')),
  unique (class_a, class_b)
);

create table substances (
  id bigint generated always as identity primary key,
  name text not null,
  hazard_class text not null check (hazard_class in (
    'class1_explosives', 'class2_gases', 'class3_flammable_liquids',
    'class4_flammable_solids', 'class5_oxidizers', 'class6_toxic',
    'class7_radioactive', 'class8_corrosives', 'class9_misc'
  )),
  quantity double precision not null,
  unit text not null check (unit in ('l', 'ml', 'kg', 't')),
  zone_id bigint not null references zones (id) on delete restrict,
  expiration_date text not null,
  sds_uri text,
  sds_file_name text,
  created_by bigint not null references users (id) on delete restrict,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index substances_zone_idx on substances (zone_id);
create index substances_expiration_idx on substances (expiration_date);

create table alerts (
  id bigint generated always as identity primary key,
  type text not null check (type in ('expiration', 'limit_exceeded', 'incompatibility', 'verification_overdue')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  related_substance_id bigint references substances (id) on delete cascade,
  related_zone_id bigint references zones (id) on delete cascade,
  message text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  resolved_at bigint,
  resolved_by bigint references users (id) on delete set null
);
create index alerts_status_idx on alerts (status);

create table field_verifications (
  id bigint generated always as identity primary key,
  zone_id bigint not null references zones (id) on delete restrict,
  performed_by bigint not null references users (id) on delete restrict,
  performed_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  notes text
);
create index field_verifications_zone_idx on field_verifications (zone_id);
create index field_verifications_performed_at_idx on field_verifications (performed_at);

create table field_verification_items (
  id bigint generated always as identity primary key,
  verification_id bigint not null references field_verifications (id) on delete cascade,
  item_key text not null,
  result text not null check (result in ('cumple', 'no_cumple', 'no_aplica')),
  observation text
);
create index field_verification_items_verification_idx on field_verification_items (verification_id);

alter table users disable row level security;
alter table zones disable row level security;
alter table zone_class_limits disable row level security;
alter table compatibility_rules disable row level security;
alter table substances disable row level security;
alter table alerts disable row level security;
alter table field_verifications disable row level security;
alter table field_verification_items disable row level security;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into users (name, role) values
  ('Bodega', 'warehouse'),
  ('Supervisor', 'supervisor');

insert into zones (name, code) values
  ('Rack A1', 'A1'),
  ('Rack A2', 'A2'),
  ('Rack B1', 'B1');

insert into zone_class_limits (zone_id, hazard_class, max_quantity, unit)
select z.id, v.hazard_class, v.max_quantity, v.unit
from zones z
cross join (values
  ('class3_flammable_liquids', 200, 'l'),
  ('class8_corrosives', 100, 'l')
) as v(hazard_class, max_quantity, unit);

insert into compatibility_rules (class_a, class_b, status) values
  ('class3_flammable_liquids', 'class5_oxidizers', 'incompatible'),
  ('class3_flammable_liquids', 'class8_corrosives', 'incompatible'),
  ('class4_flammable_solids', 'class5_oxidizers', 'incompatible'),
  ('class5_oxidizers', 'class6_toxic', 'incompatible'),
  ('class1_explosives', 'class8_corrosives', 'incompatible'),
  ('class3_flammable_liquids', 'class9_misc', 'compatible'),
  ('class8_corrosives', 'class9_misc', 'compatible');
