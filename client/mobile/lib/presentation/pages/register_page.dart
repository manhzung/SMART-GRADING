import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/user.entity.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/school/school_bloc.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String? _selectedSchool;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(SchoolFetchRequested());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onRegister() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
        AuthRegisterRequested(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text.trim()
              : null,
          school: _selectedSchool ?? '',
          password: _passwordController.text,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: MultiBlocListener(
        listeners: [
          BlocListener<AuthBloc, AuthState>(
            listener: (context, state) {
              if (state is AuthAuthenticated) {
                Navigator.pushReplacementNamed(
                  context,
                  '/email-verification-pending',
                  arguments: {'email': _emailController.text.trim()},
                );
              } else if (state is AuthError) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(state.message)));
              }
            },
          ),
          BlocListener<SchoolBloc, SchoolState>(
            listener: (context, state) {
              if (state is SchoolError) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(state.message)));
              }
            },
          ),
        ],
        child: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
              child: Column(
                children: [
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
                          color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
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
                            const SizedBox(height: 28),
                            const Text(
                              'Create an Account',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Register below to set up your institutional profile.',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 28),
                            const Text(
                              'Full Name',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _nameController,
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 14,
                              ),
                              decoration: _buildInputDecoration(
                                hintText: 'Enter your full name',
                                prefixIcon: Icons.person_outline_rounded,
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your full name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),
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
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 14,
                              ),
                              decoration: _buildInputDecoration(
                                hintText: 'email@truong.edu.vn',
                                prefixIcon: Icons.mail_outline_rounded,
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter email';
                                }
                                if (!RegExp(r'^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value.trim())) {
                                  return 'Invalid email format';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'Phone Number (Optional)',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 14,
                              ),
                              decoration: _buildInputDecoration(
                                hintText: 'Enter phone number',
                                prefixIcon: Icons.phone_outlined,
                              ),
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'School',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                              ),
                            ),
                            const SizedBox(height: 8),
                            BlocBuilder<SchoolBloc, SchoolState>(
                              builder: (context, state) {
                                final schools = state is SchoolLoaded ? state.schools : const <School>[];

                                return DropdownButtonFormField<String>(
                                  initialValue: _selectedSchool,
                                  style: const TextStyle(
                                    color: Color(0xFF0F172A),
                                    fontSize: 14,
                                  ),
                                  decoration: _buildInputDecoration(
                                    hintText: state is SchoolLoading
                                        ? 'Loading schools...'
                                        : 'Select your school',
                                    prefixIcon: Icons.account_balance_outlined,
                                  ),
                                  icon: const Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: Color(0xFF64748B),
                                  ),
                                  items: schools
                                      .map(
                                        (school) => DropdownMenuItem<String>(
                                          value: school.id,
                                          child: Text(school.name),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: state is SchoolLoading
                                      ? null
                                      : (value) {
                                          setState(() {
                                            _selectedSchool = value;
                                          });
                                        },
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Please select a school';
                                    }
                                    return null;
                                  },
                                );
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
                              decoration: _buildInputDecoration(
                                hintText: '• • • • • • • •',
                                prefixIcon: Icons.lock_outline_rounded,
                              ).copyWith(
                                suffixIcon: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
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
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter password';
                                }
                                if (value.length < 8) {
                                  return 'Password must be at least 8 characters';
                                }
                                if (!RegExp(r'^(?=.*[A-Za-z])(?=.*\d).+$').hasMatch(value)) {
                                  return 'Password must contain both letters and numbers';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'Confirm Password',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF082142),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _confirmPasswordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 14,
                              ),
                              decoration: _buildInputDecoration(
                                hintText: '• • • • • • • •',
                                prefixIcon: Icons.lock_outline_rounded,
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please confirm password';
                                }
                                if (value != _passwordController.text) {
                                  return 'Passwords do not match';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 24),
                            FormField<bool>(
                              initialValue: false,
                              validator: (value) {
                                if (value == null || !value) {
                                  return 'You must agree to the terms of use';
                                }
                                return null;
                              },
                              builder: (state) {
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        SizedBox(
                                          height: 24,
                                          width: 24,
                                          child: Checkbox(
                                            value: state.value ?? false,
                                            onChanged: (val) {
                                              state.didChange(val);
                                            },
                                            activeColor: const Color(0xFF082142),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            side: const BorderSide(
                                              color: Color(0xFFCBD5E1),
                                              width: 1.5,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: RichText(
                                            text: const TextSpan(
                                              style: TextStyle(
                                                fontSize: 13,
                                                height: 1.4,
                                                color: Color(0xFF64748B),
                                                fontFamily: 'Roboto',
                                              ),
                                              children: [
                                                TextSpan(text: 'I agree to the '),
                                                TextSpan(
                                                  text: 'terms of use',
                                                  style: TextStyle(
                                                    color: Color(0xFF082142),
                                                    fontWeight: FontWeight.bold,
                                                    decoration: TextDecoration.underline,
                                                  ),
                                                ),
                                                TextSpan(
                                                  text: ' and the system privacy policy.',
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (state.hasError) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        state.errorText ?? '',
                                        style: const TextStyle(
                                          color: Colors.redAccent,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 28),
                            BlocBuilder<AuthBloc, AuthState>(
                              builder: (context, state) {
                                final isLoading = state is AuthLoading;
                                return SizedBox(
                                  width: double.infinity,
                                  height: 52,
                                  child: ElevatedButton(
                                    onPressed: isLoading ? null : _onRegister,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF082142),
                                      foregroundColor: Colors.white,
                                      disabledBackgroundColor: const Color(0xFF082142).withValues(alpha: 0.6),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    child: isLoading
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                            ),
                                          )
                                        : const Text(
                                            'Register',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Already have an account? ',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.pushReplacementNamed(context, '/login');
                                  },
                                  child: const Text(
                                    'Login',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF082142),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
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
      ),
      prefixIcon: Icon(
        prefixIcon,
        color: const Color(0xFF64748B),
        size: 20,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(
          color: Color(0xFFCBD5E1),
          width: 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(
          color: Color(0xFF082142),
          width: 1.5,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(
          color: Colors.redAccent,
          width: 1,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(
          color: Colors.redAccent,
          width: 1.5,
        ),
      ),
    );
  }
}
