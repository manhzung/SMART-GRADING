import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/entities/exam.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/submission/submission_bloc.dart';
import 'package:smart_grading_mobile/presentation/pages/exam_selection_page.dart';
import 'package:smart_grading_mobile/presentation/pages/omr_test_lab_page.dart';
import 'submission_detail_page.dart';

export 'package:smart_grading_mobile/domain/entities/exam.entity.dart' show Submission;

class ScanView extends StatefulWidget {
  const ScanView({super.key});

  @override
  State<ScanView> createState() => _ScanViewState();
}

class _ScanViewState extends State<ScanView> {
  @override
  void initState() {
    super.initState();
    debugPrint('[ScanView] initState — dispatching SubmissionLoadRequested');
    context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
  }

  void _openCameraScanner(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ExamSelectionPage(),
      ),
    );
  }

  void _openReview(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const _ReviewSubmissionsPage(),
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
    debugPrint('[ScanView] build() called');
    return BlocBuilder<SubmissionBloc, SubmissionState>(
      builder: (context, state) {
        // --- DETAILED DATA FLOW LOGGING ---
        debugPrint('[ScanView] ████ BlocBuilder state=${state.runtimeType} ████');
        if (state is SubmissionLoaded) {
          debugPrint('[ScanView]   submissions count = ${state.submissions.length}');
          for (final s in state.submissions) {
            debugPrint(
              '[ScanView]   SUB: id=${s.id} '
              'displayName="${s.displayName}" '
              'studentCode="${s.studentCode ?? 'null'}" '
              'className="${s.className ?? 'null'}" '
              'score=${s.score} '
              'maxScore=${s.maxScore} '
              'status="${s.status}" '
              'statusUppercase="${s.statusUppercase}"',
            );
          }
        } else if (state is SubmissionError) {
          debugPrint('[ScanView]   ERROR: ${state.message}');
        } else if (state is SubmissionInitial) {
          debugPrint('[ScanView]   INITIAL — bloc not loaded');
        } else if (state is SubmissionLoading) {
          debugPrint('[ScanView]   LOADING...');
        }

        List<Submission> submissionsToDisplay = [];

        if (state is SubmissionLoaded && state.submissions.isNotEmpty) {
          submissionsToDisplay = state.submissions;
        } else if (state is SubmissionLoading) {
          submissionsToDisplay = [];
        } else {
          // SubmissionInitial or SubmissionError: do not display mock
          submissionsToDisplay = [];
        }

        final List<Submission> filteredList = submissionsToDisplay.take(5).toList();

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
                          Expanded(
                            flex: 10,
                            child: GestureDetector(
                              onTap: () => _openCameraScanner(context),
                              child: Container(
                                height: 72,
                                padding: const EdgeInsets.symmetric(horizontal: 24),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.videocam_outlined, color: Colors.white, size: 36),
                                    SizedBox(width: 14),
                                    Text(
                                      'Live Scan',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 20,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 6,
                            child: GestureDetector(
                              onTap: () => _openReview(context),
                              child: Container(
                                height: 64,
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.warning_amber_rounded, color: Color(0xFF0F172A), size: 32),
                                    SizedBox(width: 12),
                                    Text(
                                      'Review',
                                      style: TextStyle(
                                        color: Color(0xFF0F172A),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18,
                                      ),
                                    ),
                                  ],
                                ),
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
                            else ...[
                              // Error UI: hien thi khi SubmissionError
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
                                      const SizedBox(width: 8),
                                      TextButton(
                                        onPressed: () {
                                          context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
                                        },
                                        child: const Text(
                                          'Retry',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFC5221F)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              // List or empty state
                              if (filteredList.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 30),
                                  child: Center(
                                    child: Text(
                                      'No recent submissions found.',
                                      style: TextStyle(color: Color(0xFF64748B)),
                                    ),
                                  ),
                                )
                              else ...filteredList.map((item) {
                                final status = item.statusUppercase;
                                Color statusBgColor;
                                Color statusTextColor;
                                IconData icon;
                                Color iconColor;
                                Color iconBgColor;

                                switch (status) {
                                  case 'COMPLETED':
                                    statusBgColor = const Color(0xFFE6F4EA);
                                    statusTextColor = const Color(0xFF137333);
                                    icon = Icons.check_circle_outline;
                                    iconColor = const Color(0xFF137333);
                                    iconBgColor = const Color(0xFFE6F4EA);
                                    break;
                                  case 'PROCESSING':
                                    statusBgColor = const Color(0xFFE8F0FE);
                                    statusTextColor = const Color(0xFF1A73E8);
                                    icon = Icons.sync;
                                    iconColor = const Color(0xFF1A73E8);
                                    iconBgColor = const Color(0xFFE8F0FE);
                                    break;
                                  case 'REVIEW':
                                    statusBgColor = const Color(0xFFFEF3C7);
                                    statusTextColor = const Color(0xFFD97706);
                                    icon = Icons.assignment_late_outlined;
                                    iconColor = const Color(0xFFD97706);
                                    iconBgColor = const Color(0xFFFEF3C7);
                                    break;
                                  default:
                                    statusBgColor = const Color(0xFFFCE8E6);
                                    statusTextColor = const Color(0xFFC5221F);
                                    icon = Icons.error_outline;
                                    iconColor = const Color(0xFFC5221F);
                                    iconBgColor = const Color(0xFFFFF2EC);
                                }

                                return Column(
                                  children: [
                                    SubmissionRow(
                                      submission: item,
                                      statusBgColor: statusBgColor,
                                      statusTextColor: statusTextColor,
                                      icon: icon,
                                      iconColor: iconColor,
                                      iconBgColor: iconBgColor,
                                    ),
                                    const Divider(color: Color(0xFFE2E8F0), height: 1),
                                  ],
                                );
                              }),
                            ],
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

}

class SubmissionRow extends StatelessWidget {
  final Submission submission;
  final Color statusBgColor;
  final Color statusTextColor;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;

  const SubmissionRow({
    super.key,
    required this.submission,
    required this.statusBgColor,
    required this.statusTextColor,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
  });

  String _formatScore(Submission s) {
    if (s.score == null) return '--/--';
    final score = s.score!.toStringAsFixed(1);
    final max = (s.maxScore ?? 10).toStringAsFixed(0);
    return '$score/$max';
  }

  String? _buildSubtitle() {
    final code = submission.studentCode;
    final cls = submission.className;
    if (code != null && cls != null) return '$code \u2022 $cls';
    if (code != null) return code;
    if (cls != null) return cls;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = _buildSubtitle();
    debugPrint(
      '[SubmissionRow] build() displayName="${submission.displayName}" '
      'studentCode="${submission.studentCode ?? 'null'}" '
      'className="${submission.className ?? 'null'}" '
      'score=${submission.score} maxScore=${submission.maxScore} '
      'statusUppercase="${submission.statusUppercase}" '
      'subtitle="${subtitle ?? 'null'}"',
    );

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SubmissionDetailPage(submission: submission),
          ),
        );
      },
      child: Padding(
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
                    submission.displayName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatScore(submission),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  child: Text(
                    submission.statusUppercase,
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
          ],
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

class _ReviewSubmissionsPage extends StatefulWidget {
  const _ReviewSubmissionsPage();

  @override
  State<_ReviewSubmissionsPage> createState() => _ReviewSubmissionsPageState();
}

class _ReviewSubmissionsPageState extends State<_ReviewSubmissionsPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedFilter = 'ALL'; // 'ALL', 'REVIEW', 'COMPLETED'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

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
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search by student name or code...',
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Color(0xFF64748B)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildFilterChip('ALL', 'All'),
                    const SizedBox(width: 8),
                    _buildFilterChip('REVIEW', 'Needs Review'),
                    const SizedBox(width: 8),
                    _buildFilterChip('COMPLETED', 'Completed'),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          Expanded(
            child: BlocBuilder<SubmissionBloc, SubmissionState>(
              builder: (context, state) {
                if (state is SubmissionLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state is SubmissionError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
                        const SizedBox(height: 16),
                        Text(state.message, style: const TextStyle(color: Color(0xFF64748B))),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F172A),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }
                List<Submission> submissions = [];
                if (state is SubmissionLoaded) {
                  submissions = state.submissions;
                }

                final filtered = submissions.where((item) {
                  final itemStatus = item.statusUppercase;
                  if (_selectedFilter == 'REVIEW') {
                    if (itemStatus != 'REVIEW' && item.status != 'manual_review') {
                      return false;
                    }
                  } else if (_selectedFilter == 'COMPLETED') {
                    if (itemStatus != 'COMPLETED') {
                      return false;
                    }
                  }

                  if (_searchQuery.isNotEmpty) {
                    final query = _searchQuery.toLowerCase();
                    final name = item.displayName.toLowerCase();
                    final code = (item.studentCode ?? '').toLowerCase();
                    final exam = (item.examTitle ?? '').toLowerCase();
                    final cls = (item.className ?? '').toLowerCase();

                    return name.contains(query) ||
                        code.contains(query) ||
                        exam.contains(query) ||
                        cls.contains(query);
                  }
                  return true;
                }).toList();

                if (filtered.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: () async {
                      context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
                    },
                    child: ListView(
                      children: [
                        SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                        const Icon(Icons.fact_check_outlined, size: 64, color: Color(0xFFCBD5E1)),
                        const SizedBox(height: 16),
                        const Center(
                          child: Text(
                            'No submissions found',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Center(
                          child: Text(
                            'Try adjusting your search or filters',
                            style: TextStyle(color: Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<SubmissionBloc>().add(const SubmissionLoadRequested());
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    itemCount: filtered.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final status = item.statusUppercase;
                      Color statusBgColor;
                      Color statusTextColor;
                      IconData icon;
                      Color iconColor;
                      Color iconBgColor;

                      switch (status) {
                        case 'COMPLETED':
                          statusBgColor = const Color(0xFFE6F4EA);
                          statusTextColor = const Color(0xFF137333);
                          icon = Icons.check_circle_outline;
                          iconColor = const Color(0xFF137333);
                          iconBgColor = const Color(0xFFE6F4EA);
                          break;
                        case 'PROCESSING':
                          statusBgColor = const Color(0xFFE8F0FE);
                          statusTextColor = const Color(0xFF1A73E8);
                          icon = Icons.sync;
                          iconColor = const Color(0xFF1A73E8);
                          iconBgColor = const Color(0xFFE8F0FE);
                          break;
                        case 'REVIEW':
                          statusBgColor = const Color(0xFFFEF3C7);
                          statusTextColor = const Color(0xFFD97706);
                          icon = Icons.assignment_late_outlined;
                          iconColor = const Color(0xFFD97706);
                          iconBgColor = const Color(0xFFFEF3C7);
                          break;
                        default:
                          statusBgColor = const Color(0xFFFCE8E6);
                          statusTextColor = const Color(0xFFC5221F);
                          icon = Icons.error_outline;
                          iconColor = const Color(0xFFC5221F);
                          iconBgColor = const Color(0xFFFFF2EC);
                      }

                      return SubmissionRow(
                        submission: item,
                        statusBgColor: statusBgColor,
                        statusTextColor: statusTextColor,
                        icon: icon,
                        iconColor: iconColor,
                        iconBgColor: iconBgColor,
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter, String label) {
    final bool isSelected = _selectedFilter == filter;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = filter;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF475569),
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
