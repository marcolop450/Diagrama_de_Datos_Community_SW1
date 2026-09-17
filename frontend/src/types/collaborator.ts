export interface Collaborator {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  role: 'COLABORADOR';
  isActive: boolean;
  architectId?: string;
  architectName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollaboratorData {
  fullName: string;
  username: string;
  email: string;
  password: string;
}
