import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:photo_view/photo_view.dart';
import '../../core/network/submission_service.dart';
import '../../core/network/appeal_service.dart';
import '../../domain/entities/exam.entity.dart';

class SubmissionDetailPage extends StatefulWidget {
  final Submission submission;

  const SubmissionDetailPage({super.key, required this.submission});

  @override
  State<SubmissionDetailPage> createState() => _SubmissionDetailPageState();
}

class _SubmissionDetailPageState extends State<SubmissionDetailPage> {
  late SubmissionService _submissionService;
  late AppealService _appealService;
  bool _isLoading = true;
  bool _isSubmittingAppeal = false;
  Submission? _fullSubmission;
  List<Map<String, dynamic>>? _answerDetails;

  @override
  void initState() {
    super.initState();
    _submissionService = GetIt.instance<SubmissionService>();
    _appealService = GetIt.instance<AppealService>();
    _loadSubmissionDetails();
  }

  Future<void> _loadSubmissionDetails() async {
    setState(() => _isLoading = true);
    try {
      final submissions = await _submissionService.getSubmissionsByExam(widget.submission.examId);
      final found = submissions.where((s) => s.id == widget.submission.id).toList();
      if (found.isNotEmpty) {
        _fullSubmission = found.first;
        _answerDetails = _fullSubmission!.answers;
      }
    } catch (e) {
      _answerDetails = widget.submission.answers;
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  String _getStudentInitials(String name) {
    if (name.isEmpty) return '??';
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.length < 2) return parts.isNotEmpty ? parts.first.substring(0, 1).toUpperCase() : '??';
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  Color _getInitialsBgColor(String name) {
    final colors = [
      const Color(0xFFDBEAFE),
      const Color(0xFFFFEDD5),
      const Color(0xFFE0E7FF),
      const Color(0xFFF3E8FF),
      const Color(0xFFD1FAE5),
    ];
    return colors[name.hashCode.abs() % colors.length];
  }

  Color _getInitialsTextColor(String name) {
    final colors = [
      const Color(0xFF1E40AF),
      const Color(0xFFC2410C),
      const Color(0xFF3730A3),
      const Color(0xFF6B21A8),
      const Color(0xFF065F46),
    ];
    return colors[name.hashCode.abs() % colors.length];
  }

  Future<void> _requestAppeal() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yêu cầu phúc khảo'),
        content: const Text('Bạn có chắc chắn muốn gửi yêu cầu phúc khảo cho bài thi này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Gửi'),
          ),
        ],
      ),
    );

    if (result != true || !mounted) return;

    setState(() => _isSubmittingAppeal = true);
    try {
      await _appealService.createAppeal(
        examId: widget.submission.examId,
        questionNumber: 0,
        reason: 'Student requests re-grading for exam ${widget.submission.examId}',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã gửi yêu cầu phúc khảo thành công'),
            backgroundColor: Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmittingAppeal = false);
    }
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'N/A';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  String _formatTimestamp(DateTime? dt) {
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';
    return _formatDate(dt);
  }

  String _getStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'GRADED': return 'Đã chấm';
      case 'PENDING': return 'Đang chờ';
      case 'SUBMITTED': return 'Đã nộp';
      case 'APPEALED': return 'Phúc khảo';
      default: return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'GRADED': return const Color(0xFF16A34A);
      case 'PENDING': return const Color(0xFFD97706);
      case 'SUBMITTED': return const Color(0xFF1D4ED8);
      case 'APPEALED': return const Color(0xFF7C3AED);
      default: return const Color(0xFF64748B);
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status.toUpperCase()) {
      case 'GRADED': return const Color(0xFFDCFCE7);
      case 'PENDING': return const Color(0xFFFEF3C7);
      case 'SUBMITTED': return const Color(0xFFDBEAFE);
      case 'APPEALED': return const Color(0xFFF3E8FF);
      default: return const Color(0xFFF1F5F9);
    }
  }

  double _getScorePercentage(double? score, double? max) {
    if (score == null || max == null || max == 0) return 0;
    return (score / max * 100);
  }

  @override
  Widget build(BuildContext context) {
    final submission = _fullSubmission ?? widget.submission;
    final name = submission.studentName ?? submission.studentCode ?? 'Unknown';
    final initials = _getStudentInitials(name);
    final bgColor = _getInitialsBgColor(name);
    final textColor = _getInitialsTextColor(name);
    final status = submission.status.toUpperCase();
    final statusColor = _getStatusColor(status);
    final statusBg = _getStatusBgColor(status);
    final statusLabel = _getStatusLabel(status);
    final score = submission.score;
    final maxScore = submission.maxScore ?? 10;
    final percentage = _getScorePercentage(score, maxScore);

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
          'Chi tiết bài nộp',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          if (_fullSubmission?.imageUrl != null && _fullSubmission!.imageUrl!.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.image_outlined, color: Color(0xFF0F172A)),
              onPressed: () => _showImageGallery(context, _fullSubmission!.imageUrl!),
              tooltip: 'View scanned sheet',
            ),
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              statusLabel,
              style: TextStyle(
                color: statusColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: const Color(0xFFE2E8F0),
            height: 1.0,
          ),
        ),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF081C43)))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Student Info Card
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: bgColor,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    initials,
                                    style: TextStyle(
                                      color: textColor,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 20,
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
                                      name,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      submission.studentCode ?? '',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(color: Color(0xFFE2E8F0), height: 1),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _buildInfoItem(
                                  icon: Icons.assignment_outlined,
                                  label: 'Kỳ thi',
                                  value: submission.examTitle ?? 'Unknown',
                                ),
                              ),
                              Expanded(
                                child: _buildInfoItem(
                                  icon: Icons.calendar_today_outlined,
                                  label: 'Ngày thi',
                                  value: _formatDate(submission.examDate),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildInfoItem(
                                  icon: Icons.layers_outlined,
                                  label: 'Mã đề',
                                  value: submission.versionCode ?? 'N/A',
                                ),
                              ),
                              Expanded(
                                child: _buildInfoItem(
                                  icon: Icons.access_time,
                                  label: 'Thời gian nộp',
                                  value: _formatTimestamp(submission.scannedAt),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Score Card
                    if (score != null)
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ĐIỂM SỐ',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      RichText(
                                        text: TextSpan(
                                          style: const TextStyle(
                                            fontFamily: 'Roboto',
                                            color: Color(0xFF0F172A),
                                          ),
                                          children: [
                                            TextSpan(
                                              text: score.toStringAsFixed(1),
                                              style: const TextStyle(
                                                fontSize: 42,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            TextSpan(
                                              text: '/${maxScore.toStringAsFixed(0)}',
                                              style: const TextStyle(
                                                fontSize: 20,
                                                color: Color(0xFF64748B),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        _getGradeLabel(percentage),
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: _getGradeColor(percentage),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                _buildScoreGauge(percentage),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Divider(color: Color(0xFFE2E8F0), height: 1),
                            const SizedBox(height: 16),
                            _buildAnswerBreakdown(),
                          ],
                        ),
                      )
                    else
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFBBF24)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.hourglass_empty, color: Color(0xFFD97706), size: 24),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Bài thi chưa được chấm điểm.',
                                style: TextStyle(
                                  color: Color(0xFFD97706),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Answer Details Card
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'CHI TIẾT ĐÁP ÁN',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '${_getCorrectCount(_answerDetails)}/${_getTotalQuestions(_answerDetails)} đúng',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (_answerDetails != null && _answerDetails!.isNotEmpty)
                            _buildAnswerList(_answerDetails!)
                          else
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 32),
                                child: Column(
                                  children: [
                                    Icon(Icons.help_outline, size: 48, color: Color(0xFFCBD5E1)),
                                    SizedBox(height: 12),
                                    Text(
                                      'Chưa có chi tiết đáp án',
                                      style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Appeal Button
                    if (status == 'GRADED')
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isSubmittingAppeal ? null : _requestAppeal,
                          icon: _isSubmittingAppeal
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.rate_review_outlined, size: 18),
                          label: Text(
                            _isSubmittingAppeal ? 'Đang gửi...' : 'Yêu cầu phúc khảo',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF7C3AED),
                            side: const BorderSide(color: Color(0xFF7C3AED)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: const Color(0xFF0F172A)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildScoreGauge(double percentage) {
    Color color;
    if (percentage >= 80) {
      color = const Color(0xFF16A34A);
    } else if (percentage >= 60) {
      color = const Color(0xFFD97706);
    } else {
      color = const Color(0xFFDC2626);
    }

    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: CircularProgressIndicator(
              value: percentage / 100,
              strokeWidth: 8,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          Text(
            '${percentage.round()}%',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnswerBreakdown() {
    final correct = _getCorrectCount(_answerDetails);
    final wrong = _getWrongCount(_answerDetails);
    final skipped = _getSkippedCount(_answerDetails);
    final total = _getTotalQuestions(_answerDetails);
    return Column(
      children: [
        _buildBreakdownRow('Câu đúng', correct, total, const Color(0xFF16A34A)),
        const SizedBox(height: 10),
        _buildBreakdownRow('Câu sai', wrong, total, const Color(0xFFDC2626)),
        const SizedBox(height: 10),
        _buildBreakdownRow('Câu bỏ trống', skipped, total, const Color(0xFF64748B)),
      ],
    );
  }

  Widget _buildBreakdownRow(String label, int value, int total, Color color) {
    final pct = total > 0 ? (value / total * 100).round() : 0;
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
          ),
        ),
        Text(
          '$value câu ($pct%)',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildAnswerList(List<Map<String, dynamic>> answers) {
    return Column(
      children: List.generate(answers.length, (index) {
        final answer = answers[index];
        final questionNum = (answer['position'] ?? index + 1).toString();
        final isCorrect = answer['isCorrect'] == true;
        final studentAnswer = answer['selectedAnswer'] ?? answer['studentAnswer'] ?? '';
        final correctAnswer = answer['correctAnswer'] ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isCorrect ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Icon(
                    isCorrect ? Icons.check : Icons.close,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Câu $questionNum',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    if (!isCorrect) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Đáp án của bạn: $studentAnswer',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFFDC2626),
                        ),
                      ),
                      Text(
                        'Đáp án đúng: $correctAnswer',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF16A34A),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  int _getCorrectCount(List<Map<String, dynamic>>? answers) {
    if (answers == null || answers.isEmpty) return 0;
    return answers.where((a) => a['isCorrect'] == true).length;
  }

  int _getWrongCount(List<Map<String, dynamic>>? answers) {
    if (answers == null || answers.isEmpty) return 0;
    return answers.where((a) => a['isCorrect'] == false).length;
  }

  int _getSkippedCount(List<Map<String, dynamic>>? answers) {
    if (answers == null || answers.isEmpty) return 0;
    return answers
        .where((a) => a['selectedAnswer'] == null || a['selectedAnswer'] == '' || a['studentAnswer'] == null || a['studentAnswer'] == '')
        .length;
  }

  int _getTotalQuestions(List<Map<String, dynamic>>? answers) {
    if (answers == null || answers.isEmpty) return 0;
    return answers.length;
  }

  String _getGradeLabel(double pct) {
    if (pct >= 90) return 'Xuất sắc';
    if (pct >= 80) return 'Giỏi';
    if (pct >= 70) return 'Khá';
    if (pct >= 60) return 'Trung bình';
    if (pct >= 50) return 'Yếu';
    return 'Kém';
  }

  Color _getGradeColor(double pct) {
    if (pct >= 80) return const Color(0xFF16A34A);
    if (pct >= 60) return const Color(0xFFD97706);
    return const Color(0xFFDC2626);
  }

  void _showImageGallery(BuildContext context, String imageUrl) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            title: const Text(
              'Scanned Sheet',
              style: TextStyle(color: Colors.white),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share, color: Colors.white),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Share feature coming soon')),
                  );
                },
              ),
            ],
          ),
          body: PhotoView(
            imageProvider: NetworkImage(imageUrl),
            minScale: PhotoViewComputedScale.contained,
            maxScale: PhotoViewComputedScale.covered * 3,
            backgroundDecoration: const BoxDecoration(color: Colors.black),
            loadingBuilder: (context, event) => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
            errorBuilder: (context, error, stackTrace) => const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.broken_image, size: 64, color: Colors.white54),
                  SizedBox(height: 16),
                  Text(
                    'Failed to load image',
                    style: TextStyle(color: Colors.white54),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
