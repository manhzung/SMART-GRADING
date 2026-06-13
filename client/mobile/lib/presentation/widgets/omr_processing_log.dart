import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/domain/omr/engine/omr_engine.dart';

/// Widget that displays OMR processing pipeline steps and metadata.
class OMRProcessingLog extends StatelessWidget {
  final OMRProcessingResult result;

  const OMRProcessingLog({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildMetadataCard(),
        const SizedBox(height: 16),
        _buildStepsList(),
      ],
    );
  }

  Widget _buildMetadataCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          _buildMetadataChip(
            '${result.processingTime.inMilliseconds} ms',
            const Color(0xFF0F172A),
            const Color(0xFFF1F5F9),
          ),
          const SizedBox(width: 8),
          _buildMetadataChip(
            result.wasWarped ? 'Warped' : 'No Warp',
            result.wasWarped ? const Color(0xFF137333) : const Color(0xFF64748B),
            result.wasWarped ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
          ),
          if (result.skewAngle != null) ...[
            const SizedBox(width: 8),
            _buildMetadataChip(
              '${result.skewAngle!.toStringAsFixed(1)} deg',
              const Color(0xFF0F172A),
              const Color(0xFFF1F5F9),
            ),
          ],
          if (result.detectedCorners != null) ...[
            const SizedBox(width: 8),
            _buildMetadataChip(
              '${result.detectedCorners!.length} corners',
              const Color(0xFF0F172A),
              const Color(0xFFF1F5F9),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetadataChip(String label, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildStepsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: result.processingSteps.map((step) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStepIcon(step),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  step,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF0F172A),
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStepIcon(String step) {
    final isError = step.toLowerCase().contains('failed') ||
        step.toLowerCase().contains('error') ||
        step.toLowerCase().contains('exception');
    final isWarning = step.toLowerCase().contains('no corners') ||
        step.toLowerCase().contains('warning') ||
        step.toLowerCase().contains('failed:');

    if (isError) {
      return Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: const Color(0xFFFCE8E6),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.close,
          size: 14,
          color: Color(0xFFC5221F),
        ),
      );
    }

    if (isWarning) {
      return Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.warning_amber_rounded,
          size: 14,
          color: Color(0xFFD97706),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F4EA),
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.check,
        size: 14,
        color: Color(0xFF137333),
      ),
    );
  }
}
