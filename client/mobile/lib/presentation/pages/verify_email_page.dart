import 'dart:async';
import 'package:flutter/material.dart';

class VerifyEmailPage extends StatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  Timer? _timer;
  int _start = 60;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    setState(() {
      _canResend = false;
      _start = 60;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_start == 0) {
        setState(() {
          _timer?.cancel();
          _canResend = true;
        });
      } else {
        setState(() {
          _start--;
        });
      }
    });
  }

  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 2) {
      return '${name.substring(0, 1)}****@$domain';
    }
    return '${name.substring(0, 2)}****@$domain';
  }

  @override
  Widget build(BuildContext context) {
    final String emailArg =
        ModalRoute.of(context)?.settings.arguments as String? ??
        'st****@gmail.com';
    final String emailDisplay = emailArg.contains('**')
        ? emailArg
        : _maskEmail(emailArg);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            child: Column(
              children: [
                // Top Header Branding
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
                const SizedBox(height: 24),

                // Card Container
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
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        const SizedBox(height: 16),
                        // Soft Blue Icon Wrapper
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.mark_email_unread_outlined,
                              size: 40,
                              color: Color(0xFF1E40AF),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        // Title
                        const Text(
                          'Verify Email Address',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF082142),
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Grey Info Box
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
                            children: [
                              const Text(
                                'The system has sent a secure verification link to your inbox:',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF64748B),
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 16),
                              // Email display card
                              Container(
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFE2E8F0),
                                    width: 1,
                                  ),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                  horizontal: 16,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.mail_outline_rounded,
                                      color: Color(0xFF64748B),
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        emailDisplay,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF082142),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Divider(
                                height: 1,
                                color: Color(0xFFE2E8F0),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Please check your inbox and access the provided link to activate your account. This is required to ensure data security.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF64748B),
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Confirm Verification Button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Account verified successfully!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                              Navigator.pushReplacementNamed(context, '/home');
                            },
                            icon: const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 20,
                              color: Colors.white,
                            ),
                            label: const Text(
                              'Confirm Activation',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF082142),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Resend Button (Secondary Action, Outlined)
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton.icon(
                            onPressed: _canResend ? _startTimer : null,
                            icon: Icon(
                              Icons.forward_to_inbox_rounded,
                              size: 20,
                              color: _canResend
                                  ? const Color(0xFF082142)
                                  : const Color(0xFF94A3B8),
                            ),
                            label: Text(
                              _canResend
                                  ? 'Resend Email'
                                  : 'Resend Email (${_start}s)',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: _canResend
                                    ? const Color(0xFF082142)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(
                                color: _canResend
                                    ? const Color(0xFF082142)
                                    : const Color(0xFFE2E8F0),
                                width: 1.5,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Back to Login Link
                        GestureDetector(
                          onTap: () {
                            Navigator.pushReplacementNamed(context, '/login');
                          },
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.arrow_back_rounded,
                                color: Color(0xFF082142),
                                size: 16,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Login Now',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF082142),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 36),

                // Outer Notice Footer
                const Text(
                  'Did not receive the email?',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: RichText(
                    textAlign: TextAlign.center,
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.4,
                        fontFamily: 'Roboto',
                      ),
                      children: [
                        TextSpan(text: 'Please check your Spam folder or '),
                        TextSpan(
                          text: 'Contact Academic Support',
                          style: TextStyle(
                            color: Color(0xFF082142),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextSpan(text: '.'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
