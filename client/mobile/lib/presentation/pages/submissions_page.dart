import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/network/exam_submissions_service.dart';
import '../../domain/entities/class_submission_summary.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../../main.dart' show getIt;
import '../blocs/exam_submissions/exam_submissions_bloc.dart';
import '../blocs/exam_submissions/exam_submissions_event.dart';
import '../blocs/exam_submissions/exam_submissions_state.dart';
import 'submission_detail_page.dart';

class SubmissionsPage extends StatefulWidget {
  final Exam? exam;
  final String? examId;
  final String? initialClassId;
  final ExamSubmissionsService? service;

  const SubmissionsPage({
    super.key,
    this.exam,
    this.examId,
    this.initialClassId,
    this.service,
  });

  @override
  State<SubmissionsPage> createState() => _SubmissionsPageState();
}

class _SubmissionsPageState extends State<SubmissionsPage> {
  final TextEditingController _searchController = TextEditingController();
  late final ExamSubmissionsBloc _bloc;
  late final String _effectiveExamId;

  @override
  void initState() {
    super.initState();
    _effectiveExamId = widget.examId ?? widget.exam?.id ?? '';
    final service = widget.service ?? getIt<ExamSubmissionsService>();
    _bloc = ExamSubmissionsBloc(service: service)
      ..add(ExamSubmissionsLoadRequested(examId: _effectiveExamId));
  }

  @override
  void dispose() {
    _searchController.dispose();
    _bloc.close();
    super.dispose();
  }

  void _showSubmissionDetails(Submission submission) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SubmissionDetailPage(submission: submission),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            widget.exam != null ? 'Bài nộp: ${widget.exam!.title}' : 'Bài nộp theo lớp',
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ),
        body: SafeArea(
          child: BlocBuilder<ExamSubmissionsBloc, ExamSubmissionsState>(
            builder: (context, state) {
              if (state is ExamSubmissionsLoading || state is ExamSubmissionsInitial) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF0C2B64)));
              }
              if (state is ExamSubmissionsError) {
                return _buildErrorState(state.message);
              }
              if (state is ExamSubmissionsLoaded) {
                return _buildLoadedContent(state);
              }
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
          const SizedBox(height: 16),
          Text('Không thể tải dữ liệu: $message',
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => _bloc.add(ExamSubmissionsRefreshRequested(examId: _effectiveExamId)),
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadedContent(ExamSubmissionsLoaded state) {
    return Column(
      children: [
        _buildStatsRow(state),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => _bloc.add(ExamSubmissionsSearchChanged(query: value)),
              decoration: const InputDecoration(
                hintText: 'Tìm kiếm học sinh, mã bài...',
                hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                prefixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _buildFilterChips(state),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: state.byClass.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: () async => _bloc.add(ExamSubmissionsRefreshRequested(examId: _effectiveExamId)),
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: state.byClass.values.map((summary) {
                      return _buildClassSection(summary, state);
                    }).toList(),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(ExamSubmissionsLoaded state) {
    final totalSubmitted = state.byClass.values.fold<int>(0, (s, c) => s + c.totalSubmitted);
    final totalGraded = state.byClass.values.fold<int>(0, (s, c) => s + c.totalGraded);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _buildStatCard(Icons.assignment_turned_in, const Color(0xFF3B82F6), const Color(0xFFDBEAFE),
              totalSubmitted.toString(), 'Tổng bài nộp'),
          const SizedBox(width: 8),
          _buildStatCard(Icons.check_circle, const Color(0xFF16A34A), const Color(0xFFDCFCE7),
              totalGraded.toString(), 'Đã chấm'),
          const SizedBox(width: 8),
          _buildStatCard(Icons.class_outlined, const Color(0xFFD97706), const Color(0xFFFEF3C7),
              state.byClass.length.toString(), 'Lớp'),
        ],
      ),
    );
  }

  Widget _buildStatCard(IconData icon, Color iconColor, Color iconBg, String value, String label) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips(ExamSubmissionsLoaded state) {
    const filters = ['ALL', 'GRADED', 'PENDING', 'SUBMITTED'];
    const labels = {'ALL': 'Tất cả', 'GRADED': 'Đã chấm', 'PENDING': 'Đang chờ', 'SUBMITTED': 'Đã nộp'};
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: filters.map((f) {
          final selected = state.filter == f;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => _bloc.add(ExamSubmissionsFilterChanged(filter: f)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(labels[f]!,
                    style: TextStyle(
                      color: selected ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                      fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 13,
                    )),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildClassSection(ClassSubmissionSummary summary, ExamSubmissionsLoaded state) {
    final filtered = _filterSubmissions(summary.submissions, state.filter, state.searchQuery);
    final isExpanded = state.expandedClassIds.contains(summary.classId);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => _bloc.add(ExamSubmissionClassToggled(classId: summary.classId)),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(summary.className,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                        const SizedBox(height: 4),
                        Text('${summary.totalSubmitted} submitted • ${summary.totalGraded} graded',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Icon(isExpanded ? Icons.expand_less : Icons.expand_more, color: const Color(0xFF64748B)),
                ],
              ),
            ),
          ),
          if (isExpanded) ...[
            const Divider(height: 1),
            if (filtered.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Không có bài nộp phù hợp',
                  style: TextStyle(color: Color(0xFF94A3B8)),
                ),
              )
            else
              ...filtered.map((s) => _buildSubmissionCard(s)),
          ],
        ],
      ),
    );
  }

  List<Submission> _filterSubmissions(List<Submission> submissions, String filter, String query) {
    Iterable<Submission> result = submissions;
    if (filter != 'ALL') {
      result = result.where((s) => s.status.toUpperCase() == filter);
    }
    if (query.isNotEmpty) {
      final q = query.toLowerCase();
      result = result.where((s) {
        final name = (s.studentName ?? '').toLowerCase();
        final code = (s.studentCode ?? '').toLowerCase();
        return name.contains(q) || code.contains(q);
      });
    }
    return result.toList();
  }

  Widget _buildSubmissionCard(Submission submission) {
    final name = submission.studentName ?? submission.studentCode ?? 'Unknown';
    Color statusBg; Color statusText; String statusLabel;
    switch (submission.status.toUpperCase()) {
      case 'GRADED': statusBg = const Color(0xFFDCFCE7); statusText = const Color(0xFF16A34A); statusLabel = 'Đã chấm'; break;
      case 'PENDING': statusBg = const Color(0xFFFEF3C7); statusText = const Color(0xFFD97706); statusLabel = 'Đang chờ'; break;
      case 'SUBMITTED': statusBg = const Color(0xFFDBEAFE); statusText = const Color(0xFF1D4ED8); statusLabel = 'Đã nộp'; break;
      default: statusBg = const Color(0xFFF1F5F9); statusText = const Color(0xFF64748B); statusLabel = submission.status;
    }

    return InkWell(
      onTap: () => _showSubmissionDetails(submission),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(color: Color(0xFFDBEAFE), shape: BoxShape.circle),
              child: Center(
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  if (submission.studentCode != null)
                    Text(submission.studentCode!, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (submission.score != null)
                  Text('${submission.score!.toStringAsFixed(1)}/10',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)))
                else
                  const Text('--/10', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(12)),
                  child: Text(statusLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusText)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.assignment_outlined, size: 64, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 16),
            const Text('Chưa có bài nộp nào', style: TextStyle(fontSize: 15, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
