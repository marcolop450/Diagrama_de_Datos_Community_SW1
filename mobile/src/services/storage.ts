import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Adaptador de almacenamiento defensivo para el Cliente Móvil.
 * Garantiza persistencia con AsyncStorage y fallback automático en memoria
 * para prevenir errores de 'Native module is null' en cualquier entorno.
 */
class DefensiveStorageService {
  private memoryFallback: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const val = await AsyncStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`[DefensiveStorage] Error leyendo '${key}' de AsyncStorage, usando memoria:`, e);
    }
    return this.memoryFallback.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryFallback.set(key, value);
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[DefensiveStorage] Error guardando '${key}' en AsyncStorage, conservado en memoria:`, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryFallback.delete(key);
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[DefensiveStorage] Error eliminando '${key}' de AsyncStorage:`, e);
    }
  }
}

export const safeStorage = new DefensiveStorageService();
