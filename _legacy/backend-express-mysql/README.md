# PROTEQLIFE — Guía de Instalación Completa

## 📁 Estructura del proyecto

```
proteqlife/
│
├── index.html              ← Página de inicio
├── nav.js                  ← Navegación compartida (incluir en todas las páginas)
├── api.js                  ← Cliente JS para conectar con el backend
├── curso-detalle.html      ← Ficha individual de curso (dinámica)
├── cursos-sso.html         ← Catálogo Seguridad Integral
├── cursos-calidad.html     ← Catálogo Sist. Integrado de Gestión
├── cursos-liderazgo.html   ← Catálogo Desarrollo Empresarial & Liderazgo
├── aula-virtual.html       ← Aula virtual con login/registro
│
└── backend/
    ├── server.js           ← Servidor Express principal
    ├── package.json        ← Dependencias Node.js
    ├── .env.example        ← Variables de entorno (copiar como .env)
    ├── db/
    │   ├── schema.sql      ← Estructura completa de la base de datos
    │   └── connection.js   ← Conexión MySQL
    ├── middleware/
    │   └── auth.js         ← Verificación JWT
    └── routes/
        ├── auth.js         ← Registro, login, recuperar contraseña
        ├── cursos.js       ← API de cursos y categorías
        ├── aula.js         ← Dashboard, progreso, certificados
        ├── compras.js      ← Carrito y pagos
        └── admin.js        ← Panel de administración
```

---

## 🔧 PARTE 1 — Frontend (archivos HTML)

### Uso inmediato (sin backend)

1. Descarga todos los archivos HTML + `nav.js` + `api.js`
2. Colócalos en la **misma carpeta**
3. Abre `index.html` con Live Server en VS Code

> **Importante:** `nav.js` y `api.js` deben estar en la misma carpeta que los HTML.

### Correcciones aplicadas en esta versión ✅

- ✅ **Menú Cursos** ya no cierra al pasar al dropdown
- ✅ **Nombres correctos** en la navegación: "Seguridad Integral", "Sist. Integrado de Gestión", "Desarrollo Empresarial & Liderazgo"
- ✅ **Aula Virtual** en el nav va a `aula-virtual.html` (ya no a Contáctanos)
- ✅ **"Ver curso"** en los catálogos ahora redirige a `curso-detalle.html?slug=nombre-del-curso`
- ✅ **Ficha de curso** muestra: título, descripción, temario completo, carrito y botón de compra
- ✅ **Carrito** funcional con panel lateral, total y opciones de pago
- ⏳ **Pagos en línea pendientes:** el checkout del sitio no procesa cobros hasta terminar la integración real con Culqi. No solicita datos de tarjeta ni confirma compras simuladas.

---

## 🖥️ PARTE 2 — Backend Node.js + MySQL

### Requisitos previos

- Node.js v18 o superior → https://nodejs.org
- MySQL 8.0 o superior → https://www.mysql.com
- Git (opcional)

### Paso 1 — Instalar MySQL y crear la base de datos

```bash
# En la terminal:
mysql -u root -p

# Dentro de MySQL:
source /ruta/a/backend/db/schema.sql
```

O desde MySQL Workbench: File → Open SQL Script → Seleccionar `schema.sql` → Ejecutar

### Paso 2 — Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env` con tus datos reales:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_contraseña_mysql
DB_NAME=proteqlife_db
JWT_SECRET=cambia_esto_por_una_cadena_aleatoria_larga
```

### Paso 3 — Instalar dependencias y arrancar

```bash
cd backend
npm install
npm start        # producción
# o
npm run dev      # desarrollo (se reinicia automáticamente)
```

El servidor arranca en: `http://localhost:3000`

Verifica que funciona: `http://localhost:3000/api/health`

### Paso 4 — Conectar frontend con backend

En `api.js`, línea 4, cambia la URL si es necesario:
```javascript
const API_URL = 'http://localhost:3000/api'; // desarrollo
// const API_URL = 'https://api.proteqlife.com/api'; // producción
```

---

## 🗄️ Base de Datos — Tablas principales

| Tabla | Descripción |
|---|---|
| `usuarios` | Registro de usuarios con contraseña encriptada (bcrypt) |
| `categorias` | Las 3 áreas: Seguridad, Calidad, Liderazgo |
| `cursos` | Todos los cursos con precio, modalidad, etc. |
| `modulos` | Módulos de cada curso |
| `lecciones` | Lecciones con URL de video/PDF |
| `temario` | Puntos del temario por curso |
| `dirigido_a` | A quién va dirigido el curso |
| `compras` | Historial de compras |
| `compra_items` | Detalle de cada compra |
| `acceso_cursos` | Qué cursos tiene acceso cada usuario |
| `progreso` | Progreso por lección por usuario |
| `certificados` | Certificados emitidos con código QR |

**Acceso administrador:** no hay credenciales administrativas válidas que deban publicarse aquí. Crea y protege las cuentas administrativas desde el entorno de backend autorizado.

---

## 🔐 Endpoints de la API

### Autenticación
```
POST /api/auth/registro          ← Crear cuenta
POST /api/auth/login             ← Iniciar sesión → devuelve JWT
GET  /api/auth/me                ← Perfil actual (requiere token)
POST /api/auth/recuperar-password
POST /api/auth/reset-password
```

### Cursos (públicos)
```
GET /api/cursos                  ← Todos los cursos
GET /api/cursos?categoria=seguridad-integral
GET /api/cursos?modalidad=vivo
GET /api/cursos?buscar=IPERC
GET /api/cursos/categorias       ← Lista de categorías
GET /api/cursos/:slug            ← Detalle + temario + relacionados
```

### Aula Virtual (requiere login)
```
GET  /api/aula/mis-cursos        ← Cursos del usuario con progreso
GET  /api/aula/progreso/:id      ← Progreso en un curso
POST /api/aula/progreso          ← Marcar lección completada
GET  /api/aula/certificados      ← Certificados obtenidos
GET  /api/aula/proximas-clases   ← Clases en vivo programadas
```

### Compras (requiere login)
```
POST /api/compras/checkout       ← Procesar pago
GET  /api/compras/historial      ← Historial de compras
GET  /api/compras/tiene-acceso/:cursoId
```

### Admin (requiere rol admin)
```
GET  /api/admin/dashboard        ← Estadísticas generales
GET  /api/admin/usuarios         ← Lista de usuarios
GET  /api/admin/ventas           ← Historial de ventas
POST /api/admin/cursos/:id/modulos
POST /api/admin/modulos/:id/lecciones
```

### Validar certificado (público)
```
GET /api/certificados/:codigo    ← Verificar autenticidad
```

---

## 💳 Integración con Culqi (pagos en soles peruanos)

1. Crea cuenta en https://culqi.com
2. Obtén tus llaves de prueba
3. Agrega en `.env`:
   ```
   CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
   CULQI_PRIVATE_KEY=sk_test_xxxxxxxxxxxx
   ```
4. En `routes/compras.js`, reemplaza el pago simulado con:
   ```javascript
   const culqi = require('culqi-node');
   culqi.options.privateKey = process.env.CULQI_PRIVATE_KEY;
   const cargo = await culqi.charges.create({
     amount: total * 100, // en centavos
     currency_code: 'PEN',
     email: req.user.email,
     source_id: token_pago // token generado por Culqi.js en el frontend
   });
   ```

---

## 🚀 Despliegue en producción

### Opción recomendada: Railway.app (gratis para empezar)

1. Sube el código a GitHub
2. Conecta Railway con tu repositorio
3. Agrega las variables de entorno en Railway
4. Railway detecta Node.js automáticamente y despliega

### Dominio personalizado
1. Compra tu dominio en Namecheap o GoDaddy (~$10/año)
2. Apunta los DNS a Railway o tu servidor
3. Activa HTTPS (automático en Railway)

---

## 📞 Soporte técnico

Para dudas sobre la implementación:
- WhatsApp: +51 999 000 000
- Email: informes@proteqlife.com
