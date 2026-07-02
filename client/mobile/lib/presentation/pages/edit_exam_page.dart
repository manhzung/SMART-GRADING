import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/api_client.dart';
import '../../core/network/exam_service.dart' hide Question;
import '../../domain/entities/exam.entity.dart';
import '../../domain/entities/user.entity.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/class/class_bloc.dart';
import '../blocs/exam/exam_bloc.dart';

class EditExamPage extends StatefulWidget {
  final Exam exam;

  const EditExamPage({super.key, required this.exam});

  @override
  State<EditExamPage> createState() => _EditExamPageState();
}

class _EditExamPageState extends State<EditExamPage> {
  final _formKey = GlobalKey<FormState>();
  late ExamService _examService;

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _durationController;
  late TextEditingController _numberOfQuestionsController;
  late TextEditingController _totalScoreController;
  late TextEditingController _passingScoreController;

  DateTime? _selectedExamDate;
  int _numberOfVersions = 1;
  bool _shuffleQuestions = false;
  bool _shuffleAnswers = false;
  Exam? _currentExam;
  bool _isLoading = false;
  bool _isSaving = false;
  bool _autovalidate = false;

  ExamClass? _selectedClass;

  @override
  void initState() {
    super.initState();
    final apiClient = GetIt.instance<ApiClient>();
    _examService = ExamService(apiClient: apiClient);

    _currentExam = widget.exam;

    _titleController = TextEditingController(text: widget.exam.title);
    _descriptionController = TextEditingController(text: widget.exam.description ?? '');
    _durationController = TextEditingController(text: widget.exam.duration.toString());
    _numberOfQuestionsController = TextEditingController(
      text: widget.exam.numberOfQuestions > 0
          ? widget.exam.numberOfQuestions.toString()
          : widget.exam.questions.isNotEmpty
              ? widget.exam.questions.length.toString()
              : '',
    );
    _totalScoreController = TextEditingController(
      text: widget.exam.totalScore > 0 ? widget.exam.totalScore.toString() : '',
    );
    _passingScoreController = TextEditingController(text: '5');

    _selectedExamDate = widget.exam.examDate;
    _numberOfVersions = widget.exam.numberOfVersions > 0 ? widget.exam.numberOfVersions : 1;
    _selectedClass = widget.exam.primaryClassId ?? (widget.exam.classIds.isNotEmpty ? widget.exam.classIds.first : null);

    _loadFreshData();
  }

  Future<void> _loadFreshData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final freshExam = await _examService.getExamById(widget.exam.id);
      if (mounted) {
        setState(() {
          _currentExam = freshExam;
          _titleController.text = freshExam.title;
          _descriptionController.text = freshExam.description ?? '';
          _durationController.text = freshExam.duration.toString();
          _numberOfQuestionsController.text = freshExam.numberOfQuestions > 0
              ? freshExam.numberOfQuestions.toString()
              : freshExam.questions.isNotEmpty
                  ? freshExam.questions.length.toString()
                  : '';
          _totalScoreController.text = freshExam.totalScore > 0 ? freshExam.totalScore.toString() : '';
          _selectedExamDate = freshExam.examDate;
          _numberOfVersions = freshExam.numberOfVersions > 0 ? freshExam.numberOfVersions : 1;
          _selectedClass = freshExam.primaryClassId ??
              (freshExam.classIds.isNotEmpty ? freshExam.classIds.first : null);
          _isLoading = false;
        });
      }
    } catch (e) {
      // ignore: avoid_print
      print('[EditExamPage] Failed to load fresh data, using passed exam: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _durationController.dispose();
    _numberOfQuestionsController.dispose();
    _totalScoreController.dispose();
    _passingScoreController.dispose();
    super.dispose();
  }

  String _getUserInitials(String name) {
    if (name.isEmpty) return 'TP';
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'TP';
    if (parts.length == 1) {
      return parts.first.substring(0, parts.first.length >= 2 ? 2 : 1).toUpperCase();
    }
    final firstLetter = parts.first[0];
    final lastLetter = parts.last[0];
    return '$firstLetter$lastLetter'.toUpperCase();
  }

  String _getStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return 'DRAFT';
      case 'PUBLISHED':
        return 'PUBLISHED';
      case 'IN_PROGRESS':
        return 'IN PROGRESS';
      case 'COMPLETED':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return const Color(0xFF64748B);
      case 'PUBLISHED':
        return const Color(0xFF2563EB);
      case 'IN_PROGRESS':
        return const Color(0xFFD97706);
      case 'COMPLETED':
        return const Color(0xFF16A34A);
      default:
        return const Color(0xFF64748B);
    }
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedExamDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF081C43),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedExamDate) {
      setState(() {
        _selectedExamDate = picked;
      });
    }
  }

  void _saveForm() {
    setState(() {
      _autovalidate = true;
    });

    if (_formKey.currentState!.validate()) {
      _performSave();
    }
  }

  Future<void> _performSave() async {
    setState(() {
      _isSaving = true;
    });

    try {
      final duration = int.tryParse(_durationController.text) ?? 60;
      final numberOfQuestions = int.tryParse(_numberOfQuestionsController.text) ?? 0;
      final totalScore = int.tryParse(_totalScoreController.text) ?? 0;
      final passingScore = int.tryParse(_passingScoreController.text) ?? 5;

      final data = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'duration': duration,
        'numberOfQuestions': numberOfQuestions,
        'numberOfVersions': _numberOfVersions,
        'totalScore': totalScore,
        'passingScore': passingScore,
      };

      if (_selectedExamDate != null) {
        data['examDate'] = _selectedExamDate!.toIso8601String();
      }

      if (_selectedClass != null) {
        data['primaryClassId'] = _selectedClass!.id;
      }

      await _examService.updateExam(widget.exam.id, data);

      if (mounted) {
        context.read<ExamBloc>().add(ExamUpdateRequested(Exam(
          id: widget.exam.id,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          examDate: _selectedExamDate,
          duration: duration,
          numberOfQuestions: numberOfQuestions,
          numberOfVersions: _numberOfVersions,
          totalScore: totalScore,
          primaryClassId: _selectedClass,
          status: widget.exam.status,
          createdAt: widget.exam.createdAt,
        )));

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Exam updated successfully!',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );

        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  void _showClassPicker() {
    final classState = context.read<ClassBloc>().state;
    final classes = classState is ClassLoaded ? classState.classes : <Class>[];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select class',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              if (classes.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'No classes available',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: classes.length,
                    itemBuilder: (context, index) {
                      final cls = classes[index];
                      final isSelected = _selectedClass?.id == cls.id;
                      return ListTile(
                        title: Text(
                          cls.name,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? const Color(0xFF081C43) : const Color(0xFF0F172A),
                          ),
                        ),
                        subtitle: Text(cls.code),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: Color(0xFF16A34A))
                            : null,
                        onTap: () {
                          setState(() {
                            _selectedClass = ExamClass(
                              id: cls.id,
                              name: cls.name,
                              code: cls.code,
                            );
                          });
                          Navigator.pop(ctx);
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  InputDecoration _buildInputDecoration(String hint, {Widget? prefixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      prefixIcon: prefixIcon,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF081C43), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFB91C1C)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFB91C1C), width: 1.5),
      ),
      errorStyle: const TextStyle(
        color: Color(0xFFB91C1C),
        fontSize: 12.5,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String userInitials = 'TP';
    if (authState is AuthAuthenticated) {
      userInitials = _getUserInitials(authState.user.name);
    }

    final displayExam = _currentExam ?? widget.exam;
    final statusLabel = _getStatusLabel(displayExam.status);
    final statusColor = _getStatusColor(displayExam.status);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF081C43)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          displayExam.title.isNotEmpty ? displayExam.title : 'Edit exam',
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        centerTitle: false,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              statusLabel,
              style: TextStyle(
                color: statusColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    userInitials,
                    style: const TextStyle(
                      color: Color(0xFF081C43),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_isLoading)
              const LinearProgressIndicator(
                minHeight: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF081C43)),
                backgroundColor: Colors.transparent,
              ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  autovalidateMode: _autovalidate
                      ? AutovalidateMode.onUserInteraction
                      : AutovalidateMode.disabled,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section 1: Basic Information
                        const Text(
                          '1. Basic Information',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),

                        const Text(
                          'Exam title *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _titleController,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Title cannot be empty';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Example: Midterm Exam Semester 1'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),

                        const Text(
                          'Description',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _descriptionController,
                          maxLines: 3,
                          decoration: _buildInputDecoration('Exam description (optional)'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),

                        const Text(
                          'Class',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: _showClassPicker,
                          child: AbsorbPointer(
                            child: TextFormField(
                              controller: TextEditingController(
                                text: _selectedClass?.name ?? 'Select class',
                              ),
                              readOnly: true,
                              decoration: _buildInputDecoration(
                                'Select class',
                                prefixIcon: const Icon(
                                  Icons.school_outlined,
                                  color: Color(0xFF64748B),
                                  size: 22,
                                ),
                              ),
                              style: TextStyle(
                                fontSize: 15,
                                color: _selectedClass != null
                                    ? const Color(0xFF0F172A)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Section 2: Exam Parameters
                        const Text(
                          '2. Exam Parameters',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),

                        const Text(
                          'Exam date',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: _selectDate,
                          child: AbsorbPointer(
                            child: TextFormField(
                              controller: TextEditingController(
                                text: _selectedExamDate != null
                                    ? '${_selectedExamDate!.day}/${_selectedExamDate!.month}/${_selectedExamDate!.year}'
                                    : 'Select exam date',
                              ),
                              readOnly: true,
                              decoration: _buildInputDecoration(
                                'Select exam date',
                                prefixIcon: const Icon(
                                  Icons.calendar_today_outlined,
                                  color: Color(0xFF64748B),
                                  size: 22,
                                ),
                              ),
                              style: TextStyle(
                                fontSize: 15,
                                color: _selectedExamDate != null
                                    ? const Color(0xFF0F172A)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Duration (minutes) *',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _durationController,
                                    keyboardType: TextInputType.number,
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Cannot be empty';
                                      }
                                      final duration = int.tryParse(value);
                                      if (duration == null || duration <= 0) {
                                        return 'Must be a number > 0';
                                      }
                                      return null;
                                    },
                                    decoration: _buildInputDecoration('90'),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Number of questions',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _numberOfQuestionsController,
                                    keyboardType: TextInputType.number,
                                    decoration: _buildInputDecoration('50'),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Number of versions',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  DropdownButtonFormField<int>(
                                    initialValue: _numberOfVersions,
                                    icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
                                    decoration: _buildInputDecoration('Number of versions'),
                                    items: List.generate(10, (index) {
                                      final val = index + 1;
                                      return DropdownMenuItem(
                                        value: val,
                                        child: Text('$val'),
                                      );
                                    }),
                                    onChanged: (val) {
                                      if (val != null) {
                                        setState(() {
                                          _numberOfVersions = val;
                                        });
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Total points',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _totalScoreController,
                                    keyboardType: TextInputType.number,
                                    decoration: _buildInputDecoration('10'),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        const Text(
                          'Passing score',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passingScoreController,
                          keyboardType: TextInputType.number,
                          decoration: _buildInputDecoration('5'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Section 3: Shuffle Options
                        const Text(
                          '3. Shuffle Options',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 12),

                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              SwitchListTile(
                                title: const Text(
                                  'Shuffle questions',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                subtitle: const Text(
                                  'Questions will be randomly ordered',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                value: _shuffleQuestions,
                                onChanged: (val) {
                                  setState(() {
                                    _shuffleQuestions = val;
                                  });
                                },
                                activeTrackColor: const Color(0xFF081C43),
                              ),
                              const Divider(height: 1, color: Color(0xFFE2E8F0)),
                              SwitchListTile(
                                title: const Text(
                                  'Shuffle answers',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                subtitle: const Text(
                                  'Answer options will be shuffled',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                value: _shuffleAnswers,
                                onChanged: (val) {
                                  setState(() {
                                    _shuffleAnswers = val;
                                  });
                                },
                                activeTrackColor: const Color(0xFF081C43),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Section 4: Assigned Questions
                        Text(
                          '4. Assigned Questions (${displayExam.questions.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 12),

                        if (displayExam.questions.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Center(
                              child: Text(
                                'No questions assigned yet',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: displayExam.questions.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final question = displayExam.questions[index];
                              return _buildQuestionItem(index + 1, question);
                            },
                          ),
                        const SizedBox(height: 12),

                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              // TODO: Navigate to question bank or show bottom sheet
                              ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Feature under development'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          icon: const Icon(Icons.add, size: 20),
                          label: const Text('Add question'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF081C43),
                              side: const BorderSide(color: Color(0xFF081C43)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Bottom Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ElevatedButton(
                    onPressed: _isSaving ? null : _saveForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF081C43),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                      disabledBackgroundColor: const Color(0xFF64748B),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(
                            'Save changes',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                  ),
                  const SizedBox(height: 4),
                  TextButton(
                    onPressed: _isSaving ? null : () => Navigator.pop(context),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionItem(int index, Question question) {
    Color difficultyBg = const Color(0xFFDBEAFE);
    Color difficultyText = const Color(0xFF2563EB);

    final difficulty = question.difficulty?.toUpperCase() ?? 'MEDIUM';
    if (difficulty == 'HARD') {
      difficultyBg = const Color(0xFFFEE2E2);
      difficultyText = const Color(0xFFDC2626);
    } else if (difficulty == 'EASY') {
      difficultyBg = const Color(0xFFDCFCE7);
      difficultyText = const Color(0xFF16A34A);
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Center(
              child: Text(
                index.toString(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question.topic ?? 'Question',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  question.content,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: difficultyBg,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              difficulty,
              style: TextStyle(
                color: difficultyText,
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${question.score} pts',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
