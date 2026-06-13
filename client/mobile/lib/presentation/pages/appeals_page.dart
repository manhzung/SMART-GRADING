import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/appeal_service.dart';
import '../../domain/entities/appeal.entity.dart';

enum AppealStatus { pending, reviewing, approved, rejected }

extension AppealStatusExt on AppealStatus {
  static AppealStatus fromString(String? status) {
    switch (status?.toLowerCase()) {
      case 'pending':
        return AppealStatus.pending;
      case 'reviewing':
        return AppealStatus.reviewing;
      case 'approved':
        return AppealStatus.approved;
      case 'rejected':
        return AppealStatus.rejected;
      default:
        return AppealStatus.pending;
    }
  }

  String get label {
    switch (this) {
      case AppealStatus.pending:
        return 'Đang chờ';
      case AppealStatus.reviewing:
        return 'Đang xem xét';
      case AppealStatus.approved:
        return 'Đã duyệt';
      case AppealStatus.rejected:
        return 'Từ chối';
    }
  }
}

class AppealsPage extends StatefulWidget {
  const AppealsPage({super.key});

  @override
  State<AppealsPage> createState() => _AppealsPageState();
}

class _AppealsPageState extends State<AppealsPage> {
  String _searchQuery = '';
  String _selectedFilter = 'Tất cả';
  final TextEditingController _searchController = TextEditingController();

  List<Appeal> _appeals = [];
  bool _isLoading = true;
  String? _errorMessage;

  final List<String> _filters = [
    'Tất cả',
    'Đang chờ',
    'Đang xem xét',
    'Đã duyệt',
    'Từ chối',
  ];

  AppealService get _appealService => GetIt.instance<AppealService>();

  @override
  void initState() {
    super.initState();
    _loadAppeals();
  }

  Future<void> _loadAppeals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final result = await _appealService.getAppeals(limit: 50);
      if (mounted) {
        setState(() {
          _appeals = result.results;
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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Appeal> get _filteredAppeals {
    return _appeals.where((appeal) {
      final matchesSearch = _searchQuery.isEmpty ||
          appeal.displayName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (appeal.examTitle?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false) ||
          (appeal.studentEmail?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);

      final status = AppealStatusExt.fromString(appeal.status);
      bool matchesFilter = true;
      if (_selectedFilter == 'Đang chờ') {
        matchesFilter = status == AppealStatus.pending;
      } else if (_selectedFilter == 'Đang xem xét') {
        matchesFilter = status == AppealStatus.reviewing;
      } else if (_selectedFilter == 'Đã duyệt') {
        matchesFilter = status == AppealStatus.approved;
      } else if (_selectedFilter == 'Từ chối') {
        matchesFilter = status == AppealStatus.rejected;
      }

      return matchesSearch && matchesFilter;
    }).toList();
  }

  int get _totalCount => _appeals.length;
  int get _pendingCount => _appeals
      .where((a) => AppealStatusExt.fromString(a.status) == AppealStatus.pending)
      .length;
  int get _reviewingCount => _appeals
      .where((a) => AppealStatusExt.fromString(a.status) == AppealStatus.reviewing)
      .length;
  int get _processedCount => _appeals
      .where((a) {
        final s = AppealStatusExt.fromString(a.status);
        return s == AppealStatus.approved || s == AppealStatus.rejected;
      })
      .length;

  String _getStudentInitials(String name) {
    if (name.isEmpty) return '??';
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '??';
    if (parts.length == 1) {
      return parts.first.substring(0, parts.first.length >= 2 ? 2 : 1).toUpperCase();
    }
    final firstLetter = parts.first[0];
    final lastLetter = parts.last[0];
    return '$firstLetter$lastLetter'.toUpperCase();
  }

  Color _getInitialsBgColor(String name) {
    final hash = name.hashCode;
    const colors = [
      Color(0xFFDBEAFE),
      Color(0xFFFFEDD5),
      Color(0xFFE0E7FF),
      Color(0xFFF3E8FF),
      Color(0xFFD1FAE5),
    ];
    return colors[hash.abs() % colors.length];
  }

  Color _getInitialsTextColor(String name) {
    final hash = name.hashCode;
    const colors = [
      Color(0xFF1E40AF),
      Color(0xFFC2410C),
      Color(0xFF3730A3),
      Color(0xFF6B21A8),
      Color(0xFF065F46),
    ];
    return colors[hash.abs() % colors.length];
  }

  Color _getStatusBgColor(AppealStatus status) {
    switch (status) {
      case AppealStatus.pending:
        return const Color(0xFFFEF3C7);
      case AppealStatus.reviewing:
        return const Color(0xFFDBEAFE);
      case AppealStatus.approved:
        return const Color(0xFFDCFCE7);
      case AppealStatus.rejected:
        return const Color(0xFFFEE2E2);
    }
  }

  Color _getStatusTextColor(AppealStatus status) {
    switch (status) {
      case AppealStatus.pending:
        return const Color(0xFFD97706);
      case AppealStatus.reviewing:
        return const Color(0xFF1D4ED8);
      case AppealStatus.approved:
        return const Color(0xFF16A34A);
      case AppealStatus.rejected:
        return const Color(0xFFDC2626);
    }
  }

  String _formatTimeAgo(DateTime? dateTime) {
    if (dateTime == null) return '';
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes} phút trước';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} giờ trước';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} ngày trước';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  Future<void> _showAppealDetail(Appeal appeal) async {
    final status = AppealStatusExt.fromString(appeal.status);
    if (status == AppealStatus.approved || status == AppealStatus.rejected) {
      _showDetailSheet(appeal, status);
      return;
    }

    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AppealActionSheet(appeal: appeal),
    );

    if (result == null || !mounted) return;

    if (result == 'approved' || result == 'rejected') {
      await _reviewAppeal(appeal, result);
    } else if (result == 'detail') {
      _showDetailSheet(appeal, status);
    }
  }

  Future<void> _reviewAppeal(Appeal appeal, String action) async {
    try {
      final resolutionNote = ''; // Could add a text field for this
      await _appealService.reviewAppeal(
        appeal.id,
        status: action,
        resolutionNote: resolutionNote,
      );

      if (mounted) {
        setState(() {
          final index = _appeals.indexWhere((a) => a.id == appeal.id);
          if (index != -1) {
            _appeals[index] = Appeal(
              id: appeal.id,
              studentId: appeal.studentId,
              studentName: appeal.studentName,
              studentEmail: appeal.studentEmail,
              studentCode: appeal.studentCode,
              examId: appeal.examId,
              examTitle: appeal.examTitle,
              questionNumber: appeal.questionNumber,
              questionText: appeal.questionText,
              studentAnswer: appeal.studentAnswer,
              correctAnswer: appeal.correctAnswer,
              reason: appeal.reason,
              resolutionNote: resolutionNote,
              status: action,
              className: appeal.className,
              score: appeal.score,
              submittedAt: appeal.submittedAt,
              reviewedAt: DateTime.now(),
            );
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              action == 'approved' ? 'Đã duyệt yêu cầu phúc khảo' : 'Đã từ chối yêu cầu phúc khảo',
            ),
            backgroundColor: action == 'approved' ? const Color(0xFF22C55E) : const Color(0xFFDC2626),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: $e'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  void _showDetailSheet(Appeal appeal, AppealStatus status) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AppealDetailSheet(
        appeal: appeal,
        status: status,
      ),
    );
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
          'Phúc khảo',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: IconButton(
              icon: const Icon(Icons.refresh, color: Color(0xFF64748B)),
              onPressed: _loadAppeals,
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
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.flag_outlined,
                      iconColor: const Color(0xFF64748B),
                      value: _totalCount.toString(),
                      label: 'Tổng số',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.pending_actions_outlined,
                      iconColor: const Color(0xFFD97706),
                      value: _pendingCount.toString(),
                      label: 'Đang chờ',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.rate_review_outlined,
                      iconColor: const Color(0xFF1D4ED8),
                      value: _reviewingCount.toString(),
                      label: 'Đang xem xét',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.check_circle_outline,
                      iconColor: const Color(0xFF16A34A),
                      value: _processedCount.toString(),
                      label: 'Đã xử lý',
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                      decoration: const InputDecoration(
                        hintText: 'Tìm kiếm học sinh, kỳ thi...',
                        hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                        prefixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 34,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _filters.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final filter = _filters[index];
                        final isSelected = _selectedFilter == filter;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedFilter = filter;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF081C43) : Colors.white,
                              borderRadius: BorderRadius.circular(17),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF081C43) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Text(
                              filter,
                              style: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF64748B),
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
                              const SizedBox(height: 16),
                              Text(
                                'Không thể tải dữ liệu',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton(
                                onPressed: _loadAppeals,
                                child: const Text('Thử lại'),
                              ),
                            ],
                          ),
                        )
                      : _filteredAppeals.isEmpty
                          ? _buildEmptyState()
                          : RefreshIndicator(
                              onRefresh: _loadAppeals,
                              child: ListView.builder(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                itemCount: _filteredAppeals.length,
                                itemBuilder: (context, index) {
                                  final appeal = _filteredAppeals[index];
                                  return _buildAppealCard(appeal);
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF64748B),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAppealCard(Appeal appeal) {
    final displayName = appeal.displayName;
    final initials = _getStudentInitials(displayName);
    final bgColor = _getInitialsBgColor(displayName);
    final textColor = _getInitialsTextColor(displayName);
    final status = AppealStatusExt.fromString(appeal.status);

    return GestureDetector(
      onTap: () => _showAppealDetail(appeal),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
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
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusBgColor(status),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _getStatusTextColor(status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    appeal.studentEmail ?? '',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.assignment_outlined, size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${appeal.examTitle ?? 'N/A'} — Câu hỏi #${appeal.questionNumber ?? '?'}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF475569),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    appeal.reason ?? '',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatTimeAgo(appeal.submittedAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right,
              color: Color(0xFF94A3B8),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.flag_outlined,
              size: 40,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Không có yêu cầu phúc khảo nào',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Danh sách phúc khảo sẽ xuất hiện khi có học sinh\nyêu cầu xem xét lại bài thi.',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF94A3B8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _AppealActionSheet extends StatefulWidget {
  final Appeal appeal;

  const _AppealActionSheet({required this.appeal});

  @override
  State<_AppealActionSheet> createState() => _AppealActionSheetState();
}

class _AppealActionSheetState extends State<_AppealActionSheet> {
  final TextEditingController _resolutionController = TextEditingController();

  @override
  void dispose() {
    _resolutionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Xử lý phúc khảo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.appeal.reason ?? '',
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _resolutionController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Ghi chú xử lý (không bắt buộc)',
              hintStyle: TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: Color(0xFFF8FAFC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(12)),
                borderSide: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, 'rejected'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFDC2626)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Từ chối',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context, 'approved'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Duyệt',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.pop(context, 'detail'),
            child: const Text(
              'Xem chi tiết',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
        ],
      ),
    );
  }
}

class _AppealDetailSheet extends StatelessWidget {
  final Appeal appeal;
  final AppealStatus status;

  const _AppealDetailSheet({required this.appeal, required this.status});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chi tiết phúc khảo',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(color: Color(0xFFE2E8F0)),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSectionTitle('Thông tin học sinh'),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            _buildInfoRow('Họ và tên', appeal.displayName),
                            const SizedBox(height: 8),
                            _buildInfoRow('Email', appeal.studentEmail ?? 'N/A'),
                            if (appeal.className != null) ...[
                              const SizedBox(height: 8),
                              _buildInfoRow('Lớp', appeal.className!),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildSectionTitle('Thông tin kỳ thi'),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            _buildInfoRow('Kỳ thi', appeal.examTitle ?? 'N/A'),
                            const SizedBox(height: 8),
                            _buildInfoRow(
                              'Ngày thi',
                              appeal.submittedAt != null
                                  ? '${appeal.submittedAt!.day}/${appeal.submittedAt!.month}/${appeal.submittedAt!.year}'
                                  : 'N/A',
                            ),
                            if (appeal.score != null) ...[
                              const SizedBox(height: 8),
                              _buildInfoRow('Điểm hiện tại', appeal.score!.toStringAsFixed(1)),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildSectionTitle('Câu hỏi #${appeal.questionNumber ?? '?'}'),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              appeal.questionText ?? 'N/A',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildAnswerBox(
                                    label: 'Đáp án học sinh',
                                    answer: appeal.studentAnswer ?? 'N/A',
                                    color: const Color(0xFFFEF3C7),
                                    textColor: const Color(0xFFD97706),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildAnswerBox(
                                    label: 'Đáp án đúng',
                                    answer: appeal.correctAnswer ?? 'N/A',
                                    color: const Color(0xFFDCFCE7),
                                    textColor: const Color(0xFF16A34A),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildSectionTitle('Lý do phúc khảo'),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFEF3C7)),
                        ),
                        child: Text(
                          appeal.reason ?? 'N/A',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF92400E),
                          ),
                        ),
                      ),
                      if (appeal.resolutionNote != null && appeal.resolutionNote!.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        _buildSectionTitle('Ghi chú xử lý'),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F9FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFBAE6FD)),
                          ),
                          child: Text(
                            appeal.resolutionNote!,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
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

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Color(0xFF0F172A),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
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
    );
  }

  Widget _buildAnswerBox({
    required String label,
    required String answer,
    required Color color,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: textColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            answer,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
