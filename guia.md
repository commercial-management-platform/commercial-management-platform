# Historias de usuario

Plataforma de Gestión Comercial. Este documento describe cada HU: historia, criterios de aceptación, datos, endpoints y subtareas. Los prompts para implementarlas con IA están en [`ai-prompts.md`](ai-prompts.md).

Los nombres de tablas, columnas, módulos y roles siguen [`naming-glossary.md`](naming-glossary.md). Los puntos marcados como **pendiente de confirmar** no se implementan hasta que el equipo los defina.

## Índice

| HU                                                               | Título                                           | Responsable | Prioridad  |
| ---------------------------------------------------------------- | ------------------------------------------------ | ----------- | ---------- |
| [HU-01](#hu-01--autenticación-de-usuarios)                       | Autenticación de usuarios                        | Brayan      | Alta       |
| [HU-02](#hu-02--gestión-de-usuarios-asesores-y-permisos-por-rol) | Gestión de usuarios, asesores y permisos por rol | Brayan      | Alta       |
| [HU-03](#hu-03--gestión-de-clientes)                             | Gestión de clientes                              | Natalia     | Alta       |
| [HU-04](#hu-04--gestión-de-contactos-de-clientes)                | Gestión de contactos de clientes                 | Natalia     | Alta       |
| [HU-05](#hu-05--gestión-de-catálogos-comerciales)                | Gestión de catálogos comerciales                 | Jose        | Alta       |
| [HU-06](#hu-06--gestión-de-portafolios-de-clientes)              | Gestión de portafolios de clientes               | Natalia     | Alta       |
| [HU-07](#hu-07--gestión-de-rutas-comerciales)                    | Gestión de rutas comerciales                     | Stevel      | Alta       |
| [HU-08](#hu-08--programar-y-consultar-visitas)                   | Programar y consultar visitas                    | Stevel      | Alta (P0)  |
| [HU-09](#hu-09--registrar-resultados-de-visitas)                 | Registrar resultados de visitas                  | Stevel      | Media (P1) |
| [HU-10](#hu-10--gestionar-seguimientos-comerciales)              | Gestionar seguimientos comerciales               | Brayan      | Media (P1) |
| [HU-11](#hu-11--visualizar-visitas-en-un-mapa)                   | Visualizar visitas en un mapa                    | Ricardo     | Media (P1) |
| [HU-12](#hu-12--crear-y-consultar-cotizaciones)                  | Crear y consultar cotizaciones                   | Jose        | Media (P1) |
| [HU-13](#hu-13--gestionar-detalles-de-cotización)                | Gestionar detalles de cotización                 | Jose        | Media (P1) |
| [HU-14](#hu-14--registrar-y-consultar-pedidos)                   | Registrar y consultar pedidos                    | Jose        | Media (P1) |
| [HU-15](#hu-15--consultar-dashboard-de-indicadores-comerciales)  | Consultar dashboard de indicadores comerciales   | Ricardo     | Media (P1) |
| [HU-16](#hu-16--registrar-historial-de-actividad-del-cliente)    | Registrar historial de actividad del cliente     | Brayan      | Media (P1) |
| [HU-17](#hu-17--exportar-reportes-csv)                           | Exportar reportes CSV                            | Brayan      | Media (P1) |
| [HU-18](#hu-18--desplegar-la-aplicación-en-aws)                  | Desplegar la aplicación en AWS                   | Laura       | Alta (P0)  |
| [HU-19](#hu-19--automatizar-despliegues-con-jenkins)             | Automatizar despliegues con Jenkins              | Laura       | Alta (P0)  |
| [HU-20](#hu-20--gestionar-documentos-y-archivos-en-s3)           | Gestionar documentos y archivos en S3            | Laura       | Alta (P0)  |
| [HU-21](#hu-21--validar-la-solución-integrada)                   | Validar la solución integrada                    | Neider      | Alta (P0)  |
| [HU-22](#hu-22--importar-clientes-desde-csv)                     | Importar clientes desde CSV                      | Natalia     | Alta (P0)  |

---

## HU-01 — Autenticación de usuarios

- **Épica:** Acceso, usuarios y permisos
- Prioridad alta
- **Backend:** NestJS
- Clean Architecture
- betterAuth

### Historia de usuario

Como usuario de la plataforma (administrador, director o asesor), quiero iniciar y cerrar sesión de forma segura para acceder a las funcionalidades que me corresponden según mi rol.

- **Responsable:** Brayan
- **Revisión técnica:** Neider
- **Colaboradores:** Jose (persistencia), Ricardo (frontend) y Laura (despliegue).
- **Repositorio:** monorepo existente en GitHub. Los nombres de tablas, columnas, módulos y roles siguen docs/naming-glossary.md (en inglés).
- **Dependencias:** estructura base de NestJS, configuración de betterAuth y conexión de persistencia.

### 1. Objetivo

Implementar la autenticación de usuarios mediante betterAuth en el backend NestJS, manteniendo la separación de responsabilidades de Clean Architecture.

La HU debe permitir que un usuario se autentique, que su sesión pueda verificarse y que los endpoints protegidos rechacen solicitudes sin una sesión válida.

Los roles definidos para el proyecto, con los valores de docs/naming-glossary.md, son:

- admin
- director
- advisor

La autenticación identifica al usuario; la autorización por rol determina qué operaciones puede ejecutar. Aunque ambas se relacionan, deben implementarse y probarse por separado.

### 2. Criterios de aceptación

- **CA-01 — Inicio de sesión:** Un usuario registrado puede autenticarse utilizando el mecanismo configurado en betterAuth.
- **CA-02 — Credenciales inválidas:** Las credenciales incorrectas no permiten iniciar sesión y generan una respuesta controlada.
- **CA-03 — Verificación de sesión:** El backend puede verificar una sesión válida y obtener la identidad del usuario autenticado.
- **CA-04 — Protección de endpoints:** Las solicitudes sin sesión válida reciben una respuesta HTTP 401 cuando intentan acceder a un recurso protegido.
- **CA-05 — Cierre de sesión:** El usuario puede cerrar su sesión mediante el flujo soportado por betterAuth y la sesión deja de ser válida.
- **CA-06 — Roles:** La identidad autenticada permite consultar el rol asignado al usuario. Los permisos por rol se aplican mediante autorización.
- **CA-07 — Persistencia:** La configuración de autenticación utiliza la persistencia acordada y funciona con PostgreSQL en RDS.
- **CA-08 — Documentación y pruebas:** El flujo está documentado en OpenAPI cuando corresponda y cuenta con pruebas de los casos principales.

### 3. Estructura técnica con Clean Architecture

La autenticación debe respetar las capas concéntricas. No introduzcan lógica de negocio dentro del controlador ni dependan de NestJS desde el dominio.

Una estructura inicial posible dentro de backend/src es:

```text
src/
├── modules/
│   └── auth/
│       ├── domain/
│       │   ├── entities/
│       │   └── ports/
│       ├── application/
│       │   └── use-cases/
│       │       ├── get-current-user.use-case.ts
│       │       └── logout.use-case.ts
│       ├── infrastructure/
│       │   └── better-auth/
│       │       ├── better-auth.config.ts
│       │       └── better-auth.adapter.ts
│       └── presentation/
│           ├── auth.controller.ts
│           ├── auth.module.ts
│           └── guards/
├── config/
├── shared/
└── main.ts
```

Esta estructura es orientativa: antes de crear archivos, Brayan debe revisar el monorepo y seguir las convenciones que ya existan.

Consideración importante: betterAuth ya implementa buena parte del flujo de autenticación y gestión de sesiones. No conviene recrear su sistema de sesiones ni construir contraseñas, tokens o tablas de autenticación propias sin necesidad. El adaptador debe integrar betterAuth con NestJS y exponer al resto de la aplicación únicamente las operaciones necesarias.

### 4. Contrato esperado de la API

El equipo debe comprobar las rutas reales que expone la configuración de betterAuth y documentarlas correctamente en Swagger. No deben inventarse endpoints propios si betterAuth ya ofrece la operación correspondiente.

Como referencia, el contrato funcional debe cubrir:

| Operación                 | Resultado esperado                                     |
| ------------------------- | ------------------------------------------------------ |
| Iniciar sesión            | Autenticar al usuario y establecer la sesión           |
| Obtener usuario actual    | Devolver la identidad y el rol del usuario autenticado |
| Cerrar sesión             | Invalidar la sesión según el mecanismo configurado     |
| Acceder a ruta protegida  | Permitir la solicitud solo si la sesión es válida      |
| Acceder sin autenticación | Responder 401 Unauthorized                             |

Las rutas concretas dependen de la configuración de betterAuth. Si se usan cookies, Ricardo debe configurar correctamente el envío de credenciales desde Svelte y Laura debe verificar HTTPS, dominios y configuración de cookies en el despliegue.

### 5. Seguridad y pruebas mínimas

Antes de marcar la HU como terminada, verifiquen:

- Las contraseñas no se almacenan en texto plano.
- Los secretos y las variables de entorno no están en GitHub.
- Los endpoints protegidos rechazan sesiones inválidas.
- El rol se obtiene de una fuente confiable del backend y no de un valor enviado libremente por el frontend.
- Los errores no revelan información sensible.
- El flujo funciona con PostgreSQL y el entorno de despliegue.
- Las pruebas cubren inicio de sesión correcto, credenciales incorrectas, sesión inválida y cierre de sesión.

Solo acceden usuarios internos (admin, director y advisor) con una misma interfaz limitada por rol; los clientes no tienen acceso a la plataforma. Límite de esta HU: implementar autenticación no significa construir todo el módulo administrativo de usuarios. La gestión completa de asesores y la matriz detallada de permisos pueden quedar en HU separadas, aunque esta historia debe dejar la identidad y el rol disponibles para las siguientes.

### 6. Definition of Done

La HU-01 puede pasar a Done cuando:

1. El código respeta Clean Architecture y la estructura del monorepo.
2. betterAuth está integrado con el backend NestJS.
3. La sesión funciona correctamente con la persistencia acordada.
4. Se verifican los criterios de aceptación y las pruebas pasan.
5. Swagger documenta las operaciones propias y el comportamiento de las rutas protegidas.
6. Neider aprueba el pull request y el cambio queda integrado en dev.
7. Ricardo confirma que el frontend puede consumir el flujo de autenticación.

---

## HU-02 — Gestión de usuarios, asesores y permisos por rol

Esta HU corresponde al módulo de gestión de usuarios y autorización de la Plataforma de Gestión Comercial. La autenticación corresponde a la HU-01; esta historia se enfoca en que los usuarios autorizados puedan administrar las cuentas de los asesores y controlar sus permisos según su rol.

- Prioridad alta
- **Épica:** Usuarios y permisos
- Sprint por definir
- **Story Points:** 8 estimados
- **Responsable principal:** Brayan
- **Revisor técnico:** Neider
- **Apoyo:** Jose (persistencia y base de datos), Ricardo (integración frontend), Laura (despliegue).
- **Dependencia:** HU-01 — Autenticación de usuarios.

### 1. Historia de usuario

Como administrador de la Plataforma de Gestión Comercial,

quiero gestionar las cuentas de los usuarios y asignarles los roles correspondientes,

para controlar quién puede acceder a cada funcionalidad de la plataforma y garantizar que cada usuario tenga únicamente los permisos que le corresponden.

### 2. Criterios de aceptación

- CA-01 — Listado de usuarios: el administrador puede consultar los usuarios registrados con su información básica, rol y estado.
- CA-02 — Creación de usuarios: el administrador puede registrar usuarios con los datos obligatorios y un rol permitido por el sistema.
- CA-03 — Consulta individual: se puede consultar el detalle de un usuario mediante su identificador.
- CA-04 — Actualización: el administrador puede actualizar los datos permitidos de un usuario.
- CA-05 — Asignación de roles: cada usuario debe tener un rol válido entre admin, director y advisor.
- CA-06 — Activación y desactivación: el administrador puede desactivar o reactivar una cuenta sin eliminar innecesariamente su historial comercial.
- CA-07 — Control de acceso: los endpoints administrativos deben rechazar solicitudes de usuarios sin permisos suficientes.
- CA-08 — Protección del administrador: el sistema debe impedir que una operación deje la plataforma sin ningún administrador activo.
- CA-09 — Validación: los datos obligatorios, formatos y roles se validan antes de persistir cambios.
- CA-10 — Persistencia: la información se almacena mediante TypeORM y la base de datos PostgreSQL configurada para el proyecto.
- CA-11 — Pruebas: existen pruebas para operaciones exitosas, datos inválidos, usuarios no autenticados y usuarios sin permisos.
- CA-12 — Documentación: las operaciones personalizadas se documentan en Swagger/OpenAPI, siguiendo el estándar existente.
- CA-13 — Alcance del director: el director solo crea, edita, activa y desactiva usuarios con rol advisor; asignar o modificar los roles admin y director es exclusivo del admin.

Regla importante: no basta con ocultar botones en el frontend. Los permisos deben verificarse en el backend.

### 3. Permisos por rol

Matriz aprobada por el equipo. Las reglas detalladas de cada módulo se aplican en su propia HU.

| Funcionalidad                     | admin | director              | advisor                                        |
| --------------------------------- | ----- | --------------------- | ---------------------------------------------- |
| Gestionar usuarios y roles        | Sí    | Solo usuarios advisor | No                                             |
| Consultar usuarios                | Sí    | Solo asesores         | No                                             |
| Consultar dashboard comercial     | Sí    | Sí                    | Solo sus indicadores                           |
| Gestionar clientes                | Sí    | Sí                    | Consulta y actualiza los de sus rutas; no crea |
| Acceder a funcionalidades propias | Sí    | Sí                    | Sí                                             |
| Administrar catálogos             | Sí    | No                    | No                                             |
| Crear, editar y asignar rutas     | Sí    | Sí                    | No; solo consulta las suyas                    |
| Exportar reportes CSV             | Sí    | Sí                    | Solo sus datos                                 |

La HU-02 debe implementar la administración de usuarios y los permisos correspondientes. Las reglas específicas de clientes, rutas, visitas y reportes se aplicarán en las historias de esos módulos.

### 4. Endpoints propuestos

Estos endpoints son una propuesta para acordar con Neider, no rutas confirmadas del proyecto. Antes de crearlos, Brayan debe revisar la estructura existente y evitar duplicar funcionalidades que ya estén implementadas.

| Método | Endpoint propuesto | Función                        |
| ------ | ------------------ | ------------------------------ |
| GET    | /users             | Listar usuarios                |
| POST   | /users             | Crear usuario                  |
| GET    | /users/:id         | Consultar usuario              |
| PATCH  | /users/:id         | Actualizar datos permitidos    |
| PATCH  | /users/:id/role    | Cambiar el rol                 |
| PATCH  | /users/:id/status  | Activar o desactivar la cuenta |

Consideración con BetterAuth: la gestión de contraseñas, sesiones y credenciales debe respetar la implementación de la HU-01. No se deben crear contraseñas ni sesiones paralelas por fuera del mecanismo establecido.

### 5. Subtareas para ClickUp

- [ ] **HU02-T01** Revisar estructura actual, HU-01 y modelo de usuarios — Brayan
- [ ] **HU02-T02** Definir entidad, roles y estados de usuario — Brayan + Jose
- [ ] **HU02-T03** Definir permisos y reglas de autorización — Brayan + Neider
- [ ] **HU02-T04** Implementar casos de uso de gestión de usuarios — Brayan
- [ ] **HU02-T05** Implementar persistencia con TypeORM — Brayan + Jose
- [ ] **HU02-T06** Crear o adaptar controladores, DTOs y validaciones — Brayan
- [ ] **HU02-T07** Aplicar guards y restricciones por rol — Brayan
- [ ] **HU02-T08** Documentar operaciones en Swagger — Brayan
- [ ] **HU02-T09** Crear pruebas unitarias y de integración — Brayan + Jose
- [ ] **HU02-T10** Verificar integración con el frontend — Ricardo
- [ ] **HU02-T11** Revisar PR e integrar siguiendo el flujo Git del equipo — Neider

### 6. Estructura técnica orientativa

Como el proyecto utiliza NestJS, TypeScript y Clean Architecture, la implementación debe respetar la estructura que ya exista. Si el módulo todavía no existe, una organización posible sería:

```text
backend/src/modules/users/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    ├── dto/
    └── guards/
```

No es necesario crear todos estos directorios si el proyecto utiliza otra convención consistente. No se crea una segunda entidad de usuario: el usuario y la sesión son los de BetterAuth. La tabla advisor (id, name, email, phone, status) se vincula a ese usuario mediante user_id, y route, visit y quote apuntan a advisor mediante advisor_id.

---

## HU-03 — Gestión de clientes

Esta historia se enfoca en implementar el CRUD de clientes de la Plataforma de Gestión Comercial, respetando la arquitectura Clean Architecture y la estructura que ya tenga el repositorio.

- Prioridad alta
- **Épica:** Gestión comercial
- Sprint por definir
- 8 puntos estimados
- **Responsable principal:** Natalia
- **Revisor técnico:** Neider
- **Apoyo técnico:** Jose (modelo de datos, TypeORM y migraciones); Ricardo (integración frontend).
- **Dependencias:** HU-01 — Autenticación; HU-02 — Usuarios y permisos; HU-05 — Catálogos comerciales.

### 1. Historia de usuario

Como asesor comercial o usuario autorizado de la Plataforma de Gestión Comercial,

quiero registrar, consultar, actualizar y cambiar el estado de los clientes,

para mantener organizada y actualizada la información comercial y utilizarla en las visitas, seguimientos, rutas y cotizaciones.

### 2. Criterios de aceptación

- CA-01 — Registrar cliente: un usuario autorizado puede crear un cliente con los campos obligatorios definidos por el proyecto.
- CA-02 — Validar información: el sistema rechaza datos obligatorios vacíos, formatos incorrectos y valores inválidos.
- CA-03 — Consultar clientes: se puede obtener una lista de clientes registrados.
- CA-04 — Consultar detalle: se puede consultar un cliente por su identificador.
- CA-05 — Actualizar cliente: se pueden modificar los datos permitidos de un cliente existente.
- CA-06 — Estado del cliente: se puede cambiar su estado sin borrar innecesariamente su historial comercial.
- CA-07 — Evitar duplicados: el NIT es único en el sistema; un NIT repetido se rechaza con 409 Conflict.
- CA-08 — Relaciones válidas: si el cliente está relacionado con una zona, tipo, potencial o estado de catálogo, se debe comprobar que dichos registros existan y sean válidos.
- CA-09 — Autorización: solo los usuarios autenticados con permisos suficientes pueden ejecutar las operaciones.
- CA-10 — Persistencia: los datos se almacenan mediante TypeORM y PostgreSQL utilizando la configuración existente.
- CA-11 — Manejo de errores: se devuelven errores consistentes para clientes inexistentes, datos inválidos y conflictos de duplicidad.
- CA-12 — Pruebas y documentación: las operaciones se prueban y se documentan en Swagger/OpenAPI.
- CA-13 — Bitácora: crear, actualizar o cambiar el estado de un cliente registra una entrada en activity_log (HU-16) con fecha, acción, usuario y descripción.

Visibilidad por rol: admin y director crean, consultan y actualizan todos los clientes. El advisor no crea clientes; solo consulta y actualiza los clientes incluidos en sus rutas (route_client de las rutas asignadas a él).

### 3. Datos del cliente

Campos del cliente, según el modelo ER del reto:

| Campo                | Propósito                                                                     |
| -------------------- | ----------------------------------------------------------------------------- |
| id                   | Identificador único                                                           |
| nit                  | NIT, único en el sistema                                                      |
| legal_name           | Razón social                                                                  |
| trade_name           | Nombre comercial                                                              |
| address              | Dirección comercial                                                           |
| department           | Departamento                                                                  |
| municipality         | Municipio                                                                     |
| neighborhood         | Barrio                                                                        |
| phone                | Número de contacto principal                                                  |
| email                | Correo de contacto                                                            |
| latitude             | Latitud: mapa de visitas (HU-11) y confirmación de la ubicación de la visita  |
| longitude            | Longitud: mapa de visitas (HU-11) y confirmación de la ubicación de la visita |
| zone_id              | Zona comercial (catálogo de HU-05)                                            |
| client_type_id       | Tipo de cliente (catálogo de HU-05)                                           |
| client_potential_id  | Potencial comercial (catálogo de HU-05)                                       |
| client_status_id     | Estado del cliente (catálogo de HU-05)                                        |
| visit_frequency_days | Cada cuántos días se debe visitar al cliente                                  |
| created_at           | Fecha de creación                                                             |
| active               | Falso cuando el cliente está desactivado; su historial se conserva            |

Los campos siguen la entidad Cliente del modelo ER del reto, con nombres en inglés según docs/naming-glossary.md (tabla client), más latitude y longitude para el mapa de visitas (HU-11). Los catálogos se guardan como relaciones (FK), no como texto libre.

### 4. Endpoints propuestos

Las siguientes rutas son una propuesta para acordar con el equipo y adaptar al contrato actual del backend.

| Método | Endpoint            | Función              |
| ------ | ------------------- | -------------------- |
| POST   | /clients            | Registrar cliente    |
| GET    | /clients            | Listar clientes      |
| GET    | /clients/:id        | Consultar un cliente |
| PATCH  | /clients/:id        | Actualizar datos     |
| PATCH  | /clients/:id/status | Cambiar el estado    |

Reglas de implementación

- Utilizar DTOs para validar las solicitudes.
- Utilizar paginación si el proyecto ya contempla listados paginados; si no, acordar el contrato antes de introducirla.
- Mantener las relaciones con las entidades de catálogo y usuarios.
- No eliminar físicamente clientes que tengan visitas, seguimientos, cotizaciones o pedidos asociados.
- No implementar aquí la gestión de contactos, rutas, visitas o cotizaciones: corresponden a otras historias.
- No inventar campos ni endpoints sin revisar el código y los requisitos aprobados.

### 5. Subtareas para ClickUp

- [ ] **HU03-T01** Revisar requisitos, entidades y estructura actual del backend — Natalia
- [ ] **HU03-T02** Acordar campos, restricciones y relaciones del cliente — Natalia + Jose
- [ ] **HU03-T03** Definir reglas de acceso y visibilidad por rol — Natalia + Neider
- [ ] **HU03-T04** Implementar entidad y persistencia según el modelo existente — Natalia + Jose
- [ ] **HU03-T05** Implementar DTOs y validaciones — Natalia
- [ ] **HU03-T06** Implementar casos de uso para crear, listar, consultar y actualizar — Natalia
- [ ] **HU03-T07** Implementar controladores y manejo de errores — Natalia
- [ ] **HU03-T08** Integrar autorización con HU-01 y HU-02 — Natalia + Neider
- [ ] **HU03-T09** Documentar endpoints en Swagger — Natalia
- [ ] **HU03-T10** Crear pruebas unitarias y de integración — Natalia + Jose
- [ ] **HU03-T11** Verificar consumo de la API desde el frontend — Ricardo
- [ ] **HU03-T12** Revisar PR e integrar según el flujo Git del equipo — Neider

### 6. Estructura técnica orientativa

Respeta la estructura real del repositorio. Si todavía no existe el módulo de clientes, una organización compatible con Clean Architecture podría ser:

```text
backend/src/modules/clients/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

No crees esta estructura de manera automática si el proyecto ya tiene una convención establecida. Tampoco dupliques entidades, repositorios o servicios existentes.

---

## HU-04 — Gestión de contactos de clientes

Esta historia continúa la HU-03 de gestión de clientes. Su objetivo es permitir que cada cliente tenga uno o varios contactos asociados, para registrar las personas con las que el equipo comercial se comunica.

- Prioridad alta
- **Épica:** Gestión comercial
- Sprint por definir
- 5 puntos estimados
- **Responsable principal:** Natalia
- **Revisor técnico:** Neider
- **Apoyo técnico:** Jose (modelo de datos y persistencia); Ricardo (integración frontend).
- **Dependencia:** HU-03 — Gestión de clientes.

### 1. Historia de usuario

Como asesor comercial o usuario autorizado,

quiero registrar y administrar los contactos asociados a cada cliente,

para mantener actualizada la información de las personas con las que debo comunicarme durante la gestión comercial.

### 2. Criterios de aceptación

- CA-01 — Registrar contacto: se puede crear un contacto asociado a un cliente existente.
- CA-02 — Datos obligatorios: se validan los campos requeridos y los formatos definidos por el proyecto.
- CA-03 — Listar contactos: se pueden consultar los contactos pertenecientes a un cliente específico.
- CA-04 — Consultar contacto: se puede consultar el detalle de un contacto mediante su identificador.
- CA-05 — Actualizar contacto: se puede modificar la información de un contacto existente.
- CA-06 — Desactivar contacto: se puede marcar un contacto como inactivo sin eliminar innecesariamente su historial.
- CA-07 — Validar cliente: no se puede asociar un contacto a un cliente inexistente.
- CA-08 — Validar pertenencia: al consultar, modificar o desactivar un contacto, se verifica que pertenezca al cliente indicado cuando la operación esté anidada bajo ese cliente.
- CA-09 — Autorización: solo usuarios autenticados con permisos suficientes pueden gestionar contactos.
- CA-10 — Persistencia: los datos se guardan utilizando TypeORM y la conexión PostgreSQL existente.
- CA-11 — Manejo de errores: el sistema responde correctamente ante identificadores inexistentes, datos inválidos y operaciones no autorizadas.
- CA-12 — Pruebas y documentación: se implementan pruebas y se documentan los endpoints en Swagger/OpenAPI.
- CA-13 — Bitácora: crear, actualizar, desactivar o cambiar el contacto principal registra una entrada en activity_log del cliente (HU-16).

### 3. Datos del contacto

Los campos siguen la entidad Contacto del modelo ER del reto, con nombres en inglés según docs/naming-glossary.md (tabla contact).

| Campo      | Descripción                          |
| ---------- | ------------------------------------ |
| id         | Identificador único del contacto     |
| client_id  | Cliente al que pertenece             |
| name       | Nombre de la persona                 |
| job_title  | Cargo o función dentro de la empresa |
| phone      | Número de contacto                   |
| mobile     | Número de celular                    |
| email      | Correo electrónico                   |
| is_primary | Indica si es el contacto principal   |
| active     | Estado activo o inactivo             |
| created_at | Fecha de creación                    |
| updated_at | Fecha de última actualización        |

El campo active se agrega al modelo ER para permitir la desactivación (CA-06).

Regla de negocio: cada cliente tiene un solo contacto principal. Al marcar un contacto como principal, el anterior se desmarca en la misma transacción.

### 4. Endpoints propuestos

| Método | Endpoint                               | Función                        |
| ------ | -------------------------------------- | ------------------------------ |
| POST   | /clients/:clientId/contacts            | Crear contacto para un cliente |
| GET    | /clients/:clientId/contacts            | Listar contactos del cliente   |
| GET    | /clients/:clientId/contacts/:id        | Consultar un contacto          |
| PATCH  | /clients/:clientId/contacts/:id        | Actualizar contacto            |
| PATCH  | /clients/:clientId/contacts/:id/status | Activar o desactivar contacto  |

Las rutas son orientativas. Si el backend ya tiene un contrato de API definido, debes mantenerlo y evitar duplicar endpoints.

### 5. Subtareas para ClickUp

- [ ] **HU04-T01** Revisar entidad client y estructura actual del backend — Natalia
- [ ] **HU04-T02** Definir campos, restricciones y relación Cliente–Contacto — Natalia + Jose
- [ ] **HU04-T03** Definir permisos y alcance de acceso a contactos — Natalia + Neider
- [ ] **HU04-T04** Implementar entidad y persistencia de contactos — Natalia + Jose
- [ ] **HU04-T05** Implementar DTOs y validaciones — Natalia
- [ ] **HU04-T06** Implementar casos de uso de creación, consulta y actualización — Natalia
- [ ] **HU04-T07** Implementar desactivación y validación de pertenencia — Natalia
- [ ] **HU04-T08** Integrar autorización y documentar en Swagger — Natalia
- [ ] **HU04-T09** Crear pruebas unitarias y de integración — Natalia + Jose
- [ ] **HU04-T10** Validar consumo de la API desde el frontend — Ricardo
- [ ] **HU04-T11** Revisar PR e integrar según el flujo del equipo — Neider

### 6. Estructura técnica orientativa

Respeta primero la estructura real del repositorio. Si el proyecto organiza cada módulo de esta manera, el módulo de contactos podría quedar así:

```text
backend/src/modules/contacts/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

La relación principal sería:

- Un cliente puede tener varios contactos.
- Cada contacto pertenece a un cliente.

No dupliques la entidad client creada o acordada en HU-03.

---

## HU-05 — Gestión de catálogos comerciales

Esta historia contempla la administración de los catálogos que utiliza la Plataforma de Gestión Comercial para clasificar clientes y registrar resultados de las actividades comerciales. Es la base para que los formularios de clientes, visitas y seguimientos utilicen opciones consistentes.

- Prioridad alta
- **Épica:** Gestión comercial
- Sprint por definir
- 8 puntos estimados
- **Responsable principal:** Jose
- **Revisor técnico:** Neider
- **Apoyo técnico:** Natalia y Neider; Ricardo (integración frontend).
- **Dependencias:** HU-01 y HU-02 — Autenticación y permisos. HU-03 (clientes), HU-06 (portafolios) y HU-09 (resultados de visita) dependen de esta HU.

### 1. Historia de usuario

Como administrador de la Plataforma de Gestión Comercial,

quiero gestionar los catálogos comerciales del sistema,

para mantener estandarizadas las clasificaciones de clientes y los resultados de las actividades comerciales, evitando datos inconsistentes o duplicados.

### 2. Catálogos incluidos

La HU contempla estos siete catálogos. Los dos últimos salen de la explicación del creador del reto sobre el registro de visitas:

| Catálogo             | Propósito                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| Zonas                | Organizar clientes y actividades por zona geográfica o comercial.                    |
| Tipos de cliente     | Clasificar los clientes según su tipo de negocio o categoría.                        |
| Potencial            | Clasificar clientes según el potencial comercial definido por el negocio.            |
| Estados de cliente   | Identificar la situación comercial de un cliente.                                    |
| Resultados de visita | Estandarizar los resultados posibles de una visita comercial.                        |
| Objetivos de visita  | Estandarizar el propósito de cada visita (por ejemplo, presentación de nueva línea). |
| Tipos de visita      | Clasificar la visita según su tipo (por ejemplo, desarrollo de cliente).             |

Estos catálogos se desprenden de las entidades identificadas en el modelo inicial del proyecto. Los valores iniciales se cargan con un seed, que también carga los portafolios (no tienen CRUD). Propuesta por validar con el equipo: Zonas: Norte, Sur, Centro, Metropolitana. Tipos de cliente: Industrial, Distribuidor, Retail. Potencial (orden): Alto (1), Medio (2), Bajo (3). Estados de cliente: Prospecto, Activo, Inactivo. Resultados de visita: Interesado, Pedido, No interesado, No visitado. Portafolios: Equipos industriales, Herramientas, Ferretería, Insumos de soldadura. Objetivos de visita: Presentación de nueva línea, Seguimiento de cotización, Cierre comercial, Servicio posventa. Tipos de visita: Prospección, Desarrollo de cliente, Seguimiento. Las listas fijas del registro de visita (interés: alto, medio, bajo; módulo de interés: calidad, precio, calidad y precio) no son catálogos administrables y se definen con la HU de visitas.

### 3. Criterios de aceptación

- CA-01 — Consultar catálogos: los usuarios autorizados pueden consultar las opciones disponibles.
- CA-02 — Crear registros: el administrador puede crear elementos nuevos en los catálogos permitidos.
- CA-03 — Actualizar registros: el administrador puede modificar los campos editables.
- CA-04 — Activar o desactivar: los registros pueden desactivarse sin eliminarlos si ya están relacionados con información comercial.
- CA-05 — Validar datos: los campos obligatorios y formatos se validan antes de guardar.
- CA-06 — Evitar duplicados: el sistema aplica reglas de unicidad, por ejemplo, para códigos o nombres dentro del mismo catálogo cuando corresponda.
- CA-07 — Proteger relaciones: no se deben eliminar físicamente elementos que estén referenciados por clientes, visitas u otras entidades.
- CA-08 — Controlar permisos: únicamente el administrador puede crear, modificar o desactivar catálogos; los permisos de consulta deben ajustarse al contrato aprobado.
- CA-09 — Persistencia: los datos se almacenan mediante TypeORM y PostgreSQL utilizando la conexión existente.
- CA-10 — Pruebas y documentación: se prueban las operaciones y se documentan los endpoints en Swagger/OpenAPI.

### 4. Endpoints propuestos

Para evitar crear diez o más rutas independientes sin necesidad, se puede acordar un patrón común de endpoints para los catálogos.

| Método | Endpoint propuesto         | Función                        |
| ------ | -------------------------- | ------------------------------ |
| GET    | /catalogs/zones            | Consultar zonas                |
| POST   | /catalogs/zones            | Crear zona                     |
| PATCH  | /catalogs/zones/:id        | Actualizar zona                |
| PATCH  | /catalogs/zones/:id/status | Cambiar estado                 |
| GET    | /catalogs/client-types     | Consultar tipos de cliente     |
| GET    | /catalogs/potentials       | Consultar potenciales          |
| GET    | /catalogs/client-statuses  | Consultar estados de cliente   |
| GET    | /catalogs/visit-results    | Consultar resultados de visita |
| GET    | /catalogs/visit-objectives | Consultar objetivos de visita  |
| GET    | /catalogs/visit-types      | Consultar tipos de visita      |

El mismo patrón de escritura puede aplicarse a los demás catálogos si el equipo necesita administrarlos desde la plataforma.

Importante: estas rutas son sugeridas, no confirmadas. Revisa el contrato actual del backend antes de implementarlas. No hace falta duplicar controladores si ya existe una estructura común para catálogos.

### 5. Subtareas para ClickUp

- [ ] **HU05-T01** Revisar entidades y catálogos definidos en el modelo del proyecto — Jose
- [ ] **HU05-T02** Confirmar campos, valores permitidos y reglas de unicidad — Jose + Neider
- [ ] **HU05-T03** Revisar relaciones con clientes y visitas — Jose + Natalia
- [ ] **HU05-T04** Implementar o adaptar entidades y persistencia — Jose + Natalia
- [ ] **HU05-T05** Implementar consultas de catálogos — Jose
- [ ] **HU05-T06** Implementar creación y actualización de catálogos autorizados — Jose
- [ ] **HU05-T07** Implementar activación/desactivación y protección de relaciones — Jose
- [ ] **HU05-T08** Integrar validaciones y permisos — Jose + Neider
- [ ] **HU05-T09** Documentar operaciones en Swagger — Jose
- [ ] **HU05-T10** Crear pruebas unitarias y de integración — Jose + Natalia
- [ ] **HU05-T11** Validar el consumo de catálogos desde el frontend — Ricardo
- [ ] **HU05-T12** Revisar PR e integrar mediante el flujo Git del equipo — Neider

### 6. Estructura técnica orientativa

Respeta la organización que ya tenga el repositorio. Si aún no hay un módulo de catálogos, una alternativa sería:

```text
backend/src/modules/catalogs/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

Si cada catálogo ya tiene su propia entidad o módulo, reutilízalo. No crees entidades duplicadas para zone, client_type, client_potential, client_status, visit_result, visit_objective o visit_type.

---

## HU-06 — Gestión de portafolios de clientes

- **Épica:** Gestión de clientes
- **Prioridad:** Alta
- **Responsable:** Natalia
- **Estimación propuesta:** 8 puntos
- **Revisor:** Neider
- **Apoyo técnico:** Jose — Base de datos

### 1. Historia de usuario

Como administrador o usuario comercial autorizado,

quiero consultar y gestionar la asignación de clientes a los portafolios comerciales,

para organizar la cartera de clientes, mantener la información comercial ordenada y facilitar el seguimiento de las relaciones con cada cliente.

### 2. Objetivo

Implementar la gestión de la relación entre los clientes y los portafolios de la plataforma utilizando NestJS, TypeScript, TypeORM y PostgreSQL, respetando la arquitectura existente y los permisos definidos por rol.

En el modelo de datos de referencia aparece la entidad intermedia client_portfolio, que relaciona client con portfolio.

### 3. Criterios de aceptación

- CA-01. Consultar portafolios: el sistema permite consultar los portafolios registrados.
- CA-02. Consultar clientes asociados: se pueden consultar los clientes que pertenecen a un portafolio.
- CA-03. Asignar cliente: un usuario autorizado puede asociar un cliente existente a un portafolio existente.
- CA-04. Validar duplicados: el sistema impide crear dos veces la misma asociación entre un cliente y un portafolio.
- CA-05. Validar relaciones: no se permite asociar clientes o portafolios inexistentes.
- CA-06. Gestionar asociaciones: se puede retirar una asociación sin eliminar accidentalmente el cliente ni el portafolio.
- CA-07. Controlar permisos: las operaciones respetan la autenticación y autorización por roles.
- CA-08. Persistencia: los datos se guardan en PostgreSQL mediante TypeORM.
- CA-09. Manejar errores: las respuestas HTTP son coherentes con los errores de validación, recursos inexistentes y asociaciones duplicadas.
- CA-10. Documentar y probar: los endpoints cuentan con documentación Swagger y pruebas automatizadas.

### 4. Endpoints propuestos

Estos endpoints son una propuesta inicial. Antes de crearlos, Copilot debe revisar las rutas existentes y reutilizar el contrato que ya tenga el proyecto.

| Método | Endpoint                          | Función                   |
| ------ | --------------------------------- | ------------------------- |
| GET    | /portfolios                       | Consultar portafolios     |
| GET    | /portfolios/:id                   | Consultar un portafolio   |
| GET    | /portfolios/:id/clients           | Listar clientes asociados |
| POST   | /portfolios/:id/clients/:clientId | Asociar un cliente        |
| DELETE | /portfolios/:id/clients/:clientId | Retirar la asociación     |

Alcance: los portafolios no se crean ni se editan desde la plataforma; sus valores se cargan con el seed de HU-05. Esta HU solo consulta portafolios y gestiona su asociación con clientes.

### 5. Modelo de datos de referencia

La relación principal sería:

- `client`: Entidad de clientes — HU-03
- `client_portfolio`: Entidad intermedia de la relación
- `portfolio`: Entidad de portafolios

Los campos exactos, las claves primarias, las restricciones y la cardinalidad deben ajustarse al esquema actual del proyecto. No se deben crear tablas duplicadas si ya existen.

### 6. Subtareas para ClickUp

- [ ] Revisar la estructura actual del backend y las entidades existentes.
- [ ] Verificar las entidades client, portfolio y client_portfolio.
- [ ] Confirmar con Jose las relaciones, claves foráneas y restricciones.
- [ ] Definir o reutilizar los DTO y contratos existentes.
- [ ] Implementar los casos de uso para consultar portafolios y sus clientes.
- [ ] Implementar la asociación y retirada de clientes de un portafolio.
- [ ] Validar duplicados, existencia de recursos y permisos por rol.
- [ ] Integrar la persistencia mediante TypeORM y PostgreSQL.
- [ ] Documentar los endpoints en Swagger.
- [ ] Crear pruebas unitarias y de integración.
- [ ] Validar la compatibilidad con HU-03 y los contratos de API.
- [ ] Crear una rama de trabajo y abrir un Pull Request para revisión.

### 7. Estructura técnica sugerida

Respeta la estructura real del repositorio. Si el proyecto ya tiene una organización equivalente, utiliza esa en lugar de crear otra.

```text
backend/src/modules/portfolios/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

La idea es mantener separadas las reglas del negocio, los casos de uso, la persistencia y los controladores HTTP, de acuerdo con Clean Architecture.

---

## HU-07 — Gestión de rutas comerciales

Esta HU se centra en el backend de las rutas comerciales, permitiendo crear, consultar y administrar rutas que agrupan clientes para organizar las actividades del equipo comercial.

- **Épica:** Gestión comercial
- **Prioridad:** Alta
- **Responsable propuesto:** Stevel
- **Estimación propuesta:** 13 puntos
- **Revisor:** Neider
- **Apoyo técnico:** Jose — Base de datos

### 1. Historia de usuario

Como director comercial,

quiero crear y administrar rutas comerciales y asociar clientes a ellas,

para organizar las visitas, planificar recorridos y facilitar el seguimiento de las actividades comerciales.

### 2. Objetivo

Implementar la gestión de rutas utilizando NestJS, TypeScript, TypeORM y PostgreSQL, respetando Clean Architecture y la estructura existente del repositorio.

El modelo de referencia de la plataforma contempla las entidades:

- route
- route_client
- client
- advisor

Las relaciones y los campos definitivos deben verificarse en el modelo actual antes de programar.

### 3. Criterios de aceptación

- CA-01. Crear rutas: un usuario autorizado puede registrar una ruta con los datos obligatorios definidos en el proyecto.
- CA-02. Consultar rutas: se puede obtener el listado de rutas y consultar una ruta por su identificador.
- CA-03. Actualizar rutas: se pueden modificar los datos permitidos de una ruta existente.
- CA-04. Asociar clientes: una ruta puede incluir clientes existentes, cada uno con su orden de visita, y ese orden se puede cambiar.
- CA-05. Evitar duplicados: un mismo cliente no puede asociarse dos veces a la misma ruta.
- CA-06. Retirar clientes: se puede retirar un cliente de una ruta sin eliminar al cliente de la base de datos.
- CA-07. Validar relaciones: el sistema verifica la existencia de la ruta y del cliente antes de crear o retirar asociaciones.
- CA-08. Autorización: las operaciones respetan los permisos establecidos para admin, director y advisor.
- CA-09. Persistencia: los datos se almacenan mediante TypeORM en PostgreSQL.
- CA-10. Documentación y pruebas: los endpoints cuentan con documentación Swagger y pruebas automatizadas.

Alcance: el director crea la ruta con nombre o código (por ejemplo, RUT-ATL-001), territorio (zona del catálogo de HU-05), días de ejecución, frecuencia, hora de inicio y de fin sugeridas y descripción; le asigna los clientes en orden de visita (visit_order) y la asigna a un asesor (advisor_id). También tiene fecha de inicio, fecha de fin y estado, como en el modelo ER. Los campos que no están en el ER (territorio, días de ejecución, frecuencia, horas sugeridas y descripción) se agregan con migración. Solo admin y director crean, editan y asignan rutas; el advisor solo consulta las rutas asignadas a él.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato de API existente; no dupliques rutas que ya estén implementadas.

| Método | Endpoint                      | Función                            |
| ------ | ----------------------------- | ---------------------------------- |
| POST   | /routes                       | Crear una ruta                     |
| GET    | /routes                       | Listar rutas                       |
| GET    | /routes/:id                   | Consultar una ruta                 |
| PATCH  | /routes/:id                   | Actualizar una ruta                |
| GET    | /routes/:id/clients           | Consultar los clientes de una ruta |
| POST   | /routes/:id/clients/:clientId | Asociar un cliente                 |
| DELETE | /routes/:id/clients/:clientId | Retirar un cliente                 |
| PATCH  | /routes/:id/clients/order     | Reordenar los clientes de la ruta  |

### 5. Modelo de datos de referencia

- `route`: Datos y configuración de la ruta
- `route_client`: Relación entre rutas y clientes
- `client`: Clientes registrados — HU-03

route_client incluye visit_order: la posición de cada cliente en el recorrido. Dos clientes de la misma ruta no pueden tener el mismo orden.

### 6. Subtareas para ClickUp

- [ ] Inspeccionar la estructura del backend y los módulos existentes.
- [ ] Verificar las entidades route, route_client y client.
- [ ] Confirmar con Jose las relaciones, restricciones e índices.
- [ ] Definir los DTO de creación, actualización y respuesta según las convenciones actuales.
- [ ] Implementar los casos de uso para crear, listar, consultar y actualizar rutas.
- [ ] Implementar la asociación y retirada de clientes de una ruta.
- [ ] Agregar validaciones de existencia y prevención de asociaciones duplicadas.
- [ ] Aplicar los permisos definidos para cada rol.
- [ ] Integrar la persistencia con TypeORM y PostgreSQL.
- [ ] Documentar los endpoints mediante Swagger.
- [ ] Crear y ejecutar pruebas unitarias y de integración.
- [ ] Verificar compatibilidad con los módulos de clientes y visitas.
- [ ] Crear una rama de trabajo y abrir un Pull Request para revisión.

### 7. Estructura técnica sugerida

Respeta la estructura actual del repositorio. Si ya existe un módulo de rutas, amplíalo en lugar de crear otro.

```text
backend/src/modules/routes/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-08 — Programar y consultar visitas

Esta HU permite programar visitas a clientes y que cada asesor consulte su agenda. Iniciar la visita y registrar su resultado corresponde a HU-09.

- **Épica:** Planeación comercial y visitas
- **Prioridad:** Alta (P0)
- **Responsable:** Stevel
- **Revisor:** Neider
- **Apoyo técnico:** Ricardo (agenda en el frontend) y Jose (base de datos)
- **Dependencias:** HU-02 (roles), HU-03 (clientes) y HU-07 (rutas).

### 1. Historia de usuario

Como director comercial o asesor,

quiero programar visitas a clientes y consultar la agenda por día y por semana,

para organizar las actividades comerciales de cada asesor.

### 2. Criterios de aceptación

- CA-01. Programar visita: admin y director crean una visita con cliente, asesor y fecha y hora programadas; la ruta es opcional.
- CA-02. Generar desde una ruta: admin y director crean en un solo paso las visitas de todos los clientes de una ruta para una fecha, en el orden de visit_order y asignadas al asesor de la ruta.
- CA-03. Validar fechas: no se puede programar una visita en una fecha pasada.
- CA-04. Validar relaciones: cliente, asesor y ruta deben existir y estar activos; si se indica una ruta, el cliente debe pertenecer a ella.
- CA-05. Agenda del asesor: el advisor consulta sus visitas del día o de la semana, ordenadas por hora y visit_order, con cliente, dirección, contacto principal, potencial y estado.
- CA-06. Consulta general: admin y director consultan las visitas de cualquier asesor con filtros por fecha, semana, asesor, zona y estado, con paginación.
- CA-07. Reprogramar y cancelar: una visita programada puede cambiar de fecha o cancelarse; una visita ya realizada no.
- CA-08. Visibilidad: el advisor solo ve sus propias visitas.
- CA-09. Persistencia: los datos se guardan con TypeORM en PostgreSQL mediante migraciones.
- CA-10. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas.

### 3. Datos y reglas

Tabla visit (esta HU crea la tabla; HU-09 agrega los campos del registro): id, client_id, advisor_id, route_id (opcional), scheduled_date (fecha y hora), actual_date (se llena en HU-09) y status.

Estados según el creador del reto: scheduled (programada), visited (visitada) y cancelled (cancelada).

Pendiente de confirmar: la demo muestra además pendiente, reprogramada y sin visitar. También falta confirmar si el advisor puede programar visitas por su cuenta; mientras no se confirme, solo admin y director programan.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint               | Función                                          |
| ------ | ---------------------- | ------------------------------------------------ |
| POST   | /visits                | Programar una visita                             |
| POST   | /routes/:id/visits     | Generar las visitas de una ruta para una fecha   |
| GET    | /visits                | Listar visitas con filtros y paginación          |
| GET    | /visits/agenda         | Agenda del advisor autenticado, por día o semana |
| GET    | /visits/:id            | Consultar una visita                             |
| PATCH  | /visits/:id/reschedule | Reprogramar una visita                           |
| PATCH  | /visits/:id/cancel     | Cancelar una visita                              |

### 5. Subtareas para ClickUp

- [ ] **HU08-T01** Revisar las entidades route, route_client, client y advisor — Stevel + Jose
- [ ] **HU08-T02** Definir la entidad visit, sus estados y la migración — Stevel + Jose
- [ ] **HU08-T03** Implementar la programación de una visita — Stevel
- [ ] **HU08-T04** Implementar la generación de visitas desde una ruta — Stevel
- [ ] **HU08-T05** Implementar consultas con filtros y paginación — Stevel
- [ ] **HU08-T06** Implementar la agenda del asesor por día y semana — Stevel
- [ ] **HU08-T07** Implementar reprogramar y cancelar — Stevel
- [ ] **HU08-T08** Aplicar permisos por rol y documentar en Swagger — Stevel
- [ ] **HU08-T09** Crear pruebas unitarias y de integración — Stevel + Jose
- [ ] **HU08-T10** Construir la vista de agenda en el frontend — Ricardo
- [ ] **HU08-T11** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Respeta la estructura actual del repositorio. El módulo visits lo comparten HU-08 y HU-09.

```text
backend/src/modules/visits/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-09 — Registrar resultados de visitas

Esta HU cubre la pantalla Registrar visita de la demo: el asesor inicia la visita desde su agenda, el sistema confirma su ubicación y el asesor registra lo que pasó.

- **Épica:** Planeación comercial y visitas
- **Prioridad:** Media (P1)
- **Responsable:** Stevel
- **Revisor:** Neider
- **Apoyo técnico:** Natalia y Jose (base de datos)
- **Dependencias:** HU-05 (catálogos de visita) y HU-08 (visitas).

### 1. Historia de usuario

Como asesor,

quiero iniciar la visita desde mi agenda y registrar su resultado,

para dejar constancia de la ejecución de la visita y de lo que pasó con el cliente.

### 2. Criterios de aceptación

- CA-01. Iniciar visita: el advisor inicia una visita programada propia y el sistema captura la ubicación del dispositivo (latitud y longitud) en ese momento.
- CA-02. Confirmar ubicación: el backend calcula la distancia entre esa ubicación y la del cliente; si está dentro del radio permitido, la visita queda con location_confirmed = true. El asesor no puede marcar la confirmación a mano.
- CA-03. Sin ubicación: si el cliente no tiene coordenadas o el dispositivo no entrega la ubicación, la visita se puede registrar, pero queda sin confirmar.
- CA-04. Formulario precargado: los datos del cliente, su contacto principal, la ruta, la zona, la semana, el día y el asesor se cargan solos; el asesor no los escribe.
- CA-05. Campos obligatorios: objetivo (visit_objective), tipo de visita (visit_type), resultado (visit_result), interés en los productos y observaciones.
- CA-06. Campos opcionales: módulo de interés, competencia mencionada (texto abierto), hora de inicio y hora de fin.
- CA-07. Al guardar, la visita pasa a visited y se registra actual_date.
- CA-08. Gestión comercial: el formulario indica si se generó una cotización o un pedido; esos registros se crean en HU-12 y HU-14 y quedan vinculados con visit_id.
- CA-09. Próximo seguimiento: si se indica, se crea un follow_up vinculado a la visita (HU-10).
- CA-10. Reglas: solo el asesor dueño registra la visita, y no se registra una visita cancelada.
- CA-11. Bitácora: registrar la visita deja una entrada en activity_log del cliente (HU-16).
- CA-12. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas.

### 3. Datos y reglas

Campos que se agregan a visit: started_at, finished_at, check_in_latitude, check_in_longitude, check_in_distance_m, location_confirmed, visit_objective_id, visit_type_id, interest_level (high, medium, low), interest_reason (quality, price, quality_price), competitor_mentioned y observations.

Tabla visit_outcome (VISITA_RESULTADO del modelo ER): id, visit_id, visit_result_id y observation.

El creador del reto pidió no confiar en que el asesor diga que estuvo allí: la confirmación depende solo de la ubicación capturada. El tiempo que dure la visita no importa.

Pendiente de confirmar: el radio en metros que cuenta como cerca. Se configura con la variable VISIT_CHECKIN_RADIUS_METERS y su valor se define con el creador del reto.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint            | Función                                               |
| ------ | ------------------- | ----------------------------------------------------- |
| GET    | /visits/:id/form    | Datos precargados para el formulario de la visita     |
| POST   | /visits/:id/start   | Iniciar la visita y registrar la ubicación del asesor |
| POST   | /visits/:id/outcome | Registrar el resultado de la visita                   |

### 5. Subtareas para ClickUp

- [ ] **HU09-T01** Revisar la entidad visit de HU-08 y los catálogos de HU-05 — Stevel + Jose
- [ ] **HU09-T02** Agregar a visit los campos del registro y crear visit_outcome con su migración — Stevel + Jose
- [ ] **HU09-T03** Implementar los datos precargados del formulario — Stevel
- [ ] **HU09-T04** Implementar iniciar visita con cálculo de distancia y confirmación — Stevel
- [ ] **HU09-T05** Implementar el registro del resultado y el cambio a visited — Stevel
- [ ] **HU09-T06** Integrar la bitácora y el próximo seguimiento — Stevel + Natalia
- [ ] **HU09-T07** Aplicar permisos y documentar en Swagger — Stevel
- [ ] **HU09-T08** Crear pruebas, incluido el cálculo de distancia — Stevel + Jose
- [ ] **HU09-T09** Construir el formulario Registrar visita con captura de ubicación — Ricardo
- [ ] **HU09-T10** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Se trabaja dentro del módulo visits de HU-08. El cálculo de distancia va en domain, porque es una regla de negocio pura.

```text
backend/src/modules/visits/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-10 — Gestionar seguimientos comerciales

Esta HU cubre la sección Próximo seguimiento del registro de visita y la lista de seguimientos pendientes de cada asesor.

- **Épica:** Planeación comercial y visitas
- **Prioridad:** Media (P1)
- **Responsable:** Brayan
- **Revisor:** Neider
- **Apoyo técnico:** Stevel y Jose (base de datos)
- **Dependencias:** HU-09 (registro de visitas).

### 1. Historia de usuario

Como asesor,

quiero programar actividades posteriores a una visita y marcar su cumplimiento,

para mantener las oportunidades comerciales en movimiento.

### 2. Criterios de aceptación

- CA-01. Crear seguimiento: se crea a partir de una visita registrada, con fecha próxima, hora opcional, actividad, observación y responsable.
- CA-02. Validar fecha: la fecha próxima no puede ser pasada.
- CA-03. Listar: el advisor consulta sus seguimientos pendientes, vencidos y completados; admin y director consultan los de todos con filtros por asesor y fecha.
- CA-04. Vencidos: un seguimiento pendiente con fecha pasada se muestra como vencido.
- CA-05. Completar: el responsable marca el seguimiento como completado y se guarda la fecha en que se completó.
- CA-06. Actualizar: se pueden cambiar la fecha, la actividad y la observación de un seguimiento pendiente.
- CA-07. Tabla de seguimiento: el próximo seguimiento aparece en la tabla de seguimiento de rutas y visitas (HU-15).
- CA-08. Bitácora: crear y completar un seguimiento deja una entrada en activity_log del cliente.
- CA-09. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas.

### 3. Datos y reglas

Tabla follow_up: id, visit_id, next_date, next_time (opcional), activity, observation, responsible_advisor_id, completed y completed_at. Los campos next_time y responsible_advisor_id salen de la demo y no están en el modelo ER.

Pendiente de confirmar: si un seguimiento que es una próxima visita debe crear automáticamente una visita programada en HU-08.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint                 | Función                                                 |
| ------ | ------------------------ | ------------------------------------------------------- |
| POST   | /visits/:id/follow-ups   | Crear un seguimiento a partir de una visita             |
| GET    | /follow-ups              | Listar seguimientos (pendientes, vencidos, completados) |
| GET    | /follow-ups/:id          | Consultar un seguimiento                                |
| PATCH  | /follow-ups/:id          | Actualizar fecha, actividad u observación               |
| PATCH  | /follow-ups/:id/complete | Marcar como completado                                  |

### 5. Subtareas para ClickUp

- [ ] **HU10-T01** Revisar visit y visit_outcome de HU-09 — Brayan + Jose
- [ ] **HU10-T02** Definir la entidad follow_up y su migración — Brayan + Jose
- [ ] **HU10-T03** Implementar crear y actualizar seguimientos — Brayan
- [ ] **HU10-T04** Implementar la lista con estados pendiente, vencido y completado — Brayan
- [ ] **HU10-T05** Implementar completar seguimiento — Brayan
- [ ] **HU10-T06** Integrar la bitácora y aplicar permisos — Brayan
- [ ] **HU10-T07** Documentar en Swagger y crear pruebas — Brayan + Stevel
- [ ] **HU10-T08** Integrar la sección en el frontend — Ricardo
- [ ] **HU10-T09** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Respeta la estructura actual del repositorio.

```text
backend/src/modules/follow-ups/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-11 — Visualizar visitas en un mapa

Esta HU muestra en un mapa de OpenStreetMap las visitas de un día y la ruta que las une, como en el dashboard de la demo.

- **Épica:** Planeación comercial y visitas
- **Prioridad:** Media (P1)
- **Responsable:** Ricardo
- **Revisor:** Neider
- **Apoyo técnico:** Stevel (endpoint del mapa) y Natalia
- **Dependencias:** HU-03 (latitude y longitude del cliente) y HU-08 (visitas).

### 1. Historia de usuario

Como asesor o director comercial,

quiero ver en un mapa las visitas de un día y el recorrido de la ruta,

para apoyar la planeación de los recorridos y ver el avance del día.

### 2. Criterios de aceptación

- CA-01. Mapa: se usa OpenStreetMap con Leaflet, sin servicios de mapas de pago, y se muestra la atribución de OpenStreetMap.
- CA-02. Marcadores: cada visita del día aparece con un marcador numerado según visit_order y con un color por estado, y hay una leyenda de colores.
- CA-03. Recorrido: una línea une las visitas en el orden de la ruta.
- CA-04. Detalle: al seleccionar un marcador se ven el cliente, la hora, el estado y, para el advisor, la acción Iniciar visita (HU-09).
- CA-05. Filtros: el advisor ve solo sus visitas del día elegido; admin y director eligen fecha y asesor.
- CA-06. Sin coordenadas: los clientes sin latitude y longitude no rompen el mapa; se listan aparte con un aviso.
- CA-07. El mapa funciona en celular, porque el asesor lo usa en campo.
- CA-08. Los datos vienen del backend, nunca de datos de ejemplo en el frontend.

### 3. Datos y reglas

El endpoint devuelve, por visita: id, visit_order, scheduled_date, status, el nombre y la dirección del cliente, y su latitude y longitude.

Los colores dependen de los estados de HU-08; si se agregan los estados de la demo (pendiente, reprogramada, sin visitar), la leyenda se amplía.

### 4. Endpoints propuestos

Adapta este endpoint al contrato existente.

| Método | Endpoint    | Función                                                                     |
| ------ | ----------- | --------------------------------------------------------------------------- |
| GET    | /visits/map | Visitas de un día con coordenadas, orden y estado (filtros: fecha y asesor) |

### 5. Subtareas para ClickUp

- [ ] **HU11-T01** Revisar los datos de visitas y clientes disponibles — Ricardo + Stevel
- [ ] **HU11-T02** Implementar el endpoint GET /visits/map con permisos — Stevel
- [ ] **HU11-T03** Integrar Leaflet con OpenStreetMap en el frontend — Ricardo
- [ ] **HU11-T04** Dibujar marcadores numerados, colores por estado y leyenda — Ricardo
- [ ] **HU11-T05** Dibujar la línea del recorrido y el detalle del marcador — Ricardo
- [ ] **HU11-T06** Agregar filtros y la lista de clientes sin coordenadas — Ricardo + Natalia
- [ ] **HU11-T07** Probar en celular y en escritorio — Ricardo
- [ ] **HU11-T08** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

El endpoint vive en el módulo visits. En el frontend, el mapa es un componente reutilizable que también usa el dashboard (HU-15).

```text
frontend/src/lib/components/map/
├── VisitMap.svelte
└── MapLegend.svelte
```

---

## HU-12 — Crear y consultar cotizaciones

Esta HU registra las cotizaciones de cada cliente, incluida la que se genera durante una visita, y su documento adjunto en S3 (cotización simulada).

- **Épica:** Cotizaciones y pedidos
- **Prioridad:** Media (P1)
- **Responsable:** Jose
- **Revisor:** Neider
- **Apoyo técnico:** Natalia y Ricardo (frontend)
- **Dependencias:** HU-03 (clientes), HU-09 (visitas) y HU-20 (archivos en S3).

### 1. Historia de usuario

Como asesor,

quiero registrar cotizaciones asociadas a clientes,

para documentar las oportunidades comerciales.

### 2. Criterios de aceptación

- CA-01. Crear: se registra una cotización para un cliente existente; el advisor solo para clientes de sus rutas.
- CA-02. Número: el backend genera un número consecutivo único con formato COT-0001, como en la demo.
- CA-03. Visita: la cotización puede quedar vinculada a la visita en la que se generó (visit_id opcional).
- CA-04. Valor: el valor total es la suma de los detalles (HU-13); no se escribe a mano.
- CA-05. Moneda: se guarda la moneda, con COP por defecto.
- CA-06. Consultar: se listan cotizaciones con filtros por cliente, asesor, estado y fechas, con paginación, y se consulta el detalle de una.
- CA-07. Estado: el estado cambia solo según las transiciones permitidas.
- CA-08. Documento: se adjunta un PDF de la cotización, que se guarda en S3 mediante el servicio de HU-20; la base de datos guarda solo la referencia (document_key).
- CA-09. Ver documento: se obtiene una URL firmada de corta duración, solo si el usuario puede ver la cotización.
- CA-10. Bitácora: crear la cotización y cambiar su estado deja una entrada en activity_log del cliente.
- CA-11. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas.

### 3. Datos y reglas

Tabla quote: id, number, client_id, advisor_id, visit_id (opcional), date, value, currency, status y document_key. Los campos visit_id, currency y document_key no están en el modelo ER y se agregan con migración.

Pendiente de confirmar: los estados de la cotización y sus transiciones. Propuesta por validar: draft (borrador), sent (enviada), approved (aprobada) y rejected (rechazada).

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint             | Función                                       |
| ------ | -------------------- | --------------------------------------------- |
| POST   | /quotes              | Crear una cotización                          |
| GET    | /quotes              | Listar cotizaciones con filtros y paginación  |
| GET    | /quotes/:id          | Consultar una cotización con sus detalles     |
| PATCH  | /quotes/:id/status   | Cambiar el estado                             |
| POST   | /quotes/:id/document | Adjuntar el documento PDF (se guarda en S3)   |
| GET    | /quotes/:id/document | Obtener una URL firmada para ver el documento |

### 5. Subtareas para ClickUp

- [ ] **HU12-T01** Definir la entidad quote, sus estados y la migración — Jose
- [ ] **HU12-T02** Implementar el número consecutivo único — Jose
- [ ] **HU12-T03** Implementar crear y consultar cotizaciones con filtros — Jose
- [ ] **HU12-T04** Implementar el cambio de estado con transiciones válidas — Jose
- [ ] **HU12-T05** Integrar el documento PDF con el servicio de S3 de HU-20 — Jose + Laura
- [ ] **HU12-T06** Integrar la bitácora y aplicar permisos — Jose + Natalia
- [ ] **HU12-T07** Documentar en Swagger y crear pruebas — Jose + Natalia
- [ ] **HU12-T08** Construir las vistas de cotizaciones en el frontend — Ricardo
- [ ] **HU12-T09** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

El módulo quotes lo comparten HU-12 y HU-13.

```text
backend/src/modules/quotes/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-13 — Gestionar detalles de cotización

Esta HU permite agregar productos, cantidades y precios a una cotización y mantiene su valor total actualizado.

- **Épica:** Cotizaciones y pedidos
- **Prioridad:** Media (P1)
- **Responsable:** Jose
- **Revisor:** Neider
- **Apoyo técnico:** Natalia
- **Dependencias:** HU-12 (cotizaciones).

### 1. Historia de usuario

Como asesor,

quiero agregar productos, cantidades y precios a una cotización,

para calcular su valor total.

### 2. Criterios de aceptación

- CA-01. Agregar: se agrega un detalle con producto, cantidad y precio a una cotización existente.
- CA-02. Validar importes: la cantidad debe ser mayor que cero y el precio no puede ser negativo.
- CA-03. Subtotal: el backend calcula subtotal = cantidad × precio; no se acepta desde el cliente.
- CA-04. Total: el valor de la cotización se recalcula en la misma transacción cada vez que se agrega, cambia o elimina un detalle.
- CA-05. Editar y eliminar: se puede cambiar la cantidad o el precio de un detalle, o eliminarlo.
- CA-06. Bloqueo: no se modifican los detalles de una cotización en un estado cerrado (definido en HU-12).
- CA-07. Permisos: solo quien puede editar la cotización puede editar sus detalles.
- CA-08. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas del cálculo.

### 3. Datos y reglas

Tabla quote_detail: id, quote_id, product (texto, como en el modelo ER), quantity, price y subtotal.

Los montos usan tipo decimal (numeric) para evitar errores de redondeo.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint                      | Función                               |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | /quotes/:id/details           | Listar los detalles de una cotización |
| POST   | /quotes/:id/details           | Agregar un producto                   |
| PATCH  | /quotes/:id/details/:detailId | Actualizar cantidad o precio          |
| DELETE | /quotes/:id/details/:detailId | Eliminar un producto                  |

### 5. Subtareas para ClickUp

- [ ] **HU13-T01** Definir la entidad quote_detail y su migración — Jose
- [ ] **HU13-T02** Implementar agregar, editar y eliminar detalles — Jose
- [ ] **HU13-T03** Implementar el cálculo de subtotal y total en una transacción — Jose
- [ ] **HU13-T04** Aplicar el bloqueo por estado y los permisos — Jose + Natalia
- [ ] **HU13-T05** Documentar en Swagger y crear pruebas del cálculo — Jose + Natalia
- [ ] **HU13-T06** Integrar los detalles en la vista de cotización — Ricardo
- [ ] **HU13-T07** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Se trabaja dentro del módulo quotes de HU-12. El cálculo del total va en domain.

```text
backend/src/modules/quotes/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-14 — Registrar y consultar pedidos

Esta HU registra los pedidos de cada cliente, incluido el que se genera durante una visita o a partir de una cotización.

- **Épica:** Cotizaciones y pedidos
- **Prioridad:** Media (P1)
- **Responsable:** Jose
- **Revisor:** Neider
- **Apoyo técnico:** Natalia y Ricardo (frontend)
- **Dependencias:** HU-12 (cotizaciones).

### 1. Historia de usuario

Como asesor,

quiero registrar pedidos asociados a clientes y, cuando corresponda, a una cotización,

para dar seguimiento a la operación comercial.

### 2. Criterios de aceptación

- CA-01. Registrar: se crea un pedido para un cliente existente; el advisor solo para clientes de sus rutas.
- CA-02. Número: el backend genera un número consecutivo único con formato PED-0001, como en la demo.
- CA-03. Desde cotización: al crear un pedido desde una cotización, se copian el cliente y el valor; una cotización genera como máximo un pedido.
- CA-04. Visita: el pedido puede quedar vinculado a la visita en la que se generó (visit_id opcional).
- CA-05. Entrega: se registra la fecha estimada de entrega.
- CA-06. Consultar: se listan pedidos con filtros por cliente, asesor, estado y fechas, con paginación.
- CA-07. Estado: el estado cambia solo según las transiciones permitidas.
- CA-08. Bitácora: crear el pedido y cambiar su estado deja una entrada en activity_log del cliente.
- CA-09. Documentación y pruebas: los endpoints están en Swagger y tienen pruebas.

### 3. Datos y reglas

Tabla sales_order: id, number, client_id, quote_id (opcional), visit_id (opcional), advisor_id, date, value, status y estimated_delivery_date. Los campos visit_id, advisor_id y estimated_delivery_date no están en el modelo ER: advisor_id se agrega para los indicadores por asesor del dashboard.

Pendiente de confirmar: los estados del pedido. El dashboard cuenta los pedidos cerrados, así que debe quedar claro cuál estado significa cerrado.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint                 | Función                                    |
| ------ | ------------------------ | ------------------------------------------ |
| POST   | /sales-orders            | Registrar un pedido                        |
| POST   | /quotes/:id/sales-order  | Crear un pedido a partir de una cotización |
| GET    | /sales-orders            | Listar pedidos con filtros y paginación    |
| GET    | /sales-orders/:id        | Consultar un pedido                        |
| PATCH  | /sales-orders/:id/status | Cambiar el estado                          |

### 5. Subtareas para ClickUp

- [ ] **HU14-T01** Definir la entidad sales_order, sus estados y la migración — Jose
- [ ] **HU14-T02** Implementar el número consecutivo único — Jose
- [ ] **HU14-T03** Implementar registrar y consultar pedidos — Jose
- [ ] **HU14-T04** Implementar crear un pedido desde una cotización — Jose
- [ ] **HU14-T05** Integrar la bitácora y aplicar permisos — Jose + Natalia
- [ ] **HU14-T06** Documentar en Swagger y crear pruebas — Jose + Natalia
- [ ] **HU14-T07** Construir las vistas de pedidos en el frontend — Ricardo
- [ ] **HU14-T08** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Respeta la estructura actual del repositorio.

```text
backend/src/modules/sales-orders/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-15 — Consultar dashboard de indicadores comerciales

Esta HU construye el dashboard de la demo: tarjetas de indicadores, agenda del día, mapa de la ruta y la tabla de seguimiento de rutas y visitas.

- **Épica:** Dashboard, auditoría y exportación
- **Prioridad:** Media (P1)
- **Responsable:** Ricardo
- **Revisor:** Neider
- **Apoyo técnico:** Neider y Jose (consultas)
- **Dependencias:** HU-08, HU-09, HU-10, HU-11, HU-12 y HU-14.

### 1. Historia de usuario

Como director comercial o asesor,

quiero consultar indicadores comerciales,

para conocer el estado de la operación y tomar decisiones.

### 2. Criterios de aceptación

- CA-01. Indicadores: se muestran los indicadores de la sección 3, calculados en el backend a partir de datos reales.
- CA-02. Periodo: por defecto se muestra la semana actual, en la zona horaria America/Bogota.
- CA-03. Filtros: admin y director filtran por semana, zona (territorio) y asesor; el advisor ve solo sus indicadores.
- CA-04. Agenda del día: se muestran las visitas del día con su hora y estado, reutilizando HU-08.
- CA-05. Mapa: se muestra el mapa de la ruta del día, reutilizando el componente de HU-11.
- CA-06. Tabla de seguimiento: se muestran fecha, asesor, territorio, semana, día, ruta, cliente, municipio, tipo de cliente, potencial, estado de la visita, resultado, cotización, valor de la cotización, pedido y próximo seguimiento, con paginación.
- CA-07. La tabla tiene el botón Exportar, que usa la exportación de HU-17.
- CA-08. Ningún indicador usa valores fijos o de ejemplo en el frontend.
- CA-09. Documentación y pruebas: los endpoints están en Swagger y hay pruebas de los cálculos con datos conocidos.

### 3. Indicadores

Indicadores tomados de la demo del reto:

| Indicador           | Cálculo                                                             |
| ------------------- | ------------------------------------------------------------------- |
| Visitas programadas | Visitas del periodo, sin contar las canceladas                      |
| Visitas realizadas  | Visitas del periodo en estado visited                               |
| Efectividad         | Visitas realizadas ÷ visitas programadas                            |
| Valor cotizado      | Suma del valor de las cotizaciones del periodo                      |
| Pedidos cerrados    | Cantidad de pedidos del periodo en el estado que signifique cerrado |
| Facturación         | Suma del valor de esos pedidos                                      |
| Objetivo semanal    | Visitas realizadas frente a la meta (las programadas de la semana)  |

Pendiente de confirmar: el estado que cuenta como pedido cerrado (HU-14) y si la meta semanal es distinta de las visitas programadas.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint            | Función                                                  |
| ------ | ------------------- | -------------------------------------------------------- |
| GET    | /dashboard/kpis     | Indicadores del periodo (filtros: semana, zona y asesor) |
| GET    | /dashboard/tracking | Tabla de seguimiento de rutas y visitas, paginada        |

### 5. Subtareas para ClickUp

- [ ] **HU15-T01** Validar con el equipo la definición de cada indicador — Ricardo + Neider
- [ ] **HU15-T02** Implementar las consultas de indicadores con filtros — Jose
- [ ] **HU15-T03** Implementar la tabla de seguimiento paginada — Jose
- [ ] **HU15-T04** Construir las tarjetas de indicadores en el frontend — Ricardo
- [ ] **HU15-T05** Integrar la agenda del día y el mapa — Ricardo
- [ ] **HU15-T06** Construir la tabla de seguimiento con filtros y Exportar — Ricardo
- [ ] **HU15-T07** Crear pruebas de los cálculos con datos conocidos — Jose + Neider
- [ ] **HU15-T08** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

El módulo dashboard solo consulta: no crea tablas propias. Sus consultas leen visit, quote y sales_order mediante puertos de lectura.

```text
backend/src/modules/dashboard/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-16 — Registrar historial de actividad del cliente

Esta HU es la bitácora de actividades: deja registro de lo que se hace sobre cada cliente. La usan HU-03, HU-04, HU-09, HU-10, HU-12 y HU-14, así que conviene tener su puerto listo pronto.

- **Épica:** Dashboard, auditoría y exportación
- **Prioridad:** Media (P1)
- **Responsable:** Brayan
- **Revisor:** Neider
- **Apoyo técnico:** Natalia y Jose (base de datos)
- **Dependencias:** HU-01 (usuario de la sesión) y HU-03 (clientes).

### 1. Historia de usuario

Como usuario autorizado,

quiero consultar las acciones realizadas sobre un cliente,

para tener trazabilidad de su gestión comercial.

### 2. Criterios de aceptación

- CA-01. Registro automático: las acciones de las demás HU se registran solas mediante un puerto compartido; el usuario no las escribe.
- CA-02. Datos: cada entrada guarda cliente, fecha, acción, usuario y descripción.
- CA-03. Usuario confiable: el usuario se toma de la sesión, nunca del cuerpo de la petición.
- CA-04. Inmutable: las entradas no se editan ni se eliminan.
- CA-05. Consultar: se consulta el historial de un cliente, del más reciente al más antiguo, con paginación y filtros por acción y fecha.
- CA-06. Visibilidad: el advisor solo consulta el historial de clientes de sus rutas; admin y director, de todos.
- CA-07. Ficha del cliente: el historial alimenta la sección Últimas interacciones de la demo.
- CA-08. Documentación y pruebas: el endpoint está en Swagger y tiene pruebas.

### 3. Datos y reglas

Tabla activity_log: id, client_id, created_at, action, user_id y description.

Las acciones son una lista fija en inglés, por ejemplo client_created, client_updated, client_status_changed, contact_created, visit_completed, follow_up_created, quote_created y sales_order_created. Cada HU agrega las suyas.

### 4. Endpoints propuestos

Adapta este endpoint al contrato existente.

| Método | Endpoint                    | Función                                                            |
| ------ | --------------------------- | ------------------------------------------------------------------ |
| GET    | /clients/:clientId/activity | Historial de un cliente, paginado y con filtros por acción y fecha |

### 5. Subtareas para ClickUp

- [ ] **HU16-T01** Definir la entidad activity_log y su migración — Brayan + Jose
- [ ] **HU16-T02** Definir el puerto compartido y su implementación con TypeORM — Brayan
- [ ] **HU16-T03** Publicar el puerto para las demás HU y avisar al equipo — Brayan
- [ ] **HU16-T04** Implementar la consulta del historial con filtros y permisos — Brayan
- [ ] **HU16-T05** Documentar en Swagger y crear pruebas — Brayan + Natalia
- [ ] **HU16-T06** Integrar Últimas interacciones en la ficha del cliente — Ricardo
- [ ] **HU16-T07** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

El puerto vive en shared para que cualquier módulo lo use sin depender de activity-log.

```text
backend/src/shared/application/ports/activity-log.port.ts
backend/src/modules/activity-log/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-17 — Exportar reportes CSV

Esta HU implementa el botón Exportar de la tabla de seguimiento de la demo y, si el tiempo alcanza, otros reportes en CSV.

- **Épica:** Dashboard, auditoría y exportación
- **Prioridad:** Media (P1)
- **Responsable:** Brayan
- **Revisor:** Neider
- **Apoyo técnico:** Ricardo (frontend) y Jose (consultas)
- **Dependencias:** HU-15 (tabla de seguimiento), HU-12 y HU-14.

### 1. Historia de usuario

Como usuario autorizado,

quiero exportar reportes comerciales en CSV,

para analizar los datos fuera de la plataforma.

### 2. Criterios de aceptación

- CA-01. Reporte obligatorio: el CSV de seguimiento de rutas y visitas tiene las mismas columnas que la tabla del dashboard (HU-15).
- CA-02. Filtros: el CSV respeta los mismos filtros que la tabla (semana o rango de fechas, zona, asesor y estado).
- CA-03. Permisos: el advisor solo exporta sus datos; admin y director, todos.
- CA-04. Formato: UTF-8 con BOM para que Excel muestre bien las tildes, encabezados en español y comillas y comas escapadas según RFC 4180.
- CA-05. Valores: fechas en formato AAAA-MM-DD y montos como números, sin símbolo de moneda.
- CA-06. Archivo: el nombre incluye el reporte y la fecha, por ejemplo seguimiento-visitas-2026-10-26.csv.
- CA-07. Volumen: el archivo se genera por partes (streaming) para no cargar todo en memoria.
- CA-08. Documentación y pruebas: los endpoints están en Swagger y hay pruebas del formato.

### 3. Datos y reglas

Esta HU no crea tablas: reutiliza las consultas de HU-15 y de los módulos de cotizaciones y pedidos.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint                       | Función                                             |
| ------ | ------------------------------ | --------------------------------------------------- |
| GET    | /reports/visit-tracking/export | CSV de seguimiento de rutas y visitas (obligatorio) |
| GET    | /reports/clients/export        | CSV de clientes (opcional)                          |
| GET    | /reports/quotes/export         | CSV de cotizaciones (opcional)                      |
| GET    | /reports/sales-orders/export   | CSV de pedidos (opcional)                           |

### 5. Subtareas para ClickUp

- [ ] **HU17-T01** Revisar la consulta de la tabla de seguimiento de HU-15 — Brayan + Jose
- [ ] **HU17-T02** Implementar el generador de CSV con BOM y escapado — Brayan
- [ ] **HU17-T03** Implementar el reporte de seguimiento con filtros y permisos — Brayan
- [ ] **HU17-T04** Implementar los reportes opcionales si hay tiempo — Brayan
- [ ] **HU17-T05** Conectar el botón Exportar del frontend — Ricardo
- [ ] **HU17-T06** Crear pruebas del formato y de permisos — Brayan + Jose
- [ ] **HU17-T07** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

El generador de CSV es una utilidad de shared/infrastructure; el módulo reports solo arma cada reporte.

```text
backend/src/modules/reports/
├── domain/
│   ├── entities/
│   └── ports/
├── application/
│   └── use-cases/
├── infrastructure/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── dto/
```

---

## HU-18 — Desplegar la aplicación en AWS

Esta HU deja la aplicación funcionando en AWS, como exige el reto: frontend y backend en EC2 y datos en RDS PostgreSQL.

- **Épica:** Infraestructura, archivos y entrega
- **Prioridad:** Alta (P0)
- **Responsable:** Laura
- **Revisor:** Neider
- **Apoyo técnico:** Neider y Jose (base de datos)
- **Dependencias:** Esqueleto base del backend (health check y migraciones).

### 1. Historia de usuario

Como equipo,

queremos desplegar el frontend y el backend en EC2 y persistir los datos en RDS PostgreSQL,

para disponer de una aplicación funcional y accesible durante la sustentación.

### 2. Criterios de aceptación

- CA-01. La aplicación responde desde la IP elástica de la EC2.
- CA-02. El backend se conecta a RDS con SSL y GET /api/health responde 200 con la base de datos conectada.
- CA-03. Las migraciones se aplican en RDS.
- CA-04. Nginx sirve el frontend y redirige /api al backend, así que ambos comparten dominio y las cookies de sesión funcionan.
- CA-05. El backend se reinicia solo si falla o si se reinicia la EC2.
- CA-06. RDS no es accesible desde internet.
- CA-07. No hay credenciales en el repositorio; el acceso a S3 usa el rol IAM de la EC2.
- CA-08. Todo queda documentado en docs/infraestructura.md: recursos, puertos, variables (sin valores) y cómo recuperar el servicio.

### 3. Componentes

Configuración propuesta, tomada del documento de organización:

| Componente           | Configuración                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------- |
| EC2                  | Ubuntu LTS con IP elástica; corre el backend, el frontend (Nginx) y Jenkins               |
| RDS                  | PostgreSQL en la misma VPC, accesible solo desde la EC2                                   |
| Nginx                | Sirve el frontend compilado y redirige /api al backend                                    |
| Proceso del backend  | PM2 o Docker Compose (decisión pendiente del documento de organización)                   |
| IAM                  | Rol asignado a la EC2 con permisos mínimos sobre el bucket de S3; sin llaves en el código |
| Security groups      | 80 y 443 públicos; SSH y Jenkins solo desde las IP del equipo; RDS solo desde la EC2      |
| Variables de entorno | En el servidor y en Jenkins; nunca en el repositorio                                      |

Estado actual: existe la instancia "Nexo" en us-east-1, t4g.micro (ARM, 1 GB de memoria), sin IP elástica ni rol IAM. Antes de instalar Jenkins conviene asignar una IP elástica, agregar swap o pasar a t4g.small, y usar imágenes y binarios arm64.

Pendiente de confirmar: si se usa HTTPS con un dominio. betterAuth usa cookies de sesión y, sin HTTPS, hay que ajustar su configuración de cookies seguras.

### 4. Subtareas para ClickUp

- [ ] **HU18-T01** Crear la EC2, la IP elástica y los security groups — Laura
- [ ] **HU18-T02** Crear la instancia RDS PostgreSQL y probar la conexión desde la EC2 — Laura + Jose
- [ ] **HU18-T03** Crear el rol IAM con permisos mínimos sobre S3 — Laura
- [ ] **HU18-T04** Instalar Node.js, Nginx y el gestor de procesos elegido — Laura
- [ ] **HU18-T05** Configurar Nginx para el frontend y el proxy de /api — Laura
- [ ] **HU18-T06** Cargar las variables de entorno en el servidor — Laura + Neider
- [ ] **HU18-T07** Aplicar las migraciones en RDS y verificar el health check — Laura + Jose
- [ ] **HU18-T08** Documentar en docs/infraestructura.md — Laura
- [ ] **HU18-T09** Revisar la configuración de seguridad — Neider

### 5. Estructura sugerida en el repositorio

```text
infra/
├── nginx/
│   └── app.conf
└── scripts/
    └── deploy.sh
docs/infraestructura.md
```

---

## HU-19 — Automatizar despliegues con Jenkins

Esta HU automatiza el despliegue con Jenkins en la misma EC2, integrado con GitHub, como exige el reto. En la sustentación hay que demostrar un cambio desplegado así.

- **Épica:** Infraestructura, archivos y entrega
- **Prioridad:** Alta (P0)
- **Responsable:** Laura
- **Revisor:** Neider
- **Apoyo técnico:** Neider y Brayan
- **Dependencias:** HU-18 (EC2 y despliegue manual funcionando).

### 1. Historia de usuario

Como equipo,

queremos desplegar los cambios desde un proceso integrado con GitHub,

para actualizar la aplicación de forma repetible.

### 2. Criterios de aceptación

- CA-01. Jenkins está instalado en la misma EC2 de la aplicación y protegido con usuario y contraseña.
- CA-02. Un push o merge en main dispara el pipeline mediante un webhook de GitHub.
- CA-03. El pipeline está definido en un Jenkinsfile dentro del repositorio.
- CA-04. El pipeline sigue las etapas de la sección 3 y se detiene ante cualquier fallo.
- CA-05. Las variables y credenciales están en las credenciales de Jenkins, nunca en el Jenkinsfile.
- CA-06. El historial de builds muestra quién y qué se desplegó.
- CA-07. Se ensaya antes de la sustentación: un cambio visible llega a producción solo por Jenkins.

### 3. Etapas del pipeline

Etapas propuestas, según el documento de organización:

| Etapa       | Qué hace                                                             |
| ----------- | -------------------------------------------------------------------- |
| Checkout    | Descarga main desde GitHub                                           |
| Instalar    | npm ci en backend y frontend                                         |
| Calidad     | Lint y pruebas; si fallan, no se despliega                           |
| Build       | Compila backend y frontend                                           |
| Migraciones | Aplica migraciones en RDS                                            |
| Desplegar   | Publica el frontend en Nginx y reinicia el backend                   |
| Verificar   | Llama a /api/health; si no responde 200, marca el build como fallido |

### 4. Subtareas para ClickUp

- [ ] **HU19-T01** Instalar Jenkins en la EC2 y protegerlo — Laura
- [ ] **HU19-T02** Configurar las credenciales y variables en Jenkins — Laura + Neider
- [ ] **HU19-T03** Escribir el Jenkinsfile con las etapas — Laura + Brayan
- [ ] **HU19-T04** Configurar el webhook de GitHub — Laura
- [ ] **HU19-T05** Probar un despliegue completo y uno con pruebas fallidas — Laura + Brayan
- [ ] **HU19-T06** Ensayar el cambio en vivo para la sustentación — Laura + Neider

---

## HU-20 — Gestionar documentos y archivos en S3

Esta HU crea el servicio de archivos que usan las demás HU. El reto exige que todo archivo multimedia esté en S3 y que la base de datos guarde solo su referencia.

- **Épica:** Infraestructura, archivos y entrega
- **Prioridad:** Alta (P0)
- **Responsable:** Laura
- **Revisor:** Neider
- **Apoyo técnico:** Natalia y Jose
- **Dependencias:** HU-18 (rol IAM) y esqueleto base del backend.

### 1. Historia de usuario

Como usuario autorizado,

quiero asociar documentos con los registros comerciales y recuperarlos según mis permisos,

para tener los archivos centralizados y seguros.

### 2. Criterios de aceptación

- CA-01. El bucket es privado, con el acceso público bloqueado.
- CA-02. En EC2, el backend accede a S3 con el rol IAM, sin llaves en el código.
- CA-03. Un servicio compartido sube, entrega y elimina archivos detrás de un puerto (sección 3).
- CA-04. La base de datos guarda solo la key del objeto, por ejemplo quotes/{quoteId}/{uuid}.pdf.
- CA-05. Se validan el tipo de archivo (PDF, JPG y PNG) y el tamaño máximo antes de subir.
- CA-06. Los archivos se ven con URLs firmadas que vencen en S3_SIGNED_URL_EXPIRES_SECONDS.
- CA-07. Solo obtiene la URL quien puede ver el registro dueño del archivo.
- CA-08. Ningún archivo multimedia queda en el repositorio.
- CA-09. Primer uso: el documento de la cotización (HU-12).

### 3. Servicio de archivos

Operaciones del puerto compartido:

| Operación del servicio | Uso                                                             |
| ---------------------- | --------------------------------------------------------------- |
| upload                 | Sube un archivo y devuelve su key                               |
| getSignedUrl           | Devuelve una URL firmada de corta duración para ver o descargar |
| delete                 | Elimina un archivo cuando su registro se reemplaza              |

Pendiente de confirmar: el tamaño máximo de archivo y si las fotos y documentos de la visita (Tomar foto y Adjuntar documento en la demo) entran en el alcance.

### 4. Subtareas para ClickUp

- [ ] **HU20-T01** Crear el bucket privado y la política del rol IAM — Laura
- [ ] **HU20-T02** Definir el puerto de almacenamiento en shared — Laura + Jose
- [ ] **HU20-T03** Implementar el adaptador con AWS SDK v3 — Laura
- [ ] **HU20-T04** Implementar la validación de tipo y tamaño — Laura + Natalia
- [ ] **HU20-T05** Integrarlo con el documento de la cotización — Jose
- [ ] **HU20-T06** Crear pruebas con el adaptador simulado — Laura + Natalia
- [ ] **HU20-T07** Revisar el PR e integrar en dev — Neider

### 5. Estructura técnica sugerida

```text
backend/src/shared/
├── application/ports/storage.port.ts
└── infrastructure/storage/s3-storage.adapter.ts
```

---

## HU-21 — Validar la solución integrada

Esta HU asegura que todo funcione junto en AWS antes de la sustentación del lunes 26 de octubre y que cada integrante pueda explicar su parte.

- **Épica:** Infraestructura, archivos y entrega
- **Prioridad:** Alta (P0)
- **Responsable:** Neider
- **Revisor:** Revisión cruzada entre integrantes
- **Apoyo técnico:** Los siete integrantes
- **Dependencias:** Todas las HU.

### 1. Historia de usuario

Como equipo,

queremos probar los flujos principales y documentar cómo ejecutar y sustentar la aplicación,

para llegar a la sustentación con la solución verificada.

### 2. Criterios de aceptación

- CA-01. Los flujos de la sección 3 funcionan de principio a fin en el entorno de AWS.
- CA-02. Cada fila de la matriz de permisos de HU-02 se prueba con los tres roles.
- CA-03. Se verifican la conexión a RDS, el bucket privado de S3 con URLs firmadas y el pipeline de Jenkins.
- CA-04. Hay datos de demostración cargados con seeds: clientes, rutas, visitas, cotizaciones y pedidos ficticios.
- CA-05. El README explica cómo ejecutar el proyecto en local y dónde está desplegado.
- CA-06. Hay un guion de sustentación de una hora: demo, arquitectura, decisiones técnicas y preguntas.
- CA-07. Cada integrante puede explicar su HU, incluido el código generado con IA.
- CA-08. Se hace un ensayo general completo antes del 26 de octubre.

### 3. Flujos de extremo a extremo

Flujos que se prueban en AWS:

| Flujo                           | Rol                | Resultado esperado                           |
| ------------------------------- | ------------------ | -------------------------------------------- |
| Inicio y cierre de sesión       | Los tres           | Cada rol ve solo lo que le corresponde       |
| Crear cliente, ruta y asignarla | director           | El asesor ve la ruta en su agenda            |
| Iniciar y registrar visita      | advisor            | Ubicación confirmada y resultado guardado    |
| Cotización con PDF              | advisor            | Documento en S3 y visible con URL firmada    |
| Pedido desde la cotización      | advisor            | Pedido vinculado a la cotización y la visita |
| Seguimiento                     | advisor            | Aparece en la tabla de seguimiento           |
| Mapa y dashboard                | advisor y director | Indicadores con datos reales                 |
| Exportar CSV                    | advisor y director | Archivo con los datos de cada rol            |
| Bitácora                        | director           | Historial completo del cliente               |
| Cambio en vivo                  | equipo             | Jenkins despliega un cambio desde GitHub     |

### 4. Subtareas para ClickUp

- [ ] **HU21-T01** Preparar los datos de demostración con seeds — Jose + Neider
- [ ] **HU21-T02** Probar los flujos de extremo a extremo en AWS — Neider + equipo
- [ ] **HU21-T03** Probar la matriz de permisos con los tres roles — Brayan
- [ ] **HU21-T04** Verificar RDS, S3 y Jenkins — Laura
- [ ] **HU21-T05** Escribir el guion de sustentación y repartir los tiempos — Neider
- [ ] **HU21-T06** Ensayo cruzado: cada integrante explica su HU — Equipo
- [ ] **HU21-T07** Ensayo general completo — Equipo

---

## HU-22 — Importar clientes desde CSV

Esta HU cubre el requisito mínimo del reto "utilizar importaciones mediante TypeORM", entendido como la carga masiva de clientes desde un archivo CSV. Así la empresa puede pasar a la plataforma la información que hoy tiene en Excel.

- **Épica:** Clientes y catálogos comerciales
- **Prioridad:** Alta (P0)
- **Responsable:** Natalia
- **Revisor:** Neider
- **Apoyo técnico:** Brayan (utilidad CSV de HU-17), Jose (base de datos), Laura (archivo en S3) y Ricardo (frontend)
- **Dependencias:** HU-03 (clientes), HU-05 (catálogos), HU-16 (bitácora) y HU-20 (S3).

### 1. Historia de usuario

Como director comercial,

quiero importar clientes desde un archivo CSV,

para pasar a la plataforma la cartera que hoy se maneja en Excel sin registrarla cliente por cliente.

### 2. Criterios de aceptación

- CA-01. Plantilla: se descarga una plantilla CSV con los encabezados esperados y una fila de ejemplo.
- CA-02. Carga: admin y director suben un archivo CSV de hasta 2 MB y 5.000 filas; el advisor no puede importar.
- CA-03. Formato: se acepta UTF-8 con o sin BOM y separador coma o punto y coma (Excel en español usa punto y coma).
- CA-04. Validación previa: con `dryRun=true` se valida el archivo sin guardar nada y se devuelve el reporte de errores.
- CA-05. Validación por fila: campos obligatorios, formato de email, NIT, latitud y longitud, y frecuencia de visita como entero positivo.
- CA-06. Catálogos: zona, tipo de cliente, potencial y estado se escriben por nombre y se convierten en sus ids; un nombre que no existe es un error de esa fila.
- CA-07. Duplicados: una fila se rechaza si su NIT se repite dentro del archivo o ya existe en la base de datos.
- CA-08. Todo o nada: si una fila tiene errores no se importa ninguna; la importación válida se guarda en una sola transacción de TypeORM.
- CA-09. Reporte: la respuesta indica filas totales, importadas y con error, y por cada error el número de fila, la columna y el motivo.
- CA-10. Archivo: el CSV original se guarda en S3 (HU-20) y la base de datos solo guarda su referencia en `client_import`.
- CA-11. Bitácora: cada cliente creado deja una entrada `client_imported` en activity_log (HU-16).
- CA-12. Documentación y pruebas: los endpoints están en Swagger y hay pruebas con archivos válidos e inválidos.

### 3. Datos y reglas

Columnas de la plantilla (los nombres de campo siguen la tabla client de HU-03):

| Columna              | Obligatoria | Regla                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| nit                  | Sí          | Único en el archivo y en la base de datos        |
| legal_name           | Sí          | Razón social                                     |
| trade_name           | No          | Nombre comercial                                 |
| address              | Sí          | Dirección                                        |
| department           | Sí          | Departamento                                     |
| municipality         | Sí          | Municipio                                        |
| neighborhood         | No          | Barrio                                           |
| phone                | No          | Teléfono                                         |
| email                | No          | Formato de email válido                          |
| latitude             | No          | Número entre -90 y 90                            |
| longitude            | No          | Número entre -180 y 180                          |
| zone                 | Sí          | Nombre existente en el catálogo zone             |
| client_type          | Sí          | Nombre existente en el catálogo client_type      |
| client_potential     | Sí          | Nombre existente en el catálogo client_potential |
| client_status        | Sí          | Nombre existente en el catálogo client_status    |
| visit_frequency_days | Sí          | Entero mayor que cero                            |

Tabla client_import: id, file_key, total_rows, imported_rows, error_rows, status (validated, imported, failed), user_id y created_at. Es una tabla nueva que no está en el modelo ER; hay que agregarla a docs/naming-glossary.md.

Los clientes importados quedan activos y con created_at igual a la fecha de importación.

Regla por defecto: un NIT que ya existe se rechaza. Pendiente de confirmar si, en lugar de rechazarlo, se deben actualizar los datos del cliente existente.

### 4. Endpoints propuestos

Adapta estos endpoints al contrato existente; no dupliques rutas.

| Método | Endpoint                    | Función                                                |
| ------ | --------------------------- | ------------------------------------------------------ |
| GET    | /clients/import/template    | Descargar la plantilla CSV                             |
| POST   | /clients/import?dryRun=true | Validar el archivo sin guardar (multipart, campo file) |
| POST   | /clients/import             | Validar e importar el archivo                          |
| GET    | /clients/imports            | Historial de importaciones                             |

### 5. Subtareas para ClickUp

- [ ] **HU22-T01** Revisar la entidad client de HU-03 y los catálogos de HU-05 — Natalia + Jose
- [ ] **HU22-T02** Definir la plantilla, las columnas y las reglas de validación — Natalia
- [ ] **HU22-T03** Crear la entidad client_import y su migración — Natalia + Jose
- [ ] **HU22-T04** Implementar la lectura del CSV (BOM, separador, límites) — Natalia + Brayan
- [ ] **HU22-T05** Implementar la validación por fila y la conversión de catálogos — Natalia
- [ ] **HU22-T06** Implementar la importación en una transacción con TypeORM — Natalia + Jose
- [ ] **HU22-T07** Guardar el archivo en S3 y registrar la bitácora — Natalia + Laura
- [ ] **HU22-T08** Documentar en Swagger y crear pruebas con archivos de ejemplo — Natalia
- [ ] **HU22-T09** Construir la vista de importación con el reporte de errores — Ricardo
- [ ] **HU22-T10** Revisar el PR e integrar en dev — Neider

### 6. Estructura técnica sugerida

Se trabaja dentro del módulo clients de HU-03. La validación de cada fila va en domain, porque son reglas de negocio puras; la lectura del archivo va en infrastructure.

```text
backend/src/modules/clients/
├── domain/
│   └── client-import-row.ts
├── application/
│   └── use-cases/
│       └── import-clients.use-case.ts
├── infrastructure/
│   ├── csv/
│   │   └── csv-client-reader.ts
│   └── persistence/
│       └── client-import.orm-entity.ts
└── presentation/
    └── controllers/
        └── client-import.controller.ts
```
