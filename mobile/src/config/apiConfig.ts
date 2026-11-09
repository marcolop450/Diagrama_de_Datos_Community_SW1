import { safeStorage } from '../services/storage';

/**
 * Configuración dinámica de endpoints REST y WebSockets para el Cliente Móvil.
 * Detecta la IP LAN de la máquina de desarrollo para pruebas físicas en Expo Go.
 */
const DEFAULT_HOST = 'marcolop-sw1-case.duckdns.org';
const STORAGE_KEY_HOST = 'case_mobile_backend_host';
const STORAGE_KEY_SECURE = 'case_mobile_backend_secure';

class ApiConfigManager {
  private currentHost: string = DEFAULT_HOST;
  private isSecure: boolean = true;

  async init(): Promise<string> {
    try {
      const saved = await safeStorage.getItem(STORAGE_KEY_HOST);
      const savedSecure = await safeStorage.getItem(STORAGE_KEY_SECURE);
      if (saved && saved.trim()) {
        this.currentHost = saved.trim();
        this.isSecure = savedSecure === 'true' || this.currentHost.includes('duckdns.org') || this.currentHost.includes(':443');
      } else {
        this.currentHost = DEFAULT_HOST;
        this.isSecure = true;
      }
    } catch {
      this.currentHost = DEFAULT_HOST;
      this.isSecure = true;
    }
    return this.currentHost;
  }

  getHost(): string {
    return this.currentHost;
  }

  isSslEnabled(): boolean {
    return this.isSecure;
  }

  async setHost(newHost: string): Promise<void> {
    const trimmed = newHost.trim();
    this.isSecure = trimmed.startsWith('https://') || trimmed.includes('duckdns.org') || trimmed.includes(':443');
    const clean = trimmed.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    this.currentHost = clean || DEFAULT_HOST;
    try {
      await safeStorage.setItem(STORAGE_KEY_HOST, this.currentHost);
      await safeStorage.setItem(STORAGE_KEY_SECURE, this.isSecure ? 'true' : 'false');
    } catch {}
  }

  getRestBaseUrl(): string {
    const proto = this.isSecure ? 'https' : 'http';
    return `${proto}://${this.currentHost}/api`;
  }

  getWsUrl(): string {
    const proto = this.isSecure ? 'wss' : 'ws';
    return `${proto}://${this.currentHost}/ws-case`;
  }
}

export const apiConfig = new ApiConfigManager();
