/**
 * =============================================================================
 * UTILIDAD DE CRIPTOGRAFÍA (src/utils/crypto.js)
 * =============================================================================
 * Principio SOLID aplicado:
 * - Single Responsibility Principle (SRP): Este módulo tiene una única
 *   responsabilidad: gestionar el cifrado, generación de sal (salt) y
 *   verificación segura de contraseñas utilizando el módulo nativo 'crypto'.
 * =============================================================================
 */

const crypto = require('crypto');

/**
 * Genera un hash seguro para una contraseña en texto plano utilizando
 * un salt aleatorio y el algoritmo HMAC-SHA256.
 *
 * @param {string} password - Contraseña en texto plano a hashear.
 * @returns {string} - Cadena con formato "salt:hash" lista para almacenar.
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña debe ser una cadena de texto válida.');
  }

  // Generamos un salt criptográficamente seguro de 16 bytes (32 caracteres hexadecimales)
  const salt = crypto.randomBytes(16).toString('hex');

  // Derivamos el hash utilizando HMAC-SHA256 con el salt como clave
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');

  // Almacenamos el salt junto con el hash para permitir futuras verificaciones
  return `${salt}:${hash}`;
}

/**
 * Compara una contraseña en texto plano con un hash almacenado (formato "salt:hash").
 *
 * @param {string} password - Contraseña en texto plano ingresada.
 * @param {string} storedHashWithSalt - Hash almacenado ("salt:hash").
 * @returns {boolean} - true si coincide, false si no coincide.
 */
function comparePassword(password, storedHashWithSalt) {
  if (!password || !storedHashWithSalt) return false;

  const parts = storedHashWithSalt.split(':');
  if (parts.length !== 2) return false;

  const [salt, originalHash] = parts;

  // Calculamos el hash de la contraseña ingresada usando el mismo salt
  const computedHash = crypto.createHmac('sha256', salt).update(password).digest('hex');

  // Comparación segura en tiempo constante contra ataques de temporización (timing attacks)
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(originalHash));
}

module.exports = {
  hashPassword,
  comparePassword
};
