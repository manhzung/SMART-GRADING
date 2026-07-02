import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/question_service.dart';
import '../../domain/entities/exam.entity.dart';
import '../../domain/entities/question.entity.dart';

class QuestionBankPage extends StatefulWidget {
  final Exam? exam;

  const QuestionBankPage({super.key, this.exam});

  @override
  State<QuestionBankPage> createState() => _QuestionBankPageState();
}

class _QuestionBankPageState extends State<QuestionBankPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'All';
  String _searchQuery = '';
  int? _expandedIndex;

  List<QuestionModel> _questions = [];
  bool _isLoading = true;
  String? _errorMessage;
  String? _source;

  QuestionService get _questionService => GetIt.instance<QuestionService>();

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _source = null;
    });
    try {
      String? difficulty;

      if (_selectedFilter == 'Easy') {
        difficulty = 'easy';
      } else if (_selectedFilter == 'Medium') {
        difficulty = 'medium';
      } else if (_selectedFilter == 'Hard') {
        difficulty = 'hard';
      } else if (_selectedFilter == 'AI Generated') {
        _source = 'ai';
      }

      final result = await _questionService.getQuestions(
        limit: 50,
        difficulty: difficulty,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        source: _source,
      );

      if (mounted) {
        setState(() {
          _questions = result.results;
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

  List<QuestionModel> get _filteredQuestions {
    return _questions.where((q) {
      final matchesSearch = _searchQuery.isEmpty ||
          q.content.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          q.tags.any((tag) => tag.toLowerCase().contains(_searchQuery.toLowerCase()));

      bool matchesFilter = true;
      if (_selectedFilter == 'All') {
        matchesFilter = true;
      } else if (_selectedFilter == 'Easy') {
        matchesFilter = q.difficulty.toUpperCase() == 'EASY';
      } else if (_selectedFilter == 'Medium') {
        matchesFilter = q.difficulty.toUpperCase() == 'MEDIUM';
      } else if (_selectedFilter == 'Hard') {
        matchesFilter = q.difficulty.toUpperCase() == 'HARD';
      } else if (_selectedFilter == 'AI Generated') {
        matchesFilter = q.isAiGenerated;
      }

      return matchesSearch && matchesFilter;
    }).toList();
  }

  void _toggleExpand(int index) {
    setState(() {
      _expandedIndex = _expandedIndex == index ? null : index;
    });
  }

  Future<void> _deleteQuestion(QuestionModel question) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete question'),
        content: const Text('Are you sure you want to delete this question?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _questionService.deleteQuestion(question.id);
      if (mounted) {
        setState(() {
          _questions.removeWhere((q) => q.id == question.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Question deleted'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting: $e'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
          'Question Bank',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF081C43),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text(
                'TP',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFF0F172A)),
            onPressed: () => _showAddQuestionSheet(context),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                  });
                },
                onSubmitted: (_) => _loadQuestions(),
                decoration: InputDecoration(
                  hintText: 'Search questions...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
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

            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: ['All', 'Easy', 'Medium', 'Hard', 'AI Generated'].map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                        filter,
                        style: TextStyle(
                          color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                      selected: isSelected,
                      onSelected: (_) {
                        setState(() {
                          _selectedFilter = filter;
                        });
                        _loadQuestions();
                      },
                      backgroundColor: const Color(0xFFF1F5F9),
                      selectedColor: const Color(0xFFDBEAFE),
                      checkmarkColor: const Color(0xFF1D4ED8),
                      showCheckmark: false,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      side: BorderSide.none,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 12),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Total: ${_filteredQuestions.length} questions',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
              ),
            ),

            const SizedBox(height: 8),

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
                              const Text(
                                'Unable to load data',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton(
                                onPressed: _loadQuestions,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _filteredQuestions.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No questions found',
                                    style: TextStyle(fontSize: 16, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _loadQuestions,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _filteredQuestions.length,
                                itemBuilder: (context, index) {
                                  final question = _filteredQuestions[index];
                                  return _buildQuestionCard(question, index);
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCard(QuestionModel question, int index) {
    final isExpanded = _expandedIndex == index;

    Color difficultyBg;
    Color difficultyText;
    switch (question.difficulty.toUpperCase()) {
      case 'EASY':
        difficultyBg = const Color(0xFFDCFCE7);
        difficultyText = const Color(0xFF16A34A);
        break;
      case 'MEDIUM':
        difficultyBg = const Color(0xFFDBEAFE);
        difficultyText = const Color(0xFF1D4ED8);
        break;
      case 'HARD':
        difficultyBg = const Color(0xFFFEE2E2);
        difficultyText = const Color(0xFFDC2626);
        break;
      default:
        difficultyBg = const Color(0xFFF1F5F9);
        difficultyText = const Color(0xFF64748B);
    }

    return GestureDetector(
      onTap: () => _toggleExpand(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: difficultyBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          question.difficulty.toUpperCase(),
                          style: TextStyle(
                            color: difficultyText,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (question.isAiGenerated) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3E8FF),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'AI',
                            style: TextStyle(
                              color: Color(0xFF7C3AED),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                      const Spacer(),
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    question.content,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF0F172A),
                      height: 1.4,
                    ),
                    maxLines: isExpanded ? null : 3,
                    overflow: isExpanded ? null : TextOverflow.ellipsis,
                  ),

                  if (!isExpanded) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: question.options.asMap().entries.map((entry) {
                        final optIndex = entry.key;
                        final option = entry.value;
                        final isCorrect = option.isCorrect;
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isCorrect ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '${String.fromCharCode(65 + optIndex)}. ',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                ),
                              ),
                              Text(
                                option.text,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                ),
                              ),
                              if (isCorrect) ...[
                                const SizedBox(width: 4),
                                const Icon(Icons.check_circle, size: 14, color: Color(0xFF16A34A)),
                              ],
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  const SizedBox(height: 12),

                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: question.tags.map<Widget>((tag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          tag,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),

                  Row(
                    children: [
                      const Icon(Icons.history, size: 14, color: Color(0xFF94A3B8)),
                      const SizedBox(width: 4),
                      Text(
                        'Used: ${question.usageCount} times',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF64748B)),
                        onPressed: () {
                          _toggleExpand(index);
                          _showEditQuestionSheet(context, question);
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFDC2626)),
                        onPressed: () => _deleteQuestion(question),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (isExpanded) ...[
              const Divider(color: Color(0xFFE2E8F0), height: 1),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Correct answer:',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    ...question.options.asMap().entries.map((entry) {
                      final optIndex = entry.key;
                      final option = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Icon(
                              option.isCorrect ? Icons.check_circle : Icons.circle_outlined,
                              size: 20,
                              color: option.isCorrect ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${String.fromCharCode(65 + optIndex)}. ${option.text}',
                              style: TextStyle(
                                fontSize: 14,
                                color: option.isCorrect ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                fontWeight: option.isCorrect ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    if (question.explanation != null && question.explanation!.isNotEmpty) ...[
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
                                    'Explanation:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0284C7),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    question.explanation!,
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showAddQuestionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddQuestionSheet(
        onSaved: () => _loadQuestions(),
      ),
    );
  }

  void _showEditQuestionSheet(BuildContext context, QuestionModel question) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddQuestionSheet(
        existingQuestion: question,
        onSaved: () => _loadQuestions(),
      ),
    );
  }
}

class _AddQuestionSheet extends StatefulWidget {
  final QuestionModel? existingQuestion;
  final VoidCallback? onSaved;

  const _AddQuestionSheet({this.existingQuestion, this.onSaved});

  @override
  State<_AddQuestionSheet> createState() => _AddQuestionSheetState();
}

class _AddQuestionSheetState extends State<_AddQuestionSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _questionController;
  late final TextEditingController _optionAController;
  late final TextEditingController _optionBController;
  late final TextEditingController _optionCController;
  late final TextEditingController _optionDController;
  late final TextEditingController _tagsController;
  late final TextEditingController _explanationController;
  String _selectedDifficulty = 'Medium';
  int _correctOption = 0;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _questionController = TextEditingController(text: widget.existingQuestion?.content ?? '');
    final options = widget.existingQuestion?.options ?? [];
    _optionAController = TextEditingController(text: options.isNotEmpty ? options[0].text : '');
    _optionBController = TextEditingController(text: options.length > 1 ? options[1].text : '');
    _optionCController = TextEditingController(text: options.length > 2 ? options[2].text : '');
    _optionDController = TextEditingController(text: options.length > 3 ? options[3].text : '');
    _tagsController = TextEditingController(
      text: widget.existingQuestion?.tags.join(', ') ?? '',
    );
    _explanationController = TextEditingController(
      text: widget.existingQuestion?.explanation ?? '',
    );
    _selectedDifficulty = widget.existingQuestion?.difficulty ?? 'Medium';
    _correctOption = widget.existingQuestion?.correctIndex ?? 0;
  }

  @override
  void dispose() {
    _questionController.dispose();
    _optionAController.dispose();
    _optionBController.dispose();
    _optionCController.dispose();
    _optionDController.dispose();
    _tagsController.dispose();
    _explanationController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    try {
      final service = GetIt.instance<QuestionService>();
      final tags = _tagsController.text
          .split(',')
          .map((t) => t.trim())
          .where((t) => t.isNotEmpty)
          .toList();

      final options = [
        QuestionOption(id: 'opt_a', text: _optionAController.text.trim(), isCorrect: _correctOption == 0),
        QuestionOption(id: 'opt_b', text: _optionBController.text.trim(), isCorrect: _correctOption == 1),
        QuestionOption(id: 'opt_c', text: _optionCController.text.trim(), isCorrect: _correctOption == 2),
        QuestionOption(id: 'opt_d', text: _optionDController.text.trim(), isCorrect: _correctOption == 3),
      ];

      final correctAnswer = options[_correctOption].id;

      if (widget.existingQuestion != null) {
        await service.updateQuestion(
          widget.existingQuestion!.id,
          {
            'content': _questionController.text.trim(),
            'options': options.map((o) => {
              'id': o.id,
              'text': o.text,
              'isCorrect': o.isCorrect,
            }).toList(),
            'difficulty': _selectedDifficulty.toLowerCase(),
            'tags': tags,
            'explanation': _explanationController.text.trim(),
          },
        );
      } else {
        await service.createQuestion(
          content: _questionController.text.trim(),
          options: options,
          correctAnswer: correctAnswer,
          difficulty: _selectedDifficulty,
          tags: tags,
          explanation: _explanationController.text.trim(),
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onSaved?.call();
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.existingQuestion != null ? 'Question updated' : 'New question added'),
            backgroundColor: const Color(0xFF16A34A),
          ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: const Color(0xFFDC2626)),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;
    final isEditing = widget.existingQuestion != null;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 12, 24, 24 + bottomPadding),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                isEditing ? 'Edit question' : 'Add new question',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 20),

              const Text('Question content *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              const SizedBox(height: 8),
              TextFormField(
                controller: _questionController,
                minLines: 3,
                maxLines: 5,
                decoration: _inputDecoration('Enter question content'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a question' : null,
              ),
              const SizedBox(height: 16),

              const Text('Difficulty', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _selectedDifficulty,
                decoration: _inputDecoration('Select difficulty'),
                items: const [
                  DropdownMenuItem(value: 'Easy', child: Text('Easy')),
                  DropdownMenuItem(value: 'Medium', child: Text('Medium')),
                  DropdownMenuItem(value: 'Hard', child: Text('Hard')),
                ],
                onChanged: (value) => setState(() => _selectedDifficulty = value ?? 'Medium'),
              ),
              const SizedBox(height: 16),

              const Text('Options (select the correct answer)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              const SizedBox(height: 8),
              _buildOptionField('A', _optionAController, 0),
              const SizedBox(height: 8),
              _buildOptionField('B', _optionBController, 1),
              const SizedBox(height: 8),
              _buildOptionField('C', _optionCController, 2),
              const SizedBox(height: 8),
              _buildOptionField('D', _optionDController, 3),
              const SizedBox(height: 16),

              const Text('Tags (comma separated)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              const SizedBox(height: 8),
              TextFormField(
                controller: _tagsController,
                decoration: _inputDecoration('Example: Math, Geometry, Grade 10'),
              ),
              const SizedBox(height: 16),

              const Text('Explanation (optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              const SizedBox(height: 8),
              TextFormField(
                controller: _explanationController,
                minLines: 2,
                maxLines: 4,
                decoration: _inputDecoration('Enter explanation for the answer'),
              ),
              const SizedBox(height: 24),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF081C43),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Save'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionField(String label, TextEditingController controller, int index) {
    final isCorrect = _correctOption == index;
    return Row(
      children: [
        GestureDetector(
          onTap: () => setState(() => _correctOption = index),
          child: Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isCorrect ? const Color(0xFF16A34A) : Colors.transparent,
              border: Border.all(
                color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFCBD5E1),
                width: 2,
              ),
            ),
            child: isCorrect ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
          ),
        ),
        Text('$label. ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        Expanded(
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              hintText: 'Enter option $label',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: isCorrect ? const Color(0xFFDCFCE7) : Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isCorrect ? const Color(0xFF16A34A) : const Color(0xFF081C43), width: 2),
              ),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter an answer' : null,
          ),
        ),
      ],
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
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
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDC2626)),
      ),
    );
  }
}
