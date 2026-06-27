import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';
import 'package:smart_grading_mobile/domain/omr/engine_v2/omr_models.dart';
import 'package:smart_grading_mobile/domain/omr/models/grading_result.dart';
import 'package:smart_grading_mobile/domain/entities/user.entity.dart';
import 'package:smart_grading_mobile/presentation/blocs/omr_scanner/omr_scanner_bloc.dart';

class OMRResultPage extends StatelessWidget {
  final Uint8List imageBytes;
  final OMRGradingResult gradingResult;
  final OMRProcessingResult? processingResult;
  final String? examId;
  final String? examName;
  final List<QuestionScoreResult>? questionScores;
  final ClassStudent? student;
  final String? studentCode;
  final String? versionCode;

  const OMRResultPage({
    super.key,
    required this.imageBytes,
    required this.gradingResult,
    this.processingResult,
    this.examId,
    this.examName,
    this.questionScores,
    this.student,
    this.studentCode,
    this.versionCode,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Text(
          examName ?? 'Scan Result',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Share feature coming soon')),
              );
            },
          ),
        ],
      ),
      body: BlocListener<OMRScannerBloc, OMRScannerState>(
        listener: (context, state) {
          if (state is OMRScannerSubmitted) {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.submittedOnline
                      ? 'Submitted successfully!'
                      : 'Saved offline. Will sync when online.',
                ),
                backgroundColor: state.submittedOnline
                    ? const Color(0xFF22C55E)
                    : const Color(0xFFF59E0B),
                duration: const Duration(seconds: 2),
              ),
            );
            // Navigate back to scan page
            Navigator.of(context).pop();
          }
        },
        child: SingleChildScrollView(
          child: Column(
            children: [
              if (processingResult?.annotatedImageBytes != null)
                _buildAnnotatedImage(),
              _buildScoreCard(),
              if (questionScores != null && questionScores!.isNotEmpty)
                _buildPerQuestionScores()
              else
                _buildAnswerBreakdown(),
              if (processingResult != null)
                _buildProcessingInfo(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildAnnotatedImage() {
    // Build scan info lines from actual data
    final lines = <String>[];
    if (studentCode != null && studentCode!.isNotEmpty) {
      lines.add('SBD: $studentCode');
    }
    if (versionCode != null && versionCode!.isNotEmpty) {
      lines.add('MADE: $versionCode');
    }
    final correctCount = gradingResult.verdicts.where((v) => v.verdict == 'correct').length;
    final totalCount = gradingResult.verdicts.length;
    if (totalCount > 0) {
      lines.add('DIEM: ${gradingResult.score.toStringAsFixed(1)} ($correctCount/$totalCount)');
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(Icons.image, size: 20, color: Color(0xFF0F172A)),
                const SizedBox(width: 8),
                Text(
                  'Scanned Sheet',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                if (processingResult?.wasWarped ?? false) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Cropped & Warped',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                alignment: Alignment.topRight,
                children: [
                  Image.memory(
                    processingResult!.annotatedImageBytes!,
                    fit: BoxFit.contain,
                  ),
                  // Scan info overlay - top right
                  if (lines.isNotEmpty)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade400, width: 2),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisSize: MainAxisSize.min,
                          children: lines.map((line) => Text(
                            line,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              height: 1.4,
                            ),
                          )).toList(),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetectedInfoCard() {
    // Hiển thị SBD và Mã đề được đọc từ OMR scan (không chỉnh sửa được)
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.qr_code, color: Colors.white70, size: 20),
          const SizedBox(width: 12),
          if (studentCode != null && studentCode!.isNotEmpty) ...[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Số báo danh',
                    style: TextStyle(
                      color: Colors.white60,
                      fontSize: 11,
                    ),
                  ),
                  Text(
                    studentCode!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (studentCode != null && studentCode!.isNotEmpty && versionCode != null && versionCode!.isNotEmpty)
            Container(
              width: 1,
              height: 36,
              margin: const EdgeInsets.symmetric(horizontal: 16),
              color: Colors.white30,
            ),
          if (versionCode != null && versionCode!.isNotEmpty) ...[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Mã đề',
                    style: TextStyle(
                      color: Colors.white60,
                      fontSize: 11,
                    ),
                  ),
                  Text(
                    versionCode!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStudentInfoCard() {
    final displayName = student?.name ?? studentCode ?? 'Unknown';
    final displayCode = student?.studentCode ?? studentCode;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                if (displayCode != null && student != null)
                  Text(
                    'MSSV: $displayCode',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
          if (student != null)
            const Icon(Icons.verified, color: Colors.white, size: 24),
        ],
      ),
    );
  }

  Widget _buildScoreCard() {
    final pct = gradingResult.percentage;
    final gradeColor = _getGradeColor(gradingResult.grade);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            gradeColor,
            gradeColor.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: gradeColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          if (student != null) ...[
            _buildStudentInfoCard(),
            const SizedBox(height: 16),
          ],
          // Hiển thị SBD và Mã đề đã đọc được từ OMR
          if (studentCode != null || versionCode != null) ...[
            _buildDetectedInfoCard(),
            const SizedBox(height: 16),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                    Text(
                      gradingResult.score.toStringAsFixed(1),
                      style: const TextStyle(
                      color: Colors.white,
                      fontSize: 56,
                      fontWeight: FontWeight.bold,
                      height: 1,
                    ),
                  ),
                  Text(
                    'out of ${gradingResult.maxScore.toStringAsFixed(1)}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        gradingResult.grade,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${pct.toStringAsFixed(1)}%',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildStatItem(
                icon: Icons.check_circle,
                value: '${gradingResult.correctCount}',
                label: 'Correct',
                color: const Color(0xFF22C55E),
              ),
              _buildStatItem(
                icon: Icons.cancel,
                value: '${gradingResult.incorrectCount}',
                label: 'Incorrect',
                color: const Color(0xFFEF4444),
              ),
              _buildStatItem(
                icon: Icons.remove_circle_outline,
                value: '${gradingResult.unmarkedCount}',
                label: 'Unmarked',
                color: const Color(0xFFF59E0B),
              ),
              if (gradingResult.hasMultiMarked)
                _buildStatItem(
                  icon: Icons.warning_amber,
                  value: '!',
                  label: 'Multi-mark',
                  color: const Color(0xFF8B5CF6),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildAnswerBreakdown() {
    if (gradingResult.verdicts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.list_alt, size: 20, color: Color(0xFF0F172A)),
              SizedBox(width: 8),
              Text(
                'Answer Breakdown',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 5,
              childAspectRatio: 1,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: gradingResult.verdicts.length,
            itemBuilder: (context, index) {
              final verdict = gradingResult.verdicts[index];
              final color = _getVerdictColor(verdict.verdict);
              return Container(
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: color.withValues(alpha: 0.3)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Q${index + 1}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                    Text(
                      verdict.markedAnswer.isEmpty ? '-' : verdict.markedAnswer,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                    Icon(
                      _getVerdictIcon(verdict.verdict),
                      size: 12,
                      color: color,
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPerQuestionScores() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.format_list_numbered, size: 20, color: Color(0xFF0F172A)),
              SizedBox(width: 8),
              Text(
                'Per-Question Scores (Engine v2)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: questionScores!.length,
            itemBuilder: (context, index) {
              final q = questionScores![index];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: q.isCorrect
                      ? const Color(0xFFDCFCE7)
                      : (q.isUnmarked ? const Color(0xFFFEF3C7) : const Color(0xFFFEE2E2)),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: q.isCorrect
                        ? const Color(0xFF16A34A)
                        : (q.isUnmarked ? const Color(0xFFD97706) : const Color(0xFFDC2626)),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: q.isCorrect
                            ? const Color(0xFF16A34A)
                            : (q.isUnmarked ? const Color(0xFFD97706) : const Color(0xFFDC2626)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Center(
                        child: Icon(
                          q.isCorrect ? Icons.check : (q.isUnmarked ? Icons.help : Icons.close),
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
                            'Câu ${q.position}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${q.detectedAnswer ?? '?'} vs ${q.correctAnswer ?? '?'}',
                            style: TextStyle(
                              fontSize: 12,
                              color: q.isCorrect
                                  ? const Color(0xFF16A34A)
                                  : (q.isUnmarked ? const Color(0xFFD97706) : const Color(0xFFDC2626)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '+${q.score.toStringAsFixed(1)}/${q.maxScore.toStringAsFixed(1)}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: q.isCorrect
                            ? const Color(0xFF16A34A)
                            : (q.isUnmarked ? const Color(0xFFD97706) : const Color(0xFFDC2626)),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingInfo() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline, size: 20, color: Color(0xFF0F172A)),
              SizedBox(width: 8),
              Text(
                'Processing Details',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
            'Processing time',
            '${processingResult!.processingTime.inMilliseconds}ms',
          ),
          _buildInfoRow(
            'Questions processed',
            '${gradingResult.verdicts.length}',
          ),
          if (processingResult!.response.globalThreshold > 0)
            _buildInfoRow(
              'Global threshold',
              processingResult!.response.globalThreshold.toStringAsFixed(1),
            ),
          if (gradingResult.hasMultiMarked)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber, size: 18, color: Color(0xFFD97706)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Multiple bubbles were marked in one or more questions. Manual review recommended.',
                      style: TextStyle(fontSize: 13, color: Color(0xFFD97706)),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          const Text(
            'Processing steps:',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          ...processingResult!.processingSteps.map((step) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                const Icon(
                  Icons.check,
                  size: 14,
                  color: Color(0xFF22C55E),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    step,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    final hasStudent = student != null;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back),
                label: const Text('Scan Again'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: hasStudent
                      ? () {
                          context.read<OMRScannerBloc>().add(OMRScannerSubmit());
                        }
                      : null,
                  icon: const Icon(Icons.cloud_upload_outlined),
                  label: Text(hasStudent ? 'Submit' : 'Student Not Found'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: hasStudent
                        ? const Color(0xFF6366F1)
                        : const Color(0xFF94A3B8),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getGradeColor(String grade) {
    switch (grade) {
      case 'A+':
      case 'A':
        return const Color(0xFF22C55E);
      case 'B+':
      case 'B':
        return const Color(0xFF3B82F6);
      case 'C+':
      case 'C':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFFEF4444);
    }
  }

  Color _getVerdictColor(String verdict) {
    switch (verdict) {
      case 'correct':
        return const Color(0xFF22C55E);
      case 'incorrect':
        return const Color(0xFFEF4444);
      case 'unmarked':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF64748B);
    }
  }

  IconData _getVerdictIcon(String verdict) {
    switch (verdict) {
      case 'correct':
        return Icons.check;
      case 'incorrect':
        return Icons.close;
      case 'unmarked':
        return Icons.remove;
      default:
        return Icons.help_outline;
    }
  }
}
