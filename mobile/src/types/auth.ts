export type UserRole = 'SUPER_ADMIN' | 'ARQUITECTO' | 'COLABORADOR';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  username?: string;
  role: UserRole;
  subscriptionPlan: 'COMMUNITY' | 'PRO_ARCHITECT' | 'ENTERPRISE' | string;
  avatarUrl?: string;
  architectId?: string;
}

export interface LoginResponseData {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  username: string;
  role: UserRole;
  subscriptionPlan: string;
  avatarUrl?: string;
  architectId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}
