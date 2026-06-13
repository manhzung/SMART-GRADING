import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/class_service.dart';
import '../../domain/entities/user.entity.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/school/school_bloc.dart';
import '../blocs/class/class_bloc.dart';

class CreateEditClassPage extends StatefulWidget {
  final Class? cls;

  const CreateEditClassPage({super.key, this.cls});

  @override
  State<CreateEditClassPage> createState() => _CreateEditClassPageState();
}

class _CreateEditClassPageState extends State<CreateEditClassPage> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _codeController;
  late TextEditingController _academicYearController;
  late TextEditingController _schoolController;
  late TextEditingController _teacherController;

  int? _selectedGradeLevel;
  bool _autovalidate = false;

  @override
  void initState() {
    super.initState();

    // Fetch schools list if not loaded yet
    context.read<SchoolBloc>().add(SchoolFetchRequested());

    // Prepopulate fields if in Edit mode
    final cls = widget.cls;
    _nameController = TextEditingController(text: cls?.name ?? '');
    _codeController = TextEditingController(text: cls?.code ?? '');
    _academicYearController = TextEditingController(text: cls?.academicYear ?? '');
    _selectedGradeLevel = cls?.gradeLevel;
    _schoolController = TextEditingController();
    _teacherController = TextEditingController();

    // Auto-set academic year for new classes
    if (cls == null) {
      final now = DateTime.now();
      _academicYearController.text = '${now.year}-${now.year + 1}';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _academicYearController.dispose();
    _schoolController.dispose();
    _teacherController.dispose();
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

  void _saveForm() async {
    setState(() {
      _autovalidate = true;
    });

    if (_formKey.currentState!.validate()) {
      final isEdit = widget.cls != null;

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      try {
        final classService = GetIt.instance<ClassService>();

        if (isEdit) {
          await classService.updateClass(
            widget.cls!.id,
            name: _nameController.text.trim(),
            code: _codeController.text.trim(),
            gradeLevel: _selectedGradeLevel ?? 12,
            academicYear: _academicYearController.text.trim(),
          );
        } else {
          await classService.createClass(
            name: _nameController.text.trim(),
            code: _codeController.text.trim(),
            gradeLevel: _selectedGradeLevel ?? 12,
            academicYear: _academicYearController.text.trim(),
          );
        }

        if (mounted) {
          Navigator.pop(context); // Close loading dialog
          context.read<ClassBloc>().add(const ClassFetchRequested());
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isEdit ? 'Cap nhat lop hoc thanh cong!' : 'Tao lop hoc moi thanh cong!',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              backgroundColor: const Color(0xFF081C43),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          Navigator.pop(context); // Close loading dialog
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Loi: ${e.toString()}'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  void _selectSchoolDialog(List<School> schools) {
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
                'Chọn Trường học',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: schools.length,
                  itemBuilder: (context, index) {
                    final school = schools[index];
                    return ListTile(
                      title: Text(school.name),
                      leading: const Icon(Icons.school_outlined, color: Color(0xFF081C43)),
                      onTap: () {
                        setState(() {
                          _schoolController.text = school.name;
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

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    String userInitials = 'TP';
    if (authState is AuthAuthenticated) {
      userInitials = _getUserInitials(authState.user.name);
    }

    final isEditMode = widget.cls != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF081C43)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isEditMode ? 'Chỉnh sửa lớp học' : 'Tạo lớp học',
          style: const TextStyle(
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
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
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
                        // Tên lớp học
                        const Text(
                          'Tên lớp học *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Tên lớp học không được để trống';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Ví dụ: 12A1'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Mã lớp
                        Row(
                          children: [
                            const Text(
                              'Mã lớp',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF334155),
                              ),
                            ),
                            const Text(
                              ' *',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.red,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _codeController,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Mã lớp không được để trống';
                            }
                            if (value.trim().length < 2 || value.trim().length > 20) {
                              return 'Mã lớp phải từ 2-20 ký tự';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Ví dụ: CL12A1'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Khối lớp (Grade level dropdown)
                        const Text(
                          'Khối lớp',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<int>(
                          initialValue: _selectedGradeLevel,
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
                          decoration: _buildInputDecoration('Chọn khối lớp'),
                          items: const [
                            DropdownMenuItem(value: 10, child: Text('Khối 10')),
                            DropdownMenuItem(value: 11, child: Text('Khối 11')),
                            DropdownMenuItem(value: 12, child: Text('Khối 12')),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedGradeLevel = val;
                            });
                          },
                          validator: (value) {
                            if (value == null) {
                              return 'Vui lòng chọn khối lớp';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        // Niên khóa
                        const Text(
                          'Niên khóa',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _academicYearController,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Niên khóa không được để trống';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Ví dụ: 2023-2024'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Trường học
                        const Text(
                          'Trường học',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        BlocBuilder<SchoolBloc, SchoolState>(
                          builder: (context, state) {
                            final schools = state is SchoolLoaded ? state.schools : <School>[];
                            return TextFormField(
                              controller: _schoolController,
                              readOnly: true,
                              onTap: () {
                                if (schools.isNotEmpty) {
                                  _selectSchoolDialog(schools);
                                }
                              },
                              decoration: _buildInputDecoration(
                                'Chọn trường học',
                                prefixIcon: const Icon(
                                  Icons.search,
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
                        const SizedBox(height: 20),

                        // Giáo viên chủ nhiệm
                        const Text(
                          'Giáo viên chủ nhiệm',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _teacherController,
                          decoration: _buildInputDecoration(
                            'Tên giáo viên chủ nhiệm',
                            prefixIcon: const Icon(
                              Icons.person_outline,
                              color: Color(0xFF64748B),
                              size: 22,
                            ),
                          ),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 10),
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
                  ElevatedButton.icon(
                    onPressed: _saveForm,
                    icon: const Icon(Icons.save, color: Colors.white, size: 20),
                    label: const Text(
                      'Lưu thông tin',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF081C43),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
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
}
