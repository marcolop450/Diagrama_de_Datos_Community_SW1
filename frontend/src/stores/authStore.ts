import { create } from 'zustand';
import { api } from '../services/api';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  username?: string;
  role: 'SUPER_ADMIN' | 'ARQUITECTO' | 'COLABORADOR' | string;
  subscriptionPlan: 'COMMUNITY' | 'PRO_ARCHITECT' | 'ENTERPRISE' | string;
  subscriptionExpiresAt?: string | null;
  avatarUrl?: string;
}

interface AuthState {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserProfile: (updated: Partial<UserSession>) => void;
}

const TOKEN_KEY = 'sw1_volatile_session_jwt';
const USER_KEY = 'sw1_volatile_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      const storedUser = sessionStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser: UserSession = JSON.parse(storedUser);
        set({
          token: storedToken,
          user: parsedUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing volatile session:', error);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const response = await api.login({ email, password });

      if (response.success && response.data) {
        const { token, userId, fullName, username, role, subscriptionPlan, subscriptionExpiresAt, avatarUrl } = response.data;

        const userSession: UserSession = {
          userId,
          email: response.data.email || email,
          fullName,
          username,
          role,
          subscriptionPlan,
          subscriptionExpiresAt,
          avatarUrl,
        };

        // Store in sessionStorage: persists on page refresh within same tab, automatically destroyed on tab/window close
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userSession));

        set({
          token,
          user: userSession,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, message: response.message || 'Error al iniciar sesión' };
      }
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.message || 'Credenciales inválidas o error de conexión con el servidor';
      return { success: false, message: msg };
    }
  },

  logout: () => {
    try {
      api.logout().catch(() => {});
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUserProfile: (updated: Partial<UserSession>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const newUser = { ...currentUser, ...updated };
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    set({ user: newUser });
  }
}));
