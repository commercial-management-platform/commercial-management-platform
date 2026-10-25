# Guía de pruebas en AWS

Pruebas de extremo a extremo de HU-21 en el entorno desplegado: flujos (CA-01), matriz de permisos (CA-02) e infraestructura (CA-03).

**URL:** https://kestrel1.duckdns.org

## Antes de empezar

- **Cuentas:** una por rol (admin, director y advisor). Se crean con el seed a partir de las variables `SEED_*` del `.env` de producción. El asesor debe tener una ruta con clientes.
- **Datos de prueba:** todo lo que se cree queda en la base de producción, que es la misma de la demostración. Usa nombres reconocibles, por ejemplo el cliente *"Prueba AWS"*, para identificarlos después.
- **Dispositivos:** un computador y un celular. La ubicación y el mapa en campo (HU-11 CA-07) se prueban en el celular.
- **Un PDF de prueba** de menos de 5 MB.
- **Registro de fallas:** anota el paso, el rol, la hora y una captura de pantalla. Para ver el error del servidor:
  ```bash
  sudo docker logs cmp-prod-api-1 --since 10m | tail -50
  ```

## 1. Infraestructura (CA-03)

| # | Prueba | Cómo | Resultado esperado | ✔ |
|---|---|---|---|---|
| 1.1 | HTTPS | Abrir la URL en el navegador | Candado sin aviso; certificado de Let's Encrypt para `kestrel1.duckdns.org` | ☐ |
| 1.2 | API y base de datos | Abrir `https://kestrel1.duckdns.org/api/health` | `{"status":"ok","database":"up"}` | ☐ |
| 1.3 | Conexión a RDS con SSL | En la EC2: `sudo docker exec cmp-prod-api-1 printenv \| grep -E '^DB_(HOST\|SSL)='` | `DB_HOST` termina en `.rds.amazonaws.com` y `DB_SSL=true` | ☐ |
| 1.4 | RDS no es público | Consola de AWS → RDS → la instancia → *Connectivity* | *Publicly accessible: No*; el *security group* solo admite la EC2 | ☐ |
| 1.5 | Bucket privado | Abrir un documento con **Ver** (flujo 5), copiar la URL y quitarle todo lo que va después del `?` | `Access Denied` | ☐ |
| 1.6 | URL firmada que vence | Abrir la URL firmada completa después de 5 minutos | `Request has expired` | ☐ |
| 1.7 | Jenkins | Integrar un PR a la rama que despliega el job | El build arranca solo por el webhook y termina en verde en unos 3 minutos | ☐ |
| 1.8 | Despliegue fallido no rompe la aplicación | Revisar en Jenkins un build con lint o pruebas fallidas (si existe) | Se detiene antes de **Desplegar**; la versión anterior sigue en línea | ☐ |

## 2. Matriz de permisos (CA-02)

Desde tu PC, en `backend/`, con las cuentas reales de producción:

```powershell
$env:PERM_ADMIN_EMAIL="..."; $env:PERM_ADMIN_PASSWORD="..."
$env:PERM_DIRECTOR_EMAIL="..."; $env:PERM_DIRECTOR_PASSWORD="..."
$env:PERM_ADVISOR_EMAIL="..."; $env:PERM_ADVISOR_PASSWORD="..."
npm run check:permissions -- https://kestrel1.duckdns.org
```

- Comprueba 57 endpoints con los tres roles y 5 reglas de alcance de datos (por ejemplo, que el asesor solo ve sus clientes).
- No modifica datos.
- **Resultado esperado:** `Every check passed.` ☐

## 3. Flujos de extremo a extremo (CA-01)

Hazlos en orden: cada uno usa lo que creó el anterior.

### Flujo 1. Inicio y cierre de sesión — los tres roles

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Iniciar sesión como **admin** | Ve todo el menú, incluida **Administración** (usuarios y zonas) | ☐ |
| Iniciar sesión como **director** | Ve Dashboard, Clientes, Rutas, Visitas, Cotizaciones, Pedidos y Seguimientos, pero no **Administración** (esa pantalla es solo del admin) | ☐ |
| Iniciar sesión como **advisor** | No ve Administración; en Clientes solo aparecen los de sus rutas | ☐ |
| Contraseña incorrecta | Mensaje de error y no entra | ☐ |
| **Cerrar sesión** y volver atrás con el navegador | Pide iniciar sesión de nuevo | ☐ |

### Flujo 2. Crear cliente y ruta, y asignarla — director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Clientes → **Nuevo cliente** *"Prueba AWS"*, con zona, tipo, potencial, estado, contacto principal y coordenadas | El cliente aparece en la lista | ☐ |
| Crear otro cliente con el **mismo NIT** | Lo rechaza por NIT duplicado | ☐ |
| Rutas → **Nueva ruta** con la zona, el asesor de prueba y los días; agregar *"Prueba AWS"* y otro cliente | La ruta queda activa con sus clientes en orden | ☐ |
| Cambiar el orden de los clientes de la ruta | Se guarda el nuevo orden | ☐ |
| Iniciar sesión como el **asesor** de la ruta | Ve la ruta en **Rutas asignadas** y el cliente *"Prueba AWS"* en Clientes | ☐ |

### Flujo 3. Programar la visita — director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Visitas → **Programar visita** a *"Prueba AWS"* para hoy, con el asesor de la ruta | La visita aparece en la agenda del día | ☐ |
| Intentar programar una visita en una fecha pasada | La rechaza | ☐ |
| (Opcional) Generar las visitas de toda la ruta para una fecha | Se crean en el orden de la ruta | ☐ |

### Flujo 4. Iniciar y registrar la visita — advisor, desde el celular

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Abrir **Visitas** (agenda) y el **mapa** del Dashboard | La visita aparece con marcador numerado, color por estado y leyenda; el mapa se usa bien en el celular | ☐ |
| **Iniciar visita** y aceptar el permiso de ubicación | Si estás cerca del cliente: *"Ubicación confirmada"*. Si no: aviso con la distancia, y deja registrar igual | ☐ |
| Llenar objetivo, tipo, resultado, interés y observación; en **Gestión comercial** elegir *"Se generó una cotización"*; marcar **Programar próximo seguimiento** | — | ☐ |
| **Registrar visita** | La visita pasa a realizada y se abre **Nueva cotización** con el cliente fijo y *"Vinculada a la visita registrada"* | ☐ |
| Agregar dos productos y guardar el borrador | La cotización `COT-xxxx` queda en borrador con el total calculado | ☐ |

### Flujo 5. Cotización con PDF — advisor y director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Advisor: abrir la cotización → **Adjuntar** el PDF | *"Documento adjunto"*; sigue adjunto al recargar la página | ☐ |
| **Ver** | El PDF se abre en otra pestaña con una URL firmada | ☐ |
| **Reemplazar** con otro archivo | Queda el nuevo; en la consola de S3, en `quotes/<id>/`, solo hay un archivo | ☐ |
| Adjuntar un archivo `.docx` o de más de 5 MB | Lo rechaza con un aviso | ☐ |
| Director: **Enviar al cliente** y luego **Marcar aprobada** | La cotización pasa a enviada y después a aprobada | ☐ |

### Flujo 6. Pedido desde la cotización — advisor

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Abrir la cotización aprobada → **Convertir en pedido** con fecha de entrega | Se crea `PED-xxxx` con el valor de la cotización | ☐ |
| Intentar convertir la misma cotización otra vez | No lo permite (una cotización genera como máximo un pedido) | ☐ |
| Director: en la tabla de seguimiento del Dashboard, buscar la visita del flujo 4 | La fila muestra la cotización, su valor y el pedido | ☐ |

### Flujo 7. Seguimiento — advisor

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Abrir **Seguimientos** | Aparece el seguimiento programado en el flujo 4 como pendiente | ☐ |
| Marcarlo como completado | Pasa a completado con la fecha | ☐ |
| Dashboard → tabla de seguimiento | La columna *Próximo seguimiento* de la visita lo refleja | ☐ |

### Flujo 8. Mapa y dashboard — advisor y director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Director: Dashboard de la semana actual | Indicadores con datos (visitas, efectividad, valor cotizado, pedidos, facturación) | ☐ |
| Cambiar de semana y filtrar por zona y por asesor | Los indicadores y la tabla cambian según el filtro | ☐ |
| Director: mapa de la ruta del día, cambiando de asesor | Muestra el recorrido de cada asesor | ☐ |
| Advisor: Dashboard | Solo sus indicadores y sus visitas | ☐ |

### Flujo 9. Exportar CSV — advisor y director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Director: **Exportar** en la tabla de seguimiento | Descarga `seguimiento-visitas-AAAA-MM-DD.csv`; abre bien en Excel, con tildes y columnas separadas | ☐ |
| Advisor: **Exportar** | El archivo solo trae sus visitas | ☐ |

### Flujo 10. Bitácora — director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Abrir la ficha de *"Prueba AWS"* → historial | Aparecen, de la más reciente a la más antigua: creación del cliente, visita programada y realizada, cotización creada y sus cambios de estado, pedido creado y seguimiento | ☐ |

### Flujo 11. Importar clientes desde CSV — director

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Clientes → **Importar clientes** → descargar la plantilla | Descarga `plantilla-clientes.csv` con encabezados y una fila de ejemplo | ☐ |
| Llenar 2 clientes nuevos y **validar** | Reporte sin errores; todavía no se crea ningún cliente | ☐ |
| Importar | Se crean los 2 clientes y aparecen en la lista | ☐ |
| Subir un archivo con un NIT repetido y un email inválido | Reporte con la fila y la columna de cada error; no se importa nada | ☐ |
| Iniciar sesión como advisor | No aparece la opción de importar | ☐ |

### Flujo 12. Cambio en vivo — equipo

| Paso | Resultado esperado | ✔ |
|---|---|---|
| Hacer un cambio visible pequeño (por ejemplo, un texto del login), con PR a la rama que despliega Jenkins | — | ☐ |
| Integrar el PR | Jenkins arranca solo, termina en verde y el cambio se ve en la URL sin tocar el servidor | ☐ |
| Anotar cuánto tardó el build | Unos 3 minutos | ☐ |

## Resultado

| Sección | Probado por | Fecha | Resultado | Fallas |
|---|---|---|---|---|
| 1. Infraestructura | | | | |
| 2. Matriz de permisos | | | | |
| 3. Flujos 1 a 12 | | | | |
