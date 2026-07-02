import 'package:flutter/material.dart';
import '../../domain/entities/class_submission_summary.entity.dart';
import '../pages/submissions_page.dart';

class SubmissionSummaryWidget extends StatelessWidget {
  final Map<String, ClassSubmissionSummary> summaries;
  final String examId;

  const SubmissionSummaryWidget({
    super.key,
    required this.summaries,
    required this.examId,
  });

  @override
  Widget build(BuildContext context) {
    if (summaries.isEmpty) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text(
              'SUBMISSIONS BY CLASS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 16),
            const Icon(Icons.class_outlined, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 8),
            const Text(
              'No classes assigned to this exam yet',
              style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
            ),
          ],
        ),
      );
    }

    final totalSubmitted = summaries.values.fold<int>(0, (sum, s) => sum + s.totalSubmitted);
    final totalGraded = summaries.values.fold<int>(0, (sum, s) => sum + s.totalGraded);
    final totalStudents = summaries.values.fold<int>(0, (sum, s) => sum + s.totalStudents);

    return Container(
      width: double.infinity,
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
            'SUBMISSIONS BY CLASS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _miniStat('$totalSubmitted/$totalStudents', 'Submitted'),
              _miniStat('$totalGraded/$totalSubmitted', 'Graded'),
              _miniStat('${summaries.length}', 'Classes'),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          ...summaries.values.map((s) => _classRow(context, s)),
        ],
      ),
    );
  }

  Widget _miniStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _classRow(BuildContext context, ClassSubmissionSummary s) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SubmissionsPage(examId: examId, initialClassId: s.classId),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            const Icon(Icons.school_outlined, size: 18, color: Color(0xFF0C2B64)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.className,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  Text('${s.totalSubmitted}/${s.totalStudents} submitted • ${s.totalGraded} graded',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}
