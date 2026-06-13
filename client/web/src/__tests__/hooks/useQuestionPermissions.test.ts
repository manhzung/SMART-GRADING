import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuestionPermissions } from '../../hooks/useQuestionPermissions';
import { useAuthStore } from '../../presentation/store/authStore';

// Helper to set user in auth store
const setupAuth = (user: any) => {
  useAuthStore.setState({ user });
};

describe('useQuestionPermissions', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('no user should have no view or create permissions', () => {
    setupAuth(null);
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(false);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAnswers).toBe(false);
    expect(result.current.canApprove).toBe(false);
    expect(result.current.canViewPending).toBe(false);
  });

  it('student should have view but not create permissions', () => {
    setupAuth({ id: 's1', role: 'student' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAnswers).toBe(false);
    expect(result.current.canApprove).toBe(false);
    expect(result.current.canViewPending).toBe(false);
  });

  it('teacher should have create and approve permissions', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canViewAnswers).toBe(true);
    expect(result.current.canApprove).toBe(true);
    expect(result.current.canViewPending).toBe(true);
  });

  it('teacher should be able to edit their own question', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't1' } as any;
    expect(result.current.canEdit(q)).toBe(true);
  });

  it('teacher should NOT edit question from other teacher', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't2' } as any;
    expect(result.current.canEdit(q)).toBe(false);
  });

  it('teacher should be able to delete their own question', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't1' } as any;
    expect(result.current.canDelete(q)).toBe(true);
  });

  it('teacher should NOT delete question from other teacher', () => {
    setupAuth({ id: 't1', role: 'teacher' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't2' } as any;
    expect(result.current.canDelete(q)).toBe(false);
  });

  it('admin should have all permissions', () => {
    setupAuth({ id: 'a1', role: 'admin' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(true);
    expect(result.current.canViewAnswers).toBe(true);
    expect(result.current.canApprove).toBe(true);
    expect(result.current.canViewPending).toBe(true);
  });

  it('admin should be able to edit any question', () => {
    setupAuth({ id: 'a1', role: 'admin' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't2' } as any;
    expect(result.current.canEdit(q)).toBe(true);
  });

  it('admin should be able to delete any question', () => {
    setupAuth({ id: 'a1', role: 'admin' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 't2' } as any;
    expect(result.current.canDelete(q)).toBe(true);
  });

  it('student should NOT be able to edit or delete any question', () => {
    setupAuth({ id: 's1', role: 'student' });
    const { result } = renderHook(() => useQuestionPermissions());
    const q = { _id: 'q1', id: 'q1', createdBy: 's1' } as any;
    expect(result.current.canEdit(q)).toBe(false);
    expect(result.current.canDelete(q)).toBe(false);
  });

  it('parent should have minimal permissions', () => {
    setupAuth({ id: 'p1', role: 'parent' });
    const { result } = renderHook(() => useQuestionPermissions());
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAnswers).toBe(false);
    expect(result.current.canApprove).toBe(false);
  });
});
