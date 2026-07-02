import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_bloc.dart';

class EmailVerificationPendingPage extends StatefulWidget {
  final String email;

  const EmailVerificationPendingPage({super.key, required this.email});

  @override
  State<EmailVerificationPendingPage> createState() => _EmailVerificationPendingPageState();
}

class _EmailVerificationPendingPageState extends State<EmailVerificationPendingPage> {
  bool _isResent = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 48),
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF3C7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mark_email_unread_outlined,
                  size: 56,
                  color: Color(0xFFD97706),
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Verify Email',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'We have sent a verification email to',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.email,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildStep(1, 'Open email and find message from Smart Grading'),
                    const SizedBox(height: 12),
                    _buildStep(2, 'Click on the "Confirm Email" link'),
                    const SizedBox(height: 12),
                    _buildStep(3, 'Page will automatically redirect to login'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF1D4ED8), size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Check your spam folder if you cannot find the email.',
                        style: TextStyle(color: Color(0xFF1D4ED8), fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (!_isResent) ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.read<AuthBloc>().add(
                        AuthResendVerificationEmailRequested(email: widget.email),
                      );
                      setState(() => _isResent = true);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Verification email has been resent!'),
                          backgroundColor: Color(0xFF16A34A),
                        ),
                      );
                    },
                    icon: const Icon(Icons.send_outlined),
                    label: const Text('Resend Email'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0F172A),
                      side: const BorderSide(color: Color(0xFF0F172A)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Email has been resent!',
                        style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                child: const Text(
                  'Back to Login',
                  style: TextStyle(color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep(int number, String text) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text(
              '$number',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: Color(0xFF475569),
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
