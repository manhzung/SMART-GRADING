import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/submission_service.dart';
import '../../domain/entities/exam.entity.dart';
import 'submission_detail_page.dart';

class SubmissionsPage extends StatefulWidget {
  final Exam? exam;
  final String? examId;
  final String? initialClassId;

  const SubmissionsPage({super.key, this.exam, this.examId, this.initialClassId});

  @override
  State<SubmissionsPage> createState() => _SubmissionsPageState();
}

class _SubmissionsPageState extends State<SubmissionsPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedFilter = 'ALL';
  
  bool _isLoading = false;
  String? _errorMessage;
  List<Submission> _submissions = [];
  int _totalSubmissions = 0;
  int _gradedCount = 0;
  int _pendingCount = 0;

  // Advanced filter state
  double? _scoreRangeStart;
  double? _scoreRangeEnd;
  DateTime? _startDate;
  DateTime? _endDate;

  final List<String> _filterOptions = ['ALL', 'GRADED', 'PENDING', 'SUBMITTED'];
  final Map<String, String> _filterLabels = {
    'ALL': 'Tất cả',
    'GRADED': 'Đã chấm',
    'PENDING': 'Đang chờ',
    'SUBMITTED': 'Đã nộp',
  };

  @override
  void initState() {
    super.initState();
    _loadSubmissions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSubmissions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final submissionService = GetIt.instance<SubmissionService>();
      final result = await submissionService.getSubmissions(
        page: 1,
        limit: 50,
      );

      setState(() {
        _submissions = result.results;
        _isLoading = false;
      });
      _updateStats();
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _updateStats() {
    _totalSubmissions = _submissions.length;
    _gradedCount = _submissions.where((s) => s.status == 'GRADED').length;
    _pendingCount = _submissions.where((s) => s.status == 'PENDING' || s.status == 'SUBMITTED').length;
  }

  List<Submission> get _filteredSubmissions {
    List<Submission> filtered = _submissions;
    
    // Apply status filter
    if (_selectedFilter != 'ALL') {
      if (_selectedFilter == 'GRADED') {
        filtered = filtered.where((s) => s.status == 'GRADED').toList();
      } else if (_selectedFilter == 'PENDING') {
        filtered = filtered.where((s) => s.status == 'PENDING').toList();
      } else if (_selectedFilter == 'SUBMITTED') {
        filtered = filtered.where((s) => s.status == 'SUBMITTED').toList();
      }
    }
    
    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((s) {
        final name = (s.studentName ?? '').toLowerCase();
        final code = (s.studentCode ?? '').toLowerCase();
        final examTitle = (s.examTitle ?? '').toLowerCase();
        return name.contains(query) || code.contains(query) || examTitle.contains(query);
      }).toList();
    }
    
    // Apply score range filter
    if (_scoreRangeStart != null) {
      filtered = filtered.where((s) => (s.score ?? 0) >= _scoreRangeStart!).toList();
    }
    if (_scoreRangeEnd != null) {
      filtered = filtered.where((s) => (s.score ?? 0) <= _scoreRangeEnd!).toList();
    }
    
    // Apply date range filter
    if (_startDate != null) {
      filtered = filtered.where((s) {
        final scannedAt = s.scannedAt ?? DateTime.now();
        return scannedAt.isAfter(_startDate!) || scannedAt.isAtSameMomentAs(_startDate!);
      }).toList();
    }
    if (_endDate != null) {
      final endOfDay = DateTime(_endDate!.year, _endDate!.month, _endDate!.day, 23, 59, 59);
      filtered = filtered.where((s) {
        final scannedAt = s.scannedAt ?? DateTime.now();
        return scannedAt.isBefore(endOfDay) || scannedAt.isAtSameMomentAs(endOfDay);
      }).toList();
    }
    
    return filtered;
  }

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
    final colors = [
      const Color(0xFFDBEAFE), // Light blue
      const Color(0xFFFFEDD5), // Light orange/peach
      const Color(0xFFE0E7FF), // Light indigo
      const Color(0xFFF3E8FF), // Light purple
      const Color(0xFFD1FAE5), // Light green
    ];
    return colors[hash.abs() % colors.length];
  }

  Color _getInitialsTextColor(String name) {
    final hash = name.hashCode;
    final colors = [
      const Color(0xFF1E40AF), // Dark blue
      const Color(0xFFC2410C), // Dark orange
      const Color(0xFF3730A3), // Dark indigo
      const Color(0xFF6B21A8), // Dark purple
      const Color(0xFF065F46), // Dark green
    ];
    return colors[hash.abs() % colors.length];
  }

  String _formatTimestamp(DateTime? dateTime) {
    if (dateTime == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dateTime);
    
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} phút trước';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} giờ trước';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} ngày trước';
    } else {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[dateTime.month - 1]} ${dateTime.day}';
    }
  }

  Future<void> _selectStartDate(BuildContext context, StateSetter setSheetState) async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setSheetState(() => _startDate = date);
      setState(() {});
    }
  }

  Future<void> _selectEndDate(BuildContext context, StateSetter setSheetState) async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setSheetState(() => _endDate = date);
      setState(() {});
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day}/${date.month}/${date.year}';
  }

  void _clearAllFilters() {
    setState(() {
      _selectedFilter = 'ALL';
      _searchQuery = '';
      _scoreRangeStart = null;
      _scoreRangeEnd = null;
      _startDate = null;
      _endDate = null;
      _searchController.clear();
    });
  }

  void _showSubmissionDetails(Submission submission) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SubmissionDetailPage(submission: submission),
      ),
    );
  }

  void _showAdvancedFilters() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _buildAdvancedFiltersSheet(),
    );
  }

  Widget _buildAdvancedFiltersSheet() {
    return StatefulBuilder(
      builder: (context, setSheetState) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Bo loc nang cao',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'Khoang diem',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final controller = TextEditingController(
                          text: _scoreRangeStart?.toString() ?? '',
                        );
                        final result = await showDialog<double>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Diem toi thieu'),
                            content: TextField(
                              controller: controller,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                hintText: 'Nhap diem (0-10)',
                              ),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Huy'),
                              ),
                              TextButton(
                                onPressed: () {
                                  final val = double.tryParse(controller.text);
                                  Navigator.pop(ctx, val);
                                },
                                child: const Text('OK'),
                              ),
                            ],
                          ),
                        );
                        if (result != null) {
                          setSheetState(() => _scoreRangeStart = result);
                          setState(() {});
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          _scoreRangeStart?.toString() ?? '0',
                          style: TextStyle(
                            fontSize: 14,
                            color: _scoreRangeStart != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('—', style: TextStyle(fontSize: 16, color: Color(0xFF64748B))),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final controller = TextEditingController(
                          text: _scoreRangeEnd?.toString() ?? '',
                        );
                        final result = await showDialog<double>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Diem toi da'),
                            content: TextField(
                              controller: controller,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                hintText: 'Nhap diem (0-10)',
                              ),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Huy'),
                              ),
                              TextButton(
                                onPressed: () {
                                  final val = double.tryParse(controller.text);
                                  Navigator.pop(ctx, val);
                                },
                                child: const Text('OK'),
                              ),
                            ],
                          ),
                        );
                        if (result != null) {
                          setSheetState(() => _scoreRangeEnd = result);
                          setState(() {});
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          _scoreRangeEnd?.toString() ?? '10',
                          style: TextStyle(
                            fontSize: 14,
                            color: _scoreRangeEnd != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'Ngay nop',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _selectStartDate(context, setSheetState),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(
                              _startDate != null ? _formatDate(_startDate) : 'Tu ngay',
                              style: TextStyle(
                                fontSize: 14,
                                color: _startDate != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('—', style: TextStyle(fontSize: 16, color: Color(0xFF64748B))),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _selectEndDate(context, setSheetState),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(
                              _endDate != null ? _formatDate(_endDate) : 'Den ngay',
                              style: TextStyle(
                                fontSize: 14,
                                color: _endDate != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setSheetState(() {
                          _scoreRangeStart = null;
                          _scoreRangeEnd = null;
                          _startDate = null;
                          _endDate = null;
                        });
                        setState(() {});
                        Navigator.pop(context);
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Dat lai', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF081C43),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Ap dung', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
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
        title: Text(
          widget.exam != null
              ? 'Bài nộp: ${widget.exam!.title}'
              : 'Quản lý bài nộp',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          if (_selectedFilter != 'ALL' || _searchQuery.isNotEmpty || _scoreRangeStart != null || _scoreRangeEnd != null || _startDate != null || _endDate != null)
            TextButton.icon(
              onPressed: _clearAllFilters,
              icon: const Icon(Icons.clear, size: 18, color: Color(0xFFDC2626)),
              label: const Text('Xoa loc', style: TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
            ),
          Container(
            margin: const EdgeInsets.only(right: 16),
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: Color(0xFF081C43),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'GV',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
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
        child: Column(
          children: [
            if (_isLoading)
              const LinearProgressIndicator(
                color: Color(0xFF081C43),
                backgroundColor: Color(0xFFE2E8F0),
              ),
            Expanded(
              child: _errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
                          const SizedBox(height: 16),
                          const Text(
                            'Không thể tải dữ liệu bài nộp',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _loadSubmissions,
                            child: const Text('Thử lại'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadSubmissions,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Stats Row
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: _buildStatsRow(),
                            ),

                            // Search & Filter Section
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Column(
                                children: [
                                  // Search TextField
                                  Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
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
                                        hintText: 'Tìm kiếm học sinh, mã bài...',
                                        hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                                        prefixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                                        border: InputBorder.none,
                                        contentPadding: EdgeInsets.symmetric(vertical: 14),
                                      ),
                                    ),
                                  ),
                            const SizedBox(height: 12),
                            // Filter Chips Row
                            Row(
                              children: [
                                Expanded(
                                  child: SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: Row(
                                      children: _filterOptions.map((filter) {
                                        final isSelected = _selectedFilter == filter;
                                        return Padding(
                                          padding: const EdgeInsets.only(right: 8),
                                          child: GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                _selectedFilter = filter;
                                              });
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                              decoration: BoxDecoration(
                                                color: isSelected ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                _filterLabels[filter] ?? filter,
                                                style: TextStyle(
                                                  color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Advanced Filter Button
                                GestureDetector(
                                  onTap: _showAdvancedFilters,
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: const Icon(
                                      Icons.tune,
                                      color: Color(0xFF64748B),
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Submission List
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildSubmissionList(),
                      ),

                      const SizedBox(height: 30),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.assignment_turned_in,
            iconColor: const Color(0xFF3B82F6),
            iconBgColor: const Color(0xFFDBEAFE),
            value: _totalSubmissions.toString(),
            label: 'Tổng bài nộp',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildStatCard(
            icon: Icons.check_circle,
            iconColor: const Color(0xFF16A34A),
            iconBgColor: const Color(0xFFDCFCE7),
            value: _gradedCount.toString(),
            label: 'Đã chấm',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildStatCard(
            icon: Icons.pending,
            iconColor: const Color(0xFFD97706),
            iconBgColor: const Color(0xFFFEF3C7),
            value: _pendingCount.toString(),
            label: 'Đang chờ',
          ),
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
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF64748B),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSubmissionList() {
    final filtered = _filteredSubmissions;

    if (filtered.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 60),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_outlined,
              size: 64,
              color: const Color(0xFFCBD5E1),
            ),
            const SizedBox(height: 16),
            const Text(
              'Chưa có bài nộp nào',
              style: TextStyle(
                fontSize: 15,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Danh sách bài nộp (${filtered.length})',
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filtered.length,
          itemBuilder: (context, index) {
            final submission = filtered[index];
            return _buildSubmissionCard(submission);
          },
        ),
      ],
    );
  }

  Widget _buildSubmissionCard(Submission submission) {
    final name = submission.studentName ?? submission.studentCode ?? 'Unknown';
    final initials = _getStudentInitials(name);
    final bgColor = _getInitialsBgColor(name);
    final textColor = _getInitialsTextColor(name);
    
    // Status styling
    Color statusBg;
    Color statusText;
    String statusLabel;
    
    switch (submission.status.toUpperCase()) {
      case 'GRADED':
        statusBg = const Color(0xFFDCFCE7);
        statusText = const Color(0xFF16A34A);
        statusLabel = 'Đã chấm';
        break;
      case 'PENDING':
        statusBg = const Color(0xFFFEF3C7);
        statusText = const Color(0xFFD97706);
        statusLabel = 'Đang chờ';
        break;
      case 'SUBMITTED':
        statusBg = const Color(0xFFDBEAFE);
        statusText = const Color(0xFF1D4ED8);
        statusLabel = 'Đã nộp';
        break;
      default:
        statusBg = const Color(0xFFF1F5F9);
        statusText = const Color(0xFF64748B);
        statusLabel = submission.status;
    }

    return GestureDetector(
      onTap: () => _showSubmissionDetails(submission),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Avatar
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
            // Center column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    submission.studentCode ?? '',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    submission.examTitle ?? 'Unknown Exam',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatTimestamp(submission.scannedAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Right column
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (submission.score != null)
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        fontFamily: 'Roboto',
                        color: Color(0xFF0F172A),
                      ),
                      children: [
                        TextSpan(
                          text: submission.score!.toStringAsFixed(1),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const TextSpan(
                          text: '/10',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  const Text(
                    '--/10',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: statusText,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Icon(
                  Icons.chevron_right,
                  color: Color(0xFF94A3B8),
                  size: 20,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
