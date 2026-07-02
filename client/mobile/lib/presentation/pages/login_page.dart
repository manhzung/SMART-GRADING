import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_bloc.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onLogin() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
        AuthLoginRequested(
          email: _emailController.text,
          password: _passwordController.text,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            Navigator.pushReplacementNamed(context, '/home');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text(state.message)));
          }
        },
        child: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header Branding
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  width: double.infinity,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.school_rounded,
                        size: 28,
                        color: Color(0xFF082142),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Smart Grading',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF082142),
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),

                // Login Card and Footer Info
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 32,
                  ),
                  child: Column(
                    children: [
                      // Login Card
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE2E8F0),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFF0F172A,
                              ).withValues(alpha: 0.04),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Main White Section
                              Container(
                                color: Colors.white,
                                padding: const EdgeInsets.all(24),
                                child: Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 8),
                                      const Align(
                                        alignment: Alignment.center,
                                        child: Text(
                                          'Welcome Back',
                                          style: TextStyle(
                                            fontSize: 28,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF082142),
                                            letterSpacing: -0.5,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      const Align(
                                        alignment: Alignment.center,
                                        child: Text(
                                          'Sign in to continue to Smart Grading',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w400,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 32),
                                      const Text(
                                        'Email',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF082142),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      TextFormField(
                                        controller: _emailController,
                                        keyboardType:
                                            TextInputType.emailAddress,
                                        style: const TextStyle(
                                          color: Color(0xFF0F172A),
                                          fontSize: 14,
                                        ),
                                        decoration: InputDecoration(
                                          hintText: 'Enter your email',
                                          hintStyle: const TextStyle(
                                            color: Color(0xFF94A3B8),
                                            fontSize: 14,
                                          ),
                                          prefixIcon: const Icon(
                                            Icons.mail_outline_rounded,
                                            color: Color(0xFF64748B),
                                            size: 20,
                                          ),
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                                horizontal: 16,
                                                vertical: 14,
                                              ),
                                          filled: true,
                                          fillColor: Colors.white,
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFFCBD5E1),
                                              width: 1,
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF082142),
                                              width: 1.5,
                                            ),
                                          ),
                                          errorBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Colors.redAccent,
                                              width: 1,
                                            ),
                                          ),
                                          focusedErrorBorder:
                                              OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                borderSide: const BorderSide(
                                                  color: Colors.redAccent,
                                                  width: 1.5,
                                                ),
                                              ),
                                        ),
                                        validator: (value) {
                                          if (value == null || value.isEmpty) {
                                            return 'Please enter your email';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 20),
                                      const Text(
                                        'Password',
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
                                        decoration: InputDecoration(
                                          hintText: 'Enter your password',
                                          hintStyle: const TextStyle(
                                            color: Color(0xFF94A3B8),
                                            fontSize: 14,
                                          ),
                                          prefixIcon: const Icon(
                                            Icons.lock_outline_rounded,
                                            color: Color(0xFF64748B),
                                            size: 20,
                                          ),
                                          suffixIcon: GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                _obscurePassword =
                                                    !_obscurePassword;
                                              });
                                            },
                                            child: Icon(
                                              _obscurePassword
                                                  ? Icons.visibility_outlined
                                                  : Icons
                                                        .visibility_off_outlined,
                                              color: const Color(0xFF64748B),
                                              size: 20,
                                            ),
                                          ),
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                                horizontal: 16,
                                                vertical: 14,
                                              ),
                                          filled: true,
                                          fillColor: Colors.white,
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFFCBD5E1),
                                              width: 1,
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF082142),
                                              width: 1.5,
                                            ),
                                          ),
                                          errorBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Colors.redAccent,
                                              width: 1,
                                            ),
                                          ),
                                          focusedErrorBorder:
                                              OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                borderSide: const BorderSide(
                                                  color: Colors.redAccent,
                                                  width: 1.5,
                                                ),
                                              ),
                                        ),
                                        validator: (value) {
                                          if (value == null || value.isEmpty) {
                                            return 'Please enter your password';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 12),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: TextButton(
                                          onPressed: () {
                                            Navigator.pushNamed(
                                              context,
                                              '/forgot-password',
                                            );
                                          },
                                          style: TextButton.styleFrom(
                                            padding: EdgeInsets.zero,
                                            minimumSize: Size.zero,
                                            tapTargetSize: MaterialTapTargetSize
                                                .shrinkWrap,
                                          ),
                                          child: const Text(
                                            'Forgot password?',
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF082142),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      BlocBuilder<AuthBloc, AuthState>(
                                        builder: (context, state) {
                                          final isLoading =
                                              state is AuthLoading;
                                          return SizedBox(
                                            width: double.infinity,
                                            height: 52,
                                            child: ElevatedButton(
                                              onPressed: isLoading
                                                  ? null
                                                  : _onLogin,
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: const Color(
                                                  0xFF082142,
                                                ),
                                                foregroundColor: Colors.white,
                                                disabledBackgroundColor:
                                                    const Color(
                                                      0xFF082142,
                                                    ).withValues(alpha: 0.6),
                                                elevation: 0,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                ),
                                              ),
                                              child: isLoading
                                                  ? const SizedBox(
                                                      height: 20,
                                                      width: 20,
                                                      child: CircularProgressIndicator(
                                                        strokeWidth: 2.5,
                                                        valueColor:
                                                            AlwaysStoppedAnimation<
                                                              Color
                                                            >(Colors.white),
                                                      ),
                                                    )
                                                  : const Row(
                                                      mainAxisAlignment:
                                                          MainAxisAlignment
                                                              .center,
                                                      children: [
                                                        Text(
                                                          'Sign In',
                                                          style: TextStyle(
                                                            fontSize: 16,
                                                            fontWeight:
                                                                FontWeight.bold,
                                                          ),
                                                        ),
                                                        SizedBox(width: 8),
                                                        Icon(
                                                          Icons.arrow_forward,
                                                          size: 20,
                                                        ),
                                                      ],
                                                    ),
                                            ),
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              // Bottom Grey Section
                              const Divider(
                                height: 1,
                                color: Color(0xFFE2E8F0),
                              ),
                              Container(
                                color: const Color(0xFFF1F5F9),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 20,
                                  horizontal: 24,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text(
                                      "Don't have an account? ",
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        Navigator.pushReplacementNamed(
                                          context,
                                          '/register',
                                        );
                                      },
                                      child: const Text(
                                        'Sign Up',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF082142),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 48),
                      // Outer Page Footer
                      const Text(
                        '© 2024 Smart Grading Academic Systems',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF082142),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildFooterLink('Privacy\nPolicy', onTap: () => _showLegalBottomSheet(context, 'Privacy Policy')),
                          _buildFooterLink('Terms of\nService', onTap: () => _showLegalBottomSheet(context, 'Terms of Service')),
                          _buildFooterLink('Institutional\nSupport', onTap: () => _showLegalBottomSheet(context, 'Institutional Support')),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooterLink(String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap ?? () => _showLegalBottomSheet(context, text),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 13,
          height: 1.3,
          color: Color(0xFF64748B),
        ),
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
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(
              'Content for $title will be updated soon.\nPlease contact support if you need immediate assistance.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
