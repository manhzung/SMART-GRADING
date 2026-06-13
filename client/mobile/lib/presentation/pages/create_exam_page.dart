import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/omr_template_service.dart';
import '../../domain/entities/exam.entity.dart';
import '../../domain/entities/user.entity.dart';
import '../../domain/omr/models/omr_template.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/class/class_bloc.dart';
import '../blocs/exam/exam_bloc.dart';

class CreateExamPage extends StatefulWidget {
  const CreateExamPage({super.key});

  @override
  State<CreateExamPage> createState() => _CreateExamPageState();
}

class _CreateExamPageState extends State<CreateExamPage> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _durationController;
  late TextEditingController _numberOfQuestionsController;
  late TextEditingController _totalScoreController;
  late TextEditingController _passingScoreController;
  late TextEditingController _dateController;

  Class? _selectedClass;
  int _numberOfVersions = 1;
  String? _selectedOmrTemplate;
  bool _shuffleQuestions = false;
  bool _shuffleAnswers = false;
  DateTime? _selectedDate;
  bool _autovalidate = false;

  List<OMRTemplate> _omrTemplates = [];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descriptionController = TextEditingController();
    _durationController = TextEditingController(text: '90');
    _numberOfQuestionsController = TextEditingController(text: '50');
    _totalScoreController = TextEditingController(text: '10');
    _passingScoreController = TextEditingController(text: '5');
    _dateController = TextEditingController();

    context.read<ClassBloc>().add(const ClassFetchRequested());
    _loadOmrTemplates();
  }

  Future<void> _loadOmrTemplates() async {
    try {
      final service = GetIt.instance<OMRTemplateService>();
      final templates = await service.getAll();
      if (mounted) {
        setState(() {
          _omrTemplates = templates;
        });
      }
    } catch (_) {
      // Silently fail; keep empty list
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
    _dateController.dispose();
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

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
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
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _dateController.text = _formatDate(picked);
      });
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  void _showClassSelector(List<Class> classes) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Chọn lớp học',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              if (classes.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Center(
                    child: Text(
                      'Không có lớp học nào',
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
                      return ListTile(
                        title: Text(
                          cls.name,
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          '${cls.code} • ${cls.studentCount} học sinh',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 12,
                          ),
                        ),
                        leading: const Icon(
                          Icons.class_outlined,
                          color: Color(0xFF081C43),
                        ),
                        onTap: () {
                          setState(() {
                            _selectedClass = cls;
                          });
                          Navigator.pop(context);
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

  void _submitForm() {
    setState(() {
      _autovalidate = true;
    });

    if (_formKey.currentState!.validate()) {
      if (_selectedClass == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Vui lòng chọn lớp học'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      final duration = int.tryParse(_durationController.text) ?? 90;
      final totalScore = int.tryParse(_totalScoreController.text) ?? 10;
                            final numberOfQuestions = int.tryParse(_numberOfQuestionsController.text) ?? 50;

      final exam = Exam(
        id: '',
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        classIds: [],
        primaryClassId: _selectedClass != null
            ? ExamClass(
                id: _selectedClass!.id,
                name: _selectedClass!.name,
                code: _selectedClass!.code,
              )
            : null,
        omrTemplateId: _selectedOmrTemplate,
        examDate: _selectedDate,
        duration: duration,
        totalScore: totalScore,
        status: 'draft',
        numberOfVersions: _numberOfVersions,
        numberOfQuestions: numberOfQuestions,
        createdAt: DateTime.now(),
      );

      context.read<ExamBloc>().add(ExamCreateRequested(exam));

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Tạo bài kiểm tra thành công!',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: const Color(0xFF081C43),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );

      Navigator.pop(context);
    }
  }

  InputDecoration _buildInputDecoration(String hint, {Widget? prefixIcon, Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
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
    );
  }

  Widget _buildSectionLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Color(0xFF64748B),
          letterSpacing: 0.5,
        ),
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
        title: const Text(
          'Tạo bài kiểm tra',
          style: TextStyle(
            color: Color(0xFF081C43),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: false,
        actions: [
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
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section 1 - Thông tin cơ bản
                        _buildSectionLabel('THÔNG TIN CƠ BẢN'),
                        const Text(
                          'Tên bài kiểm tra *',
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
                              return 'Tên bài kiểm tra không được để trống';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Nhập tên bài kiểm tra'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Mô tả',
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
                          decoration: _buildInputDecoration('Nhập mô tả bài kiểm tra'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Section 2 - Phân công lớp học
                        _buildSectionLabel('PHÂN CÔNG LỚP HỌC'),
                        const Text(
                          'Lớp học *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        BlocBuilder<ClassBloc, ClassState>(
                          builder: (context, state) {
                            final classes = state is ClassLoaded ? state.classes : <Class>[];
                            return TextFormField(
                              readOnly: true,
                              controller: TextEditingController(
                                text: _selectedClass?.name ?? '',
                              ),
                              onTap: () => _showClassSelector(classes),
                              decoration: _buildInputDecoration(
                                'Chọn lớp học',
                                prefixIcon: const Icon(
                                  Icons.class_outlined,
                                  color: Color(0xFF64748B),
                                  size: 22,
                                ),
                              ),
                              style: const TextStyle(
                                fontSize: 15,
                                color: Color(0xFF0F172A),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 24),

                        // Section 3 - Tham số bài kiểm tra
                        _buildSectionLabel('THAM SỐ BÀI KIỂM TRA'),
                        const Text(
                          'Ngày kiểm tra',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _dateController,
                          readOnly: true,
                          onTap: _selectDate,
                          decoration: _buildInputDecoration(
                            'Chọn ngày kiểm tra',
                            prefixIcon: const Icon(
                              Icons.calendar_today_outlined,
                              color: Color(0xFF64748B),
                              size: 22,
                            ),
                          ),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Duration and Number of Questions Row
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Thời gian (phút)',
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
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Nhập thời gian';
                                      }
                                      return null;
                                    },
                                    decoration: _buildInputDecoration('90').copyWith(
                                      suffixIcon: const Padding(
                                        padding: EdgeInsets.only(right: 12),
                                        child: Text(
                                          'phút',
                                          style: TextStyle(
                                            color: Color(0xFF64748B),
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      suffixIconConstraints: const BoxConstraints(
                                        minWidth: 50,
                                        minHeight: 0,
                                      ),
                                    ),
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
                                    'Số câu hỏi',
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
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Nhập số câu';
                                      }
                                      return null;
                                    },
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

                        // Number of Versions and Total Score Row
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Số đề',
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
                                    decoration: _buildInputDecoration('Chọn số đề'),
                                    items: const [
                                      DropdownMenuItem(value: 1, child: Text('1 đề')),
                                      DropdownMenuItem(value: 2, child: Text('2 đề')),
                                      DropdownMenuItem(value: 4, child: Text('4 đề')),
                                      DropdownMenuItem(value: 8, child: Text('8 đề')),
                                    ],
                                    onChanged: (val) {
                                      setState(() {
                                        _numberOfVersions = val ?? 1;
                                      });
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
                                    'Tổng điểm',
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
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Nhập điểm';
                                      }
                                      return null;
                                    },
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

                        // Passing Score
                        const Text(
                          'Điểm đạt',
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
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Nhập điểm đạt';
                            }
                            final totalScore = int.tryParse(_totalScoreController.text) ?? 10;
                            final passingScore = int.tryParse(value) ?? 0;
                            if (passingScore > totalScore) {
                              return 'Điểm đạt không được lớn hơn tổng điểm';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('5'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Section 4 - Tùy chọn
                        _buildSectionLabel('TÙY CHỌN'),
                        Row(
                          children: [
                            Expanded(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Đảo câu hỏi',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Switch(
                                    value: _shuffleQuestions,
                                    onChanged: (val) {
                                      setState(() {
                                        _shuffleQuestions = val;
                                      });
                                    },
                                  activeTrackColor: const Color(0xFF081C43),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 24),
                            Expanded(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Đảo đáp án',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Switch(
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
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Section 5 - OMR Template
                        _buildSectionLabel('MẪU OMR'),
                        const Text(
                          'Mẫu OMR',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedOmrTemplate,
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
                          decoration: _buildInputDecoration('Chọn mẫu OMR'),
                          items: _omrTemplates.map((template) {
                            return DropdownMenuItem<String>(
                              value: template.id,
                              child: Text(template.name.isNotEmpty ? template.name : 'Template ${template.id}'),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() {
                              _selectedOmrTemplate = val;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Bottom Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ElevatedButton(
                    onPressed: _submitForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF081C43),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Tạo bài kiểm tra',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'Hủy',
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
}
