/**
 * =============================================================================
 * MIDDLEWARE DE CARGA DE ARCHIVOS CON MULTER (src/middlewares/multer.middleware.js)
 * =============================================================================
 * Principios SOLID aplicados:
 * - Single Responsibility Principle (SRP): Este módulo es el único responsable
 *   de interceptar peticiones multipart/form-data, validar tipos MIME, configurar
 *   el almacenamiento en disco (multer.diskStorage) y renombrar archivos.
 * - Interface Segregation Principle (ISP): Expone middlewares específicos y
 *   acotados ('uploadUserAvatar' y 'uploadPetImages') para que cada enrutador
 *   reciba solo lo que necesita.
 * =============================================================================
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Rutas absolutas a los directorios de almacenamiento en public/img
const USERS_IMG_DIR = path.join(__dirname, '../../public/img/users');
const PETS_IMG_DIR = path.join(__dirname, '../../public/img/pets');

// Garantizamos que las carpetas de destino existan en el sistema de archivos
[USERS_IMG_DIR, PETS_IMG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Filtro de archivos para permitir únicamente imágenes válidas.
 */
const imageFileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    const error = new Error('Formato no permitido. Solo se aceptan imágenes (jpg, jpeg, png, webp, gif).');
    error.statusCode = 400;
    return cb(error, false);
  }
};

/**
 * Configuración de almacenamiento para Avatares de Usuarios (RE-02)
 * Guarda en: public/img/users/
 * Nombre: avatar-{timestamp}-{nombreOriginalSaneado}.ext
 */
const usersStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, USERS_IMG_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 20); // limitar longitud de nombre
    const uniqueFilename = `avatar-${Date.now()}-${sanitizedName || 'file'}${ext}`;
    cb(null, uniqueFilename);
  }
});

/**
 * Configuración de almacenamiento para Imágenes de Mascotas (RE-02)
 * Guarda en: public/img/pets/
 * Nombre: pet-{timestamp}-{nombreOriginalSaneado}.ext
 */
const petsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PETS_IMG_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 20);
    const uniqueFilename = `pet-${Date.now()}-${sanitizedName || 'file'}${ext}`;
    cb(null, uniqueFilename);
  }
});

// Instancias de Multer con límites de tamaño seguros (5 MB por imagen)
const uploadUser = multer({
  storage: usersStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadPet = multer({
  storage: petsStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * Middleware para subir un único avatar (campo 'avatar')
 * RE-04: upload.single('avatar')
 */
const uploadUserAvatar = uploadUser.single('avatar');

/**
 * Middleware para subir hasta 5 imágenes de mascotas (campo 'img')
 * RE-05: upload.array('img', 5)
 */
const uploadPetImages = uploadPet.array('img', 5);

module.exports = {
  uploadUserAvatar,
  uploadPetImages
};
