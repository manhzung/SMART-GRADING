import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/exam.entity.dart';
import '../blocs/exam/exam_bloc.dart';
import 'exam_detail_page.dart';

class ExamsView extends StatefulWidget {
  const ExamsView({super.key});

  @override
  State<ExamsView> createState() => _ExamsViewState();
}

class _ExamsViewState extends State<ExamsView> {
  String _searchQuery = '';
  String _selectedFilter = 'All';
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ExamBloc>().add(const ExamLoadRequested());
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() => _searchQuery = value);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _loadExams();
    });
  }

  void _onFilterChanged(String filter) {
    setState(() => _selectedFilter = filter);
    _loadExams();
  }

  void _loadExams() {
    String? status;
    if (_selectedFilter == 'Drafts') {
      status = 'draft';
    } else if (_selectedFilter == 'Published') {
      status = 'published';
    } else if (_selectedFilter == 'Completed') {
      status = 'completed';
    }
    context.read<ExamBloc>().add(ExamLoadRequested(
      search: _searchQuery.isEmpty ? null : _searchQuery,
      status: status,
    ));
  }

  Future<void> _onRefresh() async {
    _loadExams();
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ExamBloc, ExamState>(
      builder: (context, state) {
        List<Map<String, dynamic>> examsToDisplay = [];

        if (state is ExamLoaded && state.exams.isNotEmpty) {
          examsToDisplay = state.exams.map((exam) {
            String statusUpper = exam.status.toUpperCase();
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

            String submissionsText = exam.totalSubmissions > 0
                ? '${exam.totalSubmissions}/${exam.totalStudents} Submissions'
                : 'No submissions yet';

            String dateText = 'No date';
            if (exam.examDate != null) {
              final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              dateText = '${months[exam.examDate!.month - 1]} ${exam.examDate!.day.toString().padLeft(2, '0')}';
            }

            return {
              'title': exam.title,
              'classCode': exam.primaryClassCode.isNotEmpty
                  ? '${exam.primaryClassCode} \u2014 ${exam.primaryClassName}'
                  : exam.primaryClassName,
              'status': statusUpper,
              'statusBgColor': bg,
              'statusTextColor': text,
              'submissionsText': submissionsText,
              'date': dateText,
              'participants': exam.totalSubmissions,
              'exam': exam,
            };
          }).toList();
        } else if (state is ExamLoading) {
          examsToDisplay = [];
        } else {
          examsToDisplay = _mockExams;
        }

        List<Map<String, dynamic>> filteredExams = examsToDisplay;

        return Column(
          children: [
            Expanded(
                child: RefreshIndicator(
                  onRefresh: _onRefresh,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Manage assessments and track student progress.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: _onSearchChanged,
                          decoration: const InputDecoration(
                            hintText: 'Search exams...',
                            hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
                            prefixIcon: Icon(Icons.search, color: Color(0xFF64748B)),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: ['All', 'Drafts', 'Published', 'Completed'].map((filter) {
                            final bool isSelected = _selectedFilter == filter;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: GestureDetector(
                            onTap: () {
                              _onFilterChanged(filter);
                            },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  child: Text(
                                    filter,
                                    style: TextStyle(
                                      color: isSelected ? Colors.white : const Color(0xFF64748B),
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
                      const SizedBox(height: 20),

                      if (state is ExamLoading)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: CircularProgressIndicator(),
                          ),
                        )
                      else if (filteredExams.isEmpty)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Text(
                              'No exams found matching filters.',
                              style: TextStyle(color: Color(0xFF64748B)),
                            ),
                          ),
                        )
                      else
                        ...filteredExams.map((exam) {
                          return GestureDetector(
                            onTap: () {
                              final examObj = exam['exam'] as Exam? ?? Exam(
                                id: 'mock_${exam['title']}',
                                title: exam['title'] ?? 'Mock Exam',
                                status: (exam['status'] ?? 'draft').toString().toLowerCase(),
                                createdAt: DateTime.now(),
                                duration: 90,
                                totalStudents: 348,
                                totalSubmissions: 320,
                              );
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ExamDetailPage(exam: examObj),
                                ),
                              );
                            },
                            child: ExamCard(
                              title: exam['title'],
                              classCode: exam['classCode'],
                              status: exam['status'],
                              statusBgColor: exam['statusBgColor'],
                              statusTextColor: exam['statusTextColor'],
                              submissionsText: exam['submissionsText'],
                              date: exam['date'],
                              participants: exam['participants'],
                            ),
                          );
                        }),

                      const SizedBox(height: 20),
                      Center(
                        child: Text(
                          'Showing ${filteredExams.length} of ${examsToDisplay.length} exams',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  static final List<Map<String, dynamic>> _mockExams = [
    {
      'title': 'Midterm: Intro to Python',
      'classCode': 'CS101 \u2014 Intro to Programming',
      'status': 'COMPLETED',
      'statusBgColor': const Color(0xFFE2E5FA),
      'statusTextColor': const Color(0xFF6366F1),
      'submissionsText': '28/30 Submissions',
      'date': 'Oct 12',
      'participants': 25,
    },
    {
      'title': 'Final: Advanced Algorithms',
      'classCode': 'CS204 \u2014 Data Structures',
      'status': 'PUBLISHED',
      'statusBgColor': const Color(0xFFDBEAFE),
      'statusTextColor': const Color(0xFF1D4ED8),
      'submissionsText': '4/25 Submissions',
      'date': 'Oct 28',
      'participants': 2,
    },
    {
      'title': 'Weekly Quiz: Matrix Operations',
      'classCode': 'MA302 \u2014 Linear Algebra',
      'status': 'DRAFT',
      'statusBgColor': const Color(0xFFF1F5F9),
      'statusTextColor': const Color(0xFF475569),
      'submissionsText': 'No submissions yet',
      'date': 'Nov 02',
      'participants': 0,
    },
    {
      'title': 'Semester Exam: OOP Principles',
      'classCode': 'CS101 \u2014 Intro to Programming',
      'status': 'COMPLETED',
      'statusBgColor': const Color(0xFFE2E5FA),
      'statusTextColor': const Color(0xFF6366F1),
      'submissionsText': '30/30 Submissions',
      'date': 'Oct 05',
      'participants': 28,
    },
  ];
}

class AvatarOverlapGroup extends StatelessWidget {
  final int count;

  const AvatarOverlapGroup({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    final List<Color> colors = [
      const Color(0xFF0C2B64),
      const Color(0xFF3B82F6),
      const Color(0xFF93C5FD),
    ];

    return SizedBox(
      height: 24,
      width: 50,
      child: Stack(
        children: [
          Positioned(
            left: 0,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: colors[0],
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
          if (count > 1)
            Positioned(
              left: 12,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: colors[1],
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ),
            ),
          if (count > 2)
            Positioned(
              left: 24,
              child: Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(
                  color: Color(0xFFE2E8F0),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '+$count',
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ExamCard extends StatelessWidget {
  final String title;
  final String classCode;
  final String status;
  final Color statusBgColor;
  final Color statusTextColor;
  final String submissionsText;
  final String date;
  final int participants;

  const ExamCard({
    super.key,
    required this.title,
    required this.classCode,
    required this.status,
    required this.statusBgColor,
    required this.statusTextColor,
    required this.submissionsText,
    required this.date,
    required this.participants,
  });

  @override
  Widget build(BuildContext context) {
    final bool hasSubmissions = participants > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
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
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      classCode,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(4),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusTextColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  if (hasSubmissions) ...[
                    AvatarOverlapGroup(count: participants),
                    const SizedBox(width: 4),
                  ] else ...[
                    const Icon(
                      Icons.edit_note_outlined,
                      color: Color(0xFF64748B),
                      size: 20,
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    submissionsText,
                    style: TextStyle(
                      fontSize: 13,
                      color: const Color(0xFF64748B),
                      fontStyle: hasSubmissions ? FontStyle.normal : FontStyle.italic,
                    ),
                  ),
                ],
              ),
              Text(
                date,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
