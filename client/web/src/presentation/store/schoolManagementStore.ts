import { create } from 'zustand';
import schoolManagementService from '../../services/schoolManagement.service';
import type { School } from '../../types';

interface PendingSchool {
  id: string;
  _id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
  };
  createdAt: string;
}

interface SchoolAdmin {
  id: string;
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface SchoolManagementState {
  // State
  schools: School[];
  pendingSchools: PendingSchool[];
  schoolAdmins: SchoolAdmin[];
  selectedSchool: School | null;
  isLoading: boolean;
  error: string | null;
  totalPending: number;
  totalSchools: number;

  // Actions
  fetchSchools: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => Promise<void>;
  fetchPendingSchools: (params?: {
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchSchoolAdmins: (schoolId: string) => Promise<void>;
  createSchool: (data: Partial<School>) => Promise<void>;
  updateSchool: (schoolId: string, data: Partial<School>) => Promise<void>;
  deleteSchool: (schoolId: string) => Promise<void>;
  approveSchool: (schoolId: string) => Promise<void>;
  rejectSchool: (schoolId: string, reason?: string) => Promise<void>;
  addSchoolAdmin: (schoolId: string, userId: string) => Promise<void>;
  removeSchoolAdmin: (schoolId: string, userId: string) => Promise<void>;
  selectSchool: (school: School | null) => void;
  clearError: () => void;
}

export const useSchoolManagementStore = create<SchoolManagementState>((set, get) => ({
  schools: [],
  pendingSchools: [],
  schoolAdmins: [],
  selectedSchool: null,
  isLoading: false,
  error: null,
  totalPending: 0,
  totalSchools: 0,

  fetchSchools: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await schoolManagementService.getAllSchools(params);
      const results = (data.results || []).map((s: any) => ({ ...s, _id: s._id || s.id }));
      set({ schools: results, totalSchools: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch schools', isLoading: false });
    }
  },

  fetchPendingSchools: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await schoolManagementService.getPendingSchools(params);
      const results = (data.results || []).map((s: any) => ({ ...s, _id: s._id || s.id }));
      set({ pendingSchools: results, totalPending: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch pending schools', isLoading: false });
    }
  },

  fetchSchoolAdmins: async (schoolId: string) => {
    try {
      const data = await schoolManagementService.getSchoolAdmins(schoolId);
      set({ schoolAdmins: data.results });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch school admins' });
    }
  },

  createSchool: async (data: Partial<School>) => {
    try {
      await schoolManagementService.createSchool(data);
      await get().fetchSchools();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create school' });
      throw err;
    }
  },

  updateSchool: async (schoolId: string, data: Partial<School>) => {
    try {
      await schoolManagementService.updateSchool(schoolId, data);
      await get().fetchSchools();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update school' });
      throw err;
    }
  },

  deleteSchool: async (schoolId: string) => {
    try {
      await schoolManagementService.deleteSchool(schoolId);
      set({ schools: get().schools.filter((s) => s._id !== schoolId) });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete school' });
      throw err;
    }
  },

  approveSchool: async (schoolId: string) => {
    try {
      await schoolManagementService.approveSchool(schoolId);
      set({
        pendingSchools: get().pendingSchools.filter(
          (s) => s.id !== schoolId && s._id !== schoolId
        ),
        totalPending: get().totalPending - 1,
      });
      await get().fetchSchools();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve school' });
      throw err;
    }
  },

  rejectSchool: async (schoolId: string, reason?: string) => {
    try {
      await schoolManagementService.rejectSchool(schoolId, reason);
      set({
        pendingSchools: get().pendingSchools.filter(
          (s) => s.id !== schoolId && s._id !== schoolId
        ),
        totalPending: get().totalPending - 1,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject school' });
      throw err;
    }
  },

  addSchoolAdmin: async (schoolId: string, userId: string) => {
    try {
      await schoolManagementService.addSchoolAdmin(schoolId, userId);
      await get().fetchSchoolAdmins(schoolId);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to add school admin' });
      throw err;
    }
  },

  removeSchoolAdmin: async (schoolId: string, userId: string) => {
    try {
      await schoolManagementService.removeSchoolAdmin(schoolId, userId);
      set({
        schoolAdmins: get().schoolAdmins.filter(
          (a) => a.id !== userId && a._id !== userId
        ),
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to remove school admin' });
      throw err;
    }
  },

  selectSchool: (school: School | null) => set({ selectedSchool: school }),

  clearError: () => set({ error: null }),
}));
