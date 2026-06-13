import { useAuthStore } from '../presentation/store/authStore';
import type { Question } from '../presentation/store/questionStore';

export interface QuestionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: (question: Question) => boolean;
  canDelete: (question: Question) => boolean;
  canApprove: boolean;
  canViewAnswers: boolean;
  canViewPending: boolean;
}

export function useQuestionPermissions(): QuestionPermissions {
  const user = useAuthStore((s) => s.user);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const canManage = isAdmin || isTeacher;

  return {
    canView: !!user,
    canCreate: canManage,
    canEdit: (question: Question) => {
      if (!user || !question) return false;
      if (isAdmin) return true;
      if (isTeacher) {
        const creatorId = question.createdBy;
        return creatorId === user.id || creatorId === (user as any)._id;
      }
      return false;
    },
    canDelete: (question: Question) => {
      if (!user || !question) return false;
      if (isAdmin) return true;
      if (isTeacher) {
        const creatorId = question.createdBy;
        return creatorId === user.id || creatorId === (user as any)._id;
      }
      return false;
    },
    canApprove: canManage,
    canViewAnswers: canManage,
    canViewPending: canManage,
  };
}
