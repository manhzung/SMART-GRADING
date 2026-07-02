import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:smart_grading_mobile/core/network/user_service.dart';
import 'package:smart_grading_mobile/presentation/blocs/auth/auth_bloc.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Notification toggles
  bool _emailNotifications = true;
  bool _pushNotifications = true;
  bool _gradingReminders = true;
  bool _appealUpdates = true;
  bool _systemNotifications = true;

  // Appearance
  String _appearance = 'Light';

  // Account form controllers
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;

  bool _isSavingProfile = false;
  bool _isChangingPassword = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initControllers();
  }

  void _initControllers() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      _nameController = TextEditingController(text: authState.user.name);
      _emailController = TextEditingController(text: authState.user.email);
      _phoneController = TextEditingController(text: authState.user.phone ?? '');
    } else {
      _nameController = TextEditingController();
      _emailController = TextEditingController();
      _phoneController = TextEditingController();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!mounted) return;
    setState(() => _isSavingProfile = true);

    try {
      final authState = context.read<AuthBloc>().state;
      if (authState is AuthAuthenticated) {
        final userService = GetIt.instance<UserService>();
        final updated = await userService.updateProfile(
          userId: authState.user.id,
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        );
        if (!mounted) return;
        context.read<AuthBloc>().add(AuthProfileUpdated(updated));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: Color(0xFF22C55E),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
          content: Text('Error: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSavingProfile = false);
    }
  }

  Future<void> _changePassword(String currentPassword, String newPassword) async {
    if (!mounted) return;
    setState(() => _isChangingPassword = true);

    try {
      final authState = context.read<AuthBloc>().state;
      if (authState is AuthAuthenticated) {
        final userService = GetIt.instance<UserService>();
        await userService.changePassword(
          userId: authState.user.id,
          currentPassword: currentPassword,
          newPassword: newPassword,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password changed successfully'),
            backgroundColor: Color(0xFF22C55E),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
          content: Text('Error: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String? avatarUrl;
    String role = 'student';
    String schoolName = 'Smart Grading High School';
    String schoolCode = 'SGS-2024';

    if (authState is AuthAuthenticated) {
      avatarUrl = authState.user.avatarUrl;
      role = authState.user.role;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text(
          'Settings',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFF1F5F9),
                  backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                  child: avatarUrl == null
                      ? const Icon(Icons.person, color: Color(0xFF64748B), size: 20)
                      : null,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF081C43),
              unselectedLabelColor: const Color(0xFF64748B),
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 14),
              indicatorColor: const Color(0xFF081C43),
              indicatorWeight: 2,
              indicatorSize: TabBarIndicatorSize.tab,
              tabs: const [
                Tab(text: 'Account'),
                Tab(text: 'Notifications'),
                Tab(text: 'Security'),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAccountTab(role, schoolName, schoolCode),
          _buildNotificationsTab(),
          _buildSecurityTab(),
        ],
      ),
    );
  }

  Widget _buildAccountTab(String role, String schoolName, String schoolCode) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar Section
          Center(
            child: Column(
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: const Color(0xFFF1F5F9),
                      backgroundImage: null,
                      child: const Icon(Icons.person, size: 50, color: Color(0xFF64748B)),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.camera_alt,
                          size: 14,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Role badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: role == 'teacher' ? const Color(0xFFE8F0FE) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    role == 'teacher' ? 'Teacher' : 'Student',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: role == 'teacher' ? const Color(0xFF6366F1) : const Color(0xFFD97706),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Name TextField
          _buildSectionHeader('FULL NAME'),
          TextFormField(
            controller: _nameController,
            decoration: _inputDecoration('Enter your full name'),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),

          // Email TextField (read-only)
          _buildSectionHeader('EMAIL'),
          TextFormField(
            controller: _emailController,
            decoration: _inputDecoration('Email').copyWith(
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
            ),
            readOnly: true,
            enabled: false,
          ),
          const SizedBox(height: 16),

          // Phone TextField
          _buildSectionHeader('PHONE NUMBER'),
          TextFormField(
            controller: _phoneController,
            decoration: _inputDecoration('Enter phone number'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 24),

          // Save Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSavingProfile ? null : _saveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF081C43),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isSavingProfile
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'Save Changes',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 24),

          // School Information Section
          _buildSectionHeader('SCHOOL INFORMATION'),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'School Name',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  schoolName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: Color(0xFFE2E8F0), height: 1),
                ),
                const Text(
                  'School Code',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  schoolCode,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Language row
          _buildRowTile(
            icon: Icons.language,
            title: 'Language',
            trailing: const Text(
              'Vietnamese',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
            ),
            onTap: () => _showLanguageBottomSheet(context),
          ),
          const SizedBox(height: 16),

          // Appearance toggle
          _buildRowTile(
            icon: Icons.tonality_outlined,
            title: 'Appearance',
            trailing: _buildAppearanceToggle(),
            onTap: () => _showAppearanceBottomSheet(context),
          ),
          const SizedBox(height: 16),

          // Version
          Center(
            child: Text(
              'Version 2.4.0 (Build 882)',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF94A3B8),
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildNotificationsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildNotificationToggle(
                  icon: Icons.email_outlined,
                  title: 'Email notifications',
                  value: _emailNotifications,
                  onChanged: (val) => setState(() => _emailNotifications = val),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 1),
                _buildNotificationToggle(
                  icon: Icons.notifications_outlined,
                  title: 'Push notifications',
                  value: _pushNotifications,
                  onChanged: (val) => setState(() => _pushNotifications = val),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 1),
                _buildNotificationToggle(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'Grading reminders',
                  value: _gradingReminders,
                  onChanged: (val) => setState(() => _gradingReminders = val),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 1),
                _buildNotificationToggle(
                  icon: Icons.rate_review_outlined,
                  title: 'Appeal updates',
                  value: _appealUpdates,
                  onChanged: (val) => setState(() => _appealUpdates = val),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 1),
                _buildNotificationToggle(
                  icon: Icons.settings_outlined,
                  title: 'System notifications',
                  value: _systemNotifications,
                  onChanged: (val) => setState(() => _systemNotifications = val),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationToggle({
    required IconData icon,
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF64748B), size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: const Color(0xFF081C43),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('CHANGE PASSWORD'),
          const SizedBox(height: 8),
          _PasswordChangeForm(
            onSubmit: _changePassword,
            isLoading: _isChangingPassword,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Color(0xFF64748B),
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildRowTile({
    required IconData icon,
    required String title,
    required Widget trailing,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF64748B), size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
            trailing,
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right,
              color: Colors.black.withValues(alpha: 0.3),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Text('Select Language', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            ListTile(
              title: const Text('Vietnamese'),
              leading: const Icon(Icons.check, color: Color(0xFF6366F1)),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              title: const Text('English'),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showAppearanceBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Text('Select Appearance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            ListTile(
              title: const Text('Light'),
              leading: const Icon(Icons.light_mode_outlined),
              onTap: () {
                setState(() => _appearance = 'Light');
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Dark'),
              leading: const Icon(Icons.dark_mode_outlined),
              onTap: () {
                setState(() => _appearance = 'Dark');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildAppearanceToggle() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () {
              setState(() => _appearance = 'Light');
            },
            child: Container(
              decoration: BoxDecoration(
                color: _appearance == 'Light' ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                boxShadow: _appearance == 'Light'
                    ? [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ]
                    : null,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(
                'Light',
                style: TextStyle(
                  color: _appearance == 'Light' ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              setState(() => _appearance = 'Dark');
            },
            child: Container(
              decoration: BoxDecoration(
                color: _appearance == 'Dark' ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                boxShadow: _appearance == 'Dark'
                    ? [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ]
                    : null,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(
                'Dark',
                style: TextStyle(
                  color: _appearance == 'Dark' ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
      ),
    );
  }
}

class _PasswordChangeForm extends StatefulWidget {
  final Future<void> Function(String currentPassword, String newPassword) onSubmit;
  final bool isLoading;

  const _PasswordChangeForm({
    required this.onSubmit,
    required this.isLoading,
  });

  @override
  State<_PasswordChangeForm> createState() => _PasswordChangeFormState();
}

class _PasswordChangeFormState extends State<_PasswordChangeForm> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await widget.onSubmit(
      _currentController.text,
      _newController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Current Password',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _currentController,
              obscureText: _obscureCurrent,
              decoration: InputDecoration(
                hintText: 'Enter current password',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureCurrent ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF94A3B8),
                  ),
                  onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Please enter password' : null,
            ),
            const SizedBox(height: 16),
            const Text(
              'New Password',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _newController,
              obscureText: _obscureNew,
              decoration: InputDecoration(
                hintText: 'Enter new password',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureNew ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF94A3B8),
                  ),
                  onPressed: () => setState(() => _obscureNew = !_obscureNew),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Please enter new password';
                if (v.length < 6) return 'Password must be at least 6 characters';
                return null;
              },
            ),
            const SizedBox(height: 16),
            const Text(
              'Confirm New Password',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _confirmController,
              obscureText: _obscureConfirm,
              decoration: InputDecoration(
                hintText: 'Re-enter new password',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureConfirm ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF94A3B8),
                  ),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
              validator: (v) {
                if (v != _newController.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: widget.isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF081C43),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: widget.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Change Password',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
