/**
 * =============================================================================
 * ENRUTADOR DE MASCOTAS (src/routes/pets.router.js)
 * =============================================================================
 * Principios SOLID aplicados:
 * - Single Responsibility Principle (SRP): Este módulo gestiona exclusivamente
 *   las operaciones y lógica HTTP del recurso 'Mascotas' (/api/pets).
 * - Dependency Inversion Principle (DIP): Delega la persistencia en archivos
 *   a la abstracción 'JsonFileManager' y la gestión de archivos al middleware
 *   de Multer.
 * =============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const router = express.Router();

const JsonFileManager = require('../utils/fileManager');
const { uploadPetImages } = require('../middlewares/multer.middleware');

// Instancia de persistencia para pets.json
const petsManager = new JsonFileManager(path.join(__dirname, '../data/pets.json'));

/**
 * Función auxiliar para eliminar archivos físicos de imágenes de mascotas.
 * @param {Array<string>} imageUris - Lista de rutas relativas como ['/img/pets/pet-xxx.jpg'].
 */
const safeDeleteFiles = async (imageUris) => {
  if (!Array.isArray(imageUris)) return;
  for (const uri of imageUris) {
    try {
      if (!uri || uri.includes('default')) continue;
      const filename = path.basename(uri);
      const fullPath = path.join(__dirname, '../../public/img/pets', filename);
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn(`[PetsRouter] No se pudo eliminar el archivo ${uri}:`, err.message);
    }
  }
};

// =============================================================================
// RE-05: RUTAS DEL RECURSO MASCOTAS (/api/pets)
// =============================================================================

/**
 * GET /api/pets
 * Devuelve todas las mascotas del archivo pets.json.
 */
router.get('/', async (req, res) => {
  try {
    const pets = await petsManager.readAll();
    return res.status(200).json({
      status: 'success',
      total: pets.length,
      data: pets
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al consultar la lista de mascotas.',
      error: error.message
    });
  }
});

/**
 * GET /api/pets/:id
 * Retorna la mascota correspondiente al ID solicitado.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pet = await petsManager.findById(id);

    if (!pet) {
      return res.status(404).json({
        status: 'error',
        message: `Mascota con ID ${id} no encontrada.`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: pet
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al consultar la mascota.',
      error: error.message
    });
  }
});

/**
 * POST /api/pets
 * Procesa multipart/form-data con carga múltiple de imágenes (upload.array('img', 5)).
 * Almacena los archivos en public/img/pets y guarda en 'img' un array con las rutas relativas.
 */
router.post('/', uploadPetImages, async (req, res) => {
  // En caso de fallo, capturamos los nombres de archivos subidos para rollback
  const uploadedFiles = req.files || [];
  const uploadedUris = uploadedFiles.map(file => `/img/pets/${file.filename}`);

  try {
    const { especie, color, edad, sexo } = req.body;

    // Validación de campos obligatorios
    if (!especie || !color || edad === undefined || !sexo) {
      // Limpieza de archivos recién subidos si la validación falla
      await safeDeleteFiles(uploadedUris);
      return res.status(400).json({
        status: 'error',
        message: 'Todos los campos son obligatorios: especie, color, edad, sexo.'
      });
    }

    const numericAge = Number(edad);
    if (isNaN(numericAge) || numericAge < 0) {
      await safeDeleteFiles(uploadedUris);
      return res.status(400).json({
        status: 'error',
        message: 'El campo "edad" debe ser un número entero o decimal positivo válido.'
      });
    }

    // Creación del nuevo registro de acuerdo con el esquema 3.2
    const newPet = await petsManager.create({
      especie: String(especie).trim().toLowerCase(),
      color: String(color).trim(),
      edad: numericAge,
      sexo: String(sexo).trim().toLowerCase(),
      img: uploadedUris // Array con las rutas accesibles mediante express.static
    });

    return res.status(201).json({
      status: 'success',
      message: 'Mascota registrada exitosamente.',
      data: newPet
    });
  } catch (error) {
    await safeDeleteFiles(uploadedUris);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al registrar la mascota.',
      error: error.message
    });
  }
});

/**
 * PUT /api/pets/:id
 * Actualiza datos o agrega/modifica imágenes de la mascota.
 */
router.put('/:id', uploadPetImages, async (req, res) => {
  const uploadedFiles = req.files || [];
  const uploadedUris = uploadedFiles.map(file => `/img/pets/${file.filename}`);

  try {
    const { id } = req.params;
    const existingPet = await petsManager.findById(id);

    if (!existingPet) {
      await safeDeleteFiles(uploadedUris);
      return res.status(404).json({
        status: 'error',
        message: `Mascota con ID ${id} no encontrada.`
      });
    }

    const { especie, color, edad, sexo, replaceImages } = req.body;
    const updates = {};

    if (especie) updates.especie = String(especie).trim().toLowerCase();
    if (color) updates.color = String(color).trim();
    if (sexo) updates.sexo = String(sexo).trim().toLowerCase();
    if (edad !== undefined) {
      const numericAge = Number(edad);
      if (isNaN(numericAge) || numericAge < 0) {
        await safeDeleteFiles(uploadedUris);
        return res.status(400).json({
          status: 'error',
          message: 'El campo "edad" debe ser un número válido.'
        });
      }
      updates.edad = numericAge;
    }

    // Manejo de imágenes nuevas si se adjuntaron
    if (uploadedUris.length > 0) {
      // Si el cliente especifica replaceImages='true', se reemplaza la lista completa
      // y se borran las imágenes antiguas; de lo contrario, se concatenan
      if (replaceImages === 'true' || replaceImages === true) {
        if (existingPet.img && existingPet.img.length > 0) {
          await safeDeleteFiles(existingPet.img);
        }
        updates.img = uploadedUris;
      } else {
        const currentImages = Array.isArray(existingPet.img) ? existingPet.img : [];
        updates.img = [...currentImages, ...uploadedUris];
      }
    }

    const updatedPet = await petsManager.update(id, updates);

    return res.status(200).json({
      status: 'success',
      message: 'Mascota actualizada exitosamente.',
      data: updatedPet
    });
  } catch (error) {
    await safeDeleteFiles(uploadedUris);
    return res.status(500).json({
      status: 'error',
      message: 'Error al actualizar la mascota.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/pets/:id
 * Elimina la mascota del archivo pets.json y sus imágenes físicas asociadas.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPet = await petsManager.delete(id);

    if (!deletedPet) {
      return res.status(404).json({
        status: 'error',
        message: `Mascota con ID ${id} no encontrada.`
      });
    }

    // Eliminación de imágenes físicas asociadas en public/img/pets/
    if (deletedPet.img && Array.isArray(deletedPet.img)) {
      await safeDeleteFiles(deletedPet.img);
    }

    return res.status(200).json({
      status: 'success',
      message: `Mascota con ID ${id} eliminada exitosamente.`,
      data: deletedPet
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al eliminar la mascota.',
      error: error.message
    });
  }
});

module.exports = router;
