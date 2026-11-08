import { create } from 'zustand';
import { mobileApi } from '../services/api';
import { UserSession } from '../types/auth';
import { pushNotificationService } from '../services/pushNotificationService';

interface MobileAuthState {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useMobileAuthStore = create<MobileAuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      set({ isLoading: true });
      const { token, user } = await mobileApi.getStoredSession();
      if (token && user) {
        set({ token, user, isAuthenticated: true, isLoading: false });
        // Registrar permisos y token push en segundo plano
        pushNotificationService.registerForPushNotificationsAsync().catch(() => {});
      } else {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await mobileApi.login({ email, password });
      set({
        token: data.token,
        user: {
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          username: data.username,
          role: data.role,
          subscriptionPlan: data.subscriptionPlan,
          avatarUrl: data.avatarUrl,
        },
        isAuthenticated: true,
        isLoading: false,
      });

      // Registrar permisos y token push del dispositivo inmediatamente tras autenticación exitosa
      pushNotificationService.registerForPushNotificationsAsync().catch(() => {});

      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || err.message || 'Error al iniciar sesión',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      const pushToken = await pushNotificationService.getStoredPushToken();
      if (pushToken) {
        await mobileApi.deactivatePushToken(pushToken);
      }
    } catch {}
    await mobileApi.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
