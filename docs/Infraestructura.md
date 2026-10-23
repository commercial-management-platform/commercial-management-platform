# Infraestructura de la Plataforma de Gestión Comercial

Documento de la HU-18 (despliegue en AWS), HU-19 (Jenkins) y HU-20 (S3). Describe los recursos, puertos, variables de entorno (sin valores) y cómo recuperar el servicio.

> Los valores entre `<...>` se completan con los datos reales. **Nunca** se escriben contraseñas, llaves ni el contenido de `.env` en este documento ni en el repositorio.

---

## 1. Recursos de AWS

Región: **us-east-1**

| Recurso        | Nombre / ID                                        | Configuración                                                                |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| EC2            | Nexo (`<ID_INSTANCIA>`)                            | Ubuntu 24.04 LTS arm64, `t4g.small` (2 GB)                                   |
| IP elástica    | `<IP_ELASTICA>`                                    | Asociada a la EC2 Nexo                                                       |
| RDS PostgreSQL | `nexo-db`                                          | PostgreSQL 16.15, `db.t4g.micro`, 20 GB gp3, cifrado, **sin acceso público** |
| Base de datos  | `cmp_db`                                           | Creada en la instancia `nexo-db`                                             |
| Endpoint RDS   | `nexo-db.c036isesguwy.us-east-1.rds.amazonaws.com` | Puerto 5432, SSL obligatorio                                                 |
| Bucket S3      | `nexo-riwi-bucket-2026`                            | Privado, acceso público bloqueado, ACL deshabilitadas, cifrado SSE-S3        |
| Rol IAM        | `cmp-ec2-s3-role`                                  | Asignado a la EC2; permisos solo sobre el bucket                             |

---

## 2. Puertos y reglas de acceso

| Puerto | Servicio                                       | Origen permitido                     | Motivo                                     |
| ------ | ---------------------------------------------- | ------------------------------------ | ------------------------------------------ |
| 80     | Aplicación (Nginx dentro del contenedor `web`) | Cualquiera (0.0.0.0/0)               | Acceso a la aplicación                     |
| 22     | SSH / EC2 Instance Connect                     | Solo la IP del equipo                | Administración del servidor                |
| 8080   | Jenkins (HU-19)                                | Solo las IP del equipo               | Panel de integración continua              |
| 5432   | PostgreSQL (RDS)                               | Solo el grupo de seguridad de la EC2 | RDS no es accesible desde internet (CA-06) |

Dentro de Docker, la API (puerto 3000) solo es accesible desde el contenedor `web`. No se publica al exterior.

---

## 3. Variables de entorno

El archivo es `/opt/cmp/app/.env` (en la **raíz** del proyecto, junto a `docker-compose.prod.yml`). Se escribe en el servidor a partir de `.env.example`. **Nunca** se sube al repositorio (está en `.gitignore`).

| Variable                      | Descripción                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`                    | `production`                                                                |
| `PORT`                        | `3000` (puerto interno de la API)                                           |
| `WEB_PORT`                    | `80` (puerto público de la aplicación)                                      |
| `CORS_ORIGIN`                 | `http://<IP_ELASTICA>`                                                      |
| `BETTER_AUTH_URL`             | `http://<IP_ELASTICA>`                                                      |
| `BETTER_AUTH_SECRET`          | Mínimo 32 caracteres. Generar con `openssl rand -base64 48`                 |
| `DB_HOST`                     | Endpoint de RDS                                                             |
| `DB_PORT`                     | `5432`                                                                      |
| `DB_USER`                     | Usuario de la base de datos (`nexo_user`)                                   |
| `DB_PASSWORD`                 | Contraseña de la base de datos                                              |
| `DB_NAME`                     | `cmp_db`                                                                    |
| `DB_SSL`                      | `true`                                                                      |
| `VISIT_CHECKIN_RADIUS_METERS` | Radio de check-in de visitas (valor definido por el equipo)                 |
| `SEED_*`                      | Solo para cargar usuarios de demo (`npm run seed:prod`). Ver `.env.example` |

Notas:

- En producción la aplicación no arranca si `BETTER_AUTH_SECRET` falta, tiene el valor de ejemplo o tiene menos de 32 caracteres.
- Las variables de S3 (`AWS_REGION`, `S3_BUCKET_NAME`, `S3_SIGNED_URL_EXPIRES_SECONDS`) se agregarán al `.env` cuando se implemente HU-20.

---

## 4. Puesta en marcha en la EC2

### 4.1 Instalar Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu
```

Cierra y vuelve a abrir la sesión de la terminal para que el grupo `docker` tenga efecto.

Si Nginx del host está instalado, detenlo para liberar el puerto 80:

```bash
sudo systemctl disable --now nginx
```

### 4.2 Clonar el repositorio

```bash
sudo mkdir -p /opt/cmp && sudo chown ubuntu:ubuntu /opt/cmp
git clone -b feature/HU-18-deploy-aws https://github.com/commercial-management-platform/commercial-management-platform.git /opt/cmp/app
```

Cuando el Pull Request se integre en `dev`, el servidor debe apuntar a esa rama: `git checkout dev && git pull`.

### 4.3 Crear el `.env`

```bash
cd /opt/cmp/app
cp .env.example .env
nano .env        # reemplaza los valores de la sección 3
chmod 600 .env
```

### 4.4 Certificado de RDS

Ya viene en la imagen de la API (`backend/Dockerfile`), así que no hay que descargarlo en el host.

### 4.5 Levantar la aplicación

```bash
cd /opt/cmp/app
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

La API aplica las migraciones al arrancar.

### 4.6 Datos iniciales (opcional, para la demo)

```bash
docker compose -f docker-compose.prod.yml exec api npm run seed:prod
```

---

## 5. Verificación

```bash
curl -i http://127.0.0.1/api/health      # debe responder 200
```

Desde el navegador: `http://<IP_ELASTICA>`.

---

## 6. Recuperar el servicio

1. **Estado de los contenedores:** `docker compose -f docker-compose.prod.yml ps`
2. **Logs:** `docker compose -f docker-compose.prod.yml logs -f api` (y `web` si la página no carga)
3. **Reinicio:** los contenedores tienen `restart: always`, así que vuelven solos si fallan o si se reinicia la EC2. Si no volvieron: `docker compose -f docker-compose.prod.yml up -d`
4. **Base de datos:** en la consola de AWS, revisa que RDS `nexo-db` esté **Disponible**. Si está detenida, inícala y espera 5 a 10 minutos.
5. **Actualizar la versión:** `cd /opt/cmp/app && git pull && docker compose -f docker-compose.prod.yml up -d --build`

---

## 7. Bucket S3 (HU-20)

### 7.1 Crear el bucket

Ya creado: `nexo-riwi-bucket-2026`, en us-east-1, con acceso público bloqueado, ACL deshabilitadas, versionado deshabilitado y cifrado SSE-S3.

### 7.2 Política del rol de la EC2

Rol `cmp-ec2-s3-role` → política insertada `cmp-s3-objetos`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
            "Resource": "arn:aws:s3:::nexo-riwi-bucket-2026/*"
        }
    ]
}
```

No se otorga `s3:ListBucket`: el backend no necesita listar el bucket.

### 7.3 Conexión sin llaves

La EC2 tiene el rol asignado, así que el SDK de AWS toma las credenciales automáticamente. No se usan `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en ningún lado.

### 7.4 Prueba (probada)

Dentro de la EC2, con la AWS CLI instalada:

```bash
aws sts get-caller-identity          # muestra assumed-role/cmp-ec2-s3-role
aws s3 cp /tmp/prueba.txt s3://nexo-riwi-bucket-2026/pruebas/prueba.txt
aws s3 cp s3://nexo-riwi-bucket-2026/pruebas/prueba.txt /tmp/descarga.txt
aws s3 rm s3://nexo-riwi-bucket-2026/pruebas/prueba.txt
```

Resultado: subida, descarga y borrado correctos.

### 7.5 Claves de los objetos (CA-04)

La base de datos guarda solo la clave, por ejemplo `quotes/{quoteId}/{uuid}.pdf`, nunca la URL completa.

---
