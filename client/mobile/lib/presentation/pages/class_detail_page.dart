import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/entities/user.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../blocs/exam/exam_bloc.dart';
import 'exam_detail_page.dart';
import 'exams_view.dart' show ExamCard;
import 'create_edit_class_page.dart';
import 'add_students_page.dart';
import '../../core/network/class_service.dart';
import '../../core/network/api_client.dart';
import '../../main.dart';

class ClassDetailPage extends StatefulWidget {
  final Class cls;

  const ClassDetailPage({super.key, required this.cls});

  @override
  State<ClassDetailPage> createState() => _ClassDetailPageState();
}

class _ClassDetailPageState extends State<ClassDetailPage> {
  int _activeTab = 0; // 0: Students, 1: Exams, 2: Teachers
  String _studentSearchQuery = '';
  final TextEditingController _studentSearchController = TextEditingController();
  late Class _currentClass;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _currentClass = widget.cls;
    // Dispatch exam load request to make sure exams are loaded and synced
    context.read<ExamBloc>().add(const ExamLoadRequested());
  }

  @override
  void dispose() {
    _studentSearchController.dispose();
    super.dispose();
  }

  Future<void> _openEmail(String email) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _refreshClass() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final updated = await ClassService(apiClient: getIt<ApiClient>()).getClassById(_currentClass.id);
      setState(() {
        _currentClass = updated;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error updating data: $e')),
      );
    }
  }

  // Normalize name for realistic email generation
  String _getEmailFromName(String? name, {bool isStudent = false}) {
    if (name == null || name.isEmpty) {
      return isStudent ? 'student@school.edu.vn' : 'teacher@school.edu.vn';
    }
    final normalized = name.toLowerCase()
        .replaceAll('đ', 'd')
        .replaceAll(RegExp(r'[àáảãạăằắẳẵặâầấẩẫậ]'), 'a')
        .replaceAll(RegExp(r'[èéẻẽẹêềếểễệ]'), 'e')
        .replaceAll(RegExp(r'[ìíỉĩị]'), 'i')
        .replaceAll(RegExp(r'[òóỏõọôồốổỗộơờớởỡợ]'), 'o')
        .replaceAll(RegExp(r'[ùúủũụưừứửữự]'), 'u')
        .replaceAll(RegExp(r'[ỳýỷỹỵ]'), 'y');
    
    final parts = normalized.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.length < 2) {
      return '$normalized@school.edu.vn';
    }
    
    final lastName = parts.last;
    final firstInitials = parts.sublist(0, parts.length - 1).map((p) => p[0]).join();
    
    final domain = isStudent ? 'student.edu.vn' : 'school.edu.vn';
    return '$lastName.$firstInitials@$domain';
  }

  // Get student initials for the colored avatar
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

  // Consistently generate avatar colors based on student's name
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
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _currentClass.name,
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Color(0xFF0F172A)),
            onSelected: (value) async {
              if (value == 'edit') {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateEditClassPage(cls: _currentClass),
                  ),
                );
                _refreshClass();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem<String>(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_outlined, size: 20, color: Color(0xFF0F172A)),
                    SizedBox(width: 10),
                    Text('Edit Class'),
                  ],
                ),
              ),
            ],
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
              child: RefreshIndicator(
                onRefresh: _refreshClass,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Main card detail general info
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                        child: _buildClassInfoCard(),
                      ),

              // Homeroom Teacher Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: _buildHomeroomTeacherCard(),
              ),

              const SizedBox(height: 16),

              // Tabs Section (Students, Exams, Teachers)
              _buildTabsRow(),

              // Tab View Content
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: _buildActiveTabView(),
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

  Widget _buildClassInfoCard() {
    final bool active = _currentClass.isActive;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _currentClass.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'CODE: ${_currentClass.code}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
              // Status Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: active ? const Color(0xFFE8F5E9) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: active ? const Color(0xFF2E7D32) : const Color(0xFF64748B),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      active ? 'ACTIVE' : 'INACTIVE',
                      style: TextStyle(
                        color: active ? const Color(0xFF2E7D32) : const Color(0xFF64748B),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Info Grid: NIÊN KHÓA & KHỐI LỚP
          Row(
            children: [
              Expanded(
                child: _buildInfoGridItem(
                  icon: Icons.calendar_today_outlined,
                  title: 'ACADEMIC YEAR',
                  value: _currentClass.academicYear ?? '2023 - 2024',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoGridItem(
                  icon: Icons.school_outlined,
                  title: 'GRADE LEVEL',
                  value: _currentClass.gradeDisplay.isNotEmpty
                      ? _currentClass.gradeDisplay
                      : 'Grade 12',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildInfoGridItem({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: const Color(0xFF0F172A),
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHomeroomTeacherCard() {
    final teacherName = _currentClass.homeroomTeacherName ?? 'John Smith';
    final teacherEmail = _getEmailFromName(teacherName);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'HOMEROOM TEACHER',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Avatar Stack with Settings/Shield badge at bottom right
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
                      width: 52,
                      height: 52,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 52,
                        height: 52,
                        color: const Color(0xFF0F172A),
                        child: Center(
                          child: Text(
                            _getStudentInitials(teacherName),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF0F172A), width: 1.5),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.stars,
                          size: 11,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      teacherName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      teacherEmail,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Email button
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.mail_outline,
                    color: Color(0xFF0F172A),
                    size: 18,
                  ),
                  onPressed: () => _openEmail(teacherEmail),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabsRow() {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1.0),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildTabItem(0, 'Students'),
          _buildTabItem(1, 'Exams'),
          _buildTabItem(2, 'Teachers'),
        ],
      ),
    );
  }

  Widget _buildTabItem(int index, String label) {
    final bool isSelected = _activeTab == index;
    return InkWell(
      onTap: () {
        setState(() {
          _activeTab = index;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? const Color(0xFF081C43) : Colors.transparent,
              width: 2.0,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF081C43) : const Color(0xFF64748B),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildActiveTabView() {
    switch (_activeTab) {
      case 0:
        return _buildStudentsTab();
      case 1:
        return _buildExamsTab();
      case 2:
        return _buildTeachersTab();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStudentsTab() {
    // Filter students
    final students = _currentClass.studentIds;
    final filtered = students.where((student) {
      if (_studentSearchQuery.isEmpty) return true;
      final query = _studentSearchQuery.toLowerCase();
      final code = (student.studentCode ?? '').toLowerCase();
      return student.name.toLowerCase().contains(query) ||
             student.email.toLowerCase().contains(query) ||
             code.contains(query);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search bar
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _studentSearchController,
            onChanged: (value) {
              setState(() {
                _studentSearchQuery = value;
              });
            },
            decoration: const InputDecoration(
              hintText: 'Search students...',
              hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
              prefixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Add & Import Row
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () async {
                  final updatedClass = await Navigator.push<Class>(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AddStudentsPage(cls: _currentClass, initialTab: 0),
                    ),
                  );
                  if (updatedClass != null) {
                    setState(() {
                      _currentClass = updatedClass;
                    });
                  }
                },
                icon: const Icon(Icons.person_add_alt_1, color: Colors.white, size: 18),
                label: const Text(
                  'Add Student',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF081C43),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final updatedClass = await Navigator.push<Class>(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AddStudentsPage(cls: _currentClass, initialTab: 1),
                    ),
                  );
                  if (updatedClass != null) {
                    setState(() {
                      _currentClass = updatedClass;
                    });
                  }
                },
                icon: const Icon(Icons.file_open_outlined, color: Color(0xFF0F172A), size: 18),
                label: const Text(
                  'Import from Excel',
                  style: TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // List label
        Text(
          'Student List (${filtered.length})',
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 12),

        // Students List
        if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(
              child: Text(
                'No students found.',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final student = filtered[index];
              final initials = _getStudentInitials(student.name);
              final bgColor = _getInitialsBgColor(student.name);
              final textColor = _getInitialsTextColor(student.name);
              final studentCode = student.studentCode ?? 'SV100234';
              final studentEmail = student.email.isNotEmpty 
                  ? student.email 
                  : _getEmailFromName(student.name, isStudent: true);

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    // Colored Initials Avatar
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
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            student.name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$studentCode  \u2022  $studentEmail',
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
                    const Icon(
                      Icons.chevron_right,
                      color: Color(0xFF94A3B8),
                      size: 20,
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildExamsTab() {
    return BlocBuilder<ExamBloc, ExamState>(
      builder: (context, state) {
        List<Exam> examsToDisplay = [];

        if (state is ExamLoaded && state.exams.isNotEmpty) {
          // Filter exams for this class
          examsToDisplay = state.exams.where((exam) {
            final matchesClass = exam.classIds.any((c) => c.id == _currentClass.id) ||
                exam.primaryClassId?.id == _currentClass.id;
            return matchesClass;
          }).toList();
        }

        if (state is ExamLoading) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (examsToDisplay.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              children: [
                Icon(Icons.assignment_outlined, size: 48, color: Color(0xFFCBD5E1)),
                SizedBox(height: 16),
                Text(
                  'No exams found for this class.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: examsToDisplay.length,
          itemBuilder: (context, index) {
            final exam = examsToDisplay[index];
            final statusUpper = exam.status.toUpperCase();
            Color bg = const Color(0xFFF1F5F9);
            Color text = const Color(0xFF475569);
            if (statusUpper == 'COMPLETED') {
              bg = const Color(0xFFE2E5FA);
              text = const Color(0xFF6366F1);
            } else if (statusUpper == 'PUBLISHED') {
              bg = const Color(0xFFDBEAFE);
              text = const Color(0xFF1D4ED8);
            } else if (statusUpper == 'IN_PROGRESS') {
              bg = const Color(0xFFFEF3C7);
              text = const Color(0xFFD97706);
            }

            final submissionsText = exam.totalSubmissions > 0
                ? '${exam.totalSubmissions}/${exam.totalStudents} Submissions'
                : 'No submissions yet';

            String dateText = 'No date';
            if (exam.examDate != null) {
              final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              dateText = '${months[exam.examDate!.month - 1]} ${exam.examDate!.day.toString().padLeft(2, '0')}';
            }

            return GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ExamDetailPage(exam: exam),
                  ),
                );
              },
              child: ExamCard(
                title: exam.title,
                classCode: exam.primaryClassCode.isNotEmpty
                    ? '${exam.primaryClassCode} \u2014 ${exam.primaryClassName}'
                    : exam.primaryClassName,
                status: statusUpper,
                statusBgColor: bg,
                statusTextColor: text,
                submissionsText: submissionsText,
                date: dateText,
                participants: exam.totalSubmissions,
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTeachersTab() {
    final teachers = _currentClass.subjectTeachers;

    if (teachers.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Column(
          children: [
            Icon(Icons.people_outline, size: 48, color: Color(0xFFCBD5E1)),
            SizedBox(height: 16),
            Text(
              'No subject teachers found.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: teachers.length,
      itemBuilder: (context, index) {
        final teacher = teachers[index];
        final name = teacher.teacherName ?? 'Subject Teacher';
        final email = _getEmailFromName(name);
        final subjectName = teacher.subject?.name ?? 'Subject';
        final subjectCode = teacher.subject?.code ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.person_outline,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(width: 16),
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
                      email,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    // Subject tag
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        subjectCode.isNotEmpty ? '$subjectName ($subjectCode)' : subjectName,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Email button
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  icon: const Icon(
                    Icons.mail_outline,
                    color: Color(0xFF64748B),
                    size: 16,
                  ),
                  onPressed: () => _openEmail(email),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
