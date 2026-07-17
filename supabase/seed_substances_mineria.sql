insert into zones (name, code) values
  ('Polvorin', 'POLV'),
  ('Bodega de Nitrato', 'NITR'),
  ('Bodega de Reactivos de Flotacion', 'REAC'),
  ('Bodega de Toxicos', 'TOXI'),
  ('Bodega de Insumos de Proceso', 'INSU');

insert into substances (name, hazard_class, quantity, unit, zone_id, expiration_date, sds_uri, sds_file_name, created_by)
values
  (
    'Cianuro de sodio (solido)',
    'class6_toxic',
    200,
    'kg',
    (select id from zones where code = 'TOXI'),
    '2027-07-17',
    'https://winklerltda.cl/quimicav2/wp-content/uploads/2025/01/SO-1445-SODIO-CIANURO-P.pdf',
    'HDS_Cianuro_Sodio_Winkler_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Nitrato de amonio (grado tecnico)',
    'class5_oxidizers',
    2000,
    'kg',
    (select id from zones where code = 'NITR'),
    '2028-07-17',
    'https://ecostandard.cl/wp-content/uploads/2021/09/nitrato-de-amonio-ficha-tecnica-HDS.pdf',
    'HDS_Nitrato_Amonio_NCh2245_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Emulsion explosiva / ANFO a granel',
    'class1_explosives',
    500,
    'kg',
    (select id from zones where code = 'POLV'),
    '2027-01-17',
    'https://www.ecosmep.com/cabecera/upload/fichas/12436.pdf',
    'HDS_ANFO.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Xantato isopropilico de sodio (SIPX)',
    'class4_flammable_solids',
    150,
    'kg',
    (select id from zones where code = 'REAC'),
    '2027-04-17',
    'https://flottec.mx/archivos/Flottec%20SIPX%20Collector%20SDS%20Spanish%20r00%202018-07-18.pdf',
    'HDS_Xantato_SIPX_Flottec.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'MIBC (espumante de flotacion)',
    'class3_flammable_liquids',
    80,
    'l',
    (select id from zones where code = 'REAC'),
    '2027-10-17',
    'https://www.flottec.mx/archivos/Flottec%20F120%20Frother%20SDS%20SP%20r01%202024-02-09.pdf',
    'HDS_MIBC_Flottec_F120.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Cal hidratada',
    'class8_corrosives',
    3000,
    'kg',
    (select id from zones where code = 'INSU'),
    '2028-01-17',
    'https://www.carmeuse.com/sites/default/files/2023-06/sds_-_hydrated_lime_-_spanish.pdf',
    'HDS_Cal_Hidratada_Carmeuse.pdf',
    (select id from users where name = 'Bodega Demo')
  );

select name, hazard_class, quantity, unit from substances order by id;
