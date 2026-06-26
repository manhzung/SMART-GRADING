import 'package:flutter/material.dart';
import 'package:smart_grading_mobile/presentation/blocs/batch_scan/batch_scan_bloc.dart';

class BatchSummaryPage extends StatelessWidget {
  final BatchScanSummary state;
  final VoidCallback onViewDetails;
  final VoidCallback onContinueScanning;

  const BatchSummaryPage({
    super.key,
    required this.state,
    required this.onViewDetails,
    required this.onContinueScanning,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: const Text('Kết quả quét'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Summary card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF22C55E),
                      size: 64,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Tổng kết',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildStatRow('Đã quét', '${state.totalScanned} phiếu'),
                    const SizedBox(height: 12),
                    _buildStatRow(
                      'Điểm TB',
                      state.averageScore.toStringAsFixed(1),
                    ),
                    const SizedBox(height: 12),
                    _buildStatRow(
                      'Cao nhất',
                      state.highestScore.toStringAsFixed(1),
                    ),
                    const SizedBox(height: 12),
                    _buildStatRow(
                      'Thấp nhất',
                      state.lowestScore.toStringAsFixed(1),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Score distribution
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Phân bố điểm',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildScoreBar('10', _countScore(10), state.totalScanned, const Color(0xFF22C55E)),
                    const SizedBox(height: 8),
                    _buildScoreBar('8-9', _countRange(8, 9), state.totalScanned, const Color(0xFF22C55E)),
                    const SizedBox(height: 8),
                    _buildScoreBar('6-7', _countRange(6, 7), state.totalScanned, const Color(0xFFF59E0B)),
                    const SizedBox(height: 8),
                    _buildScoreBar('4-5', _countRange(4, 5), state.totalScanned, const Color(0xFFEF4444)),
                    const SizedBox(height: 8),
                    _buildScoreBar('<4', _countBelow(4), state.totalScanned, const Color(0xFFDC2626)),
                  ],
                ),
              ),

              const Spacer(),

              // Action buttons
              SizedBox(
                height: 56,
                child: OutlinedButton.icon(
                  onPressed: onViewDetails,
                  icon: const Icon(Icons.list_alt),
                  label: const Text('Xem chi tiết'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF334155)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: onContinueScanning,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Quay lại quét tiếp'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 16,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildScoreBar(String label, int count, int total, Color color) {
    final percentage = total > 0 ? count / total : 0.0;
    return Row(
      children: [
        SizedBox(
          width: 40,
          child: Text(
            label,
            style: const TextStyle(color: Colors.white70),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: const Color(0xFF334155),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 12,
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 30,
          child: Text(
            '($count)',
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ),
      ],
    );
  }

  int _countScore(double score) {
    return state.results.where((r) => r.gradingResult.totalScore == score).length;
  }

  int _countRange(int min, int max) {
    return state.results.where((r) {
      final s = r.gradingResult.totalScore;
      return s >= min && s < max;
    }).length;
  }

  int _countBelow(double max) {
    return state.results.where((r) => r.gradingResult.totalScore < max).length;
  }
}
