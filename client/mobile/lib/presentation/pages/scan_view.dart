import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/exam_selection_page.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_test_lab_page.dart';

class ScanView extends StatefulWidget {
  const ScanView({super.key});

  @override
  State<ScanView> createState() => _ScanViewState();
}

class _ScanViewState extends State<ScanView> {
  String _searchQuery = '';

  void _openCameraScanner(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ExamSelectionPage(),
      ),
    );
  }

  int _getSubmissionCount(SubmissionState state) {
    if (state is SubmissionLoaded) return state.submissions.length;
    if (state is SubmissionError) return _mockSubmissions.length;
    return 0;
  }

  void _openReview(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const _ReviewSubmissionsPage(),
      ),
    );
  }

  void _openAnalytics(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const _AnalyticsPage(),
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
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
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Filter Submissions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.check_circle, color: Color(0xFF10B981)),
              title: const Text('All'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.sync, color: Color(0xFF1A73E8)),
              title: const Text('Pending'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.check_circle_outline, color: Color(0xFF137333)),
              title: const Text('Completed'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.assignment_late_outlined, color: Color(0xFFD97706)),
              title: const Text('Needs Review'),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _uploadSubmissions(BuildContext context) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Upload feature: select PDF/image files from device'),
        backgroundColor: Color(0xFF6366F1),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('[ScanView] build called');
    return BlocBuilder<SubmissionBloc, SubmissionState>(
      builder: (context, state) {
        debugPrint('[ScanView] BlocBuilder state: ${state.runtimeType}');
        if (state is SubmissionLoaded) {
          debugPrint('[ScanView] SubmissionLoaded: ${state.submissions.length} submissions');
          for (final s in state.submissions.take(3)) {
            debugPrint('[ScanView]   - id=${s.id} status="${s.status}" displayStatus="${s.statusUppercase}" name="${s.displayName}"');
          }
        }
        if (state is SubmissionError) {
          debugPrint('[ScanView] SubmissionError: ${state.message}');
        }
        List<Map<String, dynamic>> submissionsToDisplay = [];

        if (state is SubmissionLoaded && state.submissions.isNotEmpty) {
          submissionsToDisplay = state.submissions.map((sub) {
            Color bg;
            Color text;
            IconData icon;
            Color iconBg;

            switch (sub.statusUppercase) {
              case 'COMPLETED':
                bg = const Color(0xFFE6F4EA);
                text = const Color(0xFF137333);
                icon = Icons.check_circle_outline;
                iconBg = const Color(0xFFE6F4EA);
                break;
              case 'PROCESSING':
                bg = const Color(0xFFE8F0FE);
                text = const Color(0xFF1A73E8);
                icon = Icons.sync;
                iconBg = const Color(0xFFEFF6FF);
                break;
              case 'REVIEW':
                bg = const Color(0xFFFEF3C7);
                text = const Color(0xFFD97706);
                icon = Icons.assignment_late_outlined;
                iconBg = const Color(0xFFFEF3C7);
                break;
              default:
                bg = const Color(0xFFFCE8E6);
                text = const Color(0xFFC5221F);
                icon = Icons.error_outline;
                iconBg = const Color(0xFFFFF2EC);
            }

            return {
              'name': sub.displayName,
              'exam': sub.displayExam,
              'time': sub.displayTime,
              'status': sub.statusUppercase,
              'statusBgColor': bg,
              'statusTextColor': text,
              'icon': icon,
              'iconColor': text,
              'iconBgColor': iconBg,
            };
          }).toList();
        } else if (state is SubmissionLoading) {
          submissionsToDisplay = [];
        } else if (state is SubmissionError) {
          submissionsToDisplay = _mockSubmissions;
        } else {
          submissionsToDisplay = _mockSubmissions;
        }

        final List<Map<String, dynamic>> filteredList = submissionsToDisplay.where((item) {
          final String name = item['name'].toString().toLowerCase();
          final String exam = item['exam'].toString().toLowerCase();
          final String search = _searchQuery.toLowerCase();
          return name.contains(search) || exam.contains(search);
        }).toList();

        final bool isLoading = state is SubmissionLoading;

        return RefreshIndicator(
          onRefresh: () async {
            context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
          },
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Grading Center',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Centralize and automate your workflow.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 20),

                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => _openCameraScanner(context),
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.videocam_outlined, color: Colors.white, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Live Scan',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 4,
                            child: GestureDetector(
                              onTap: () => _openReview(context),
                              child: Container(
                                height: 48,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.warning_amber_rounded, color: Color(0xFF0F172A), size: 20),
                                      SizedBox(width: 8),
                                      Text(
                                        'Review',
                                        style: TextStyle(
                                          color: Color(0xFF0F172A),
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: GestureDetector(
                              onTap: () => _openAnalytics(context),
                              child: const Center(
                                child: Icon(Icons.bar_chart_outlined, color: Color(0xFF0F172A), size: 22),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const OMRTestLabPage(),
                                ),
                              );
                            },
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366F1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Icon(Icons.science_outlined, color: Colors.white, size: 22),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      DashedBorderContainer(
                        child: GestureDetector(
                          onTap: () => _uploadSubmissions(context),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.01),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE8F0FE),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.note_add_outlined,
                                      color: Color(0xFF1A73E8),
                                      size: 22,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Upload Submissions',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Tap to browse or drag PDF scans here.',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right,
                                  color: Color(0xFF94A3B8),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Row(
                                children: [
                                  const Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextField(
                                      onChanged: (val) {
                                        setState(() {
                                          _searchQuery = val;
                                        });
                                      },
                                      decoration: const InputDecoration(
                                        hintText: 'Search students...',
                                        hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                                        border: InputBorder.none,
                                        isDense: true,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          GestureDetector(
                            onTap: () => _showFilterSheet(context),
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Center(
                                child: Icon(Icons.tune_outlined, color: Color(0xFF0F172A), size: 20),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Padding(
                              padding: EdgeInsets.all(16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Recent Submissions',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    'TODAY',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF64748B),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(color: Color(0xFFE2E8F0), height: 1),

                            if (isLoading)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 30),
                                child: Center(child: CircularProgressIndicator()),
                              )
                            else if (filteredList.isEmpty)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 30),
                                child: Center(
                                  child: Text(
                                    'No recent submissions found.',
                                    style: TextStyle(color: Color(0xFF64748B)),
                                  ),
                                ),
                              )
                            else ...[
                              if (state is SubmissionError)
                                Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFCE8E6),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.cloud_off, size: 16, color: Color(0xFFC5221F)),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          state.message,
                                          style: const TextStyle(fontSize: 12, color: Color(0xFFC5221F)),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ...filteredList.map((item) {
                                return Column(
                                  children: [
                                    _SubmissionRow(
                                      name: item['name'],
                                      exam: item['exam'],
                                      time: item['time'],
                                      status: item['status'],
                                      statusBgColor: item['statusBgColor'],
                                      statusTextColor: item['statusTextColor'],
                                      icon: item['icon'],
                                      iconColor: item['iconColor'],
                                      iconBgColor: item['iconBgColor'],
                                    ),
                                    const Divider(color: Color(0xFFE2E8F0), height: 1),
                                  ],
                                );
                              }),
                            ],

                            InkWell(
                              onTap: () => _openReview(context),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                alignment: Alignment.center,
                                child: Text(
                                  'View All Submissions (${_getSubmissionCount(state)})',
                                  style: const TextStyle(
                                    color: Color(0xFF0C2B64),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF071D3E),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'QUEUE PERFORMANCE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF93C5FD),
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                SizedBox(height: 6),
                                Text(
                                  '98.2% Accuracy',
                                  style: TextStyle(
                                    fontSize: 20,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: const [
                                Text(
                                  'Processing Time',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF93C5FD),
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                SizedBox(height: 6),
                                Text(
                                  '1.4s/pg',
                                  style: TextStyle(
                                    fontSize: 20,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static final List<Map<String, dynamic>> _mockSubmissions = [
    {
      'name': 'Elena Rodriguez',
      'exam': 'Midterm Calculus II',
      'time': '10:24 AM',
      'status': 'GRADED',
      'statusBgColor': const Color(0xFFE6F4EA),
      'statusTextColor': const Color(0xFF137333),
      'icon': Icons.check_circle_outline,
      'iconColor': Color(0xFF137333),
      'iconBgColor': const Color(0xFFE6F4EA),
    },
    {
      'name': 'Marcus Chen',
      'exam': 'Midterm Calculus II',
      'time': '11:02 AM',
      'status': 'PROCESSING',
      'statusBgColor': const Color(0xFFE8F0FE),
      'statusTextColor': const Color(0xFF1A73E8),
      'icon': Icons.sync,
      'iconColor': const Color(0xFF1A73E8),
      'iconBgColor': const Color(0xFFEFF6FF),
    },
    {
      'name': 'Sarah Jenkins',
      'exam': 'Midterm Calculus II',
      'time': '11:15 AM',
      'status': 'ERROR',
      'statusBgColor': const Color(0xFFFCE8E6),
      'statusTextColor': const Color(0xFFC5221F),
      'icon': Icons.error_outline,
      'iconColor': const Color(0xFFC5221F),
      'iconBgColor': const Color(0xFFFFF2EC),
    },
    {
      'name': 'David Omari',
      'exam': 'Midterm Calculus II',
      'time': '11:30 AM',
      'status': 'REVIEW',
      'statusBgColor': const Color(0xFFFEF3C7),
      'statusTextColor': const Color(0xFFD97706),
      'icon': Icons.assignment_late_outlined,
      'iconColor': const Color(0xFFD97706),
      'iconBgColor': const Color(0xFFFEF3C7),
    },
  ];
}

class _SubmissionRow extends StatelessWidget {
  final String name;
  final String exam;
  final String time;
  final String status;
  final Color statusBgColor;
  final Color statusTextColor;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;

  const _SubmissionRow({
    required this.name,
    required this.exam,
    required this.time,
    required this.status,
    required this.statusBgColor,
    required this.statusTextColor,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$exam \u2022 $time',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: statusBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Text(
              status,
              style: TextStyle(
                color: statusTextColor,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
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

class _ReviewSubmissionsPage extends StatelessWidget {
  const _ReviewSubmissionsPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          'Review Submissions',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.fact_check_outlined, size: 64, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text(
              'Manual Review',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            SizedBox(height: 8),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 48),
              child: Text(
                'Review submissions flagged for manual review due to multiple marks or low confidence.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnalyticsPage extends StatelessWidget {
  const _AnalyticsPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          'Analytics',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart_outlined, size: 64, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text(
              'Grading Analytics',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            SizedBox(height: 8),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 48),
              child: Text(
                'View submission statistics, grade distribution, and performance trends.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
