import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/user.entity.dart';
import '../blocs/class/class_bloc.dart';
import 'class_detail_page.dart';
import 'create_edit_class_page.dart';

class ClassesView extends StatefulWidget {
  const ClassesView({super.key});

  @override
  State<ClassesView> createState() => _ClassesViewState();
}

class _ClassesViewState extends State<ClassesView> {
  void _addStudents(Class cls) {
    Navigator.pushNamed(
      context,
      '/class-add-students',
      arguments: cls,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ClassBloc, ClassState>(
      builder: (context, state) {
        final isLoading = state is ClassLoading;
        final classes = state is ClassLoaded ? state.classes : <Class>[];

        return Scaffold(
          backgroundColor: Colors.transparent,
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateEditClassPage(),
                ),
              );
            },
            backgroundColor: const Color(0xFF081C43),
            child: const Icon(Icons.add, color: Colors.white),
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              context.read<ClassBloc>().add(const ClassFetchRequested());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'My Classes',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const CreateEditClassPage(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.add, color: Colors.white, size: 18),
                        label: const Text(
                          'New Class',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF081C43),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  if (isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (classes.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Column(
                          children: [
                            Icon(Icons.school_outlined, size: 48, color: Color(0xFFCBD5E1)),
                            SizedBox(height: 16),
                            Text(
                              'No classes found.\nPull to refresh.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    ...classes.map((cls) => _ClassCardFromEntity(
                      cls: cls,
                      imageUrls: _mockImageUrlsForClass(cls.name),
                      onAddStudents: () => _addStudents(cls),
                    )),
                    const SizedBox(height: 8),
                    _AddClassCard(),
                  ],
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static List<String> _mockImageUrlsForClass(String className) {
    return [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60',
    ];
  }
}

class _ClassCardFromEntity extends StatelessWidget {
  final Class cls;
  final List<String> imageUrls;
  final VoidCallback? onAddStudents;

  const _ClassCardFromEntity({
    required this.cls,
    required this.imageUrls,
    this.onAddStudents,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ClassDetailPage(cls: cls),
                ),
              );
            },
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _getColorForClass(cls.name).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        _getIconForClass(cls.name),
                        style: TextStyle(
                          color: _getColorForClass(cls.name),
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cls.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          cls.subtitle,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, color: Color(0xFF64748B)),
                    onSelected: (value) {
                      if (value == 'add_students') {
                        onAddStudents?.call();
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'add_students',
                        child: Row(
                          children: [
                            Icon(Icons.person_add_outlined, size: 20, color: Color(0xFF64748B)),
                            SizedBox(width: 8),
                            Text('Add students'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.people_outline,
                      color: Color(0xFF64748B),
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${cls.studentCount} Students',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                _AvatarOverlapGroup(
                  count: cls.studentCount,
                  imageUrls: imageUrls,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getIconForClass(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('math') || lower.contains('calculus') || lower.contains('algebra')) return '\u03A3';
    if (lower.contains('physics') || lower.contains('science')) return '\u2697';
    if (lower.contains('literature') || lower.contains('english') || lower.contains('writing')) return '\u270D';
    if (lower.contains('bio') || lower.contains('chem') || lower.contains('science')) return '\u2697';
    if (lower.contains('history')) return '\u23F0';
    if (lower.contains('art') || lower.contains('design')) return '\u2665';
    return '\u25A0';
  }

  Color _getColorForClass(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('math') || lower.contains('calculus')) return const Color(0xFF7C2D12);
    if (lower.contains('physics') || lower.contains('science')) return const Color(0xFF081C43);
    if (lower.contains('literature') || lower.contains('english')) return const Color(0xFF1E3A8A);
    if (lower.contains('bio') || lower.contains('chem')) return const Color(0xFF991B1B);
    if (lower.contains('history')) return const Color(0xFF7C3AED);
    if (lower.contains('art')) return const Color(0xFFDB2777);
    return const Color(0xFF0F172A);
  }
}

class _AvatarOverlapGroup extends StatelessWidget {
  final int count;
  final List<String> imageUrls;

  const _AvatarOverlapGroup({
    required this.count,
    required this.imageUrls,
  });

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    return SizedBox(
      height: 20,
      width: 54,
      child: Stack(
        children: [
          if (imageUrls.isNotEmpty)
            Positioned(
              left: 0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  imageUrls[0],
                  width: 20,
                  height: 20,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 20,
                    height: 20,
                    color: const Color(0xFF0C2B64),
                  ),
                ),
              ),
            ),
          if (imageUrls.length > 1)
            Positioned(
              left: 12,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  imageUrls[1],
                  width: 20,
                  height: 20,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 20,
                    height: 20,
                    color: const Color(0xFF3B82F6),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 24,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              child: Center(
                child: Text(
                  '+$count',
                  style: const TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddClassCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const CreateEditClassPage(),
          ),
        );
      },
      child: DashedBorderContainer(
        child: Container(
          height: 120,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Color(0xFFF1F5F9),
                child: Icon(Icons.add, color: Color(0xFF64748B), size: 24),
              ),
              SizedBox(height: 10),
              Text(
                'Add Another Class',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DashedBorderContainer extends StatelessWidget {
  final Widget child;
  final Color color;
  final double strokeWidth;
  final double gap;
  final double radius;

  const DashedBorderContainer({
    super.key,
    required this.child,
    this.color = const Color(0xFFCBD5E1),
    this.strokeWidth = 1.0,
    this.gap = 5.0,
    this.radius = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRectPainter(
        color: color,
        strokeWidth: strokeWidth,
        gap: gap,
        radius: radius,
      ),
      child: child,
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double gap;
  final double radius;

  _DashedRectPainter({
    required this.color,
    required this.strokeWidth,
    required this.gap,
    required this.radius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final RRect rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(radius),
    );

    final Path path = Path()..addRRect(rrect);

    final Path dashedPath = Path();
    for (final PathMetric metric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        dashedPath.addPath(
          metric.extractPath(distance, distance + gap),
          Offset.zero,
        );
        distance += gap * 2;
      }
    }
    canvas.drawPath(dashedPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
