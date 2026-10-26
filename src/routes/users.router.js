/**
 * =============================================================================
 * ENRUTADOR DE USUARIOS (src/routes/users.router.js)
 * =============================================================================
 * Principios SOLID aplicados:
 * - Single Responsibility Principle (SRP): Este módulo gestiona exclusivamente
 *   las rutas y lógica HTTP correspondiente al recurso 'Usuarios' (/api/users).
 * - Dependency Inversion Principle (DIP): Delega la persistencia al
 *   'JsonFileManager', la criptografía a 'crypto.js' y la gestión de archivos
 *   al middleware de Multer.
 * =============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const router = express.Router();

const JsonFileManager = require('../utils/fileManager');
const { hashPassword } = require('../utils/crypto');
const { uploadUserAvatar } = require('../middlewares/multer.middleware');

// Instancia de persistencia para el archivo users.json
const usersManager = new JsonFileManager(path.join(__dirname, '../data/users.json'));

/**
 * Función auxiliar para eliminar el campo password de la respuesta (RE-03).
 * @param {object} user - Objeto usuario con o sin password.
 * @returns {object} Usuario sin el campo password.
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Función auxiliar para eliminar un archivo de imagen en caso de error o reemplazo.
 * @param {string} relativeOrAbsoluteUri - Ruta como '/img/users/avatar-xxx.png'.
 */
const safeDeleteFile = async (relativeUri) => {
  try {
    if (!relativeUri || relativeUri.includes('default')) return;
    const filename = path.basename(relativeUri);
    const fullPath = path.join(__dirname, '../../public/img/users', filename);
    await fs.unlink(fullPath);
  } catch (err) {
    // Si no existe o no se puede borrar, no bloqueamos la operación
    console.warn(`[UsersRouter] No se pudo eliminar el archivo ${relativeUri}:`, err.message);
  }
};

// =============================================================================
// RE-04: RUTAS DEL RECURSO USUARIOS (/api/users)
// =============================================================================

/**
 * GET /api/users
 * Devuelve la lista completa de usuarios registrados, omitiendo sus contraseñas.
 */
router.get('/', async (req, res) => {
  try {
    const users = await usersManager.readAll();
    const sanitizedUsers = users.map(sanitizeUser);
    return res.status(200).json({
      status: 'success',
      total: sanitizedUsers.length,
      data: sanitizedUsers
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al consultar la lista de usuarios.',
      error: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * Retorna un único usuario por su ID (sin password).
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usersManager.findById(id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: `Usuario con ID ${id} no encontrado.`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al consultar el usuario.',
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * Registra un nuevo usuario con avatar opcional/requerido en multipart/form-data.
 * Encripta la contraseña con crypto y persiste en users.json.
 */
router.post('/', uploadUserAvatar, async (req, res) => {
  try {
    const { firstname, lastname, username, password } = req.body;

    // Validación de campos obligatorios
    if (!firstname || !lastname || !username || !password) {
      // Si subieron un archivo pero la validación falló, limpiamos el archivo huérfano
      if (req.file) {
        await safeDeleteFile(`/img/users/${req.file.filename}`);
      }
      return res.status(400).json({
        status: 'error',
        message: 'Todos los campos son obligatorios: firstname, lastname, username, password.'
      });
    }

    // Verificar si el username ya está en uso
    const users = await usersManager.readAll();
    const existingUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      if (req.file) {
        await safeDeleteFile(`/img/users/${req.file.filename}`);
      }
      return res.status(400).json({
        status: 'error',
        message: `El nombre de usuario '${username}' ya está registrado.`
      });
    }

    // Hasheo seguro de la contraseña con salt mediante el módulo nativo crypto (RE-03)
    const hashedPassword = hashPassword(password);

    // Definición de la URL estática del avatar
    // Si no se adjuntó archivo, se asigna una imagen por defecto o genérica
    const avatarUrl = req.file
      ? `/img/users/${req.file.filename}`
      : '/img/users/default-avatar.png';

    // Construcción del objeto de usuario según el esquema 3.1
    const newUser = await usersManager.create({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      username: username.trim(),
      password: hashedPassword,
      avatar: avatarUrl
    });

    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente.',
      data: sanitizeUser(newUser)
    });
  } catch (error) {
    if (req.file) {
      await safeDeleteFile(`/img/users/${req.file.filename}`);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al registrar el usuario.',
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Actualiza información general, contraseña (re-encriptando) o avatar (reemplazando anterior).
 */
router.put('/:id', uploadUserAvatar, async (req, res) => {
  try {
    const { id } = req.params;
    const existingUser = await usersManager.findById(id);

    if (!existingUser) {
      if (req.file) {
        await safeDeleteFile(`/img/users/${req.file.filename}`);
      }
      return res.status(404).json({
        status: 'error',
        message: `Usuario con ID ${id} no encontrado.`
      });
    }

    const { firstname, lastname, username, password } = req.body;
    const updates = {};

    if (firstname) updates.firstname = firstname.trim();
    if (lastname) updates.lastname = lastname.trim();

    // Si cambia username, validar que no colisione con otro usuario
    if (username && username.trim().toLowerCase() !== existingUser.username.toLowerCase()) {
      const users = await usersManager.readAll();
      const duplicate = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== existingUser.id);
      if (duplicate) {
        if (req.file) {
          await safeDeleteFile(`/img/users/${req.file.filename}`);
        }
        return res.status(400).json({
          status: 'error',
          message: `El nombre de usuario '${username}' ya está en uso.`
        });
      }
      updates.username = username.trim();
    }

    // Si se envía una nueva contraseña, se procesa con crypto (RE-03)
    if (password) {
      updates.password = hashPassword(password);
    }

    // Si se subió un nuevo avatar, se actualiza la ruta y se elimina el archivo anterior si aplica
    if (req.file) {
      updates.avatar = `/img/users/${req.file.filename}`;
      if (existingUser.avatar && existingUser.avatar !== updates.avatar) {
        await safeDeleteFile(existingUser.avatar);
      }
    }

    const updatedUser = await usersManager.update(id, updates);

    return res.status(200).json({
      status: 'success',
      message: 'Usuario actualizado exitosamente.',
      data: sanitizeUser(updatedUser)
    });
  } catch (error) {
    if (req.file) {
      await safeDeleteFile(`/img/users/${req.file.filename}`);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Error al actualizar el usuario.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Elimina un usuario por su ID y opcionalmente su avatar asociado.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await usersManager.delete(id);

    if (!deletedUser) {
      return res.status(404).json({
        status: 'error',
        message: `Usuario con ID ${id} no encontrado.`
      });
    }

    // Limpieza del archivo de imagen físico asociado
    if (deletedUser.avatar) {
      await safeDeleteFile(deletedUser.avatar);
    }

    return res.status(200).json({
      status: 'success',
      message: `Usuario con ID ${id} eliminado correctamente.`,
      data: sanitizeUser(deletedUser)
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al eliminar el usuario.',
      error: error.message
    });
  }
});

module.exports = router;
