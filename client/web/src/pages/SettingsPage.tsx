import { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Settings as SettingsIcon,
  Camera,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Calendar,
  Trash2,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../presentation/store/authStore';
import styles from './SettingsPage.module.css';

type TabType = 'profile' | 'security' | 'preferences';

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Auth store
  const user = useAuthStore(s => s.user);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const changePassword = useAuthStore(s => s.changePassword);

  const userRole = user?.role || 'teacher';
  const roleLabel = userRole === 'admin' ? 'SUPER ADMIN' : userRole === 'school-admin' ? 'SCHOOL ADMIN' : userRole.toUpperCase();
  const roleBadgeClass = userRole === 'admin' ? 'roleBadgeAdmin' : userRole === 'school-admin' ? 'roleBadgeSchool' : userRole === 'teacher' ? 'roleBadgeTeacher' : 'roleBadgeStudent';

  // Profile state - initialized from authStore
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [role] = useState(user?.role === 'admin' ? 'Administrator'
    : user?.role === 'teacher' ? 'Teacher'
    : user?.role === 'student' ? 'Student'
    : user?.role === 'parent' ? 'Parent'
    : 'Unknown');
  const [avatarPreview, setAvatarPreview] = useState<string | null>((user as any)?.avatarUrl || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Preferences state
  const [language, setLanguage] = useState('vi');
  const [theme, setTheme] = useState('light');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  
  // Sessions state (mock data)
  const [sessions] = useState<Session[]>([
    { id: '1', device: 'Chrome on Windows', location: 'Hanoi, Vietnam', lastActive: 'Active', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Hanoi, Vietnam', lastActive: '2 hours ago', current: false },
    { id: '3', device: 'Firefox on macOS', location: 'Ho Chi Minh City, Vietnam', lastActive: '3 days ago', current: false },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('user-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setLanguage(prefs.language || 'vi');
        setTheme(prefs.theme || 'light');
        setDateFormat(prefs.dateFormat || 'DD/MM/YYYY');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const prefs = { language, theme, dateFormat };
    localStorage.setItem('user-preferences', JSON.stringify(prefs));
  }, [language, theme, dateFormat]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must not exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: fullName, phone });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error((error as Error).message || 'Update failed');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Confirm password does not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTerminateSession = (_sessionId: string) => {
    toast.success('Logged out session successfully');
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'security' as TabType, label: 'Security', icon: Shield },
    { id: 'preferences' as TabType, label: 'Preferences', icon: SettingsIcon },
  ];

  return (
    <div className={styles.container}>
      {/* Title */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={`roleBadge ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage personal details, security credentials, and system settings</p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Tabs Navigation */}
        <div className={styles.tabsNav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Personal Details</h2>
              <p className={styles.sectionDesc}>Manage your profile information</p>
              
              <div className={styles.profileCard}>
                {/* Avatar */}
                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className={styles.avatarImage} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <User size={40} />
                      </div>
                    )}
                    <label className={styles.avatarUploadBtn}>
                      <Camera size={16} />
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className={styles.avatarInput}
                      />
                    </label>
                  </div>
                  <div className={styles.avatarActions}>
                    <p className={styles.avatarInstructions}>Upload your profile photo. PNG, JPG formats up to 5MB.</p>
                    <button 
                      className={styles.removeAvatarBtn}
                      onClick={() => setAvatarPreview(null)}
                      style={{ display: avatarPreview ? 'flex' : 'none' }}
                    >
                      <X size={14} />
                      <span>Remove photo</span>
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={styles.input}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={styles.input}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Role</label>
                    <div className={styles.roleBadge}>
                      <span className={styles.roleIcon}>
                        {role === 'Administrator' ? <Shield size={14} /> : <User size={14} />}
                      </span>
                      <span>{role}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.saveBtn} 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                    <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Security</h2>
              <p className={styles.sectionDesc}>Manage your passwords and account security</p>

              {/* Change Password */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Change Password</h3>
                <div className={styles.passwordForm}>
                  <div className={styles.field}>
                    <label className={styles.label}>Current Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>New Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Enter new password (min. 8 characters)"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Confirm New Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Repeat new password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    className={styles.changePasswordBtn} 
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? <Loader2 size={16} className={styles.spinner} /> : <Shield size={16} />}
                    <span>{isChangingPassword ? 'Changing...' : 'Change Password'}</span>
                  </button>
                </div>
              </div>

              {/* Two Factor Authentication */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Two-Factor Authentication</h3>
                <p className={styles.cardDesc}>Add an extra layer of security to your account</p>
                <div className={styles.twoFactorRow}>
                  <div className={styles.twoFactorStatus}>
                    <span className={`${styles.statusDot} ${twoFactorEnabled ? styles.statusActive : ''}`}></span>
                    <span>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <button 
                    className={`${styles.twoFactorBtn} ${twoFactorEnabled ? styles.twoFactorBtnDisable : ''}`}
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      toast.success(twoFactorEnabled ? 'Disabled two-factor authentication' : 'Please authenticate to enable 2FA');
                    }}
                  >
                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Active Sessions</h3>
                <p className={styles.cardDesc}>List of devices currently logged into your account</p>
                <div className={styles.sessionsList}>
                  {sessions.map(session => (
                    <div key={session.id} className={styles.sessionItem}>
                      <div className={styles.sessionIcon}>
                        {session.device.includes('iPhone') ? (
                          <Smartphone size={20} />
                        ) : (
                          <Monitor size={20} />
                        )}
                      </div>
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionDevice}>
                          {session.device}
                          {session.current && <span className={styles.currentBadge}>Current</span>}
                        </div>
                        <div className={styles.sessionMeta}>
                          <span>{session.location}</span>
                          <span className={styles.sessionDot}>•</span>
                          <span>{session.lastActive}</span>
                        </div>
                      </div>
                      {!session.current && (
                        <button 
                          className={styles.terminateBtn}
                          onClick={() => handleTerminateSession(session.id)}
                          title="Log out this session"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Preferences</h2>
              <p className={styles.sectionDesc}>Customize display language and theme preferences</p>

              <div className={styles.preferencesList}>
                {/* Language */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Globe size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Language</div>
                      <div className={styles.preferenceDesc}>Choose display language</div>
                    </div>
                  </div>
                  <select 
                    value={language} 
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      toast.success('Language updated');
                    }}
                    className={styles.select}
                  >
                    <option value="vi">Vietnamese</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Theme */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Monitor size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Theme</div>
                      <div className={styles.preferenceDesc}>Choose display theme</div>
                    </div>
                  </div>
                  <div className={styles.themeSelector}>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('light');
                        toast.success('Switched to light theme');
                      }}
                    >
                      <Monitor size={14} />
                      <span>Light</span>
                    </button>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('dark');
                        toast.success('Switched to dark theme');
                      }}
                    >
                      <EyeOff size={14} />
                      <span>Dark</span>
                    </button>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'system' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('system');
                        toast.success('Switched to system theme');
                      }}
                    >
                      <SettingsIcon size={14} />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                {/* Date Format */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Calendar size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Date Format</div>
                      <div className={styles.preferenceDesc}>Choose date display format</div>
                    </div>
                  </div>
                  <select 
                    value={dateFormat} 
                    onChange={(e) => {
                      setDateFormat(e.target.value);
                      toast.success('Date format updated');
                    }}
                    className={styles.select}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Clock size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Timezone</div>
                      <div className={styles.preferenceDesc}>Your current timezone</div>
                    </div>
                  </div>
                  <div className={styles.timezoneDisplay}>
                    <Check size={16} />
                    <span>Asia/Ho_Chi_Minh (UTC+7)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
