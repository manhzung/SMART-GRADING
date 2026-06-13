import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_bloc.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    context.read<AuthBloc>().add(AuthCheckRequested());
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) async {
        if (state is AuthAuthenticated) {
          await Future.delayed(const Duration(seconds: 3));
          if (context.mounted) {
            Navigator.pushReplacementNamed(context, '/home');
          }
        } else if (state is AuthUnauthenticated) {
          await Future.delayed(const Duration(seconds: 3));
          if (context.mounted) {
            Navigator.pushReplacementNamed(context, '/login');
          }
        }
      },
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFF8FAFC),
                Color(0xFFF0F4F8),
              ],
            ),
          ),
          child: CustomPaint(
            painter: SplashBackgroundPainter(),
            child: SafeArea(
              child: SizedBox.expand(
                child: Column(
                  children: [
                    const Spacer(flex: 3),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: const Color(0xFFE2E8F0),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0F172A).withValues(alpha: 0.06),
                                blurRadius: 24,
                                offset: const Offset(0, 8),
                              ),
                              BoxShadow(
                                color: const Color(0xFF0F172A).withValues(alpha: 0.02),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.school_rounded,
                              size: 48,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SizedBox(height: 36),
                        const Text(
                          'Smart Grading',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Academic Systems',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 48),
                        const ThreeDotsLoading(),
                        const SizedBox(height: 16),
                        const Text(
                          'Initializing Workspace...',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF94A3B8),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(flex: 2),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 24.0),
                      child: Text(
                        'v2.4.1 • Secure Environment',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF94A3B8),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SplashBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF94A3B8).withValues(alpha: 0.04)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final centerBottomRight = Offset(size.width * 1.1, size.height * 0.9);
    for (double r = 100; r <= 600; r += 60) {
      canvas.drawCircle(centerBottomRight, r, paint);
    }

    final centerTopLeft = Offset(-size.width * 0.1, size.height * 0.1);
    for (double r = 100; r <= 500; r += 60) {
      canvas.drawCircle(centerTopLeft, r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class ThreeDotsLoading extends StatefulWidget {
  const ThreeDotsLoading({super.key});

  @override
  State<ThreeDotsLoading> createState() => _ThreeDotsLoadingState();
}

class _ThreeDotsLoadingState extends State<ThreeDotsLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final double phase = index * math.pi / 3.0;
            final double value = math.sin((_controller.value * 2 * math.pi) - phase);
            final double opacity = 0.25 + 0.75 * ((value + 1) / 2);

            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 6),
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: opacity),
                shape: BoxShape.circle,
              ),
            );
          },
        );
      }),
    );
  }
}
