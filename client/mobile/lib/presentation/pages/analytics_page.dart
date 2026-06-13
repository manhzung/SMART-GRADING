import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/analytics_service.dart';
import '../../domain/entities/analytics.entity.dart';

class AnalyticsPage extends StatefulWidget {
  const AnalyticsPage({super.key});

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  int _selectedPeriod = 1;

  bool _isLoading = true;
  String? _errorMessage;
  AnalyticsData? _analyticsData;
  DashboardStats? _dashboardStats;

  AnalyticsService get _analyticsService => GetIt.instance<AnalyticsService>();

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final period = _periodParam;
      final results = await Future.wait([
        _analyticsService.getDashboardStats(),
        _analyticsService.getAnalytics(period: period),
      ]);

      if (mounted) {
        setState(() {
          _dashboardStats = results[0] as DashboardStats;
          _analyticsData = results[1] as AnalyticsData;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String get _periodParam {
    switch (_selectedPeriod) {
      case 0:
        return '7d';
      case 1:
        return '30d';
      case 2:
        return 'semester';
      default:
        return '30d';
    }
  }

  Future<void> _refreshData() async {
    await _loadAnalytics();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Thống kê',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: Color(0xFF0C2B64),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'TP',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
                        const SizedBox(height: 16),
                        const Text(
                          'Không thể tải dữ liệu thống kê',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: _loadAnalytics,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshData,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildPeriodSelector(),
                          const SizedBox(height: 20),
                          _buildStatsGrid(),
                          const SizedBox(height: 20),
                          if (_analyticsData != null) ...[
                            _buildScoreTrendSection(),
                            const SizedBox(height: 20),
                            _buildGradeDistributionSection(),
                            const SizedBox(height: 20),
                            _buildTopStudentsSection(),
                            const SizedBox(height: 20),
                            _buildSubjectPerformanceSection(),
                          ],
                          const SizedBox(height: 60),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildPeriodSelector() {
    final periods = ['7 ngày', '30 ngày', 'Học kỳ'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(periods.length, (index) {
          final isSelected = _selectedPeriod == index;
          return Padding(
            padding: EdgeInsets.only(right: index < 2 ? 8 : 0),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedPeriod = index;
                });
                _loadAnalytics();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  periods[index],
                  style: TextStyle(
                    color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStatsGrid() {
    final stats = _dashboardStats;
    final summary = _analyticsData?.summary;

    final totalStudents = stats?.totalStudents ?? summary?.totalStudents ?? 0;
    final totalExams = stats?.totalExams ?? summary?.totalExams ?? 0;
    final avgScore = stats?.avgScore ?? summary?.avgScore ?? 0.0;
    final passRate = stats?.passRate ?? 0;

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildStatCard(
              icon: Icons.people_outline,
              iconColor: const Color(0xFF3B82F6),
              iconBgColor: const Color(0xFFDBEAFE),
              value: _formatNumber(totalStudents),
              label: 'Tổng học sinh',
            )),
            const SizedBox(width: 12),
            Expanded(child: _buildStatCard(
              icon: Icons.assignment_outlined,
              iconColor: const Color(0xFF8B5CF6),
              iconBgColor: const Color(0xFFEDE9FE),
              value: _formatNumber(totalExams),
              label: 'Tổng kỳ thi',
            )),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildStatCard(
              icon: Icons.analytics_outlined,
              iconColor: const Color(0xFF10B981),
              iconBgColor: const Color(0xFFD1FAE5),
              value: '${avgScore.toStringAsFixed(1)}/10',
              label: 'Điểm trung bình',
            )),
            const SizedBox(width: 12),
            Expanded(child: _buildStatCard(
              icon: Icons.check_circle_outline,
              iconColor: const Color(0xFFF59E0B),
              iconBgColor: const Color(0xFFFEF3C7),
              value: '$passRate%',
              label: 'Tỷ lệ đạt',
            )),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String value,
    required String label,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreTrendSection() {
    final trends = _analyticsData?.recentTrends ?? [];
    if (trends.isEmpty) {
      return const SizedBox.shrink();
    }

    final scores = trends.map((t) => t.avgScore).toList();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Xu hướng điểm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: CustomPaint(
              size: Size.infinite,
              painter: _ScoreTrendPainter(
                data: scores,
                lineColor: const Color(0xFF081C43),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGradeDistributionSection() {
    final grades = _analyticsData?.gradeDistribution ?? [];
    if (grades.isEmpty) {
      return const SizedBox.shrink();
    }

    final gradeColors = {
      'A': const Color(0xFF10B981),
      'B': const Color(0xFF3B82F6),
      'C': const Color(0xFFEAB308),
      'D': const Color(0xFFF97316),
      'F': const Color(0xFFEF4444),
    };

    final gradeLabels = {
      'A': 'A (8.5-10)',
      'B': 'B (7.0-8.4)',
      'C': 'C (5.5-6.9)',
      'D': 'D (4.0-5.4)',
      'F': 'F (0-3.9)',
    };

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Phân bố điểm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          ...grades.map((g) {
            final percentage = (g.percentage).round();
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        gradeLabels[g.grade] ?? g.grade,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      Text(
                        '$percentage%',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: percentage / 100,
                      minHeight: 8,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        gradeColors[g.grade] ?? const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTopStudentsSection() {
    final rankings = _analyticsData?.studentRankings ?? [];
    if (rankings.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Học sinh xuất sắc',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          ...List.generate(rankings.length > 5 ? 5 : rankings.length, (index) {
            final student = rankings[index];
            return _buildStudentRow(
              rank: index + 1,
              name: student.name,
              className: student.email ?? '',
              score: student.avgScore,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStudentRow({
    required int rank,
    required String name,
    required String className,
    required double score,
  }) {
    final medalColors = {
      1: const Color(0xFFFFD700),
      2: const Color(0xFFC0C0C0),
      3: const Color(0xFFCD7F32),
    };

    final avatarColors = [
      const Color(0xFF3B82F6),
      const Color(0xFF8B5CF6),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
      const Color(0xFFEF4444),
    ];

    Widget rankWidget;
    if (rank <= 3) {
      rankWidget = Icon(
        Icons.emoji_events,
        color: medalColors[rank],
        size: 24,
      );
    } else {
      rankWidget = Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            '$rank',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
            ),
          ),
        ),
      );
    }

    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    final initials = parts.isEmpty ? '?' : parts.take(2).map((e) => e[0]).join();

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Center(child: rankWidget),
          ),
          const SizedBox(width: 12),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: avatarColors[(rank - 1) % avatarColors.length],
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                initials,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Text(
                  className,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Text(
            score.toStringAsFixed(1),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectPerformanceSection() {
    final subjects = _analyticsData?.subjectPerformance ?? [];
    if (subjects.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Theo môn học',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          ...subjects.map((s) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  SizedBox(
                    width: 50,
                    child: Text(
                      s.subject,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: s.avgScore / 10,
                        minHeight: 8,
                        backgroundColor: const Color(0xFFF1F5F9),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 36,
                    child: Text(
                      s.avgScore.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(number % 1000 == 0 ? 0 : 1)}K';
    }
    return number.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }
}

class _ScoreTrendPainter extends CustomPainter {
  final List<double> data;
  final Color lineColor;

  _ScoreTrendPainter({required this.data, required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final gridPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 1;

    final pointPaint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.fill;

    final pointBorderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    const double leftPadding = 35;
    const double rightPadding = 10;
    const double topPadding = 10;
    const double bottomPadding = 30;

    final chartWidth = size.width - leftPadding - rightPadding;
    final chartHeight = size.height - topPadding - bottomPadding;

    final yLabels = [10.0, 7.5, 5.0, 2.5];
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int i = 0; i < yLabels.length; i++) {
      final y = topPadding + (chartHeight / (yLabels.length - 1)) * i;
      canvas.drawLine(Offset(leftPadding, y), Offset(size.width - rightPadding, y), gridPaint);
      textPainter.text = TextSpan(
        text: yLabels[i].toString(),
        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(0, y - textPainter.height / 2));
    }

    const minY = 2.5;
    const maxY = 10.0;
    final points = <Offset>[];

    for (int i = 0; i < data.length; i++) {
      final x = leftPadding + (chartWidth / (data.length - 1)) * i;
      final normalizedY = (data[i] - minY) / (maxY - minY);
      final y = topPadding + chartHeight * (1 - normalizedY);
      points.add(Offset(x, y));
    }

    final path = Path();
    path.moveTo(points[0].dx, points[0].dy);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }

    canvas.drawPath(path, paint);

    for (final point in points) {
      canvas.drawCircle(point, 5, pointBorderPaint);
      canvas.drawCircle(point, 3, pointPaint);
    }

    final xLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'];
    for (int i = 0; i < data.length && i < xLabels.length; i++) {
      final x = leftPadding + (chartWidth / (data.length - 1)) * i;
      textPainter.text = TextSpan(
        text: xLabels[i],
        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(x - textPainter.width / 2, size.height - bottomPadding + 8),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
