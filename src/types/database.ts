export type MoodType = 'happy' | 'sad' | 'neutral';
export type PriorityType = 'normal' | 'important' | 'urgent';
export type UserRole = 'admin' | 'teacher' | 'parent';

export interface Kres {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  adminIds: string[];
}

export interface Sinif {
  id: string;
  kresId: string;
  name: string;
  ageGroup: string;
  teacherIds: string[];
  createdAt: number;
}

export interface Cocuk {
  id: string;
  kresId: string;
  sinifId: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  parentIds: string[];
  photoURL?: string;
  createdAt: number;
}

export interface Rapor {
  id: string;
  cocukId: string;
  sinifId: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  mood: MoodType;
  yemek: { breakfast: boolean; lunch: boolean; snack: boolean };
  uyku: { duration: number; note: string };
  tuvalet: { count: number; note: string };
  photos: string[];
  note: string;
  createdAt: number;
}

export interface Duyuru {
  id: string;
  kresId: string;
  sinifId?: string;
  title: string;
  message: string;
  priority: PriorityType;
  sentBy: string;
  targetRole: 'all' | 'parents' | 'teachers';
  createdAt: number;
  expiresAt?: number;
}
