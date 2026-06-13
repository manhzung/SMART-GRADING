export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface School {
  _id: string;
  name: string;
  address?: string;
  logoUrl?: string;
  createdAt: string;
  subjectIds: string[];
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  description?: string;
  gradeLevel: number;
}

export interface Class {
  _id: string;
  name: string;
  code: string;
  teacherId?: string;
  schoolId?: string;
  subjectId?: string;
  academicYear?: string;
  studentIds: string[];
}
