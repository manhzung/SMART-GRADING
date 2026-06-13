import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/question_service.dart';
import '../../domain/entities/exam.entity.dart';
import '../../domain/entities/question.entity.dart';

class ExamQuestionsPage extends StatefulWidget {
  final Exam exam;

  const ExamQuestionsPage({super.key, required this.exam});

  @override
  State<ExamQuestionsPage> createState() => _ExamQuestionsPageState();
}

class _ExamQuestionsPageState extends State<ExamQuestionsPage> {
  String _selectedFilter = 'All';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  int? _expandedIndex;

  bool _questionsLoading = false;
  String? _questionsError;
  List<QuestionModel> _loadedQuestions = [];

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    setState(() {
      _questionsLoading = true;
      _questionsError = null;
    });

    try {
      final questionService = GetIt.instance<QuestionService>();
      if (widget.exam.questionIds.isNotEmpty) {
        final questions = await Future.wait(
          widget.exam.questionIds.map((id) => questionService.getQuestionById(id)),
        );
        setState(() {
          _loadedQuestions = questions.whereType<QuestionModel>().toList();
          _questionsLoading = false;
        });
      } else {
        setState(() => _questionsLoading = false);
      }
    } catch (e) {
      setState(() {
        _questionsError = e.toString();
        _questionsLoading = false;
      });
    }
  }

  void _confirmDeleteQuestion(QuestionModel question) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa câu hỏi'),
        content: Text('Bạn có chắc muốn xóa câu hỏi "${question.content}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final questionService = GetIt.instance<QuestionService>();
                await questionService.deleteQuestion(question.id);
                _loadQuestions();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đã xóa câu hỏi')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lỗi: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> get _filteredQuestions {
    final List<dynamic> baseList = _loadedQuestions.isNotEmpty
        ? _loadedQuestions
        : widget.exam.questions;

    final mapped = baseList.asMap().entries.map<Map<String, dynamic>>((entry) {
      final q = entry.value;
      String difficulty;
      String topic;
      String content;
      int points;
      List<String> options;
      String? correctAnswer;
      String? explanation;
      String id;

      if (q is QuestionModel) {
        id = q.id;
        difficulty = q.difficulty.toUpperCase();
        topic = q.topic ?? 'Question ${entry.key + 1}';
        content = q.content;
        points = q.tags.isNotEmpty ? q.tags.length : 5;
        options = q.options.map((o) => o.text).toList();
        final correctOpt = q.options.where((o) => o.isCorrect).toList();
        correctAnswer = q.correctAnswer ?? (correctOpt.isNotEmpty ? correctOpt.first.text : null);
        explanation = q.explanation;
      } else {
        final question = q as Question;
        id = question.id;
        difficulty = (question.difficulty ?? 'MEDIUM').toUpperCase();
        topic = question.topic ?? 'Question ${entry.key + 1}';
        content = question.content;
        points = question.score;
        options = question.options ?? [];
        correctAnswer = question.correctAnswer;
        explanation = question.explanation;
      }

      return {
        'id': id,
        'index': entry.key + 1,
        'difficulty': difficulty,
        'topic': topic,
        'content': content,
        'points': points,
        'seen': true,
        'correctRate': 0.8,
        'options': options,
        'correctAnswer': correctAnswer,
        'explanation': explanation,
      };
    }).toList();

    return mapped.where((q) {
      final matchesSearch = _searchQuery.isEmpty ||
          q['content'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          q['topic'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      final diff = q['difficulty'] as String;
      final matchesFilter = _selectedFilter == 'All' ||
          (_selectedFilter == 'Easy' && diff == 'EASY') ||
          (_selectedFilter == 'Medium' && diff == 'MEDIUM') ||
          (_selectedFilter == 'Hard' && diff == 'HARD');
      return matchesSearch && matchesFilter;
    }).toList();
  }

  void _toggleExpand(int index) {
    setState(() {
      _expandedIndex = _expandedIndex == index ? null : index;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getDifficultyBg(String difficulty) {
    switch (difficulty) {
      case 'EASY': return const Color(0xFFDCFCE7);
      case 'MEDIUM': return const Color(0xFFDBEAFE);
      case 'HARD': return const Color(0xFFFEE2E2);
      default: return const Color(0xFFF1F5F9);
    }
  }

  Color _getDifficultyText(String difficulty) {
    switch (difficulty) {
      case 'EASY': return const Color(0xFF16A34A);
      case 'MEDIUM': return const Color(0xFF1D4ED8);
      case 'HARD': return const Color(0xFFDC2626);
      default: return const Color(0xFF64748B);
    }
  }

  Color _getCorrectRateColor(double rate) {
    if (rate >= 0.7) return const Color(0xFF16A34A);
    if (rate >= 0.4) return const Color(0xFFD97706);
    return const Color(0xFFDC2626);
  }

  @override
  Widget build(BuildContext context) {
    if (_questionsLoading) {
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
            'Danh sách câu hỏi',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1.0),
            child: Container(color: const Color(0xFFE2E8F0), height: 1.0),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_questionsError != null) {
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
            'Danh sách câu hỏi',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1.0),
            child: Container(color: const Color(0xFFE2E8F0), height: 1.0),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(_questionsError!, textAlign: TextAlign.center),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  setState(() => _questionsError = null);
                  _loadQuestions();
                },
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    final filtered = _filteredQuestions;
    final totalQuestions = filtered.length;
    final totalPoints = filtered.fold<int>(0, (sum, q) => sum + ((q['points'] as int?) ?? 0));

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
          'Danh sách câu hỏi',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$totalQuestions câu',
              style: const TextStyle(
                color: Color(0xFF475569),
                fontSize: 12,
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
        child: Column(
          children: [
            // Stats Row
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.assignment_outlined, size: 18, color: Color(0xFF0F172A)),
                          const SizedBox(width: 8),
                          Text(
                            '$totalQuestions câu hỏi',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_outline, size: 18, color: Color(0xFF0F172A)),
                          const SizedBox(width: 8),
                          Text(
                            '$totalPoints điểm',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: TextField(
                controller: _searchController,
                onChanged: (value) {
                  setState(() => _searchQuery = value);
                },
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm câu hỏi...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF081C43), width: 2),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Filter Chips
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: ['All', 'Easy', 'Medium', 'Hard'].map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _selectedFilter = filter);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          filter,
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
            const SizedBox(height: 8),

            // Question List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.search_off,
                            size: 64,
                            color: Colors.grey.shade300,
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Không tìm thấy câu hỏi nào',
                            style: TextStyle(
                              fontSize: 16,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final q = filtered[index];
                        final originalQuestion = _loadedQuestions.isNotEmpty
                            ? (index < _loadedQuestions.length ? _loadedQuestions[index] : null)
                            : null;
                        return _buildQuestionCard(q, index, originalQuestion);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCard(Map<String, dynamic> question, int index, [QuestionModel? originalQuestion]) {
    final isExpanded = _expandedIndex == index;
    final difficulty = question['difficulty'] as String;
    final diffBg = _getDifficultyBg(difficulty);
    final diffText = _getDifficultyText(difficulty);
    final points = question['points'] as int? ?? 0;
    final correctRate = (question['correctRate'] as double?) ?? 0.0;
    final seen = question['seen'] as bool? ?? true;
    final options = question['options'] as List<String>?;
    final correctAnswer = question['correctAnswer'] as String?;
    final explanation = question['explanation'] as String?;

    return GestureDetector(
      onTap: () => _toggleExpand(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isExpanded ? const Color(0xFF081C43) : const Color(0xFFE2E8F0),
            width: isExpanded ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Center(
                          child: Text(
                            '${question['index']}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: diffBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          difficulty,
                          style: TextStyle(
                            color: diffText,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (!seen)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'MỚI',
                            style: TextStyle(
                              color: Color(0xFFD97706),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      const Spacer(),
                      Row(
                        children: [
                          const Icon(Icons.star_outline, size: 13, color: Color(0xFF94A3B8)),
                          const SizedBox(width: 3),
                          Text(
                            '$points đ',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        isExpanded ? Icons.expand_less : Icons.expand_more,
                        size: 20,
                        color: const Color(0xFF94A3B8),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Topic / Title
                  Text(
                    question['topic'] as String? ?? 'Câu hỏi',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),

                  // Question Content
                  Text(
                    question['content'] as String,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                      height: 1.4,
                    ),
                    maxLines: isExpanded ? null : 2,
                    overflow: isExpanded ? null : TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 12),

                  // Stats Row
                  Row(
                    children: [
                      _buildStatChip(
                        icon: Icons.visibility_outlined,
                        label: seen ? 'Đã scan' : 'Chưa scan',
                        color: seen ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        bg: seen ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                      ),
                      const SizedBox(width: 8),
                      _buildStatChip(
                        icon: Icons.check_circle_outline,
                        label: '${(correctRate * 100).round()}% đúng',
                        color: _getCorrectRateColor(correctRate),
                        bg: _getCorrectRateColor(correctRate).withValues(alpha: 0.1),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: () => _toggleExpand(index),
                        icon: Icon(
                          isExpanded ? Icons.visibility_off : Icons.visibility,
                          size: 16,
                        ),
                        label: Text(
                          isExpanded ? 'Thu gọn' : 'Xem chi tiết',
                          style: const TextStyle(fontSize: 12),
                        ),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF081C43),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Expanded Content
            if (isExpanded) ...[
              const Divider(color: Color(0xFFE2E8F0), height: 1),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (options != null && options.isNotEmpty) ...[
                      const Text(
                        'Đáp án đúng:',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...options.asMap().entries.map<Widget>((entry) {
                        final optIndex = entry.key;
                        final option = entry.value;
                        final isCorrect = correctAnswer != null &&
                            option.toLowerCase() == correctAnswer.toLowerCase();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Icon(
                                isCorrect ? Icons.check_circle : Icons.circle_outlined,
                                size: 20,
                                color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${String.fromCharCode(65 + optIndex)}. $option',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                  fontWeight: isCorrect ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ] else ...[
                      const Text(
                        'Không có lựa chọn (câu hỏi tự luận)',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                    if (explanation != null && explanation.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F9FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBAE6FD)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.lightbulb_outline, size: 18, color: Color(0xFF0284C7)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Giải thích:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0284C7),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    explanation,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF0F172A),
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Chức năng sửa câu hỏi - sử dụng trang Question Bank'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: const Text('Sửa'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF64748B),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: originalQuestion != null
                              ? () => _confirmDeleteQuestion(originalQuestion)
                              : () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Không thể xóa: câu hỏi chưa được tải từ server'),
                                      backgroundColor: Color(0xFFDC2626),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                },
                          icon: const Icon(Icons.delete_outline, size: 16),
                          label: const Text('Xóa'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFDC2626),
                            side: const BorderSide(color: Color(0xFFDC2626)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip({
    required IconData icon,
    required String label,
    required Color color,
    required Color bg,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
