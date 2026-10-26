# Entregable 1 - Grupo 3 | API REST de Usuarios y Mascotas

> Proyecto desarrollado en **Node.js** con **Express**, persistencia no bloqueante con `fs.promises`, subida de archivos mediante `multer.diskStorage`, seguridad con el módulo nativo `crypto`, servidor de archivos estáticos (`express.static`) y arquitectura guiada por los principios **SOLID**.

---

## 📋 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Principios SOLID Aplicados](#-principios-solid-aplicados)
5. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
6. [Módulos del Sistema](#-módulos-del-sistema)
   - [RE-01: Servidor de Archivos Estáticos](#re-01-servidor-de-archivos-estáticos-public)
   - [RE-02: Configuración de Multer (diskStorage)](#re-02-configuración-de-multer-diskstorage)
   - [RE-03: Seguridad de Credenciales (crypto)](#re-03-seguridad-de-credenciales-crypto)
7. [Referencia de la API (Endpoints)](#-referencia-de-la-api-endpoints)
   - [Endpoints de Usuarios (`/api/users`)](#endpoints-de-usuarios-apiusers)
   - [Endpoints de Mascotas (`/api/pets`)](#endpoints-de-mascotas-apipets)
8. [Códigos de Estado HTTP Utilizados](#-códigos-de-estado-http-utilizados)
9. [Dashboard Interactivo Incluido](#-dashboard-interactivo-incluido)

---

## 🚀 Descripción General

Esta API REST gestiona dos recursos principales e independientes:
- **Usuarios (`users`):** Registro con avatar, encriptación segura de contraseñas y sanitización de datos.
- **Mascotas (`pets`):** Registro de mascotas con carga múltiple de imágenes (hasta 5 fotografías simultáneas).

La información se persiste en formato JSON local (`users.json` y `pets.json`) sin bloquear el Event Loop de Node.js mediante el uso estricto de `fs.promises` y `async/await`.

---

## 🛠️ Stack Tecnológico

- **Entorno de Ejecución:** Node.js (v18+)
- **Framework Web:** Express.js (v5+)
- **Manejo de Carga de Archivos:** `multer` (con `multer.diskStorage`)
- **Persistencia Asíncrona:** Módulo nativo `fs/promises`
- **Criptografía y Seguridad:** Módulo nativo `crypto` (HMAC-SHA256 con Salt aleatorio y comparación en tiempo constante)
- **Monitoreo en Desarrollo:** `nodemon`

---

## 📁 Estructura del Proyecto

```plaintext
├── public/
│   ├── img/
│   │   ├── users/           <-- Avatares subidos por multer
│   │   └── pets/            <-- Fotografías de mascotas subidas por multer
│   └── index.html           <-- Dashboard interactivo de prueba visual
├── src/
│   ├── app.js               <-- Configuración principal del servidor Express
│   ├── middlewares/
│   │   └── multer.middleware.js <-- Configuración de diskStorage y filtros
│   ├── routes/
│   │   ├── users.router.js  <-- Rutas y lógica para /api/users
│   │   └── pets.router.js   <-- Rutas y lógica para /api/pets
│   ├── utils/
│   │   ├── crypto.js        <-- Funciones de hashing seguro y verificación
│   │   └── fileManager.js   <-- Abstracción CRUD no bloqueante con fs.promises
│   └── data/
│       ├── users.json       <-- Almacén persistente de usuarios
│       └── pets.json        <-- Almacén persistente de mascotas
├── package.json
└── README.md
```

---

## 📐 Principios SOLID Aplicados

El proyecto fue diseñado aplicando buenas prácticas de ingeniería de software para mantener el código desacoplado, legible y mantenible:

| Principio | Aplicación en el Proyecto |
| :--- | :--- |
| **S - Single Responsibility (Responsabilidad Única)** | Cada módulo atiende un único propósito bien delimitado:<br>• `crypto.js`: Exclusivamente operaciones criptográficas.<br>• `fileManager.js`: Exclusivamente persistencia asíncrona de archivos.<br>• `multer.middleware.js`: Exclusivamente recepción y almacenamiento físico de archivos.<br>• `users.router.js` y `pets.router.js`: Únicamente orquestación de peticiones HTTP para sus respectivos dominios. |
| **O - Open/Closed (Abierto/Cerrado)** | `JsonFileManager` está abierto a extensión pero cerrado a modificación: permite operar sobre cualquier archivo JSON (`users.json`, `pets.json`, etc.) reutilizando toda la lógica de lectura/escritura sin alterar su código fuente. |
| **L - Liskov Substitution (Sustitución de Liskov)** | La capa de persistencia define contratos uniformes (`readAll`, `findById`, `create`, `update`, `delete`). Si en el futuro se reemplaza el almacenamiento JSON por una base de datos (MongoDB, PostgreSQL), los enrutadores no requerirán cambios estructurales. |
| **I - Interface Segregation (Segregación de Interfaces)** | En lugar de un middleware masivo, `multer.middleware.js` exporta interfaces específicas (`uploadUserAvatar` y `uploadPetImages`). Los clientes de estos middlewares reciben únicamente lo que necesitan. |
| **D - Dependency Inversion (Inversión de Dependencias)** | Los enrutadores de alto nivel no dependen de llamadas de bajo nivel a las APIs del sistema operativo (`fs.readFile`), sino de abstracciones de servicio (`JsonFileManager`, `crypto.js`). |

---

## ⚡ Instalación y Puesta en Marcha

### 1. Clonar o ingresar al directorio del proyecto
```bash
cd Entrega1
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar el servidor en modo desarrollo (con auto-reload)
```bash
npm run dev
```

### 4. O ejecutar en modo producción
```bash
npm start
```

El servidor iniciará por defecto en el puerto `8080`:
- **Dashboard web interactivo:** [http://localhost:8080](http://localhost:8080)
- **API Usuarios:** [http://localhost:8080/api/users](http://localhost:8080/api/users)
- **API Mascotas:** [http://localhost:8080/api/pets](http://localhost:8080/api/pets)

---

## 🧩 Módulos del Sistema

### RE-01: Servidor de Archivos Estáticos (`public/`)
Express expone la carpeta `public/` en la raíz mediante:
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```
Cualquier archivo subido a `public/img/users/` o `public/img/pets/` es accesible de inmediato mediante una petición HTTP GET directa:
- Avatar: `http://localhost:8080/img/users/avatar-1710000000.png`
- Foto mascota: `http://localhost:8080/img/pets/pet-1-1710000001.jpg`

### RE-02: Configuración de `multer.diskStorage`
Se configuró obligatoriamente `multer.diskStorage({ destination, filename })`:
- **`destination`**: Discrimina el directorio de destino según el tipo de recurso (`public/img/users` para usuarios, `public/img/pets` para mascotas).
- **`filename`**: Evita colisiones de nombres utilizando marcas de tiempo y saneamiento de caracteres:
  - Formato avatar: `avatar-${Date.now()}-${sanitizedName}.ext`
  - Formato mascotas: `pet-${Date.now()}-${sanitizedName}.ext`
- **Filtro MIME**: Solo se aceptan extensiones de imagen (`jpg`, `jpeg`, `png`, `webp`, `gif`).

### RE-03: Seguridad de Credenciales (`crypto`)
- Las contraseñas de los usuarios **nunca** se almacenan en texto plano.
- En el registro (`POST`) o modificación (`PUT`), se genera un **salt criptográfico** aleatorio de 16 bytes y se calcula un hash con **HMAC-SHA256**.
- El valor guardado en `users.json` tiene el formato `"salt:hashHex"`.
- Al consultar usuarios (`GET`), el campo `password` se **elimina automáticamente** de la respuesta JSON por razones de seguridad.

---

## 📡 Referencia de la API (Endpoints)

### Endpoints de Usuarios (`/api/users`)

#### 1. Obtener todos los usuarios
- **Método:** `GET`
- **Ruta:** `/api/users`
- **Respuesta Exitosa (200 OK):**
```json
{
  "status": "success",
  "total": 1,
  "data": [
    {
      "id": 1,
      "firstname": "Wilmer",
      "lastname": "Patiño",
      "username": "w.patino",
      "avatar": "/img/users/avatar-1710000000.png"
    }
  ]
}
```

#### 2. Obtener un usuario por ID
- **Método:** `GET`
- **Ruta:** `/api/users/:id`
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "firstname": "Wilmer",
    "lastname": "Patiño",
    "username": "w.patino",
    "avatar": "/img/users/avatar-1710000000.png"
  }
}
```
- **Error (404 Not Found):** Si el ID no existe.

#### 3. Registrar un nuevo usuario
- **Método:** `POST`
- **Ruta:** `/api/users`
- **Encabezado:** `Content-Type: multipart/form-data`
- **Campos del Body:**
  - `firstname`: (string, obligatorio)
  - `lastname`: (string, obligatorio)
  - `username`: (string, obligatorio, único)
  - `password`: (string, obligatorio)
  - `avatar`: (archivo imagen, opcional)
- **Respuesta (201 Created):**
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente.",
  "data": {
    "id": 2,
    "firstname": "Ana",
    "lastname": "Gómez",
    "username": "ana.gomez",
    "avatar": "/img/users/avatar-1740000000-foto.png"
  }
}
```

#### 4. Actualizar usuario
- **Método:** `PUT`
- **Ruta:** `/api/users/:id`
- **Encabezado:** `Content-Type: multipart/form-data` o `application/json`
- **Respuesta (200 OK):** Usuario actualizado (con password omitido).

#### 5. Eliminar usuario
- **Método:** `DELETE`
- **Ruta:** `/api/users/:id`
- **Respuesta (200 OK):** Mensaje de confirmación y datos del usuario eliminado (también se limpia el archivo físico del avatar).

---

### Endpoints de Mascotas (`/api/pets`)

#### 1. Obtener todas las mascotas
- **Método:** `GET`
- **Ruta:** `/api/pets`
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "total": 1,
  "data": [
    {
      "id": 1,
      "especie": "perro",
      "color": "negro con manchas blancas",
      "edad": 4,
      "sexo": "macho",
      "img": [
        "/img/pets/pet-1-1710000001.jpg",
        "/img/pets/pet-2-1710000002.jpg"
      ]
    }
  ]
}
```

#### 2. Obtener mascota por ID
- **Método:** `GET`
- **Ruta:** `/api/pets/:id`
- **Respuesta (200 OK):** Datos de la mascota consultada.

#### 3. Registrar una nueva mascota
- **Método:** `POST`
- **Ruta:** `/api/pets`
- **Encabezado:** `Content-Type: multipart/form-data`
- **Campos del Body:**
  - `especie`: (string, obligatorio, ej: "gato")
  - `color`: (string, obligatorio, ej: "atigrado")
  - `edad`: (número, obligatorio, ej: 2)
  - `sexo`: (string, obligatorio, "macho" o "hembra")
  - `img`: (archivos, múltiple, hasta 5 imágenes)
- **Respuesta (201 Created):**
```json
{
  "status": "success",
  "message": "Mascota registrada exitosamente.",
  "data": {
    "id": 2,
    "especie": "gato",
    "color": "atigrado",
    "edad": 2,
    "sexo": "hembra",
    "img": [
      "/img/pets/pet-1740000001-michi.jpg"
    ]
  }
}
```

#### 4. Actualizar mascota
- **Método:** `PUT`
- **Ruta:** `/api/pets/:id`
- **Respuesta (200 OK):** Mascota actualizada. Admite adjuntar nuevas imágenes o reemplazarlas con `replaceImages: true`.

#### 5. Eliminar mascota
- **Método:** `DELETE`
- **Ruta:** `/api/pets/:id`
- **Respuesta (200 OK):** Mascota eliminada y sus fotografías físicas removidas del disco.

---

## 🚦 Códigos de Estado HTTP Utilizados

| Código | Significado | Escenarios de Uso |
| :---: | :--- | :--- |
| **`200 OK`** | Operación exitosa | Consultas (`GET`), actualizaciones (`PUT`), eliminaciones (`DELETE`). |
| **`201 Created`** | Recurso creado | Creación exitosa de usuarios o mascotas (`POST`). |
| **`400 Bad Request`** | Solicitud errónea | Campos faltantes, formato de imagen no admitido o username duplicado. |
| **`404 Not Found`** | No encontrado | ID solicitado de usuario o mascota no existe en los archivos JSON. |
| **`500 Internal Error`** | Error de servidor | Fallas no controladas de I/O o del servidor. |

---

## 🖥️ Dashboard Interactivo Incluido

Al abrir **`http://localhost:8080`** en tu navegador, dispondrás de una interfaz web completa para:
- Visualizar todos los usuarios con sus avatares en tiempo real.
- Registrar usuarios subiendo imágenes directamente desde tu equipo.
- Visualizar mascotas con su galería de fotos y registrar nuevas mascotas subiendo hasta 5 imágenes a la vez.
- Probar cada endpoint de la API con un visor de respuestas JSON en vivo.
- Inspeccionar el resumen visual de los principios SOLID implementados.
