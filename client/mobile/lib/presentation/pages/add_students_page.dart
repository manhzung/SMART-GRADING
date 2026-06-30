import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/user.entity.dart';
import '../../core/network/class_service.dart';
import '../../core/network/user_service.dart';
import '../../core/network/api_client.dart';
import '../../main.dart';
import '../blocs/class/class_bloc.dart';

class AddStudentsPage extends StatefulWidget {
  final Class cls;
  final int initialTab;

  const AddStudentsPage({super.key, required this.cls, this.initialTab = 0});

  @override
  State<AddStudentsPage> createState() => _AddStudentsPageState();
}

class _AddStudentsPageState extends State<AddStudentsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final UserService _userService = getIt<UserService>();
  final ClassService _classService = ClassService(apiClient: getIt<ApiClient>());

  // Select Existing Tab State
  List<User> _allStudents = [];
  List<User> _filteredStudents = [];
  final Set<String> _selectedStudentIds = {};
  bool _isLoadingExisting = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  // Import New Tab State
  final List<Map<String, String>> _importRows = [
    {'name': '', 'email': '', 'code': ''}
  ];
  bool _isImporting = false;
  final _importFormKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this, initialIndex: widget.initialTab);
    _loadExistingStudents();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadExistingStudents() async {
    setState(() {
      _isLoadingExisting = true;
    });

    try {
      final response = await _userService.getAvailableStudents(classId: widget.cls.id);

      setState(() {
        _allStudents = response.results;
        _filterStudents(_searchQuery);
        _isLoadingExisting = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingExisting = false;
      });
      _showSnackBar('Lỗi tải danh sách học sinh: ${e.toString()}', isError: true);
    }
  }

  void _filterStudents(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredStudents = _allStudents;
      } else {
        final q = query.toLowerCase();
        _filteredStudents = _allStudents.where((s) {
          final nameMatch = s.name.toLowerCase().contains(q);
          final codeMatch = (s.studentCode ?? '').toLowerCase().contains(q);
          return nameMatch || codeMatch;
        }).toList();
      }
    });
  }

  void _toggleStudentSelection(String studentId) {
    setState(() {
      if (_selectedStudentIds.contains(studentId)) {
        _selectedStudentIds.remove(studentId);
      } else {
        _selectedStudentIds.add(studentId);
      }
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedStudentIds.clear();
    });
  }

  Future<void> _confirmAddition() async {
    if (_selectedStudentIds.isEmpty) return;

    setState(() {
      _isLoadingExisting = true;
    });

    try {
      final updatedClass = await _classService.addStudents(
        classId: widget.cls.id,
        studentIds: _selectedStudentIds.toList(),
      );

      // Refresh ClassBloc so dashboard lists are updated
      if (mounted) {
        context.read<ClassBloc>().add(const ClassFetchRequested());
      }

      _showSnackBar('Thêm học sinh thành công!');
      if (mounted) {
        Navigator.pop(context, updatedClass);
      }
    } catch (e) {
      setState(() {
        _isLoadingExisting = false;
      });
      _showSnackBar('Lỗi khi thêm học sinh: ${e.toString()}', isError: true);
    }
  }

  // Import New Tab functions
  void _addImportRow() {
    setState(() {
      _importRows.add({'name': '', 'email': '', 'code': ''});
    });
  }

  void _removeImportRow(int index) {
    if (_importRows.length <= 1) {
      // Clear instead of remove if only 1 row left
      setState(() {
        _importRows[0] = {'name': '', 'email': '', 'code': ''};
      });
      return;
    }
    setState(() {
      _importRows.removeAt(index);
    });
  }

  Future<void> _submitImport() async {
    if (!_importFormKey.currentState!.validate()) return;
    _importFormKey.currentState!.save();

    setState(() {
      _isImporting = true;
    });

    try {
      final studentsPayload = _importRows.map((row) {
        return {
          'name': row['name']!.trim(),
          'email': row['email']!.trim(),
          'studentCode': row['code']!.trim().isEmpty ? null : row['code']!.trim(),
        };
      }).toList();

      final result = await _classService.importStudents(
        classId: widget.cls.id,
        students: studentsPayload,
      );

      final successCount = (result['success'] as List?)?.length ?? 0;
      final failedList = result['failed'] as List?;
      final failedCount = failedList?.length ?? 0;

      // Refresh ClassBloc
      if (mounted) {
        context.read<ClassBloc>().add(const ClassFetchRequested());
      }

      if (failedCount > 0) {
        _showSnackBar(
          'Đã nhập thành công $successCount học sinh. Thất bại $failedCount học sinh.',
          isError: true,
        );
      } else {
        _showSnackBar('Đã nhập thành công $successCount học sinh mới!');
      }

      // Fetch the fully updated class details
      final updatedClass = await _classService.getClassById(widget.cls.id);

      if (mounted) {
        Navigator.pop(context, updatedClass);
      }
    } catch (e) {
      setState(() {
        _isImporting = false;
      });
      _showSnackBar('Lỗi nhập học sinh: ${e.toString()}', isError: true);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: isError ? Colors.red.shade700 : const Color(0xFF081C43),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  // Visual helper functions
  String _getInitials(String name) {
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

  @override
  Widget build(BuildContext context) {
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
          'Add Students',
          style: TextStyle(
            color: Color(0xFF081C43),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: Color(0xFF081C43)),
            onPressed: () {
              _showSnackBar('Chọn học sinh hiện có từ trường học hoặc nhập mới từ file Excel/nhập tay.');
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF081C43),
          labelColor: const Color(0xFF081C43),
          unselectedLabelColor: const Color(0xFF64748B),
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 15),
          tabs: const [
            Tab(text: 'Select Existing'),
            Tab(text: 'Import New'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildSelectExistingTab(),
            _buildImportNewTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectExistingTab() {
    return Stack(
      children: [
        Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: _filterStudents,
                  decoration: InputDecoration(
                    hintText: 'Search by name or code',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Color(0xFF64748B), size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _filterStudents('');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ),

            // List of students
            Expanded(
              child: _isLoadingExisting
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredStudents.isEmpty
                      ? Center(
                          child: Text(
                            _allStudents.isEmpty
                                ? 'Tất cả học sinh trong hệ thống đã có trong lớp.'
                                : 'Không tìm thấy học sinh phù hợp.',
                            style: const TextStyle(color: Color(0xFF64748B)),
                            textAlign: TextAlign.center,
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          itemCount: _filteredStudents.length,
                          itemBuilder: (context, index) {
                            final student = _filteredStudents[index];
                            final isChecked = _selectedStudentIds.contains(student.id);
                            final name = student.name;
                            final initials = _getInitials(name);
                            final bgCol = _getInitialsBgColor(name);
                            final textCol = _getInitialsTextColor(name);
                            final code = student.studentCode ?? 'STD-2026-000';

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: InkWell(
                                onTap: () => _toggleStudentSelection(student.id),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      // Initials Avatar
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          color: bgCol,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Center(
                                          child: Text(
                                            initials,
                                            style: TextStyle(
                                              color: textCol,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 16),

                                      // Student Info
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFF0F172A),
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              code,
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Color(0xFF64748B),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),

                                      // Custom Checkbox
                                      Container(
                                        width: 24,
                                        height: 24,
                                        decoration: BoxDecoration(
                                          color: isChecked ? const Color(0xFF081C43) : Colors.transparent,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: isChecked ? const Color(0xFF081C43) : const Color(0xFFCBD5E1),
                                            width: 1.5,
                                          ),
                                        ),
                                        child: isChecked
                                            ? const Icon(Icons.check, color: Colors.white, size: 16)
                                            : null,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
            
            // Allocate space for footer
            SizedBox(height: _selectedStudentIds.isNotEmpty ? 172 : 90),
          ],
        ),

        // Floating Footer Overlay
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            color: Colors.transparent,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_selectedStudentIds.isNotEmpty) ...[
                  // Count indicator pill
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF081C43),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.people, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              '${_selectedStudentIds.length} student${_selectedStudentIds.length > 1 ? 's' : ''} selected',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: _clearSelection,
                          child: Text(
                            'CLEAR',
                            style: TextStyle(
                              color: Colors.blue.shade300,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action Button
                ElevatedButton(
                  onPressed: _selectedStudentIds.isNotEmpty ? _confirmAddition : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF081C43),
                    disabledBackgroundColor: const Color(0xFF081C43).withValues(alpha: 0.5),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Confirm Addition',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildImportNewTab() {
    return _isImporting
        ? const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text(
                  'Đang xử lý nhập dữ liệu học sinh...',
                  style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold),
                )
              ],
            ),
          )
        : Form(
            key: _importFormKey,
            child: Column(
              children: [
                // Instructions / Tips card
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, color: Color(0xFF1D4ED8), size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Thêm thông tin học sinh dưới đây. Email là bắt buộc và duy nhất. Mật khẩu mặc định sẽ được đặt là student123',
                            style: TextStyle(
                              color: Color(0xFF1E40AF),
                              fontSize: 12.5,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Dynamic form list
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _importRows.length,
                    itemBuilder: (context, index) {
                      return Card(
                        color: Colors.white,
                        surfaceTintColor: Colors.white,
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 16),
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
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Học sinh #${index + 1}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF081C43),
                                      fontSize: 15,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                                    onPressed: () => _removeImportRow(index),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ),
                              const Divider(height: 20, color: Color(0xFFF1F5F9)),

                              // Name Field
                              const Text(
                                'Họ và tên *',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                initialValue: _importRows[index]['name'],
                                decoration: _buildFieldDecoration('Ví dụ: Nguyễn Văn An'),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Họ tên không được trống';
                                  }
                                  return null;
                                },
                                onSaved: (value) {
                                  _importRows[index]['name'] = value ?? '';
                                },
                              ),
                              const SizedBox(height: 16),

                              // Email Field
                              const Text(
                                'Email học sinh *',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                initialValue: _importRows[index]['email'],
                                keyboardType: TextInputType.emailAddress,
                                decoration: _buildFieldDecoration('Ví dụ: student@school.edu.vn'),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Email không được trống';
                                  }
                                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                                    return 'Email không hợp lệ';
                                  }
                                  return null;
                                },
                                onSaved: (value) {
                                  _importRows[index]['email'] = value ?? '';
                                },
                              ),
                              const SizedBox(height: 16),

                              // Student Code Field
                              const Text(
                                'Mã học sinh (Tùy chọn)',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                initialValue: _importRows[index]['code'],
                                decoration: _buildFieldDecoration('Ví dụ: HS10003'),
                                onSaved: (value) {
                                  _importRows[index]['code'] = value ?? '';
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // Actions Bottom Bar
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _addImportRow,
                          icon: const Icon(Icons.add, color: Color(0xFF081C43)),
                          label: const Text(
                            'Thêm dòng',
                            style: TextStyle(
                              color: Color(0xFF081C43),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF081C43)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _submitImport,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF081C43),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Import & Add',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
  }

  InputDecoration _buildFieldDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13.5),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
      errorStyle: const TextStyle(color: Color(0xFFB91C1C), fontSize: 11),
    );
  }
}
