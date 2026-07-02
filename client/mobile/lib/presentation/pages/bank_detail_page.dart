import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:smart_grading_mobile/core/network/bank_service.dart';
import 'package:smart_grading_mobile/core/network/question_service.dart';
import 'package:smart_grading_mobile/domain/entities/question_bank.entity.dart';
import 'package:smart_grading_mobile/domain/entities/question.entity.dart';

class BankDetailPage extends StatefulWidget {
  final String? bankId;

  const BankDetailPage({super.key, this.bankId});

  @override
  State<BankDetailPage> createState() => _BankDetailPageState();
}

class _BankDetailPageState extends State<BankDetailPage> {
  final BankService _bankService = GetIt.instance<BankService>();
  final QuestionService _questionService = GetIt.instance<QuestionService>();

  QuestionBank? _bank;
  List<QuestionModel> _questions = [];
  bool _isLoadingBank = true;
  bool _isLoadingQuestions = false;
  String? _error;
  String _searchQuery = '';
  String? _selectedDifficulty;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBank();
    });
  }

  String? get _effectiveBankId {
    if (widget.bankId != null) return widget.bankId;
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    return args?['bankId'] as String?;
  }

  Future<void> _loadBank() async {
    final bankId = _effectiveBankId;
    if (bankId == null) {
      if (mounted) {
        setState(() {
          _error = 'No bank ID provided';
          _isLoadingBank = false;
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        _isLoadingBank = true;
        _error = null;
      });
    }

    try {
      final bankDetail = await _bankService.getBank(bankId);
      if (mounted) {
        setState(() {
          _bank = bankDetail.bank;
          _isLoadingBank = false;
        });
      }
      _loadQuestions(bankId);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Unable to load bank';
          _isLoadingBank = false;
        });
      }
    }
  }

  Future<void> _loadQuestions(String bankId) async {
    if (mounted) {
      setState(() {
        _isLoadingQuestions = true;
      });
    }

    try {
      final result = await _questionService.getQuestions(
        bankId: bankId,
        difficulty: _selectedDifficulty,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );
      if (mounted) {
        setState(() {
          _questions = result.results;
          _isLoadingQuestions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingQuestions = false;
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
    if (_bank != null) {
      _loadQuestions(_bank!.id);
    }
  }

  void _onDifficultyChanged(String? difficulty) {
    setState(() {
      _selectedDifficulty = difficulty == 'All' ? null : difficulty?.toLowerCase();
    });
    if (_bank != null) {
      _loadQuestions(_bank!.id);
    }
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return const Color(0xFF10B981);
      case 'medium':
        return const Color(0xFFF59E0B);
      case 'hard':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF6B7280);
    }
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
          _bank?.name ?? 'Bank Details',
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoadingBank) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return _buildErrorState();
    }

    if (_bank == null) {
      return const Center(child: Text('Bank not found'));
    }

    return RefreshIndicator(
      onRefresh: () async {
        await _loadBank();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildBankHeader(),
            _buildSearchBar(),
            _buildDifficultyFilters(),
            _buildQuestionsList(),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 48),
          const SizedBox(height: 16),
          Text(
            _error ?? 'Unable to load bank',
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadBank,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildBankHeader() {
    final bank = _bank!;
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  bank.name,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.bold,
                    fontSize: 24,
                  ),
                ),
              ),
              _buildTypeBadge(bank.type),
            ],
          ),
          if (bank.description != null && bank.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              bank.description!,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    Color badgeColor;
    switch (type.toLowerCase()) {
      case 'school':
        badgeColor = const Color(0xFF3B82F6);
        break;
      case 'personal':
        badgeColor = const Color(0xFF8B5CF6);
        break;
      default:
        badgeColor = const Color(0xFF6B7280);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        type,
        style: TextStyle(
          color: badgeColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextField(
        onChanged: _onSearchChanged,
        decoration: InputDecoration(
          hintText: 'Search questions...',
          prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
          filled: true,
          fillColor: Colors.white,
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
            borderSide: const BorderSide(color: Color(0xFF3B82F6)),
          ),
        ),
      ),
    );
  }

  Widget _buildDifficultyFilters() {
    final difficulties = ['All', 'Easy', 'Medium', 'Hard'];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Wrap(
        spacing: 8,
        children: difficulties.map((diff) {
          final isSelected = (diff == 'All' && _selectedDifficulty == null) ||
              diff.toLowerCase() == _selectedDifficulty;
          return FilterChip(
            label: Text(diff),
            selected: isSelected,
            onSelected: (_) => _onDifficultyChanged(diff),
            selectedColor: const Color(0xFF3B82F6).withValues(alpha: 0.2),
            checkmarkColor: const Color(0xFF3B82F6),
            labelStyle: TextStyle(
              color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFF64748B),
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildQuestionsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Questions',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (_isLoadingQuestions)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_questions.isEmpty)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.quiz_outlined, color: Color(0xFF94A3B8), size: 48),
                  SizedBox(height: 16),
                  Text(
                    'No questions found',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _questions.length,
            itemBuilder: (context, index) {
              final question = _questions[index];
              return _buildQuestionCard(question);
            },
          ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildQuestionCard(QuestionModel question) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    question.content,
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                _buildDifficultyBadge(question.difficulty),
              ],
            ),
            if (question.tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: question.tags.take(3).map((tag) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      tag,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 10,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDifficultyBadge(String difficulty) {
    final color = _getDifficultyColor(difficulty);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        difficulty,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
