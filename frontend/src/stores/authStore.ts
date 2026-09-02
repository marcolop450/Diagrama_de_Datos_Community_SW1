import { create } from 'zustand';
import { api } from '../services/api';

export interface UserPreferences {
  theme: 'dark' | 'light';
  grid: boolean;
  snapToGrid: boolean;
  autoSaveInterval: number;
  defaultZoom: number;
  [key: string]: any;
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  username?: string;
  role: 'SUPER_ADMIN' | 'ARQUITECTO' | 'COLABORADOR' | string;
  subscriptionPlan: 'COMMUNITY' | 'PRO_ARCHITECT' | 'ENTERPRISE' | string;
  subscriptionExpiresAt?: string | null;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

interface AuthState {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: 'dark' | 'light';
  initialize: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { fullName: string; email: string; username?: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserProfile: (updated: Partial<UserSession>) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const TOKEN_KEY = 'sw1_volatile_session_jwt';
const USER_KEY = 'sw1_volatile_user';
const THEME_KEY = 'sw1_theme_preference';

const applyThemeToDom = (theme: 'dark' | 'light') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  theme: 'dark',

  initialize: () => {
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      const storedUser = sessionStorage.getItem(USER_KEY);
      const storedTheme = (localStorage.getItem(THEME_KEY) || 'dark') as 'dark' | 'light';

      applyThemeToDom(storedTheme);

      if (storedToken && storedUser) {
        const parsedUser: UserSession = JSON.parse(storedUser);
        const userTheme = parsedUser.preferences?.theme || storedTheme;
        applyThemeToDom(userTheme);

        set({
          token: storedToken,
          user: parsedUser,
          theme: userTheme,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ token: null, user: null, theme: storedTheme, isAuthenticated: false, isLoading: false });
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
        const { token, userId, fullName, username, role, subscriptionPlan, subscriptionExpiresAt, avatarUrl, preferences } = response.data;

        const userTheme = (preferences?.theme as 'dark' | 'light') || 'dark';
        applyThemeToDom(userTheme);
        localStorage.setItem(THEME_KEY, userTheme);

        const userSession: UserSession = {
          userId,
          email: response.data.email || email,
          fullName,
          username,
          role,
          subscriptionPlan,
          subscriptionExpiresAt,
          avatarUrl,
          preferences: preferences || {
            theme: 'dark',
            grid: true,
            snapToGrid: true,
            autoSaveInterval: 30,
            defaultZoom: 1.0,
          },
        };

        // Store in sessionStorage (volatile)
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userSession));

        set({
          token,
          user: userSession,
          theme: userTheme,
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

  register: async (data: { fullName: string; email: string; username?: string; password: string }) => {
    try {
      set({ isLoading: true });
      const response = await api.register(data);

      if (response.success && response.data) {
        const { token, userId, fullName, username, role, subscriptionPlan, subscriptionExpiresAt, avatarUrl, preferences } = response.data;

        const userTheme = (preferences?.theme as 'dark' | 'light') || 'dark';
        applyThemeToDom(userTheme);
        localStorage.setItem(THEME_KEY, userTheme);

        const userSession: UserSession = {
          userId,
          email: response.data.email || data.email,
          fullName,
          username,
          role,
          subscriptionPlan,
          subscriptionExpiresAt,
          avatarUrl,
          preferences: preferences || {
            theme: 'dark',
            grid: true,
            snapToGrid: true,
            autoSaveInterval: 30,
            defaultZoom: 1.0,
          },
        };

        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userSession));

        set({
          token,
          user: userSession,
          theme: userTheme,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, message: response.message || 'Error al registrar usuario' };
      }
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.message || 'Error al registrar usuario en el servidor';
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
  },

  setTheme: (theme: 'dark' | 'light') => {
    applyThemeToDom(theme);
    localStorage.setItem(THEME_KEY, theme);
    const currentUser = get().user;
    if (currentUser) {
      const currentPrefs = currentUser.preferences || {
        theme: 'dark',
        grid: true,
        snapToGrid: true,
        autoSaveInterval: 30,
        defaultZoom: 1.0,
      };
      const newPrefs = { ...currentPrefs, theme };
      const updatedUser = { ...currentUser, preferences: newPrefs };
      sessionStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      set({ theme, user: updatedUser });
    } else {
      set({ theme });
    }
  }
}));
