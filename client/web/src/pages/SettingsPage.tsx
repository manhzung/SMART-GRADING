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
  const [role] = useState(user?.role === 'admin' ? 'Quản trị viên'
    : user?.role === 'teacher' ? 'Giáo viên'
    : user?.role === 'student' ? 'Học sinh'
    : user?.role === 'parent' ? 'Phụ huynh'
    : 'Không xác định');
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
    { id: '1', device: 'Chrome on Windows', location: 'Hà Nội, Việt Nam', lastActive: 'Đang hoạt động', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Hà Nội, Việt Nam', lastActive: '2 giờ trước', current: false },
    { id: '3', device: 'Firefox on macOS', location: 'TP. Hồ Chí Minh, Việt Nam', lastActive: '3 ngày trước', current: false },
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
        toast.error('Kích thước ảnh không được vượt quá 5MB');
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
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    if (!email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: fullName, phone });
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (error) {
      toast.error((error as Error).message || 'Cập nhật thất bại');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings) => {
    const newValue = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    localStorage.setItem('notification-prefs', JSON.stringify({
      ...notifications,
      [key]: newValue,
    }));
    toast.success('Đã lưu cài đặt thông báo');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error((error as Error).message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTerminateSession = (_sessionId: string) => {
    // API call would go here
    toast.success('Đã đăng xuất phiên làm việc');
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Hồ sơ', icon: User },
    { id: 'security' as TabType, label: 'Bảo mật', icon: Shield },
    { id: 'preferences' as TabType, label: 'Tùy chọn', icon: SettingsIcon },
  ];

  return (
    <div className={styles.container}>
      {/* Title */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={`roleBadge ${roleBadgeClass}`}>{roleLabel}</span>
          <h1 className={styles.title}>Cài đặt</h1>
          <p className={styles.subtitle}>Quản lý thông tin cá nhân, cấu hình bảo mật và thiết lập tùy chọn hệ thống</p>
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
              <h2 className={styles.sectionTitle}>Thông tin cá nhân</h2>
              <p className={styles.sectionDesc}>Quản lý thông tin hồ sơ của bạn</p>
              
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
                    <p className={styles.avatarInstructions}>Tải lên hình ảnh chân dung của bạn. Định dạng PNG, JPG tối đa 5MB.</p>
                    <button 
                      className={styles.removeAvatarBtn}
                      onClick={() => setAvatarPreview(null)}
                      style={{ display: avatarPreview ? 'flex' : 'none' }}
                    >
                      <X size={14} />
                      <span>Xóa ảnh chân dung</span>
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Họ và tên</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={styles.input}
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                      placeholder="Nhập địa chỉ email"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Số điện thoại</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={styles.input}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Vai trò</label>
                    <div className={styles.roleBadge}>
                      <span className={styles.roleIcon}>
                        {role === 'Quản trị viên' ? <Shield size={14} /> : <User size={14} />}
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
                    <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Bảo mật</h2>
              <p className={styles.sectionDesc}>Quản lý mật khẩu và bảo mật tài khoản</p>

              {/* Change Password */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Đổi mật khẩu</h3>
                <div className={styles.passwordForm}>
                  <div className={styles.field}>
                    <label className={styles.label}>Mật khẩu hiện tại</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Nhập mật khẩu hiện tại"
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
                    <label className={styles.label}>Mật khẩu mới</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
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
                    <label className={styles.label}>Xác nhận mật khẩu mới</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Nhập lại mật khẩu mới"
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
                    <span>{isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</span>
                  </button>
                </div>
              </div>

              {/* Two Factor Authentication */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Xác thực hai yếu tố</h3>
                <p className={styles.cardDesc}>Thêm một lớp bảo mật bổ sung cho tài khoản của bạn</p>
                <div className={styles.twoFactorRow}>
                  <div className={styles.twoFactorStatus}>
                    <span className={`${styles.statusDot} ${twoFactorEnabled ? styles.statusActive : ''}`}></span>
                    <span>{twoFactorEnabled ? 'Đã bật' : 'Chưa bật'}</span>
                  </div>
                  <button 
                    className={`${styles.twoFactorBtn} ${twoFactorEnabled ? styles.twoFactorBtnDisable : ''}`}
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      toast.success(twoFactorEnabled ? 'Đã tắt xác thực hai yếu tố' : 'Vui lòng xác thực để bật 2FA');
                    }}
                  >
                    {twoFactorEnabled ? 'Tắt 2FA' : 'Bật 2FA'}
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className={styles.securityCard}>
                <h3 className={styles.cardTitle}>Phiên làm việc đang hoạt động</h3>
                <p className={styles.cardDesc}>Danh sách các thiết bị đang đăng nhập vào tài khoản của bạn</p>
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
                          {session.current && <span className={styles.currentBadge}>Hiện tại</span>}
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
                          title="Đăng xuất phiên này"
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
              <h2 className={styles.sectionTitle}>Tùy chọn</h2>
              <p className={styles.sectionDesc}>Tùy chỉnh giao diện và ngôn ngữ hiển thị</p>

              <div className={styles.preferencesList}>
                {/* Language */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Globe size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Ngôn ngữ</div>
                      <div className={styles.preferenceDesc}>Chọn ngôn ngữ giao diện</div>
                    </div>
                  </div>
                  <select 
                    value={language} 
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      toast.success('Đã cập nhật ngôn ngữ');
                    }}
                    className={styles.select}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Theme */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Monitor size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Giao diện</div>
                      <div className={styles.preferenceDesc}>Chọn chế độ hiển thị</div>
                    </div>
                  </div>
                  <div className={styles.themeSelector}>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('light');
                        toast.success('Đã chuyển sang giao diện sáng');
                      }}
                    >
                      <Monitor size={14} />
                      <span>Sáng</span>
                    </button>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('dark');
                        toast.success('Đã chuyển sang giao diện tối');
                      }}
                    >
                      <EyeOff size={14} />
                      <span>Tối</span>
                    </button>
                    <button 
                      className={`${styles.themeBtn} ${theme === 'system' ? styles.themeBtnActive : ''}`}
                      onClick={() => {
                        setTheme('system');
                        toast.success('Đã chuyển sang giao diện theo hệ thống');
                      }}
                    >
                      <SettingsIcon size={14} />
                      <span>Tự động</span>
                    </button>
                  </div>
                </div>

                {/* Date Format */}
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <Calendar size={20} className={styles.preferenceIcon} />
                    <div>
                      <div className={styles.preferenceTitle}>Định dạng ngày tháng</div>
                      <div className={styles.preferenceDesc}>Chọn cách hiển thị ngày</div>
                    </div>
                  </div>
                  <select 
                    value={dateFormat} 
                    onChange={(e) => {
                      setDateFormat(e.target.value);
                      toast.success('Đã cập nhật định dạng ngày');
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
                      <div className={styles.preferenceTitle}>Múi giờ</div>
                      <div className={styles.preferenceDesc}>Múi giờ hiện tại của bạn</div>
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
