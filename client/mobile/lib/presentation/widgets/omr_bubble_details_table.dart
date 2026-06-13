import 'package:flutter/material.dart';
import '../../domain/omr/models/omr_response.dart';
import '../../domain/omr/engine/omr_engine.dart';

class OMRBubbleDetailsTable extends StatelessWidget {
  final OMRProcessingResult result;

  const OMRBubbleDetailsTable({
    super.key,
    required this.result,
  });

  @override
  Widget build(BuildContext context) {
    final bubbleIntensities = result.response.bubbleIntensities;
    final hasIssues = result.response.multiMarked || result.response.hasUnmarked;

    if (bubbleIntensities.isEmpty) {
      return _buildEmptyOrIssuesState(hasIssues);
    }

    final fields = bubbleIntensities.keys.toList();

    return Column(
      children: [
        if (hasIssues) _buildStatusIndicators(),
        _buildHeader(),
        Expanded(
          child: ListView.builder(
            itemCount: fields.length,
            itemBuilder: (context, index) {
              final field = fields[index];
              final intensities = bubbleIntensities[field]!;
              final answer = result.response.answers[field] ?? '';
              final localThreshold = result.response.localThresholds[field];
              final avgIntensity = _computeAverageIntensity(intensities);
              final status = _determineStatus(field, intensities);

              return _buildRow(
                rowNum: index + 1,
                field: field,
                answer: answer,
                avgIntensity: avgIntensity,
                threshold: localThreshold,
                status: status,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyOrIssuesState(bool hasIssues) {
    if (!hasIssues) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text(
            'No bubble data available',
            style: TextStyle(
              color: Color(0xFF64748B),
              fontSize: 14,
            ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      child: Column(
        children: [
          _buildStatusIndicators(),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.all(24.0),
            child: Text(
              'No bubble data available',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicators() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (result.response.multiMarked)
            const _StatusBadge(label: 'MULTI', textColor: Color(0xFFC5221F), bgColor: Color(0xFFF8D7DA)),
          if (result.response.hasUnmarked)
            const _StatusBadge(label: 'UNMARKED', textColor: Color(0xFFD97706), bgColor: Color(0xFFFEF3C7)),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF1F5F9),
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(
              '#',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'Field',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'Ans',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          SizedBox(
            width: 70,
            child: Text(
              'Intensity',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          SizedBox(width: 12),
          SizedBox(
            width: 70,
            child: Text(
              'Threshold',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          SizedBox(width: 12),
          SizedBox(
            width: 72,
            child: Text(
              'Status',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRow({
    required int rowNum,
    required String field,
    required String answer,
    required double avgIntensity,
    required double? threshold,
    required _BubbleStatus status,
  }) {
    final bgColor = switch (status) {
      _BubbleStatus.marked => const Color(0xFFE6F4EA),
      _BubbleStatus.unmarked => const Color(0xFFFEF3C7),
      _BubbleStatus.multi => const Color(0xFFFCE8E6),
    };

    final statusBadge = switch (status) {
      _BubbleStatus.marked => const _StatusBadge(label: 'MARKED', textColor: Color(0xFF137333), bgColor: Color(0xFFD4EDDA)),
      _BubbleStatus.unmarked => const _StatusBadge(label: 'UNMARKED', textColor: Color(0xFFD97706), bgColor: Color(0xFFFEF3C7)),
      _BubbleStatus.multi => const _StatusBadge(label: 'MULTI', textColor: Color(0xFFC5221F), bgColor: Color(0xFFF8D7DA)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        border: const Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(
              '$rowNum',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              field,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              answer.isEmpty ? '-' : answer,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          SizedBox(
            width: 70,
            child: Text(
              avgIntensity.toStringAsFixed(1),
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 70,
            child: Text(
              threshold?.toStringAsFixed(1) ?? '-',
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
                color: Color(0xFF64748B),
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 72,
            child: statusBadge,
          ),
        ],
      ),
    );
  }

  double _computeAverageIntensity(List<BubbleIntensity> intensities) {
    if (intensities.isEmpty) return 0.0;
    final sum = intensities.fold<double>(0.0, (s, b) => s + b.meanIntensity);
    return sum / intensities.length;
  }

  _BubbleStatus _determineStatus(String field, List<BubbleIntensity> intensities) {
    if (intensities.isEmpty) return _BubbleStatus.unmarked;

    final markedCount = intensities.where((b) => b.isMarked).length;

    if (markedCount == 0) {
      return _BubbleStatus.unmarked;
    } else if (markedCount > 1) {
      return _BubbleStatus.multi;
    } else {
      return _BubbleStatus.marked;
    }
  }
}

enum _BubbleStatus { marked, unmarked, multi }

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color textColor;
  final Color bgColor;

  const _StatusBadge({
    required this.label,
    required this.textColor,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: textColor,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
