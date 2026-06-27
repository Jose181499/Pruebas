// ============================================================
// MÓDULO MAESTROS - ERP Multiempresa
// ============================================================

console.log('📦 Módulo Maestros cargando...');

// ============================================================
// CONSTANTES Y ESTADO GLOBAL
// ============================================================
const CU = 'Erika';
const SK = 'erp2026_m02_v74_';
const MAESTROS = ['clientes','proveedores','almacenes','categorias','marcas','um'];

/* Permisos por usuario: nivel 2 puede descargar */
const PERMISOS = {
  'Erika': { nivel:2, descarga:true },
  'Edith': { nivel:2, descarga:true },
  'Carlos':{ nivel:1, descarga:false },
  'Ana':   { nivel:1, descarga:false }
};

/* ══════════════════════════════════════════════════════
   CONFIGURACIÓN DE MÓDULOS
══════════════════════════════════════════════════════ */
const MODS = {
  clientes:{
    title:'Clientes', singular:'cliente', icon:'👤', unique:'numero',
    subtitle:'Base para cotizaciones, ventas y cuentas por cobrar.',
    fields:[
      {n:'ambito',  l:'Ámbito',           t:'select', opts:['COMPARTIDO','KCF','AGD'], req:true},
      {n:'tipoDoc', l:'Tipo documento',    t:'select', opts:['RUC','DNI','CE']},
      {n:'numero',  l:'N° documento',      t:'text'},
      {n:'nombre',  l:'Razón social',      t:'text',   req:true, full:true},
      {n:'contacto',l:'Contacto',          t:'text',   req:true},
      {n:'telefono',l:'Teléfono',          t:'text'},
      {n:'email',   l:'Correo',            t:'text'},
      {n:'condicion',l:'Condición',        t:'select', opts:['Contado','Crédito aprobado','Bloqueado'], req:true},
      {n:'estado',  l:'Estado',            t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',     l:'Observación',       t:'textarea',full:true}
    ],
    cols:['ambito','numero','nombre','contacto','telefono','condicion','estado']
  },
  proveedores:{
    title:'Proveedores', singular:'proveedor', icon:'🏭', unique:'numero',
    subtitle:'Base para compras, recepción y cuentas por pagar.',
    fields:[
      {n:'ambito',   l:'Ámbito',           t:'select', opts:['COMPARTIDO','KCF','AGD'], req:true},
      {n:'tipo',     l:'Tipo proveedor',   t:'select', opts:['Recurrente','Web','Ocasional','Servicio','Única compra'], req:true},
      {n:'tipoDoc',  l:'Tipo documento',   t:'select', opts:['RUC','DNI','CE']},
      {n:'numero',   l:'RUC / documento',  t:'text',   req:true},
      {n:'nombre',   l:'Razón social',     t:'text',   req:true, full:true},
      {n:'nombreComercial', l:'Nombre comercial', t:'text'},
      {n:'direccionFiscal', l:'Dirección fiscal', t:'text', full:true},
      {n:'contacto', l:'Nombre contacto',  t:'text',   req:true},
      {n:'cargo',    l:'Cargo',            t:'text'},
      {n:'telefono', l:'Teléfono',         t:'text'},
      {n:'email',    l:'Correo',           t:'text'},
      {n:'banco',    l:'Banco',            t:'select', opts:['BCP','BBVA','Interbank','Scotiabank','Banco de la Nación','BanBif','Pichincha','MiBanco','Caja Arequipa','Caja Piura','Otro']},
      {n:'tipoCuenta',l:'Tipo cuenta',     t:'select', opts:['Cuenta corriente','Cuenta de ahorros','Detracciones','Otra']},
      {n:'cuenta',   l:'N° cuenta',        t:'text'},
      {n:'cci',      l:'CCI',              t:'text'},
      {n:'titularCuenta', l:'Titular cuenta', t:'text'},
      {n:'condicion',l:'Condición de pago',t:'select', opts:['Contado','Crédito 7 días','Crédito 15 días','Crédito 30 días','Crédito 45 días','Crédito 60 días','Crédito 90 días'], req:true},
      {n:'lineaCredito', l:'Línea de crédito', t:'text'},
      {n:'moneda',   l:'Moneda',           t:'select', opts:['Soles','Dólares']},
      {n:'descuento',l:'Descuento negociado',t:'text'},
      {n:'puntoRecojo',    l:'Punto de recojo',    t:'text'},
      {n:'direccionRecojo',l:'Dirección de recojo', t:'text'},
      {n:'googleMapsRecojo',l:'Link Google Maps',  t:'text'},
      {n:'horarioRecojo',  l:'Horario de atención',t:'text'},
      {n:'contactoRecojo', l:'Contacto almacén',   t:'text'},
      {n:'telefonoRecojo', l:'Teléfono almacén',   t:'text'},
      {n:'instruccionesRecojo',l:'Instrucciones de recojo',t:'textarea',full:true},
      {n:'estado',   l:'Estado proveedor', t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',      l:'Observaciones internas',   t:'textarea',full:true}
    ],
    cols:['ambito','tipo','numero','nombre','telefono','condicion','estado']
  },
  almacenes:{
    title:'Almacenes', singular:'almacén', icon:'📦', unique:'codigo',
    subtitle:'Controla dónde está la mercadería y quién responde.',
    fields:[
      {n:'empresa',  l:'Empresa',           t:'select', opts:['KCF','AGD'], req:true},
      {n:'codigo',   l:'Código almacén',    t:'text',   req:true},
      {n:'nombre',   l:'Nombre de almacén', t:'text',   req:true},
      {n:'tipo',     l:'Tipo de almacén',   t:'select', opts:['Principal','Secundario','Temporal','Consignación','Virtual'], req:true},
      {n:'responsable', l:'Responsable',    t:'text',   req:true},
      {n:'responsableCargo', l:'Cargo responsable', t:'text'},
      {n:'telefono', l:'Teléfono',          t:'text'},
      {n:'email',    l:'Correo responsable',t:'text'},
      {n:'direccion',l:'Dirección',         t:'text',   full:true},
      {n:'googleMaps',l:'Link Google Maps', t:'text'},
      {n:'horario',  l:'Horario de atención',t:'text'},
      {n:'instrucciones',l:'Instrucciones internas',t:'textarea',full:true},
      {n:'estado',   l:'Estado almacén',    t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',      l:'Observaciones internas',t:'textarea',full:true}
    ],
    cols:['empresa','codigo','nombre','tipo','responsable','telefono','estado']
  },
  categorias:{
    title:'Categorías', singular:'categoría', icon:'🗂', unique:'codigo',
    subtitle:'Clasifica productos para cotizar, comprar y reportar.',
    fields:[
      {n:'ambito',l:'Ámbito',      t:'select', opts:['COMPARTIDO','KCF','AGD'], req:true},
      {n:'codigo',l:'Código',      t:'text',   req:true},
      {n:'nombre',l:'Categoría',   t:'select', opts:[], req:true},
      {n:'tipo',  l:'Subcategoría',t:'select', opts:[], req:true},
      {n:'estado',l:'Estado',      t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',   l:'Observaciones internas',t:'textarea',full:true}
    ],
    cols:['ambito','codigo','nombre','tipo','estado']
  },
  marcas:{
    title:'Marcas', singular:'marca', icon:'🏷', unique:'codigo',
    subtitle:'Controla marcas originales, alternativas y homologadas.',
    fields:[
      {n:'ambito',   l:'Ámbito',     t:'select', opts:['COMPARTIDO','KCF','AGD'], req:true},
      {n:'codigo',   l:'Código marca',t:'text',  req:true},
      {n:'nombre',   l:'Marca',       t:'text',  req:true},
      {n:'tipo',     l:'Tipo marca',  t:'select', opts:['Original','Alternativa','Homologada','Genérica','Por validar'], req:true},
      {n:'paisOrigen',l:'País de origen',t:'text'},
      {n:'proveedorReferencia',l:'Proveedor referencia',t:'text'},
      {n:'webMarca', l:'Web / catálogo',t:'text'},
      {n:'estado',   l:'Estado marca',t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',      l:'Observaciones internas',t:'textarea',full:true}
    ],
    cols:['ambito','codigo','nombre','tipo','estado']
  },
  um:{
    title:'Unidades de medida', singular:'unidad', icon:'📏', unique:'codigo',
    subtitle:'Define cómo compras, vendes e inventarias los productos.',
    fields:[
      {n:'ambito', l:'Ámbito',           t:'select', opts:['COMPARTIDO','KCF','AGD'], req:true},
      {n:'codigo', l:'Código',           t:'text',   req:true},
      {n:'simbolo',l:'Abreviatura',      t:'text',   req:true},
      {n:'nombre', l:'Unidad',           t:'text',   req:true},
      {n:'tipo',   l:'Tipo',             t:'select', opts:['Cantidad','Peso','Longitud','Empaque','Servicio'], req:true},
      {n:'decimal',l:'Permite decimales',t:'select', opts:['Sí','No'], req:true},
      {n:'estado', l:'Estado',           t:'select', opts:['Activo','Observado','Bloqueado','Inactivo'], req:true},
      {n:'obs',    l:'Observación',      t:'textarea',full:true}
    ],
    cols:['ambito','codigo','simbolo','nombre','tipo','decimal','estado']
  }
};

/* Mapa de categorías / subcategorías y códigos */
const CAT_MAP = {"Mobiliario de oficina":["Sillas operativas","Sillas gerenciales","Sillas ergonómicas","Sillas visitantes y capacitación","Escritorios y mesas","Archivadores, anaqueles y lockers","Accesorios ergonómicos","Repuestos de sillas"],"Útiles, papelería y organización":["Papel, cartulina y formatos","Lapiceros, plumones y marcadores","Archivadores, files y folders","Engrapadoras, grapas y perforadores","Tijeras, cuchillas y cortadores","Etiquetas, rotuladoras y cintas de rotulado","Pizarras, plumones y accesorios","Embalaje menor de oficina"],"Tecnología, cómputo y audiovisuales":["Periféricos de cómputo","Almacenamiento digital","Audio, video y comunicación","Redes y conectividad","Energía, estabilizadores y supresores","Impresión, rotulación y consumibles","Equipos móviles y accesorios","Drones, cámaras y equipos especiales"],"Electrodomésticos, cafetería y menaje":["Electrodomésticos menores","Refrigeración y conservación","Menaje y utensilios","Cafetería y consumo interno","Envases, vasos y descartables"],"Limpieza, higiene y ambiente":["Limpieza general","Limpieza industrial","Higiene personal","Desinfección y sanitización","Ambientadores y control de olores","Paños, esponjas y absorbentes","Dispensadores y accesorios de limpieza"],"EPP - protección de cabeza y rostro":["Cascos de seguridad","Barbiquejos y accesorios de casco","Caretas faciales","Capuchas, balaclavas y cubrenuca","Protección facial para soldadura"],"EPP - protección visual y auditiva":["Lentes de seguridad","Micas, lunas y visores","Lavaojos y accesorios","Tapones auditivos","Orejeras auditivas"],"EPP - protección respiratoria":["Mascarillas descartables","Respiradores reutilizables","Cartuchos, filtros y retenedores","Respiración para emergencia","Accesorios de protección respiratoria"],"EPP - protección de manos, pies y cuerpo":["Guantes de seguridad","Botas, botines y punteras","Ropa de trabajo y uniformes","Chalecos y prendas reflectivas","Mandiles, casacas y cuero de soldador","Rodilleras, escarpines y mangas","Impermeables y protección química"],"Señalización, demarcación y seguridad vial":["Conos de seguridad","Cadenas, barreras y delimitadores","Cintas de señalización y demarcación","Postes, parantes y bases","Varas luminosas y luces de emergencia","Letreros, placas y señalética","Caballete, conos plegables y accesorios"],"Emergencia, primeros auxilios y rescate":["Extintores y accesorios","Botiquines y reposición de botiquín","Camillas e inmovilizadores","Kit antiderrame y contención","Duchas, lavaojos y emergencia química","Rescate técnico","Detectores, alarmas y monitoreo","Oxígeno portátil y accesorios"],"Trabajo en altura y bloqueo/etiquetado":["Arneses de seguridad","Líneas de vida y eslingas","Retráctiles y conectores","Anclajes y accesorios de altura","Candados de bloqueo","Bloqueadores y tarjetas LOTO"],"Herramientas manuales, eléctricas y neumáticas":["Herramientas manuales","Herramientas eléctricas","Herramientas inalámbricas y baterías","Herramientas neumáticas","Instrumentos de medición manual","Herramientas de corte y perforación","Carretillas, carros y equipos de apoyo","Accesorios y repuestos de herramientas"],"Abrasivos, corte, perforación y soldadura":["Discos abrasivos y de corte","Lijas y abrasivos especiales","Brocas, fresas y machos","Soldadura, oxicorte y accesorios","Antorchas, boquillas, toberas y difusores","Equipos y consumibles para soldar"],"Adhesivos, sellantes, cintas y químicos industriales":["Cintas adhesivas industriales","Cintas de embalaje y oficina","Adhesivos y pegamentos","Sellantes, siliconas y trabadores","Limpiadores y desengrasantes","Solventes, thinner y removedores","Anticorrosivos y protectores","Pinturas, lacas y accesorios","Lubricantes especiales y aflojatodo"],"Material eléctrico, iluminación y conectividad":["Cables, terminales y conectores","Canaletas, tubos y accesorios","Tableros, cajas y gabinetes eléctricos","Contactores, relés y guardamotores","Pulsadores, selectores y controles","Fusibles, portafusibles y protección eléctrica","Iluminación industrial","Baterías, cargadores y energía portátil","Instrumentos eléctricos de medición"],"Embalaje, manipuleo y almacenamiento":["Stretch film, film y plástico de embalaje","Zunchos y accesorios de enzunchado","Cajas, cartón y esquineros","Parihuelas, bandejas y contenedores","Ganchos, grilletes y accesorios de izaje","Tecles, garruchas y equipos de carga","Estantería, racks y anaqueles industriales"],"Mangueras, conexiones e hidráulica ligera":["Mangueras y acoples","Niples, uniones y conectores","Válvulas y accesorios","Manómetros e indicadores","Aire comprimido y accesorios"],"Filtros, lubricantes y mantenimiento preventivo":["Filtros de aire","Filtros de aceite","Filtros de combustible","Filtros hidráulicos","Aceites y lubricantes","Grasas y pastas","Refrigerantes y aditivos","Kits de mantenimiento"],"Transmisión, rodamientos y sellos":["Fajas y correas","Rodamientos y chumaceras","Retenes, sellos y empaquetaduras","Cadenas y piñones","Pernos, tuercas y fijaciones","Acoplamientos y elementos de transmisión"],"Componentes hidráulicos y neumáticos":["Cilindros y pistones","Bombas hidráulicas","Válvulas hidráulicas y neumáticas","Mangueras hidráulicas","Racores y conexiones hidráulicas","Sellos y kits hidráulicos","Compresores y accesorios neumáticos"],"Repuestos y componentes de maquinaria pesada":["Repuestos eléctricos de maquinaria","Repuestos mecánicos de maquinaria","Componentes de motor","Componentes de tren de rodamiento","Componentes de cabina y carrocería","Consumibles técnicos de mantenimiento","Accesorios bajo muestra o código parte"],"Campañas, regalos y solicitudes eventuales":["Regalos corporativos","Canastas, campañas y fechas especiales","Alimentos, panetones y consumo especial","Souvenirs y merchandising","Solicitudes únicas del cliente"],"Salud, farmacia y botiquín especial":["Medicamentos de botiquín","Material médico básico","Curaciones y vendajes","Insumos de primeros auxilios","Reposiciones especiales de salud ocupacional"],"Servicios y conceptos no inventariables":["Calibración y certificación","Flete, transporte y reparto","Instalación y configuración","Mantenimiento y reparación","Pólizas, seguros y SCTR","Servicios tercerizados bajo pedido"],"Por clasificar":["Por clasificar","Requiere revisión comercial","Requiere revisión técnica","Requiere revisión logística"]};
const CAT_CODES = {"Mobiliario de oficina":"CAT001","Útiles, papelería y organización":"CAT002","Tecnología, cómputo y audiovisuales":"CAT003","Electrodomésticos, cafetería y menaje":"CAT004","Limpieza, higiene y ambiente":"CAT005","EPP - protección de cabeza y rostro":"CAT006","EPP - protección visual y auditiva":"CAT007","EPP - protección respiratoria":"CAT008","EPP - protección de manos, pies y cuerpo":"CAT009","Señalización, demarcación y seguridad vial":"CAT010","Emergencia, primeros auxilios y rescate":"CAT011","Trabajo en altura y bloqueo/etiquetado":"CAT012","Herramientas manuales, eléctricas y neumáticas":"CAT013","Abrasivos, corte, perforación y soldadura":"CAT014","Adhesivos, sellantes, cintas y químicos industriales":"CAT015","Material eléctrico, iluminación y conectividad":"CAT016","Embalaje, manipuleo y almacenamiento":"CAT017","Mangueras, conexiones e hidráulica ligera":"CAT018","Filtros, lubricantes y mantenimiento preventivo":"CAT019","Transmisión, rodamientos y sellos":"CAT020","Componentes hidráulicos y neumáticos":"CAT021","Repuestos y componentes de maquinaria pesada":"CAT022","Campañas, regalos y solicitudes eventuales":"CAT023","Salud, farmacia y botiquín especial":"CAT024","Servicios y conceptos no inventariables":"CAT025","Por clasificar":"CAT099"};
const CAT_LIST = Object.keys(CAT_MAP);

/* Poblar opciones de categorías en MODS */
MODS.categorias.fields.find(f=>f.n==='nombre').opts = CAT_LIST;
MODS.categorias.fields.find(f=>f.n==='tipo').opts = CAT_MAP[CAT_LIST[0]] || [];

/* ══════════════════════════════════════════════════════
   DATOS Y PERSISTENCIA
══════════════════════════════════════════════════════ */
const DS = {}; // datasets
const LOGS = {};
const SELECTED = {};
let sheetMode = {}; // 'principal' | 'completa' por módulo

const DEFAULTS = {
  clientes:[
    {id:1,ambito:'COMPARTIDO',tipoDoc:'RUC',numero:'20100070970',nombre:'KOMATSU-MITSUI MAQUINARIAS PERÚ S.A.',nombreComercial:'KOMATSU-MITSUI',direccionFiscal:'Av. Argentina 4453, Callao',contacto:'Compras',telefono:'999 111 222',email:'compras@cliente.com',condicion:'Crédito aprobado',diasCredito:'30',limiteCredito:'',descuento:'',estado:'Activo',obs:'Cliente recurrente.',contactos:[{nombre:'Compras',cargo:'Jefe',telefono:'999 111 222',email:'compras@cliente.com',principal:true}],puntos:[{punto:'Principal',direccion:'Av. Argentina 4453, Callao',googleMaps:'',horario:'',contacto:'',telefono:'',instrucciones:'',principal:true}],creadoPor:'Erika',creadoEn:'2026-06-24 09:00',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 09:00',uso:8},
    {id:2,ambito:'KCF',tipoDoc:'RUC',numero:'20600000000',nombre:'CLIENTE INDUSTRIAL EJEMPLO S.A.C.',nombreComercial:'CLIENTE INDUSTRIAL',direccionFiscal:'Av. Javier Prado Oeste 1650',contacto:'Operaciones',telefono:'988 222 333',email:'operaciones@cliente.com',condicion:'Contado',diasCredito:'0',limiteCredito:'',descuento:'',estado:'Activo',obs:'',contactos:[],puntos:[],creadoPor:'Erika',creadoEn:'2026-06-24 09:10',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 09:10',uso:2},
    {id:3,ambito:'AGD',tipoDoc:'RUC',numero:'20500000000',nombre:'CONSTRUCTORA EJEMPLO S.A.C.',nombreComercial:'CONSTRUCTORA EJEMPLO',direccionFiscal:'Jr. Las Begonias 123, Lima',contacto:'Administración',telefono:'977 333 444',email:'admin@cliente.com',condicion:'Crédito aprobado',diasCredito:'30',limiteCredito:'',descuento:'',estado:'Observado',obs:'Revisar deuda.',contactos:[],puntos:[],creadoPor:'Erika',creadoEn:'2026-06-24 09:20',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 09:20',uso:1}
  ],
  proveedores:[
    {id:1,ambito:'COMPARTIDO',tipo:'Recurrente',tipoDoc:'RUC',numero:'20511111111',nombre:'ACEROS DEL PERÚ S.A.C.',nombreComercial:'ACEROS DEL PERÚ',direccionFiscal:'Av. Industrial 123, Lima',contacto:'Ventas',cargo:'Ejecutivo',telefono:'955 111 222',email:'ventas@aceros.com',banco:'BCP',tipoCuenta:'Cuenta corriente',cuenta:'',cci:'',titularCuenta:'ACEROS DEL PERÚ S.A.C.',condicion:'Crédito 30 días',lineaCredito:'',moneda:'Soles',descuento:'',puntoRecojo:'Almacén Callao',direccionRecojo:'Av. Argentina 1234, Callao',googleMapsRecojo:'',horarioRecojo:'Lun-Vie 9am-5pm',contactoRecojo:'',telefonoRecojo:'',instruccionesRecojo:'',estado:'Activo',obs:'Proveedor recurrente.',creadoPor:'Erika',creadoEn:'2026-06-24 10:00',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 10:00',uso:6}
  ],
  almacenes:[
    {id:1,empresa:'KCF',codigo:'ALM-SMP',nombre:'Almacén SMP',tipo:'Principal',responsable:'Armando',responsableCargo:'Encargado',telefono:'999 000 111',email:'',direccion:'San Martín de Porres',googleMaps:'',horario:'Lun-Vie 8am-6pm',instrucciones:'',estado:'Activo',obs:'Almacén principal.',creadoPor:'Erika',creadoEn:'2026-06-24 11:00',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 11:00',uso:12},
    {id:2,empresa:'AGD',codigo:'OF-BRE',nombre:'Oficina Breña',tipo:'Secundario',responsable:'Estrella',responsableCargo:'Asistente',telefono:'999 000 222',email:'',direccion:'Breña',googleMaps:'',horario:'',instrucciones:'',estado:'Activo',obs:'Entrega documentaria.',creadoPor:'Erika',creadoEn:'2026-06-24 11:08',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 11:08',uso:3}
  ],
  categorias: CAT_LIST.flatMap((cat,ci)=>
    (CAT_MAP[cat]||[]).map((sub,si)=>({
      id: ci*100+si+1,
      ambito:'COMPARTIDO',
      codigo:`${CAT_CODES[cat]}-S${String(si+1).padStart(3,'0')}`,
      nombre: cat,
      tipo: sub,
      estado:'Activo',
      obs:'Producto de cartera.',
      creadoPor:'Erika', creadoEn:'2026-06-26 00:00',
      actualizadoPor:'Erika', actualizadoEn:'2026-06-26 00:00',
      uso:0
    }))
  ),
  marcas:[
    {id:1,ambito:'COMPARTIDO',codigo:'DRAEGER',nombre:'Dräger',tipo:'Original',paisOrigen:'Alemania',proveedorReferencia:'',webMarca:'',estado:'Activo',obs:'Marca original.',creadoPor:'Erika',creadoEn:'2026-06-24 12:00',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 12:00',uso:3},
    {id:2,ambito:'COMPARTIDO',codigo:'ALT-KCF',nombre:'Alternativo KCF',tipo:'Alternativa',paisOrigen:'',proveedorReferencia:'',webMarca:'',estado:'Activo',obs:'Usar en cotización alterna.',creadoPor:'Erika',creadoEn:'2026-06-24 12:05',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 12:05',uso:2}
  ],
  um:[
    {id:1,ambito:'COMPARTIDO',codigo:'UND',simbolo:'und',nombre:'Unidad',tipo:'Cantidad',decimal:'No',estado:'Activo',obs:'',creadoPor:'Erika',creadoEn:'2026-06-24 12:20',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 12:20',uso:18},
    {id:2,ambito:'COMPARTIDO',codigo:'KG', simbolo:'kg', nombre:'Kilogramo',tipo:'Peso',decimal:'Sí',estado:'Activo',obs:'',creadoPor:'Erika',creadoEn:'2026-06-24 12:21',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 12:21',uso:4},
    {id:3,ambito:'KCF',       codigo:'CJ', simbolo:'cj', nombre:'Caja',tipo:'Empaque',decimal:'No',estado:'Activo',obs:'',creadoPor:'Erika',creadoEn:'2026-06-24 12:22',actualizadoPor:'Erika',actualizadoEn:'2026-06-24 12:22',uso:2}
  ]
};

function load(key){ try{ const d=localStorage.getItem(SK+key); return d?JSON.parse(d):null; }catch(e){ return null; } }
function save(key,val){ localStorage.setItem(SK+key,JSON.stringify(val)); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

function initData(){
  MAESTROS.forEach(m=>{
    DS[m]     = load(m) || clone(DEFAULTS[m]);
    LOGS[m]   = load(m+'_log') || [];
    SELECTED[m] = DS[m][0]?.id || null;
    sheetMode[m] = 'principal';
  });
}

function persist(m){ save(m,DS[m]); }
function pushLog(m,empresa,accion,detalle){
  LOGS[m].unshift({fecha:now(),empresa,accion,detalle,usuario:CU});
  LOGS[m]=LOGS[m].slice(0,25);
  save(m+'_log',LOGS[m]);
}

/* ══════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════ */
function now(){
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function esc(v){ return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function sd(v){ return (v===undefined||v===null||String(v).trim()==='') ? '-' : esc(v); }
function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2400); }
function fecha(v){
  if(!v) return '-';
  const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}${m[4]?'<br>'+m[4]:''}`;
  return esc(v);
}
function empresa(){ return document.getElementById('empresaActiva')?.value||'KCF'; }
function visible(r){ const e=empresa(); return r.ambito==='COMPARTIDO'||r.ambito===e||!r.ambito; }
function normalize(n,v){ let s=String(v??'').trim(); if(['codigo','numero'].includes(n)) s=s.toUpperCase().replace(/\s+/g,'-'); if(n==='simbolo') s=s.toLowerCase(); return s; }
function clientCode(r){ return r.codigoCliente||`CLI-${String(r.id||0).padStart(6,'0')}`; }
function primaryContact(r){ return (r.contactos?.length ? r.contactos.find(c=>c.principal)||r.contactos[0] : null) || {nombre:r.contacto||'',telefono:r.telefono||'',email:r.email||''}; }
function primaryPoint(r){ return (r.puntos?.length ? r.puntos.find(p=>p.principal)||r.puntos[0] : null) || {}; }

/* ── BADGES ── */
function bAmbito(v){
  if(v==='KCF')        return '<span class="badge b-kcf">Solo KCF</span>';
  if(v==='AGD')        return '<span class="badge b-agd">Solo AGD</span>';
  return '<span class="badge b-shared">Compartido</span>';
}
function bEstado(v){
  if(v==='Activo')    return '<span class="badge b-ok">Activo</span>';
  if(v==='Observado') return '<span class="badge b-warn">Observado</span>';
  if(v==='Bloqueado') return '<span class="badge b-block">Bloqueado</span>';
  return '<span class="badge b-gray">Inactivo</span>';
}
function bVal(n,v){
  if(n==='ambito') return bAmbito(v);
  if(n==='estado') return bEstado(v);
  if(n==='decimal') return v==='Sí'?'<span class="badge b-info">Sí</span>':'<span class="badge b-gray">No</span>';
  return sd(v);
}

/* ── TEMA DE TABLA (devuelve objeto de colores según filtro activo) ── */
function getTableTheme(m){
  const f=(document.getElementById('ambito_'+m)||{}).value||'VISIBLE';
  const e=empresa();
  const THEMES={
    KCF:        {th:'#FFF1F2',thText:'#7F1D1D',thBorder:'#FCA5A5',tdBorder:'#FECDD3',stripe:'#FFF5F6'},
    AGD:        {th:'#FFEDD5',thText:'#7C2D12',thBorder:'#FDBA74',tdBorder:'#FED7AA',stripe:'#FFF8F1'},
    COMPARTIDO: {th:'#DBEAFE',thText:'#1E3A8A',thBorder:'#93C5FD',tdBorder:'#BFDBFE',stripe:'#EFF6FF'},
    TODOS:      {th:'#EDE9FE',thText:'#4C1D95',thBorder:'#A78BFA',tdBorder:'#DDD6FE',stripe:'#F5F3FF'}
  };
  if(f==='KCF')        return THEMES.KCF;
  if(f==='AGD')        return THEMES.AGD;
  if(f==='COMPARTIDO') return THEMES.COMPARTIDO;
  if(f==='TODOS')      return THEMES.TODOS;
  /* VISIBLE → empresa activa */
  return e==='AGD' ? THEMES.AGD : THEMES.KCF;
}

/* ══════════════════════════════════════════════════════
   TEMAS / EMPRESA
══════════════════════════════════════════════════════ */
function applyTheme(code){
  const r=document.documentElement;
  if(code==='AGD'){
    r.style.setProperty('--em','#FC6200');
    r.style.setProperty('--em-soft','#FFE7D1');
    r.style.setProperty('--em-side','#FFEEDC');
    document.getElementById('logoEmpresa').textContent='AGD';
  } else {
    r.style.setProperty('--em','#EF233C');
    r.style.setProperty('--em-soft','#FFE4E8');
    r.style.setProperty('--em-side','#FFECEF');
    document.getElementById('logoEmpresa').textContent='KCF';
  }
}

/* ══════════════════════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════════════════════ */
let currentScreen = 'clientes';

function openScreen(screen){
  currentScreen = screen;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  (document.getElementById(screen)||document.getElementById('clientes')).classList.add('active');
  document.querySelectorAll('.menu-header,.child-btn,.tab-btn').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll(`[data-screen="${screen}"]`).forEach(el=>el.classList.add('active'));
  if(MAESTROS.includes(screen)){
    document.querySelector('.menu-header[data-screen="clientes"]')?.classList.add('active');
  }
  renderScreen(screen);
  document.getElementById('mainPanel').scrollTo({top:0,behavior:'smooth'});
}

/* ══════════════════════════════════════════════════════
   FILTROS
══════════════════════════════════════════════════════ */
function filtered(m){
  const q=(document.getElementById('search_'+m)?.value||'').toLowerCase().trim();
  const st=document.getElementById('estado_'+m)?.value||'TODOS';
  const am=document.getElementById('ambito_'+m)?.value||'VISIBLE';
  return DS[m].filter(r=>{
    const okQ=!q||JSON.stringify(r).toLowerCase().includes(q);
    const okSt=st==='TODOS'||(r.estado||'Activo')===st;
    const okAm=am==='TODOS'||(am==='VISIBLE'?visible(r):r.ambito===am);
    return okQ&&okSt&&okAm;
  });
}

/* ══════════════════════════════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════════════════════════════ */
function renderScreen(screen){
  if(!MAESTROS.includes(screen)){
    const el=document.getElementById(screen);
    if(el) el.innerHTML=`<div class="panel" style="padding:20px"><div class="panel-title">${esc(screen.charAt(0).toUpperCase()+screen.slice(1))}</div><p class="panel-help" style="margin-top:6px">Módulo en construcción.</p></div>`;
    return;
  }
  screen==='clientes' ? renderClientes() : renderMaestro(screen);
}

/* ── RENDER CLIENTES ── */
function renderClientes(){
  const list=filtered('clientes');
  const count=st=>DS.clientes.filter(r=>(r.estado||'Activo')===st).length;

  document.getElementById('clientes').innerHTML = `
    <div class="client-status-board">
      <div class="client-status-card status-active"><div class="client-status-dot">A</div><div><small>Activos</small><b>${count('Activo')}</b></div></div>
      <div class="client-status-card status-observed"><div class="client-status-dot">!</div><div><small>Observados</small><b>${count('Observado')}</b></div></div>
      <div class="client-status-card status-blocked"><div class="client-status-dot">B</div><div><small>Bloqueados</small><b>${count('Bloqueado')}</b></div></div>
    </div>
    <div class="panel">
      <div class="clean-header">
        <div class="master-title-wrap"><div class="master-title">Clientes</div><div class="master-subtitle">Base comercial de clientes y prospectos</div></div>
        <div class="search-box"><input type="text" id="search_clientes" placeholder="Buscar por código, razón social, RUC, contacto..."></div>
        <div class="clean-actions">
          <select id="ambito_clientes"><option value="VISIBLE">Empresa activa</option><option value="TODOS">Todos</option><option value="COMPARTIDO">Compartidos</option><option value="KCF">KCF</option><option value="AGD">AGD</option></select>
          <select id="estado_clientes"><option value="TODOS">Estados</option><option value="Activo">Activos</option><option value="Observado">Observados</option><option value="Bloqueado">Bloqueados</option><option value="Inactivo">Inactivos</option></select>
          <button class="btn btn-secondary" data-bulk="clientes">Importar</button>
          <button class="btn btn-primary btn-create" data-new="clientes">+ Crear cliente</button>
        </div>
      </div>
      <div class="security-note"><b>Seguridad:</b> la descarga de data queda bloqueada. Solo Gerencia/Administrador podrá autorizar exportaciones.</div>
      <div class="table-scroll">${renderClientTable(list)}</div>
      <div class="bottom-sheet">
        <div class="bottom-left">
          <span class="bottom-label">Vista de datos</span>
          <div class="page-group">
            <button class="page-btn ${sheetMode.clientes==='principal'?'active':''}" data-sheet="clientes|principal"><span class="page-num">1</span>Principal</button>
            <button class="page-btn ${sheetMode.clientes==='completa'?'active':''}" data-sheet="clientes|completa"><span class="page-num">2</span>Completa</button>
          </div>
        </div>
        <div class="bottom-help">${sheetMode.clientes==='principal'?'Datos comerciales clave para trabajar rápido.':'Todos los campos adicionales registrados en la ficha.'}</div>
      </div>
    </div>`;

  bindFilters('clientes', renderClientes);
}

function renderClientTable(list){
  if(!list.length) return '<div style="padding:20px;text-align:center;color:#64748B;font-weight:800">No se encontraron clientes.</div>';
  const t=getTableTheme('clientes');
  const thS=`style="background:${t.th};color:${t.thText};border:1px solid ${t.thBorder};position:sticky;top:0;z-index:10;padding:8px;font-size:10px;font-weight:1000;white-space:nowrap;box-shadow:0 2px 4px rgba(15,23,42,.10)"`;
  const tdS=(i)=>`style="border:1px solid ${t.tdBorder};background:${i%2===0?'#fff':t.stripe}"`;

  if(sheetMode.clientes==='principal'){
    const rows=list.map((r,i)=>{
      const c=primaryContact(r);
      const ts=tdS(i);
      return `<tr class="${r.estado==='Inactivo'?'disabled':''}">
        <td ${ts}><b>${i+1}</b></td><td ${ts}>${fecha(r.actualizadoEn||r.creadoEn)}</td>
        <td ${ts}>${bAmbito(r.ambito)}</td>
        <td ${ts}><span class="code-pill">${clientCode(r)}</span></td>
        <td ${ts} class="left"><b>${sd(r.nombre||r.nombreComercial)}</b></td>
        <td ${ts}>${r.numero?sd(r.numero):'<span class="badge b-gray">Pendiente</span>'}</td>
        <td ${ts} class="left">${sd(c.nombre||r.contacto)}</td><td ${ts}>${sd(c.telefono||r.telefono)}</td>
        <td ${ts} class="left">${sd(c.email||r.email)}</td>
        <td ${ts}>${sd(r.condicion||'Contado')}</td><td ${ts}>${bEstado(r.estado||'Activo')}</td>
        <td ${ts}><div style="display:flex;gap:5px;justify-content:center">
          <button class="action-btn action-view" data-view="clientes|${r.id}">👁 Ver</button>
          <button class="action-btn action-edit" data-edit="clientes|${r.id}">✎ Editar</button>
          <button class="action-btn action-delete" data-toggle="clientes|${r.id}">${r.estado==='Inactivo'?'Activar':'Inactivar'}</button>
        </div></td>
      </tr>`;
    }).join('');
    return `<table class="master-table"><thead><tr><th ${thS}>Item</th><th ${thS}>Actualizado</th><th ${thS}>Ámbito</th><th ${thS}>Código</th><th ${thS}>Razón social</th><th ${thS}>RUC/DNI</th><th ${thS}>Contacto</th><th ${thS}>Teléfono</th><th ${thS}>Correo</th><th ${thS}>Condición</th><th ${thS}>Estado</th><th ${thS} style="min-width:200px;background:${t.th};color:${t.thText};border:1px solid ${t.thBorder};position:sticky;top:0;z-index:10;padding:8px;font-size:10px;font-weight:1000">Acciones</th></tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    const rows=list.map((r,i)=>{
      const c=primaryContact(r); const p=primaryPoint(r);
      const ts=tdS(i);
      return `<tr class="${r.estado==='Inactivo'?'disabled':''}">
        <td ${ts}><b>${i+1}</b></td><td ${ts}><span class="code-pill">${clientCode(r)}</span></td>
        <td ${ts} class="left"><b>${sd(r.nombre)}</b></td><td ${ts} class="left">${sd(r.nombreComercial)}</td>
        <td ${ts} class="left">${sd(r.direccionFiscal)}</td><td ${ts}>${sd(r.limiteCredito)}</td>
        <td ${ts}>${r.diasCredito==='0'?'Contado':sd(r.diasCredito)+' días'}</td><td ${ts}>${sd(r.descuento)}</td>
        <td ${ts} class="left">${sd(p.punto)}</td><td ${ts} class="left">${sd(p.direccion)}</td>
        <td ${ts} class="left">${sd(p.googleMaps)}</td><td ${ts}>${sd(p.horario)}</td>
        <td ${ts} class="left">${sd(p.instrucciones)}</td><td ${ts} class="left">${sd(r.obs)}</td>
        <td ${ts}>${fecha(r.creadoEn)}</td><td ${ts}>${sd(r.creadoPor)}</td>
        <td ${ts}>${r.uso>0?`<span class="badge b-warn">${r.uso}</span>`:'<span class="badge b-ok">0</span>'}</td>
        <td ${ts}><div style="display:flex;gap:5px;justify-content:center">
          <button class="action-btn action-view" data-view="clientes|${r.id}">👁</button>
          <button class="action-btn action-edit" data-edit="clientes|${r.id}">✎</button>
        </div></td>
      </tr>`;
    }).join('');
    return `<table class="master-table" style="min-width:1600px"><thead><tr><th ${thS}>Item</th><th ${thS}>Código</th><th ${thS}>Razón social</th><th ${thS}>Nombre comercial</th><th ${thS}>Dir. fiscal</th><th ${thS}>Límite crédito</th><th ${thS}>Días crédito</th><th ${thS}>Descuento</th><th ${thS}>Punto entrega</th><th ${thS}>Dir. entrega</th><th ${thS}>Google Maps</th><th ${thS}>Horario</th><th ${thS}>Instrucciones</th><th ${thS}>Notas</th><th ${thS}>Creado</th><th ${thS}>Creado por</th><th ${thS}>Uso</th><th ${thS}>Acciones</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

/* ── RENDER MAESTRO GENÉRICO ── */
function renderMaestro(m){
  const cfg=MODS[m];
  const list=filtered(m);
  const count=st=>DS[m].filter(r=>(r.estado||'Activo')===st).length;

  document.getElementById(m).innerHTML = `
    <div class="master-status-board">
      <div class="master-status-card"><div class="master-status-dot msd-active">A</div><div><small>Activos</small><b>${count('Activo')}</b></div></div>
      <div class="master-status-card"><div class="master-status-dot msd-observed">!</div><div><small>Observados</small><b>${count('Observado')}</b></div></div>
      <div class="master-status-card"><div class="master-status-dot msd-blocked">B</div><div><small>Bloqueados</small><b>${count('Bloqueado')}</b></div></div>
    </div>
    <div class="panel">
      <div class="clean-header">
        <div class="master-title-wrap"><div class="master-title">${esc(cfg.title)}</div><div class="master-subtitle">${esc(cfg.subtitle)}</div></div>
        <div class="search-box"><input type="text" id="search_${m}" placeholder="Buscar..."></div>
        <div class="clean-actions">
          <select id="ambito_${m}"><option value="VISIBLE">Empresa activa</option><option value="TODOS">Todos</option><option value="COMPARTIDO">Compartidos</option><option value="KCF">KCF</option><option value="AGD">AGD</option></select>
          <select id="estado_${m}"><option value="TODOS">Estados</option><option value="Activo">Activos</option><option value="Observado">Observados</option><option value="Bloqueado">Bloqueados</option><option value="Inactivo">Inactivos</option></select>
          <button class="btn btn-secondary" data-bulk="${m}">Importar</button>
          <button class="btn btn-primary btn-create" data-new="${m}">+ Crear ${esc(cfg.singular)}</button>
        </div>
      </div>
      <div class="security-note"><b>Seguridad:</b> descarga bloqueada. Solo Gerencia/Administrador puede autorizar exportaciones.</div>
      <div class="table-scroll">${renderMasterTable(m,list)}</div>
      <div class="bottom-sheet">
        <div class="bottom-left">
          <span class="bottom-label">Vista de datos</span>
          <div class="page-group">
            <button class="page-btn ${sheetMode[m]==='principal'?'active':''}" data-sheet="${m}|principal"><span class="page-num">1</span>Principal</button>
            <button class="page-btn ${sheetMode[m]==='completa'?'active':''}" data-sheet="${m}|completa"><span class="page-num">2</span>Completa</button>
          </div>
        </div>
        <div class="bottom-help">${sheetMode[m]==='principal'?'Datos clave para trabajar rápido.':'Datos completos registrados en la ficha.'}</div>
      </div>
    </div>`;

  bindFilters(m, ()=>renderMaestro(m));
}

function renderMasterTable(m,list){
  if(!list.length) return '<div style="padding:20px;text-align:center;color:#64748B;font-weight:800">No se encontraron registros.</div>';
  const cfg=MODS[m];
  const t=getTableTheme(m);
  const thS=`style="background:${t.th};color:${t.thText};border:1px solid ${t.thBorder};position:sticky;top:0;z-index:10;padding:8px;font-size:10px;font-weight:1000;white-space:nowrap;box-shadow:0 2px 4px rgba(15,23,42,.10)"`;
  const tdS=(i,extra='')=>`style="border:1px solid ${t.tdBorder};background:${i%2===0?'#fff':t.stripe}${extra?';'+extra:''}"`;

  const cols = sheetMode[m]==='principal'
    ? cfg.cols
    : cfg.fields.map(f=>f.n);
  const headers=cols.map(c=>`<th ${thS}>${esc((cfg.fields.find(f=>f.n===c)||{l:c}).l)}</th>`).join('');
  const rows=list.map((r,i)=>{
    const ts=tdS(i);
    const tsL=tdS(i,'text-align:left');
    const cells=cols.map(c=>`<td ${['nombre','obs','direccion','direccionFiscal'].includes(c)?tsL:ts}>${bVal(c,r[c])}</td>`).join('');
    return `<tr class="${r.estado==='Inactivo'?'disabled':''}">
      <td ${ts}><b>${i+1}</b></td>${cells}
      <td ${ts}>${r.uso>0?`<span class="badge b-warn">${r.uso}</span>`:'<span class="badge b-ok">0</span>'}</td>
      <td ${ts}>${fecha(r.actualizadoEn)}</td>
      <td ${ts}><div style="display:flex;gap:5px;justify-content:center">
        <button class="action-btn action-view" data-view="${m}|${r.id}">👁 Ver</button>
        <button class="action-btn action-edit" data-edit="${m}|${r.id}">✎ Editar</button>
        <button class="action-btn action-delete" data-toggle="${m}|${r.id}">${r.estado==='Inactivo'?'Activar':'Inactivar'}</button>
      </div></td>
    </tr>`;
  }).join('');
  return `<table class="master-table"><thead><tr><th ${thS}>Item</th>${headers}<th ${thS}>Uso</th><th ${thS}>Actualizado</th><th ${thS} style="min-width:200px;background:${t.th};color:${t.thText};border:1px solid ${t.thBorder};position:sticky;top:0;z-index:10;padding:8px;font-size:10px;font-weight:1000">Acciones</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function bindFilters(m, cb){
  ['search_','estado_','ambito_'].forEach(p=>{
    const el=document.getElementById(p+m);
    if(el){ el.addEventListener(p==='search_'?'input':'change', cb); }
  });
}

/* ══════════════════════════════════════════════════════
   MODAL CLIENTE
══════════════════════════════════════════════════════ */
let clientEditId=null, contactCtr=0, pointCtr=0;

function contactBox(d={}){
  contactCtr++;
  return `<div class="cm-box" data-cid="${contactCtr}">
    <button class="cm-box-del" data-rc="${contactCtr}">🗑</button>
    <div class="cm-grid cm-grid-contact" style="margin-top:4px">
      <div class="cm-field"><label>Nombre *</label><input data-cf="nombre" value="${esc(d.nombre||'')}"></div>
      <div class="cm-field"><label>Cargo</label><input data-cf="cargo" value="${esc(d.cargo||'')}"></div>
      <div class="cm-field"><label>Teléfono</label><input data-cf="telefono" value="${esc(d.telefono||'')}"></div>
      <div class="cm-field"><label>Email</label><input data-cf="email" value="${esc(d.email||'')}"></div>
      <div class="cm-field"><label>&nbsp;</label><label class="cm-checkbox"><input type="checkbox" data-cf="principal" ${d.principal?'checked':''}><span>Contacto principal</span></label></div>
    </div>
  </div>`;
}

function pointBox(d={}){
  pointCtr++;
  return `<div class="cm-box" data-pid="${pointCtr}">
    <button class="cm-box-del" data-rp="${pointCtr}">🗑</button>
    <div class="cm-grid cm-grid-delivery" style="margin-top:4px">
      <div class="cm-field"><label>Punto de entrega *</label><input data-pf="punto" value="${esc(d.punto||'')}"></div>
      <div class="cm-field"><label>Dirección de entrega</label><input data-pf="direccion" value="${esc(d.direccion||'')}"></div>
      <div class="cm-field"><label>Link Google Maps</label><input data-pf="googleMaps" value="${esc(d.googleMaps||'')}"></div>
      <div class="cm-field"><label>Horario / referencia</label><input data-pf="horario" value="${esc(d.horario||'')}"></div>
      <div class="cm-field"><label>Contacto entrega</label><input data-pf="contacto" value="${esc(d.contacto||'')}"></div>
      <div class="cm-field"><label>Teléfono punto</label><input data-pf="telefono" value="${esc(d.telefono||'')}"></div>
      <div class="cm-field"><label>&nbsp;</label><label class="cm-checkbox"><input type="checkbox" data-pf="principal" ${d.principal?'checked':''}><span>Punto principal</span></label></div>
      <div class="cm-field full-row"><label>Instrucciones</label><input data-pf="instrucciones" value="${esc(d.instrucciones||'')}"></div>
    </div>
  </div>`;
}

const STATE_CFG = {
  'Activo':   {cls:'s-green',  dot:'#84CC16',pill:'pill-green',  txt:'Cliente habilitado para cotizar, vender y atender normalmente.'},
  'Observado':{cls:'s-yellow', dot:'#F59E0B',pill:'pill-yellow', txt:'Revisar condiciones antes de atender o despachar.'},
  'Bloqueado':{cls:'s-red',    dot:'#FB7185',pill:'pill-red',    txt:'No atender ni vender hasta que Gerencia lo libere.'},
  'Inactivo': {cls:'s-gray',   dot:'#94A3B8',pill:'pill-gray',   txt:'Registro desactivado. No usar en operaciones nuevas.'}
};

function syncClientState(){
  const v=document.getElementById('cli_estado')?.value||'Activo';
  const cfg=STATE_CFG[v]||STATE_CFG['Activo'];
  const box=document.getElementById('cliStateBox');
  if(box){ box.className='cm-state-box '+cfg.cls; }
  const dot=document.getElementById('cliStateDot');
  if(dot){ dot.style.background=cfg.dot; }
  const txt=document.getElementById('cliStateText');
  if(txt){ txt.textContent=cfg.txt; }
  const pill=document.getElementById('cliStatePill');
  if(pill){ pill.className='cm-state-pill '+cfg.pill; pill.textContent=v; }
}

function openClientModal(editId=null){
  clientEditId=editId; contactCtr=0; pointCtr=0;
  const r=editId?DS.clientes.find(x=>x.id===editId):null;
  document.getElementById('cmTitle').textContent=editId?'Editar cliente':'Crear cliente';
  document.getElementById('cmHint').textContent=editId?`Editando ID ${editId}`:'Modo: creación';
  const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v??''; };
  sv('cli_ambito',r?.ambito||'COMPARTIDO');
  sv('cli_tipoDoc',r?.tipoDoc||'RUC');
  sv('cli_numero',r?.numero||'');
  sv('cli_nombre',r?.nombre||'');
  sv('cli_nombreComercial',r?.nombreComercial||'');
  sv('cli_direccionFiscal',r?.direccionFiscal||'');
  sv('cli_condicion',r?.condicion||'Contado');
  sv('cli_diasCredito',r?.diasCredito||'0');
  sv('cli_limiteCredito',r?.limiteCredito||'');
  sv('cli_descuento',r?.descuento||'');
  sv('cli_estado',r?.estado||'Activo');
  sv('cli_obs',r?.obs||'');
  syncClientState();
  const cc=document.getElementById('cliContacts');
  const cp=document.getElementById('cliPoints');
  const contacts=r?.contactos?.length?r.contactos:[{nombre:r?.contacto||'',cargo:'',telefono:r?.telefono||'',email:r?.email||'',principal:true}];
  const points=r?.puntos?.length?r.puntos:[{punto:'',direccion:r?.direccionFiscal||'',googleMaps:'',horario:'',contacto:'',telefono:'',instrucciones:'',principal:true}];
  cc.innerHTML=contacts.map(c=>contactBox(c)).join('');
  cp.innerHTML=points.map(p=>pointBox(p)).join('');
  document.querySelector('#clientModal .cm-body').scrollTop=0;
  document.getElementById('clientModal').classList.add('show');
}

function closeClientModal(){ document.getElementById('clientModal').classList.remove('show'); }

function getContacts(){
  return Array.from(document.querySelectorAll('[data-cid]')).map(b=>({
    nombre:b.querySelector('[data-cf="nombre"]')?.value.trim()||'',
    cargo:b.querySelector('[data-cf="cargo"]')?.value.trim()||'',
    telefono:b.querySelector('[data-cf="telefono"]')?.value.trim()||'',
    email:b.querySelector('[data-cf="email"]')?.value.trim()||'',
    principal:!!b.querySelector('[data-cf="principal"]')?.checked
  })).filter(c=>c.nombre||c.telefono||c.email);
}

function getPoints(){
  return Array.from(document.querySelectorAll('[data-pid]')).map(b=>({
    punto:b.querySelector('[data-pf="punto"]')?.value.trim()||'',
    direccion:b.querySelector('[data-pf="direccion"]')?.value.trim()||'',
    googleMaps:b.querySelector('[data-pf="googleMaps"]')?.value.trim()||'',
    horario:b.querySelector('[data-pf="horario"]')?.value.trim()||'',
    contacto:b.querySelector('[data-pf="contacto"]')?.value.trim()||'',
    telefono:b.querySelector('[data-pf="telefono"]')?.value.trim()||'',
    instrucciones:b.querySelector('[data-pf="instrucciones"]')?.value.trim()||'',
    principal:!!b.querySelector('[data-pf="principal"]')?.checked
  })).filter(p=>p.punto||p.direccion);
}

function requestConfirmClient(){
  const nombre=(document.getElementById('cli_nombre')?.value.trim()||document.getElementById('cli_nombreComercial')?.value.trim()||'').trim();
  if(!nombre){ toast('Completa razón social o nombre comercial.'); return; }
  const contacts=getContacts();
  const points=getPoints();
  const numero=document.getElementById('cli_numero')?.value.trim()||'Pendiente';
  document.getElementById('confirmSummary').innerHTML=`
    <div class="confirm-row"><b>Ámbito</b><span>${esc(document.getElementById('cli_ambito')?.selectedOptions[0]?.textContent||'')}</span></div>
    <div class="confirm-row"><b>Documento</b><span>${esc(document.getElementById('cli_tipoDoc')?.value+' '+numero)}</span></div>
    <div class="confirm-row"><b>Cliente</b><span>${esc(nombre)}</span></div>
    <div class="confirm-row"><b>Condición</b><span>${esc(document.getElementById('cli_condicion')?.value||'')}</span></div>
    <div class="confirm-row"><b>Estado</b><span>${esc(document.getElementById('cli_estado')?.value||'')}</span></div>
    <div class="confirm-row"><b>Contacto</b><span>${esc(contacts[0]?.nombre||'-')}</span></div>
  `;
  document.getElementById('confirmModal').classList.add('show');
}

function saveClient(){
  const contacts=getContacts();
  const points=getPoints();
  const p=contacts.find(c=>c.principal)||contacts[0]||{};
  const data={
    ambito:document.getElementById('cli_ambito')?.value||'COMPARTIDO',
    tipoDoc:document.getElementById('cli_tipoDoc')?.value||'RUC',
    numero:normalize('numero',document.getElementById('cli_numero')?.value||''),
    nombre:(document.getElementById('cli_nombre')?.value.trim()||document.getElementById('cli_nombreComercial')?.value.trim()||''),
    nombreComercial:document.getElementById('cli_nombreComercial')?.value.trim()||'',
    direccionFiscal:document.getElementById('cli_direccionFiscal')?.value.trim()||'',
    contacto:p.nombre||'', telefono:p.telefono||'', email:p.email||'',
    condicion:document.getElementById('cli_condicion')?.value||'Contado',
    diasCredito:document.getElementById('cli_diasCredito')?.value||'0',
    limiteCredito:document.getElementById('cli_limiteCredito')?.value.trim()||'',
    descuento:document.getElementById('cli_descuento')?.value.trim()||'',
    estado:document.getElementById('cli_estado')?.value||'Activo',
    obs:document.getElementById('cli_obs')?.value.trim()||'',
    contactos:contacts, puntos:points
  };
  if(!data.nombre){ toast('Completa razón social.'); return; }
  if(clientEditId){
    const idx=DS.clientes.findIndex(x=>x.id===clientEditId);
    DS.clientes[idx]={...DS.clientes[idx],...data,actualizadoPor:CU,actualizadoEn:now()};
    pushLog('clientes',data.ambito,'Actualización',`Se actualizó cliente ${data.nombre}.`);
    toast('Cliente actualizado');
  } else {
    const id=DS.clientes.length?Math.max(...DS.clientes.map(x=>x.id))+1:1;
    DS.clientes.unshift({id,codigoCliente:`CLI-${String(id).padStart(6,'0')}`,...data,creadoPor:CU,creadoEn:now(),actualizadoPor:CU,actualizadoEn:now(),uso:0});
    pushLog('clientes',data.ambito,'Creación',`Se creó cliente ${data.nombre}.`);
    toast('Cliente creado');
  }
  persist('clientes');
  closeClientModal();
  renderClientes();
}

function sunatDemo(){
  const n=document.getElementById('cli_numero')?.value.replace(/\D/g,'')||'';
  if(!n){ toast('Ingresa el RUC para consultar.'); return; }
  const db={'20100070970':{nombre:'KOMATSU-MITSUI MAQUINARIAS PERÚ S.A.',comercial:'KOMATSU-MITSUI',dir:'Av. Argentina 4453, Callao'}};
  const d=db[n]||{nombre:'CLIENTE CONSULTADO SUNAT S.A.C.',comercial:'CLIENTE SUNAT',dir:'Dirección fiscal registrada en SUNAT'};
  const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  sv('cli_nombre',d.nombre); sv('cli_nombreComercial',d.comercial); sv('cli_direccionFiscal',d.dir);
  toast('Datos SUNAT cargados (demo)');
}

/* ── VER CLIENTE ── */
function openViewModal(m,id){
  if(m==='clientes'){
    const r=DS.clientes.find(x=>x.id===id); if(!r) return;
    const c=primaryContact(r); const p=primaryPoint(r);
    document.getElementById('viewTitle').textContent=`${clientCode(r)} · ${r.nombre||r.nombreComercial||'Cliente'}`;
    document.getElementById('viewBody').innerHTML=`
      <div class="view-topgrid">
        <div class="view-topcard"><b>Estado</b><span>${bEstado(r.estado||'Activo')}</span></div>
        <div class="view-topcard"><b>Ámbito</b><span>${bAmbito(r.ambito)}</span></div>
        <div class="view-topcard"><b>Documento</b><span>${r.numero?sd(r.tipoDoc+' '+r.numero):'Pendiente'}</span></div>
        <div class="view-topcard"><b>Condición</b><span>${sd(r.condicion||'Contado')}</span></div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Datos generales</div></div>
        <div class="view-grid">
          <div class="view-field"><span class="view-label">Código</span><div class="view-value"><span class="code-pill">${clientCode(r)}</span></div></div>
          <div class="view-field wide"><span class="view-label">Razón social</span><div class="view-value">${sd(r.nombre)}</div></div>
          <div class="view-field"><span class="view-label">Nombre comercial</span><div class="view-value">${sd(r.nombreComercial)}</div></div>
          <div class="view-field wide"><span class="view-label">Dirección fiscal</span><div class="view-value">${sd(r.direccionFiscal)}</div></div>
        </div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Contacto principal</div></div>
        <div class="view-grid">
          <div class="view-field"><span class="view-label">Contacto</span><div class="view-value">${sd(c.nombre||r.contacto)}</div></div>
          <div class="view-field"><span class="view-label">Cargo</span><div class="view-value">${sd(c.cargo)}</div></div>
          <div class="view-field"><span class="view-label">Teléfono</span><div class="view-value">${sd(c.telefono||r.telefono)}</div></div>
          <div class="view-field wide"><span class="view-label">Correo</span><div class="view-value">${sd(c.email||r.email)}</div></div>
        </div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Condición comercial</div></div>
        <div class="view-grid">
          <div class="view-field"><span class="view-label">Condición</span><div class="view-value">${sd(r.condicion)}</div></div>
          <div class="view-field"><span class="view-label">Límite</span><div class="view-value">${sd(r.limiteCredito)}</div></div>
          <div class="view-field"><span class="view-label">Días crédito</span><div class="view-value">${r.diasCredito==='0'?'Contado':sd(r.diasCredito)+' días'}</div></div>
          <div class="view-field"><span class="view-label">Descuento</span><div class="view-value">${sd(r.descuento)}</div></div>
        </div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Punto de entrega</div></div>
        <div class="view-grid">
          <div class="view-field"><span class="view-label">Punto</span><div class="view-value">${sd(p.punto)}</div></div>
          <div class="view-field wide"><span class="view-label">Dirección</span><div class="view-value">${sd(p.direccion)}</div></div>
          <div class="view-field"><span class="view-label">Horario</span><div class="view-value">${sd(p.horario)}</div></div>
          <div class="view-field wide"><span class="view-label">Instrucciones</span><div class="view-value">${sd(p.instrucciones)}</div></div>
        </div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Notas y trazabilidad</div></div>
        <div class="view-grid">
          <div class="view-field wide"><span class="view-label">Notas</span><div class="view-value">${sd(r.obs)}</div></div>
          <div class="view-field"><span class="view-label">Uso ERP</span><div class="view-value">${r.uso>0?`<span class="badge b-warn">${r.uso} mov.</span>`:'<span class="badge b-ok">0 mov.</span>'}</div></div>
          <div class="view-field"><span class="view-label">Creado</span><div class="view-value">${fecha(r.creadoEn)}</div></div>
          <div class="view-field"><span class="view-label">Por</span><div class="view-value">${sd(r.creadoPor)}</div></div>
        </div>
      </div>
      <div class="view-foot">
        <button class="btn btn-secondary" onclick="document.getElementById('viewModal').classList.remove('show')">Cerrar</button>
        <button class="btn btn-primary" onclick="document.getElementById('viewModal').classList.remove('show');openClientModal(${r.id})">Editar</button>
      </div>`;
  } else {
    const r=DS[m]?.find(x=>x.id===id); if(!r) return;
    const cfg=MODS[m];
    document.getElementById('viewTitle').textContent=`${r.codigo||r.numero||''} · ${r.nombre||''}`;
    document.getElementById('viewBody').innerHTML=`
      <div class="view-topgrid">
        <div class="view-topcard"><b>Estado</b><span>${bEstado(r.estado)}</span></div>
        <div class="view-topcard"><b>Ámbito</b><span>${bAmbito(r.ambito||r.empresa)}</span></div>
        <div class="view-topcard"><b>Código / RUC</b><span>${sd(r.codigo||r.numero)}</span></div>
        <div class="view-topcard"><b>Uso ERP</b><span>${r.uso>0?`<span class="badge b-warn">${r.uso} mov.</span>`:'<span class="badge b-ok">0</span>'}</span></div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Datos completos</div></div>
        <div class="view-grid">${cfg.fields.filter(f=>f.n!=='estado').map(f=>`<div class="view-field ${['obs','direccion','nombre','instrucciones'].includes(f.n)?'wide':''}"><span class="view-label">${esc(f.l)}</span><div class="view-value">${bVal(f.n,r[f.n])}</div></div>`).join('')}</div>
      </div>
      <div class="view-block"><div class="view-block-head"><div class="view-block-title">Trazabilidad</div></div>
        <div class="view-grid">
          <div class="view-field"><span class="view-label">Creado</span><div class="view-value">${fecha(r.creadoEn)}</div></div>
          <div class="view-field"><span class="view-label">Por</span><div class="view-value">${sd(r.creadoPor)}</div></div>
          <div class="view-field"><span class="view-label">Actualizado</span><div class="view-value">${fecha(r.actualizadoEn)}</div></div>
          <div class="view-field"><span class="view-label">Por</span><div class="view-value">${sd(r.actualizadoPor)}</div></div>
        </div>
      </div>
      <div class="view-foot">
        <button class="btn btn-secondary" onclick="document.getElementById('viewModal').classList.remove('show')">Cerrar</button>
        <button class="btn btn-primary" onclick="document.getElementById('viewModal').classList.remove('show');openMasterModal('${m}',${r.id})">Editar</button>
      </div>`;
  }
  document.getElementById('viewModal').classList.add('show');
}

/* ══════════════════════════════════════════════════════
   MODAL MAESTROS (proveedor, almacén, categoría, marca, um)
══════════════════════════════════════════════════════ */
let masterEditId=null, masterModule=null;

const MM_STATE = {
  'Activo':   {cls:'s-green',  dot:'green',  pill:'',        txt:'Habilitado para operar normalmente.'},
  'Observado':{cls:'s-yellow', dot:'yellow', pill:'p-yellow',txt:'Revisar condiciones antes de operar.'},
  'Bloqueado':{cls:'s-red',    dot:'red',    pill:'p-red',   txt:'No usar hasta liberación de Gerencia.'},
  'Inactivo': {cls:'s-gray',   dot:'gray',   pill:'p-gray',  txt:'Desactivado para nuevos registros.'}
};

function syncMasterState(){
  const sel=document.getElementById('mm_estado'); if(!sel) return;
  const v=sel.value||'Activo';
  const cfg=MM_STATE[v]||MM_STATE['Activo'];
  const box=document.getElementById('mmStateBox');
  if(box){ box.className='mm-state-box '+cfg.cls; }
  const dot=document.getElementById('mmStateDot');
  if(dot){ dot.className='mm-state-dot'; if(cfg.dot==='yellow')dot.style.background='#F59E0B'; else if(cfg.dot==='red')dot.style.background='#FB7185'; else if(cfg.dot==='gray')dot.style.background='#94A3B8'; else dot.style.background='#84CC16'; }
  const txt=document.getElementById('mmStateTxt'); if(txt) txt.textContent=cfg.txt;
  const pill=document.getElementById('mmStatePill'); if(pill){ pill.className='mm-state-pill '+cfg.pill; pill.textContent=v; }
}

function renderMasterForm(m, rec=null){
  const cfg=MODS[m];
  const def=(n)=>{
    if(rec) return rec[n]??'';
    const defaults={ambito:'COMPARTIDO',empresa:empresa().includes('AGD')?'AGD':'KCF',estado:'Activo',condicion:'Contado',moneda:'Soles',banco:'BCP',tipoCuenta:'Cuenta corriente',tipo:cfg.fields.find(f=>f.n==='tipo')?.opts?.[0]||''};
    return defaults[n]??'';
  };

  function fInput(f){
    const v=def(f.n);
    if(f.n==='estado') return `<div class="mm-state-box s-green" id="mmStateBox"><label>${esc(f.l)} *</label><select id="mm_estado">${(f.opts||[]).map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select><div class="mm-state-help"><div class="mm-state-help-text"><span class="mm-state-dot" id="mmStateDot"></span><span id="mmStateTxt"></span></div><span class="mm-state-pill" id="mmStatePill"></span></div></div>`;
    if(f.t==='select') return `<div class="mm-field ${f.full?'full-row':''}"><label>${esc(f.l)}${f.req?' *':''}</label><select id="mm_${f.n}">${(f.opts||[]).map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(o==='COMPARTIDO'?'Compartido KCF + AGD':o)}</option>`).join('')}</select></div>`;
    if(f.t==='textarea') return `<div class="mm-field ${f.full?'full-row':''}"><label>${esc(f.l)}${f.req?' *':''}</label><textarea id="mm_${f.n}">${esc(v)}</textarea></div>`;
    return `<div class="mm-field ${f.full?'full-row':''}"><label>${esc(f.l)}${f.req?' *':''}</label><input type="text" id="mm_${f.n}" value="${esc(v)}"></div>`;
  }

  /* Estructura específica por módulo */
  if(m==='proveedores') return renderProveedorForm(fInput, def, rec);
  if(m==='almacenes')   return renderAlmacenForm(fInput, def, rec);
  if(m==='categorias')  return renderCategoriaForm(def, rec);
  if(m==='marcas')      return renderMarcaForm(fInput, def, rec);

  /* Genérico para um */
  return `<div class="mm-box"><div class="mm-grid" style="grid-template-columns:repeat(3,1fr)">${cfg.fields.map(f=>fInput(f)).join('')}</div></div>`;
}

function renderProveedorForm(fi, def, rec){
  const sunat=`<div class="mm-field"><label>RUC / documento *</label><div class="mm-sunat-group"><input type="text" id="mm_numero" value="${esc(def('numero'))}"><button class="mm-sunat-btn" id="mmSunatBtn">SUNAT</button></div></div>`;
  const state=`<div class="mm-state-box s-green" id="mmStateBox"><label>Estado proveedor *</label><select id="mm_estado"><option value="Activo" ${def('estado')==='Activo'?'selected':''}>Activo</option><option value="Observado" ${def('estado')==='Observado'?'selected':''}>Observado</option><option value="Bloqueado" ${def('estado')==='Bloqueado'?'selected':''}>Bloqueado</option><option value="Inactivo" ${def('estado')==='Inactivo'?'selected':''}>Inactivo</option></select><div class="mm-state-help"><div class="mm-state-help-text"><span class="mm-state-dot" id="mmStateDot"></span><span id="mmStateTxt"></span></div><span class="mm-state-pill" id="mmStatePill"></span></div></div>`;
  const f=(n)=>{ const fd=MODS.proveedores.fields.find(x=>x.n===n); if(!fd) return ''; return fi(fd); };
  return `
    <div class="mm-section"><div class="mm-section-title">Información general</div><div class="mm-box"><div class="mm-grid mm-grid-main">${f('ambito')}${f('tipoDoc')}${sunat}${state}<div class="mm-field span-2">${f('nombre').replace('class="mm-field ','class="mm-field inner-')}</div>${f('nombreComercial')}<div class="mm-field span-3">${f('direccionFiscal').replace('class="mm-field ','class="mm-field inner-')}</div></div></div></div>
    <div class="mm-section"><div class="mm-section-title">Contacto principal</div><div class="mm-box"><div class="mm-grid mm-grid-contact">${f('contacto')}${f('cargo')}${f('telefono')}${f('email')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Datos bancarios</div><div class="mm-box"><div class="mm-grid mm-grid-bank">${f('banco')}${f('tipoCuenta')}${f('cuenta')}${f('cci')}${f('titularCuenta')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Condición comercial</div><div class="mm-box"><div class="mm-grid mm-grid-comercial">${f('condicion')}${f('lineaCredito')}${f('moneda')}${f('descuento')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Punto de recojo / despacho</div><div class="mm-box"><div class="mm-grid mm-grid-pickup">${f('puntoRecojo')}${f('direccionRecojo')}${f('googleMapsRecojo')}${f('horarioRecojo')}${f('contactoRecojo')}${f('telefonoRecojo')}${f('instruccionesRecojo').replace('class="mm-field ','class="mm-field inner-')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Observaciones internas</div><div class="mm-box">${f('obs').replace('class="mm-field ','class="mm-field inner-')}</div></div>`;
}

function renderAlmacenForm(fi, def, rec){
  const state=`<div class="mm-state-box s-green" id="mmStateBox"><label>Estado almacén *</label><select id="mm_estado"><option value="Activo" ${def('estado')==='Activo'?'selected':''}>Activo</option><option value="Observado" ${def('estado')==='Observado'?'selected':''}>Observado</option><option value="Bloqueado" ${def('estado')==='Bloqueado'?'selected':''}>Bloqueado</option><option value="Inactivo" ${def('estado')==='Inactivo'?'selected':''}>Inactivo</option></select><div class="mm-state-help"><div class="mm-state-help-text"><span class="mm-state-dot" id="mmStateDot"></span><span id="mmStateTxt"></span></div><span class="mm-state-pill" id="mmStatePill"></span></div></div>`;
  const f=(n)=>{ const fd=MODS.almacenes.fields.find(x=>x.n===n); if(!fd) return ''; return fi(fd); };
  return `
    <div class="mm-section"><div class="mm-section-title">Información general</div><div class="mm-box"><div class="mm-grid mm-grid-cat">${f('codigo')}${f('nombre')}${f('tipo')}${state}${f('empresa')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Responsable del almacén</div><div class="mm-box"><div class="mm-grid mm-grid-contact">${f('responsable')}${f('responsableCargo')}${f('telefono')}${f('email')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Ubicación y operación</div><div class="mm-box"><div class="mm-grid mm-grid-pickup">${f('direccion').replace('class="mm-field ','class="mm-field s2-')}${f('googleMaps')}${f('horario')}${f('instrucciones').replace('class="mm-field ','class="mm-field inner-')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Observaciones internas</div><div class="mm-box">${f('obs').replace('class="mm-field ','class="mm-field inner-')}</div></div>`;
}

function renderCategoriaForm(def, rec){
  const cat=def('nombre')||CAT_LIST[0];
  const sub=def('tipo')||(CAT_MAP[cat]||[])[0]||'';
  const code=makeCatCode(cat,sub);
  const state=`<div class="mm-state-box s-green" id="mmStateBox"><label>Estado *</label><select id="mm_estado"><option value="Activo" ${def('estado')==='Activo'?'selected':''}>Activo</option><option value="Observado">Observado</option><option value="Bloqueado">Bloqueado</option><option value="Inactivo">Inactivo</option></select><div class="mm-state-help"><div class="mm-state-help-text"><span class="mm-state-dot" id="mmStateDot"></span><span id="mmStateTxt"></span></div><span class="mm-state-pill" id="mmStatePill"></span></div></div>`;
  return `
    <div class="mm-section"><div class="mm-section-title">Información general</div><div class="mm-box">
      <div class="mm-grid mm-grid-cat">
        <div class="mm-field cat-code-readonly"><label>Código automático</label><input type="text" id="mm_codigo" value="${esc(code)}" readonly><div class="cat-auto-note"><b>Automático:</b> se genera según la categoría y subcategoría.</div></div>
        <div class="mm-field"><label>Categoría *</label><select id="mm_nombre">${CAT_LIST.map(c=>`<option value="${esc(c)}" ${c===cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="mm-field"><label>Subcategoría *</label><select id="mm_tipo">${(CAT_MAP[cat]||[]).map(s=>`<option value="${esc(s)}" ${s===sub?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
        ${state}
        <div class="mm-field"><label>Ámbito *</label><select id="mm_ambito"><option value="COMPARTIDO" ${def('ambito')==='COMPARTIDO'?'selected':''}>Compartido KCF + AGD</option><option value="KCF" ${def('ambito')==='KCF'?'selected':''}>Solo KCF</option><option value="AGD" ${def('ambito')==='AGD'?'selected':''}>Solo AGD</option></select></div>
      </div>
    </div></div>
    <div class="mm-section"><div class="mm-section-title">Observaciones internas</div><div class="mm-box"><div class="mm-field full-row"><label>Observación</label><textarea id="mm_obs">${esc(def('obs'))}</textarea></div></div></div>`;
}

function renderMarcaForm(fi, def, rec){
  const state=`<div class="mm-state-box s-green" id="mmStateBox"><label>Estado marca *</label><select id="mm_estado"><option value="Activo" ${def('estado')==='Activo'?'selected':''}>Activo</option><option value="Observado">Observado</option><option value="Bloqueado">Bloqueado</option><option value="Inactivo">Inactivo</option></select><div class="mm-state-help"><div class="mm-state-help-text"><span class="mm-state-dot" id="mmStateDot"></span><span id="mmStateTxt"></span></div><span class="mm-state-pill" id="mmStatePill"></span></div></div>`;
  const f=(n)=>{ const fd=MODS.marcas.fields.find(x=>x.n===n); if(!fd) return ''; return fi(fd); };
  return `
    <div class="mm-section"><div class="mm-section-title">Información general</div><div class="mm-box"><div class="mm-grid mm-grid-cat">${f('ambito')}${f('codigo')}${f('nombre')}${state}${f('tipo')}</div></div></div>
    <div class="mm-section"><div class="mm-section-title">Información comercial</div><div class="mm-box"><div class="mm-grid mm-grid-contact">${f('paisOrigen')}${f('proveedorReferencia')}<div class="mm-field span-2">${f('webMarca').replace('class="mm-field ','class="mm-field inner-')}</div></div></div></div>
    <div class="mm-section"><div class="mm-section-title">Observaciones internas</div><div class="mm-box">${f('obs').replace('class="mm-field ','class="mm-field inner-')}</div></div>`;
}

function makeCatCode(cat,sub){
  const base=CAT_CODES[cat]||'CAT000';
  const list=CAT_MAP[cat]||[];
  const idx=Math.max(1,list.indexOf(sub)+1);
  return `${base}-S${String(idx).padStart(3,'0')}`;
}

function openMasterModal(m, editId=null){
  masterModule=m; masterEditId=editId;
  const cfg=MODS[m];
  const rec=editId?DS[m]?.find(r=>r.id===editId):null;
  document.getElementById('mmTitle').textContent=editId?`Editar ${cfg.singular}`:`Crear ${cfg.singular}`;
  document.getElementById('mmMode').textContent=editId?`Editando ID ${editId}`:'Modo: creación';
  document.getElementById('mmHelp').textContent=`Validación: no se permiten duplicados por ${cfg.unique} en el mismo ámbito.`;
  document.getElementById('mmFields').innerHTML=renderMasterForm(m,rec);
  document.getElementById('masterModal').classList.add('show');
  document.querySelector('#masterModal .mm-body').scrollTop=0;
  syncMasterState();
  if(m==='categorias') bindCatSync();
  if(m==='proveedores'){ const b=document.getElementById('mmSunatBtn'); if(b) b.addEventListener('click',sunatMasterDemo); }
}

function bindCatSync(){
  const cat=document.getElementById('mm_nombre');
  const sub=document.getElementById('mm_tipo');
  const code=document.getElementById('mm_codigo');
  if(!cat||!sub||!code) return;
  const sync=()=>{
    const c=cat.value;
    const old=sub.value;
    const subs=CAT_MAP[c]||[];
    sub.innerHTML=subs.map(s=>`<option value="${esc(s)}" ${s===old?'selected':''}>${esc(s)}</option>`).join('');
    if(!subs.includes(old)) sub.value=subs[0]||'';
    code.value=makeCatCode(c,sub.value);
  };
  cat.addEventListener('change',sync);
  sub.addEventListener('change',()=>{ code.value=makeCatCode(cat.value,sub.value); });
}

function sunatMasterDemo(){
  const n=document.getElementById('mm_numero')?.value.replace(/\D/g,'')||'';
  if(!n){ toast('Ingresa el RUC del proveedor.'); return; }
  const db={'20511111111':{nombre:'ACEROS DEL PERÚ S.A.C.',comercial:'ACEROS DEL PERÚ',dir:'Av. Industrial 123, Lima'}};
  const d=db[n]||{nombre:'PROVEEDOR CONSULTADO S.A.C.',comercial:'PROVEEDOR SUNAT',dir:'Dirección fiscal SUNAT'};
  const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  sv('mm_nombre',d.nombre); sv('mm_nombreComercial',d.comercial); sv('mm_direccionFiscal',d.dir);
  toast('Datos SUNAT cargados (demo)');
}

function closeMasterModal(){ document.getElementById('masterModal').classList.remove('show'); masterModule=null; masterEditId=null; }

function getFormData(){
  const m=masterModule; const cfg=MODS[m];
  const data={};
  cfg.fields.forEach(f=>{
    const el=document.getElementById(`mm_${f.n}`);
    data[f.n]=el?normalize(f.n,el.value||''):'';
  });
  // estado desde caja especial
  const est=document.getElementById('mm_estado'); if(est) data.estado=est.value;
  if(m==='categorias'){
    const cat=document.getElementById('mm_nombre')?.value||'';
    const sub=document.getElementById('mm_tipo')?.value||'';
    data.nombre=cat; data.tipo=sub;
    data.codigo=makeCatCode(cat,sub);
  }
  if(m==='proveedores'){
    const n=document.getElementById('mm_numero'); if(n) data.numero=normalize('numero',n.value);
  }
  return data;
}

function validateMaster(data){
  const m=masterModule; const cfg=MODS[m];
  for(const f of cfg.fields){
    if(f.req&&!String(data[f.n]||'').trim()) return `Completa: ${f.l}`;
  }
  if(data[cfg.unique]){
    const dup=DS[m].find(r=>r.id!==masterEditId&&String(r[cfg.unique]||'').toUpperCase()===String(data[cfg.unique]||'').toUpperCase()&&r.ambito===data.ambito);
    if(dup) return `Ya existe ${cfg.unique}: ${data[cfg.unique]} en el mismo ámbito.`;
  }
  return '';
}

function saveMaster(){
  const m=masterModule; const cfg=MODS[m];
  const data=getFormData();
  const err=validateMaster(data); if(err){ toast(err); return; }
  if(masterEditId){
    const idx=DS[m].findIndex(r=>r.id===masterEditId);
    DS[m][idx]={...DS[m][idx],...data,actualizadoPor:CU,actualizadoEn:now()};
    pushLog(m,data.ambito||'COMPARTIDO','Actualización',`Se actualizó ${cfg.singular}: ${data.nombre||data.codigo||data.numero}.`);
    toast(`${cfg.singular.charAt(0).toUpperCase()+cfg.singular.slice(1)} actualizado`);
  } else {
    const id=DS[m].length?Math.max(...DS[m].map(r=>r.id))+1:1;
    DS[m].unshift({id,...data,creadoPor:CU,creadoEn:now(),actualizadoPor:CU,actualizadoEn:now(),uso:0});
    pushLog(m,data.ambito||'COMPARTIDO','Creación',`Se creó ${cfg.singular}: ${data.nombre||data.codigo||data.numero}.`);
    toast(`${cfg.singular.charAt(0).toUpperCase()+cfg.singular.slice(1)} creado`);
  }
  persist(m);
  closeMasterModal();
  renderScreen(m);
}

/* ══════════════════════════════════════════════════════
   CARGA MASIVA
══════════════════════════════════════════════════════ */
let bulkRows=[];

function csvHeaders(m){ return MODS[m].fields.map(f=>f.n); }
function csvExample(m,sep=';'){
  const h=csvHeaders(m);
  const s={ambito:'COMPARTIDO',estado:'Activo',condicion:'Contado',decimal:'No',moneda:'Soles'};
  MODS[m].fields.forEach(f=>{ if(!s[f.n]) s[f.n]= f.opts?f.opts[0]:'EJEMPLO'; });
  return h.join(sep)+'\n'+h.map(k=>s[k]||'').join(sep);
}

function openBulk(m){
  const sel=document.getElementById('bulkModule');
  sel.innerHTML=MAESTROS.map(x=>`<option value="${x}">${MODS[x].title}</option>`).join('');
  sel.value=m;
  document.getElementById('bulkTitle').textContent=`Carga masiva · ${MODS[m].title}`;
  document.getElementById('bulkHelp').textContent=`Pega CSV con encabezados. Sin duplicados por ${MODS[m].unique} y ámbito.`;
  document.getElementById('bulkText').value=csvExample(m,';');
  document.getElementById('bulkTemplate').textContent='Plantilla:\n'+csvExample(m,';');
  document.getElementById('bulkPreview').innerHTML='';
  bulkRows=[];
  document.getElementById('bulkModal').classList.add('show');
}

function parseBulk(){
  const m=document.getElementById('bulkModule').value;
  const sep=document.getElementById('bulkSep').value;
  const text=document.getElementById('bulkText').value.trim();
  if(!text) return [];
  const lines=text.split(/\r?\n/).filter(Boolean);
  const headers=lines[0].split(sep).map(h=>h.trim());
  return lines.slice(1).map((line,i)=>{
    const cols=line.split(sep);
    const row={}; headers.forEach((h,j)=>row[h]=normalize(h,cols[j]||''));
    row.__line=i+2;
    const mm=masterModule; masterModule=m;
    row.__err=validateMaster(row);
    masterModule=mm;
    return row;
  });
}

function previewBulk(){
  const m=document.getElementById('bulkModule').value;
  bulkRows=parseBulk();
  const v=bulkRows.filter(r=>!r.__err).length;
  document.getElementById('bulkPreview').innerHTML=`<table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:5px;background:#F8FAFC;font-size:10px">Línea</th><th style="padding:5px;background:#F8FAFC;font-size:10px">Estado</th><th style="padding:5px;background:#F8FAFC;font-size:10px">Clave</th><th style="padding:5px;background:#F8FAFC;font-size:10px">Nombre</th><th style="padding:5px;background:#F8FAFC;font-size:10px">Observación</th></tr></thead><tbody>${bulkRows.map(r=>`<tr><td style="padding:4px;font-size:10px">${r.__line}</td><td>${r.__err?'<span class="badge b-warn">Error</span>':'<span class="badge b-ok">OK</span>'}</td><td style="font-size:10px">${esc(r[MODS[m].unique]||'')}</td><td style="font-size:10px">${esc(r.nombre||'')}</td><td style="font-size:10px;color:#64748B">${esc(r.__err||'Listo')}</td></tr>`).join('')}</tbody></table><p style="padding:7px 10px;font-size:10.5px;color:#475569">${v} válidos / ${bulkRows.length-v} observados.</p>`;
}

function importBulk(){
  const m=document.getElementById('bulkModule').value;
  if(!bulkRows.length) previewBulk();
  const valids=bulkRows.filter(r=>!r.__err);
  if(!valids.length){ toast('No hay registros válidos.'); return; }
  valids.forEach(row=>{
    delete row.__line; delete row.__err;
    const id=DS[m].length?Math.max(...DS[m].map(r=>r.id))+1:1;
    DS[m].push({id,...row,creadoPor:CU,creadoEn:now(),actualizadoPor:CU,actualizadoEn:now(),uso:0});
  });
  pushLog(m,'COMPARTIDO','Carga masiva',`Se importaron ${valids.length} registro(s).`);
  persist(m);
  renderScreen(m);
  toast(`${valids.length} registros importados.`);
  document.getElementById('bulkModal').classList.remove('show');
}

/* ══════════════════════════════════════════════════════
   TOGGLE ACTIVO / INACTIVO
══════════════════════════════════════════════════════ */
function toggleRecord(m,id){
  const r=DS[m]?.find(x=>x.id===id); if(!r) return;
  r.estado=r.estado==='Inactivo'?'Activo':'Inactivo';
  r.actualizadoPor=CU; r.actualizadoEn=now();
  pushLog(m,r.ambito||r.empresa||'COMPARTIDO',r.estado==='Activo'?'Reactivación':'Inactivación',`${r.nombre||r.codigo||r.numero} → ${r.estado}.`);
  persist(m); renderScreen(m); toast(`Registro ${r.estado.toLowerCase()}`);
}

/* ══════════════════════════════════════════════════════
   EVENT DELEGATION GLOBAL
══════════════════════════════════════════════════════ */
document.addEventListener('click', e=>{
  const t=e.target;

  /* Navegación */
  const nav=t.closest('[data-screen]');
  if(nav){
    const g=nav.closest('.menu-group');
    if(nav.classList.contains('menu-header')&&g) g.classList.toggle('open');
    openScreen(nav.dataset.screen);
    return;
  }

  /* Crear nuevo */
  const newBtn=t.closest('[data-new]');
  if(newBtn){
    const m=newBtn.dataset.new;
    if(m==='clientes') openClientModal();
    else openMasterModal(m);
    return;
  }

  /* Editar */
  const editBtn=t.closest('[data-edit]');
  if(editBtn){
    const [m,id]=editBtn.dataset.edit.split('|');
    if(m==='clientes') openClientModal(Number(id));
    else openMasterModal(m,Number(id));
    return;
  }

  /* Ver */
  const viewBtn=t.closest('[data-view]');
  if(viewBtn){
    const [m,id]=viewBtn.dataset.view.split('|');
    openViewModal(m,Number(id));
    return;
  }

  /* Toggle */
  const togBtn=t.closest('[data-toggle]');
  if(togBtn){
    const [m,id]=togBtn.dataset.toggle.split('|');
    toggleRecord(m,Number(id));
    return;
  }

  /* Carga masiva */
  const bulkBtn=t.closest('[data-bulk]');
  if(bulkBtn){ openBulk(bulkBtn.dataset.bulk); return; }

  /* Hoja 1/2 */
  const sheetBtn=t.closest('[data-sheet]');
  if(sheetBtn){
    const [m,mode]=sheetBtn.dataset.sheet.split('|');
    sheetMode[m]=mode; renderScreen(m);
    return;
  }

  /* Cerrar modales al click en backdrop */
  if(t.id==='clientModal')  closeClientModal();
  if(t.id==='confirmModal') document.getElementById('confirmModal').classList.remove('show');
  if(t.id==='viewModal')    document.getElementById('viewModal').classList.remove('show');
  if(t.id==='masterModal')  closeMasterModal();
  if(t.id==='bulkModal')    document.getElementById('bulkModal').classList.remove('show');

  /* Remover contacto / punto */
  const rc=t.closest('[data-rc]');
  if(rc){ const b=rc.closest('[data-cid]'); if(document.querySelectorAll('[data-cid]').length>1) b?.remove(); else toast('Debe quedar al menos un contacto.'); }
  const rp=t.closest('[data-rp]');
  if(rp){ const b=rp.closest('[data-pid]'); if(document.querySelectorAll('[data-pid]').length>1) b?.remove(); else toast('Debe quedar al menos un punto.'); }
});

/* Eventos delegados para cambios de filtro en módulos activos */
document.addEventListener('change', e=>{
  const id=e.target?.id||'';

  /* Empresa activa */
  if(id==='empresaActiva'){
    applyTheme(e.target.value);
    MAESTROS.forEach(m=>{ const sec=document.getElementById(m); if(sec?.classList.contains('active')) renderScreen(m); });
    return;
  }

  /* Estado cliente */
  if(id==='cli_estado') syncClientState();

  /* Estado maestro */
  if(id==='mm_estado') syncMasterState();

  /* el re-render de bindFilters ya reconstruye la tabla con el color correcto */
});

/* Botones del modal cliente */
document.getElementById('cmClose').addEventListener('click', closeClientModal);
document.getElementById('cmCancel').addEventListener('click', closeClientModal);
document.getElementById('cmClear').addEventListener('click', ()=>openClientModal(clientEditId));
document.getElementById('cmSave').addEventListener('click', requestConfirmClient);
document.getElementById('btnSunat').addEventListener('click', sunatDemo);
document.getElementById('btnAddContact').addEventListener('click', ()=>document.getElementById('cliContacts').insertAdjacentHTML('beforeend',contactBox({})));
document.getElementById('btnAddPoint').addEventListener('click', ()=>document.getElementById('cliPoints').insertAdjacentHTML('beforeend',pointBox({})));

/* Botones confirmar */
document.getElementById('confirmClose').addEventListener('click', ()=>document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('confirmCancel').addEventListener('click', ()=>document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('confirmOk').addEventListener('click', ()=>{ document.getElementById('confirmModal').classList.remove('show'); saveClient(); });

/* Botones ver */
document.getElementById('viewClose').addEventListener('click', ()=>document.getElementById('viewModal').classList.remove('show'));

/* Botones maestro modal */
document.getElementById('mmClose').addEventListener('click', closeMasterModal);
document.getElementById('mmClear').addEventListener('click', ()=>openMasterModal(masterModule,null));
document.getElementById('mmSave').addEventListener('click', saveMaster);

/* Carga masiva */
document.getElementById('bulkClose').addEventListener('click', ()=>document.getElementById('bulkModal').classList.remove('show'));
document.getElementById('btnPreview').addEventListener('click', previewBulk);
document.getElementById('btnImport').addEventListener('click', importBulk);
document.getElementById('bulkModule').addEventListener('change', e=>openBulk(e.target.value));

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Maestros');
    initData();
    applyTheme('KCF');
    openScreen('clientes');
});

console.log('✅ Maestros JS cargado completamente');