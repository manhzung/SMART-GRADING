import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/class_service.dart';
import '../../core/network/user_service.dart';
import '../../domain/entities/user.entity.dart';
import '../blocs/auth/auth_bloc.dart';
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

  int? _selectedGradeLevel;
  String? _selectedTeacherId;
  List<User> _teachers = [];
  bool _isLoadingTeachers = false;
  bool _autovalidate = false;

  @override
  void initState() {
    super.initState();

    // Prepopulate fields if in Edit mode
    final cls = widget.cls;
    _nameController = TextEditingController(text: cls?.name ?? '');
    _codeController = TextEditingController(text: cls?.code ?? '');
    _academicYearController = TextEditingController(text: cls?.academicYear ?? '');
    _selectedGradeLevel = cls?.gradeLevel;

    // Auto-set academic year for new classes
    if (cls == null) {
      final now = DateTime.now();
      _academicYearController.text = '${now.year}-${now.year + 1}';
    }

    // Load teachers list for homeroom teacher dropdown
    _loadTeachers();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _academicYearController.dispose();
    super.dispose();
  }

  Future<void> _loadTeachers() async {
    setState(() => _isLoadingTeachers = true);
    try {
      final userService = GetIt.instance<UserService>();
      final result = await userService.getTeachers(page: 1, limit: 100);
      if (!mounted) return;
      setState(() {
        _teachers = result.results;
        _isLoadingTeachers = false;
        // Default homeroom teacher = current user
        final authState = context.read<AuthBloc>().state;
        if (authState is AuthAuthenticated) {
          _selectedTeacherId = authState.user.id;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingTeachers = false);
    }
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
      final authState = context.read<AuthBloc>().state;
      if (authState is! AuthAuthenticated) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Session expired'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      // Auto-fill schoolId from current user (matches web behavior)
      final currentUser = authState.user;
      final schoolId = currentUser.schoolId;
      if (schoolId == null || schoolId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account not assigned to a school'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      try {
        final classService = GetIt.instance<ClassService>();

        // Fallback to current user if teacher not selected (matches web behavior).
        final teacherId = (_selectedTeacherId == null || _selectedTeacherId!.isEmpty)
            ? currentUser.id
            : _selectedTeacherId;

        if (isEdit) {
          await classService.updateClass(
            widget.cls!.id,
            name: _nameController.text.trim(),
            code: _codeController.text.trim(),
            gradeLevel: _selectedGradeLevel ?? 12,
            academicYear: _academicYearController.text.trim(),
            homeroomTeacherId: teacherId,
          );
        } else {
          await classService.createClass(
            name: _nameController.text.trim(),
            code: _codeController.text.trim(),
            gradeLevel: _selectedGradeLevel ?? 12,
            academicYear: _academicYearController.text.trim(),
            schoolId: schoolId,
            homeroomTeacherId: teacherId,
          );
        }

        if (mounted) {
          Navigator.pop(context); // Close loading dialog
          context.read<ClassBloc>().add(const ClassFetchRequested());
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isEdit ? 'Class updated successfully!' : 'New class created successfully!',
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
              content: Text('Error: ${e.toString()}'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
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
          isEditMode ? 'Edit Class' : 'Create Class',
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
                        // Class Name
                        const Text(
                          'Class Name *',
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
                              return 'Class name is required';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Example: 12A1'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Class Code
                        Row(
                          children: [
                            const Text(
                              'Class Code',
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
                              return 'Class code is required';
                            }
                            if (value.trim().length < 2 || value.trim().length > 20) {
                              return 'Class code must be 2-20 characters';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Example: CL12A1'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Grade Level (dropdown)
                        const Text(
                          'Grade Level',
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
                          decoration: _buildInputDecoration('Select grade level'),
                          items: const [
                            DropdownMenuItem(value: 10, child: Text('Grade 10')),
                            DropdownMenuItem(value: 11, child: Text('Grade 11')),
                            DropdownMenuItem(value: 12, child: Text('Grade 12')),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedGradeLevel = val;
                            });
                          },
                          validator: (value) {
                            if (value == null) {
                              return 'Please select a grade level';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        // Academic Year
                        const Text(
                          'Academic Year',
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
                              return 'Academic year is required';
                            }
                            return null;
                          },
                          decoration: _buildInputDecoration('Example: 2023-2024'),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Homeroom Teacher (matches web: dropdown, default = current user)
                        const Text(
                          'Homeroom Teacher',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedTeacherId,
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
                          decoration: _buildInputDecoration(
                            _isLoadingTeachers ? 'Loading...' : 'Select homeroom teacher',
                            prefixIcon: const Icon(
                              Icons.person_outline,
                              color: Color(0xFF64748B),
                              size: 22,
                            ),
                          ),
                          items: [
                            const DropdownMenuItem<String>(
                              value: '',
                              child: Text('-- Select Teacher --'),
                            ),
                            ..._teachers.map((t) => DropdownMenuItem<String>(
                                  value: t.id,
                                  child: Text('${t.name} (${t.email})'),
                                )),
                          ],
                          onChanged: _isLoadingTeachers
                              ? null
                              : (val) {
                                  setState(() {
                                    _selectedTeacherId = val;
                                  });
                                },
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
                      'Save',
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
