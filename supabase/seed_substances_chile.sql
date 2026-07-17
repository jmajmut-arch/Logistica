insert into substances (name, hazard_class, quantity, unit, zone_id, expiration_date, sds_uri, sds_file_name, created_by)
values
  (
    'Acido sulfurico 98%',
    'class8_corrosives',
    25,
    'l',
    (select id from zones where code = 'B1'),
    '2029-07-17',
    'https://www.merckmillipore.com/Web-CH-Site/de_DE/-/CHF/ShowDocument-File?ProductSKU=MDA_CHEM-100731&DocumentType=MSD&DocumentId=100731_SDS_CL_ES.PDF&DocumentUID=295555&Language=ES&Country=CL&Origin=PDP',
    'HDS_Acido_Sulfurico_98_Merck_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Acido clorhidrico 37%',
    'class8_corrosives',
    20,
    'l',
    (select id from zones where code = 'B1'),
    '2028-01-17',
    'https://www.merckmillipore.com/CL/es/product/msds/MDA_CHEM-109057',
    'HDS_Acido_Clorhidrico_Merck_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Hidroxido de sodio (solucion)',
    'class8_corrosives',
    15,
    'l',
    (select id from zones where code = 'B1'),
    '2029-01-17',
    'https://www.merckmillipore.com/Web-DE-Site/en_US/-/EUR/ShowDocument-File?ProductSKU=MDA_CHEM-106498&DocumentType=MSD&DocumentId=106498_SDS_CL_ES.PDF&DocumentUID=364224&Language=ES&Country=CL&Origin=null',
    'HDS_Hidroxido_Sodio_Merck_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Hipoclorito de sodio (solucion)',
    'class8_corrosives',
    20,
    'l',
    (select id from zones where code = 'B1'),
    '2026-10-15',
    'https://www.merckmillipore.com/Web-CO-Site/en_US/-/COP/ShowDocument-File?ProductSKU=MDA_CHEM-105614&DocumentType=MSD&DocumentId=105614_SDS_CO_ES.PDF&DocumentUID=352231&Language=ES&Country=CO&Origin=null',
    'HDS_Hipoclorito_Sodio_Merck_CO.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Peroxido de hidrogeno 30%',
    'class5_oxidizers',
    10,
    'l',
    (select id from zones where code = 'B1'),
    '2027-01-17',
    'https://www.merckmillipore.com/Web-DE-Site/en_US/-/EUR/ShowDocument-File?ProductSKU=MDA_CHEM-107209&DocumentType=MSD&DocumentId=107209_SDS_PE_ES.PDF&DocumentUID=6501870&Language=ES&Country=PE&Origin=PDP',
    'HDS_Peroxido_Hidrogeno_Merck_PE.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Gasolina 93 octanos',
    'class3_flammable_liquids',
    40,
    'l',
    (select id from zones where code = 'A1'),
    '2027-01-15',
    'https://www.sec.cl/sitio-web/wp-content/uploads/2019/06/HDS_COPEC_GASOLINA_SP_93.pdf',
    'HDS_Copec_Gasolina_93_SEC.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Petroleo diesel',
    'class3_flammable_liquids',
    60,
    'l',
    (select id from zones where code = 'A1'),
    '2027-07-17',
    'https://www.sec.cl/sitio-web/wp-content/uploads/2019/06/HDS_COPEC_PETROLEO_DIESEL_ULTRA.pdf',
    'HDS_Copec_Diesel_Ultra_SEC.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Etanol 96 grados',
    'class3_flammable_liquids',
    30,
    'l',
    (select id from zones where code = 'A1'),
    '2028-07-17',
    'https://www.merckmillipore.com/MX/es/product/msds/MDA_CHEM-100983',
    'HDS_Etanol_Merck_MX.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Gas licuado de petroleo (GLP)',
    'class2_gases',
    45,
    'kg',
    (select id from zones where code = 'A2'),
    '2036-07-17',
    'http://www.mininco.cl/maderas/sigex/pages/abrearchivo2.asp?arch=archivos%2F1705%2FHDS+GAS+LIPIGAS.pdf',
    'HDS_GLP_Lipigas.pdf',
    (select id from users where name = 'Bodega Demo')
  ),
  (
    'Oxigeno comprimido',
    'class2_gases',
    50,
    'kg',
    (select id from zones where code = 'A2'),
    '2031-07-17',
    'http://www.indura.cl/Descargar/Ox%C3%ADgeno?path=/content/storage/cl/biblioteca/e6c4c65ea426493ea2ded2c57085008c.pdf',
    'HDS_Oxigeno_Indura_CL.pdf',
    (select id from users where name = 'Bodega Demo')
  );

select name, hazard_class, quantity, unit from substances order by id;
