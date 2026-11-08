import { safeStorage } from '../services/storage';

/**
 * Configuración dinámica de endpoints REST y WebSockets para el Cliente Móvil.
 * Detecta la IP LAN de la máquina de desarrollo para pruebas físicas en Expo Go.
 */
const DEFAULT_HOST = '192.168.1.10:8080';
const STORAGE_KEY_HOST = 'case_mobile_backend_host';

class ApiConfigManager {
  private currentHost: string = DEFAULT_HOST;

  async init(): Promise<string> {
    try {
      const saved = await safeStorage.getItem(STORAGE_KEY_HOST);
      if (saved && saved.trim()) {
        this.currentHost = saved.trim();
      }
    } catch {
      this.currentHost = DEFAULT_HOST;
    }
    return this.currentHost;
  }

  getHost(): string {
    return this.currentHost;
  }

  async setHost(newHost: string): Promise<void> {
    const clean = newHost.trim().replace(/^https?:\/\//, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    this.currentHost = clean || DEFAULT_HOST;
    try {
      await safeStorage.setItem(STORAGE_KEY_HOST, this.currentHost);
    } catch {}
  }

  getRestBaseUrl(): string {
    return `http://${this.currentHost}/api`;
  }

  getWsUrl(): string {
    return `ws://${this.currentHost}/ws-case`;
  }
}

export const apiConfig = new ApiConfigManager();
