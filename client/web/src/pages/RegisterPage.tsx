import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import { apiService } from '../core/api';
import AuthLayout from '../presentation/components/AuthLayout';
import styles from './RegisterPage.module.css';

interface School {
  id: string;
  name: string;
  code: string;
  schoolType: string;
  address?: {
    city?: string;
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clearError = useAuthStore((state) => state.clearError);

  const [schools, setSchools] = useState<School[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schoolId: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await apiService.get<{ results: School[] }>('/schools', { params: { limit: 100 } });
        setSchools(response.results || []);
        if (response.results && response.results.length > 0) {
          setFormData((prev) => ({ ...prev, schoolId: response.results![0].id }));
        }
      } catch {
        console.error('Failed to load schools');
      } finally {
        setIsLoadingSchools(false);
      }
    };
    fetchSchools();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLocalError(null);
    clearError();

    if (!formData.fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setLocalError('Please enter your academic email.');
      return;
    }
    if (!formData.schoolId) {
      setLocalError('Please select a school.');
      return;
    }
    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (!/\d/.test(formData.password) || !/[a-zA-Z]/.test(formData.password)) {
      setLocalError('Password must contain at least one letter and one number.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!formData.agreeTerms) {
      setLocalError('You must agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    try {
      await register(formData.email, formData.password, formData.fullName, formData.schoolId);
      toast.success(
        'Registration successful! Please verify your email and wait for School Admin to approve your account.'
      );

      navigate('/email-verification-pending', { state: { email: formData.email } });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Account registration failed.');
    }
  };

  const getSchoolLabel = (school: School) => {
    const city = school.address?.city ? ` (${school.address.city})` : '';
    return `${school.name}${city}`;
  };

  return (
    <AuthLayout splitLayout={true}>
      <div>
        <h1 className={styles.title}>Join Smart Exam Grading</h1>
        <p className={styles.subtitle}>Create your educator account to get started.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {localError && <div className={styles.errorAlert}>{localError}</div>}
          {useAuthStore.getState().error && (
            <div className={styles.errorAlert}>{useAuthStore.getState().error}</div>
          )}

          <div className={styles.formRow}>
            {/* Full Name */}
            <div className={styles.formGroup}>
              <label htmlFor="fullName" className={styles.label}>Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Dr. Jane Smith"
                className={styles.input}
                required
              />
            </div>

            {/* Academic Email */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Academic Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jane.smith@university.edu"
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* School */}
          <div className={styles.formGroup}>
            <label htmlFor="schoolId" className={styles.label}>School</label>
            <div className={styles.selectWrapper}>
              {isLoadingSchools ? (
                <select className={styles.select} disabled>
                  <option>Loading schools...</option>
                </select>
              ) : schools.length === 0 ? (
                <select className={styles.select} disabled>
                  <option>No schools available</option>
                </select>
              ) : (
                <select
                  id="schoolId"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleChange}
                  className={styles.select}
                  required
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {getSchoolLabel(school)}
                    </option>
                  ))}
                </select>
              )}
              <ChevronsUpDown className={styles.selectIcon} size={16} />
            </div>
          </div>

          <div className={styles.formRow}>
            {/* Password */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className={styles.input}
                required
              />
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="agreeTerms"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className={styles.checkboxInput}
            />
            <label htmlFor="agreeTerms" className={styles.checkboxLabel}>
              I agree to the{' '}
              <a href="#terms" className={styles.checkboxLink}>Terms & Conditions</a>
              {' '}and{' '}
              <a href="#privacy" className={styles.checkboxLink}>Privacy Policy</a>.
            </label>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || isLoadingSchools}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>Log In</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
