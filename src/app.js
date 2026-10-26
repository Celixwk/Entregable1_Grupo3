/**
 * =============================================================================
 * SERVIDOR PRINCIPAL EXPRESS (src/app.js)
 * =============================================================================
 * Ejercicio Práctico: API REST con Persistencia en Archivos, Subida con Multer
 * y Archivos Estáticos.
 *
 * Principios SOLID aplicados:
 * - Single Responsibility Principle (SRP): Este archivo es responsable de
 *   la configuración inicial del servidor, el registro de middlewares globales,
 *   la exposición de archivos estáticos y la delegación de rutas a sus respectivos
 *   enrutadores modulares.
 * - Open/Closed Principle (OCP): Nuevos recursos (por ejemplo, 'adopciones')
 *   pueden registrarse como nuevos routers sin alterar la lógica de los existentes.
 * =============================================================================
 */

const express = require('express');
const path = require('path');
const multer = require('multer');

// Importación de enrutadores modulares
const usersRouter = require('./routes/users.router');
const petsRouter = require('./routes/pets.router');

const app = express();
const PORT = process.env.PORT || 8080;

// =============================================================================
// MIDDLEWARES GLOBALES DE PARSEO
// =============================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// RE-01: SERVIDOR DE ARCHIVOS ESTÁTICOS (public/)
// =============================================================================
// Exponemos la carpeta 'public' en la raíz para que las imágenes subidas
// a /public/img/... puedan accederse directamente como:
// http://localhost:8080/img/users/... y http://localhost:8080/img/pets/...
app.use(express.static(path.join(__dirname, '../public')));

// =============================================================================
// RE-04 & RE-05: ENRUTADORES DE RECURSOS
// =============================================================================
app.use('/api/users', usersRouter);
app.use('/api/pets', petsRouter);

// Endpoint de verificación de salud del servicio (Healthcheck)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'API REST Users & Pets'
  });
});

// =============================================================================
// MANEJO GLOBAL DE ERRORES (Multer, formato, etc.)
// =============================================================================
app.use((err, req, res, next) => {
  // Manejo de errores específicos lanzados por Multer (tamaño máximo, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'El archivo excede el tamaño máximo permitido de 5 MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Campo de archivo inesperado o se superó el límite de archivos permitidos.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `Error de carga en Multer: ${err.message}`
    });
  }

  // Manejo de errores personalizados con código de estado
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Error no controlado (500)
  console.error('[UnhandledError]', err);
  return res.status(500).json({
    status: 'error',
    message: 'Error interno no controlado en el servidor.',
    error: err.message
  });
});

// Manejador para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// =============================================================================
// INICIALIZACIÓN DEL SERVIDOR
// =============================================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
    console.log(`📁 Directorio estático: ${path.join(__dirname, '../public')}`);
    console.log(`👤 Rutas de Usuarios:  http://localhost:${PORT}/api/users`);
    console.log(`🐾 Rutas de Mascotas:  http://localhost:${PORT}/api/pets`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
