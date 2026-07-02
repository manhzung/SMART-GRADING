import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/submission_service.dart';
import '../../domain/entities/exam.entity.dart';
import '../blocs/auth/auth_bloc.dart';

class MyScoresPage extends StatefulWidget {
  const MyScoresPage({super.key});

  @override
  State<MyScoresPage> createState() => _MyScoresPageState();
}

class _MyScoresPageState extends State<MyScoresPage> {
  late SubmissionService _submissionService;
  bool _isLoading = true;
  String? _errorMessage;
  List<Submission> _submissions = [];

  @override
  void initState() {
    super.initState();
    _submissionService = GetIt.instance<SubmissionService>();
    _loadSubmissions();
  }

  Future<void> _loadSubmissions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final authState = context.read<AuthBloc>().state;
      final currentUserId = authState is AuthAuthenticated ? authState.user.id : '';
      final submissions = await _submissionService.getSubmissions(studentId: currentUserId);
      if (mounted) {
        setState(() {
          _submissions = submissions.results;
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

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'N/A';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Color _getScoreColor(double? score) {
    if (score == null) return Colors.grey;
    if (score >= 8) return const Color(0xFF16A34A);
    if (score >= 5) return const Color(0xFFD97706);
    return const Color(0xFFDC2626);
  }

  String _getGradeLabel(double? score) {
    if (score == null) return '-';
    if (score >= 9) return 'Excellent';
    if (score >= 8) return 'Good';
    if (score >= 7) return 'Fair';
    if (score >= 5) return 'Average';
    if (score >= 3) return 'Poor';
    return 'Failing';
  }

  @override
  Widget build(BuildContext context) {
    final mySubmissions = _submissions;
    final graded = mySubmissions.where((s) {
      final status = s.status.toUpperCase();
      return status == 'GRADED' && s.score != null;
    }).toList();
    final avgScore = graded.isNotEmpty
        ? graded.map((s) => s.score!).reduce((a, b) => a + b) / graded.length
        : 0.0;

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
          'My Scores',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF64748B)),
            onPressed: _loadSubmissions,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: const Color(0xFFE2E8F0), height: 1.0),
        ),
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
                        Text(_errorMessage!, style: const TextStyle(color: Color(0xFF64748B))),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadSubmissions,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadSubmissions,
                    child: CustomScrollView(
                      slivers: [
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(24),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Average Score',
                                                  style: TextStyle(color: Colors.white70, fontSize: 14),
                                                ),
                                                const SizedBox(height: 4),
                                                RichText(
                                                  text: TextSpan(
                                                    children: [
                                                      TextSpan(
                                                        text: avgScore.toStringAsFixed(1),
                                                        style: const TextStyle(
                                                          fontSize: 36,
                                                          fontWeight: FontWeight.bold,
                                                          color: Colors.white,
                                                        ),
                                                      ),
                                                      const TextSpan(
                                                        text: '/10',
                                                        style: TextStyle(fontSize: 18, color: Colors.white54),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  _getGradeLabel(avgScore),
                                                  style: TextStyle(
                                                    color: _getScoreColor(avgScore),
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Container(
                                            width: 80,
                                            height: 80,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(color: Colors.white24, width: 3),
                                            ),
                                            child: Center(
                                              child: Text(
                                                '${graded.length}',
                                                style: const TextStyle(
                                                  fontSize: 28,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      const Text(
                                        'exams graded',
                                        style: TextStyle(color: Colors.white54, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildMiniStat(
                                        'Total Exams',
                                        '${mySubmissions.length}',
                                        Icons.assignment,
                                        const Color(0xFF6366F1),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildMiniStat(
                                        'Graded',
                                        '${graded.length}',
                                        Icons.check_circle,
                                        const Color(0xFF16A34A),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildMiniStat(
                                        'Pending',
                                        '${mySubmissions.length - graded.length}',
                                        Icons.hourglass_empty,
                                        const Color(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (mySubmissions.isEmpty)
                          SliverFillRemaining(
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.assignment_outlined, size: 64, color: Colors.grey[300]),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No exams yet',
                                    style: TextStyle(fontSize: 16, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) {
                                  final submission = mySubmissions[index];
                                  final score = submission.score;
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: ListTile(
                                      contentPadding: const EdgeInsets.all(12),
                                      leading: Container(
                                        width: 48,
                                        height: 48,
                                        decoration: BoxDecoration(
                                          color: _getScoreColor(score).withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Center(
                                          child: Text(
                                            score != null ? score.toStringAsFixed(0) : '-',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              color: _getScoreColor(score),
                                            ),
                                          ),
                                        ),
                                      ),
                                      title: Text(
                                        submission.examTitle ?? 'Exam',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const SizedBox(height: 4),
                                          Text(
                                            'Date: ${_formatDate(submission.scannedAt)}',
                                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                          ),
                                          if (submission.status.toUpperCase() == 'GRADED')
                                            Text(
                                              _getGradeLabel(score),
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: _getScoreColor(score),
                                              ),
                                            ),
                                        ],
                                      ),
                                      trailing: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: submission.status.toUpperCase() == 'GRADED'
                                              ? const Color(0xFFDCFCE7)
                                              : const Color(0xFFFEF3C7),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          submission.status.toUpperCase() == 'GRADED' ? 'Graded' : 'Pending',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: submission.status.toUpperCase() == 'GRADED'
                                                ? const Color(0xFF16A34A)
                                                : const Color(0xFFD97706),
                                          ),
                                        ),
                                      ),
                                      onTap: () => Navigator.pushNamed(
                                        context,
                                        '/submission-detail',
                                        arguments: submission,
                                      ),
                                    ),
                                  );
                                },
                                childCount: mySubmissions.length,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
