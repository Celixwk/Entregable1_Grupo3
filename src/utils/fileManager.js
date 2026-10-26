/**
 * =============================================================================
 * GESTOR DE PERSISTENCIA EN ARCHIVOS JSON (src/utils/fileManager.js)
 * =============================================================================
 * Principios SOLID aplicados:
 * - Single Responsibility Principle (SRP): Este módulo es el único responsable
 *   de interactuar con el sistema de archivos de forma asíncrona y no bloqueante
 *   usando 'fs.promises'.
 * - Open/Closed Principle (OCP): Es genérico y extensible; permite operar
 *   con cualquier archivo JSON (users.json, pets.json u otros futuros)
 *   sin modificar su implementación interna.
 * - Dependency Inversion Principle (DIP): Los enrutadores y controladores
 *   dependen de estas operaciones de alto nivel y no directamente de los
 *   métodos de bajo nivel de Node.js.
 * =============================================================================
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Clase que encapsula las operaciones CRUD sobre un archivo JSON específico.
 */
class JsonFileManager {
  /**
   * @param {string} filePath - Ruta absoluta o relativa al archivo JSON.
   */
  constructor(filePath) {
    this.filePath = filePath;
  }

  /**
   * Garantiza que el archivo exista; si no existe, lo inicializa con un arreglo vacío [].
   * @private
   */
  async _ensureFileExists() {
    try {
      await fs.access(this.filePath);
    } catch {
      // Aseguramos que el directorio contenedor exista
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      // Escribimos un arreglo vacío formateado
      await fs.writeFile(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  /**
   * Lee todos los registros del archivo JSON de manera no bloqueante.
   * @returns {Promise<Array>} Lista de elementos almacenados.
   */
  async readAll() {
    await this._ensureFileExists();
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (error) {
      console.error(`[FileManager] Error al leer ${this.filePath}:`, error.message);
      throw new Error(`Error de lectura en base de datos local: ${error.message}`);
    }
  }

  /**
   * Sobrescribe el archivo JSON con una nueva lista de datos de manera no bloqueante.
   * @param {Array} data - Arreglo de objetos a persistir.
   * @returns {Promise<void>}
   */
  async writeAll(data) {
    await this._ensureFileExists();
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await fs.writeFile(this.filePath, jsonString, 'utf-8');
    } catch (error) {
      console.error(`[FileManager] Error al escribir en ${this.filePath}:`, error.message);
      throw new Error(`Error de escritura en base de datos local: ${error.message}`);
    }
  }

  /**
   * Busca un registro por su ID numérico.
   * @param {number|string} id - ID del registro.
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const list = await this.readAll();
    const numericId = Number(id);
    return list.find(item => item.id === numericId) || null;
  }

  /**
   * Inserta un nuevo elemento autoincrementando el ID.
   * @param {object} itemData - Datos del nuevo elemento (sin id).
   * @returns {Promise<object>} El elemento insertado con su nuevo ID.
   */
  async create(itemData) {
    const list = await this.readAll();
    const maxId = list.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const newItem = {
      id: maxId + 1,
      ...itemData
    };
    list.push(newItem);
    await this.writeAll(list);
    return newItem;
  }

  /**
   * Actualiza un elemento existente por su ID.
   * @param {number|string} id - ID del elemento a actualizar.
   * @param {object} updatedFields - Campos a modificar.
   * @returns {Promise<object|null>} El elemento actualizado o null si no se encuentra.
   */
  async update(id, updatedFields) {
    const list = await this.readAll();
    const numericId = Number(id);
    const index = list.findIndex(item => item.id === numericId);

    if (index === -1) {
      return null;
    }

    // Mantenemos el ID original inmutable y fusionamos los campos
    const existingItem = list[index];
    const updatedItem = {
      ...existingItem,
      ...updatedFields,
      id: existingItem.id
    };

    list[index] = updatedItem;
    await this.writeAll(list);
    return updatedItem;
  }

  /**
   * Elimina un elemento por su ID.
   * @param {number|string} id - ID del elemento a eliminar.
   * @returns {Promise<object|null>} El elemento eliminado o null si no existía.
   */
  async delete(id) {
    const list = await this.readAll();
    const numericId = Number(id);
    const index = list.findIndex(item => item.id === numericId);

    if (index === -1) {
      return null;
    }

    const [deletedItem] = list.splice(index, 1);
    await this.writeAll(list);
    return deletedItem;
  }
}

module.exports = JsonFileManager;
