import 'package:flutter/material.dart';

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String _newPassword = '';
  String _confirmPassword = '';

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(_onPasswordChanged);
    _confirmPasswordController.addListener(_onConfirmPasswordChanged);
  }

  @override
  void dispose() {
    _passwordController.removeListener(_onPasswordChanged);
    _confirmPasswordController.removeListener(_onConfirmPasswordChanged);
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onPasswordChanged() {
    setState(() {
      _newPassword = _passwordController.text;
    });
  }

  void _onConfirmPasswordChanged() {
    setState(() {
      _confirmPassword = _confirmPasswordController.text;
    });
  }

  bool get _hasEightChars => _newPassword.length >= 8;
  bool get _hasUppercase => _newPassword.contains(RegExp(r'[A-Z]'));
  bool get _hasNumber => _newPassword.contains(RegExp(r'[0-9]'));
  bool get _passwordsMatch =>
      _newPassword == _confirmPassword && _newPassword.isNotEmpty;
  bool get _allRequirementsMet =>
      _hasEightChars && _hasUppercase && _hasNumber && _passwordsMatch;

  ({String label, double value, Color color}) get _passwordStrength {
    if (_newPassword.isEmpty) {
      return (label: 'WEAK', value: 0.0, color: const Color(0xFFCBD5E1));
    }
    int count = 0;
    if (_hasEightChars) count++;
    if (_hasUppercase) count++;
    if (_hasNumber) count++;

    if (count <= 1) {
      return (label: 'WEAK', value: 0.33, color: Colors.redAccent);
    } else if (count == 2) {
      return (label: 'MEDIUM', value: 0.66, color: Colors.orangeAccent);
    } else {
      return (label: 'STRONG', value: 1.0, color: Colors.green);
    }
  }

  void _onSubmit() async {
    if (_allRequirementsMet) {
      setState(() {
        _isLoading = true;
      });
      // Simulate API call delay
      await Future.delayed(const Duration(seconds: 1500 ~/ 1000));
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
            ),
          ),
        );
        Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strength = _passwordStrength;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            child: Column(
              children: [
                // Reset Password Card Container
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Header part of card
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            const SizedBox(height: 8),
                            // Dark blue icon card
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F2547),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.lock_reset_rounded,
                                  size: 32,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            // Title
                            const Text(
                              'Reset Password',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            // Subtitle
                            const Text(
                              'Please create a new secure password for your Smart Grading account.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF64748B),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),

                      // Body part of card
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // New Password Input
                              const Text(
                                'New Password',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF082142),
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                style: const TextStyle(
                                  color: Color(0xFF0F172A),
                                  fontSize: 14,
                                ),
                                decoration:
                                    _buildInputDecoration(
                                      hintText: 'Enter new password',
                                      prefixIcon: Icons.lock_outline_rounded,
                                    ).copyWith(
                                      suffixIcon: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _obscurePassword =
                                                !_obscurePassword;
                                          });
                                        },
                                        child: Icon(
                                          _obscurePassword
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: const Color(0xFF64748B),
                                          size: 20,
                                        ),
                                      ),
                                    ),
                              ),
                              const SizedBox(height: 12),

                              // Password Strength indicator
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'PASSWORD STRENGTH',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF94A3B8),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    strength.label,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: strength.color,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              LinearProgressIndicator(
                                value: strength.value,
                                minHeight: 4,
                                backgroundColor: const Color(0xFFE2E8F0),
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  strength.color,
                                ),
                                borderRadius: BorderRadius.circular(2),
                              ),
                              const SizedBox(height: 20),

                              // Confirm Password Input
                              const Text(
                                'Confirm New Password',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF082142),
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _confirmPasswordController,
                                obscureText: _obscureConfirmPassword,
                                style: const TextStyle(
                                  color: Color(0xFF0F172A),
                                  fontSize: 14,
                                ),
                                decoration:
                                    _buildInputDecoration(
                                      hintText: 'Confirm new password',
                                      prefixIcon: Icons.lock_outline_rounded,
                                    ).copyWith(
                                      suffixIcon: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _obscureConfirmPassword =
                                                !_obscureConfirmPassword;
                                          });
                                        },
                                        child: Icon(
                                          _obscureConfirmPassword
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: const Color(0xFF64748B),
                                          size: 20,
                                        ),
                                      ),
                                    ),
                              ),
                              const SizedBox(height: 24),

                              // Password Requirements Box
                              Container(
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFF1F5F9),
                                    width: 1,
                                  ),
                                ),
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Password Requirements',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF082142),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    _buildRequirementRow(
                                      'At least 8 characters',
                                      _hasEightChars,
                                    ),
                                    const SizedBox(height: 8),
                                    _buildRequirementRow(
                                      'At least 1 uppercase letter',
                                      _hasUppercase,
                                    ),
                                    const SizedBox(height: 8),
                                    _buildRequirementRow(
                                      'At least 1 number',
                                      _hasNumber,
                                    ),
                                    const SizedBox(height: 8),
                                    _buildRequirementRow(
                                      'Passwords match',
                                      _passwordsMatch,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 28),

                              // Action Button
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton(
                                  onPressed: _allRequirementsMet && !_isLoading
                                      ? _onSubmit
                                      : null,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF082142),
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor: const Color(
                                      0xFFE2E8F0,
                                    ),
                                    disabledForegroundColor: const Color(
                                      0xFF94A3B8,
                                    ),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: _isLoading
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(
                                                  Colors.white,
                                                ),
                                          ),
                                        )
                                      : const Text(
                                          'Đặt lại mật khẩu',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ),
                              ),
                              const SizedBox(height: 24),

                              // Back to Login Link
                              GestureDetector(
                                onTap: () {
                                  Navigator.pushReplacementNamed(
                                    context,
                                    '/login',
                                  );
                                },
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.arrow_back_rounded,
                                      color: Color(0xFF64748B),
                                      size: 16,
                                    ),
                                    SizedBox(width: 4),
                                    Text(
                                      'Back to Login',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 36),

                // Footer Section
                const Text(
                  '© 2024 Smart Grading Academic Systems',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF082142),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildFooterLink('Privacy Policy', onTap: () => _showLegalBottomSheet(context, 'Privacy Policy')),
                    _buildFooterLink('Terms of Service', onTap: () => _showLegalBottomSheet(context, 'Terms of Service')),
                    _buildFooterLink('Institutional Support', onTap: () => _showLegalBottomSheet(context, 'Institutional Support')),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRequirementRow(String requirement, bool isSatisfied) {
    return Row(
      children: [
        Icon(
          isSatisfied
              ? Icons.check_circle_rounded
              : Icons.radio_button_unchecked_rounded,
          color: isSatisfied ? Colors.green : const Color(0xFF94A3B8),
          size: 18,
        ),
        const SizedBox(width: 8),
        Text(
          requirement,
          style: TextStyle(
            fontSize: 13,
            color: isSatisfied
                ? const Color(0xFF082142)
                : const Color(0xFF64748B),
            fontWeight: isSatisfied ? FontWeight.w500 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildFooterLink(String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap ?? () => _showLegalBottomSheet(context, text),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
      ),
    );
  }

  void _showLegalBottomSheet(BuildContext context, String title) {
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
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text(
              'Noi dung cua $title se duoc cap nhat sau.\nVui long lien he ho tro neu ban can ho tro ngay lap tuc.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Dong')),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({
    required String hintText,
    required IconData prefixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: const TextStyle(
        color: Color(0xFF94A3B8),
        fontSize: 14,
        fontWeight: FontWeight.normal,
      ),
      prefixIcon: Icon(prefixIcon, color: const Color(0xFF64748B), size: 20),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF082142), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
    );
  }
}
