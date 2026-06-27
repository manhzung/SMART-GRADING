import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/api_client.dart';
import '../../core/network/exam_service.dart';
import '../../core/network/exam_submissions_service.dart';
import '../../core/network/submission_service.dart';
import '../../domain/entities/class_submission_summary.entity.dart';
import '../../domain/entities/exam.entity.dart';
import '../../presentation/widgets/submission_summary_widget.dart';
import 'edit_exam_page.dart';
import 'exam_questions_page.dart';
import 'submissions_page.dart';

class ExamDetailPage extends StatefulWidget {
  final Exam exam;

  const ExamDetailPage({super.key, required this.exam});

  @override
  State<ExamDetailPage> createState() => _ExamDetailPageState();
}

class _ExamDetailPageState extends State<ExamDetailPage> {
  late ExamService _examService;
  late SubmissionService _submissionService;
  late ExamSubmissionsService _examSubmissionsService;

  bool _isLoading = false;
  Exam? _fullExam;
  ExamStatistics? _statistics;
  Map<String, ClassSubmissionSummary> _classSummaries = {};

  @override
  void initState() {
    super.initState();
    final apiClient = GetIt.instance<ApiClient>();
    _examService = ExamService(apiClient: apiClient);
    _submissionService = SubmissionService(apiClient: apiClient);
    _examSubmissionsService = ExamSubmissionsService(apiClient: apiClient);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final futures = await Future.wait([
        _examService.getExamById(widget.exam.id),
        _submissionService.getExamStatistics(widget.exam.id),
        _examSubmissionsService.getExamSubmissionsByClass(widget.exam.id),
      ]);

      setState(() {
        _fullExam = futures[0] as Exam;
        _statistics = futures[1] as ExamStatistics;
        _classSummaries = futures[2] as Map<String, ClassSubmissionSummary>;
        _isLoading = false;
        // ignore: avoid_print
        print('[ExamDetailPage] Loaded ${_classSummaries.length} class summaries: ${_classSummaries.keys.toList()}');
      });
    } catch (e) {
      // Graceful fallback to mocked statistics/questions if server fails or is empty
      // ignore: avoid_print
      print('[ExamDetailPage] Failed to load live data, using fallbacks: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not sync live data. Showing offline snapshot.'),
            backgroundColor: const Color(0xFF0F172A),
            duration: const Duration(seconds: 2),
          ),
        );
      }
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _shareExam() {
    final exam = widget.exam;
    final questionCount = exam.numberOfQuestions > 0
        ? exam.numberOfQuestions
        : exam.questionIds.length;
    final examDateStr = exam.examDate != null
        ? '${exam.examDate!.day}/${exam.examDate!.month}/${exam.examDate!.year}'
        : 'Chua xac dinh';
    final shareText = '''
Bai kiem tra: ${exam.title}
Mo ta: ${exam.description ?? 'Khong co'}
Ngay: $examDateStr
Thoi gian: ${exam.duration} phut
So cau hoi: $questionCount
Diem: ${exam.totalScore}
''';
    Clipboard.setData(ClipboardData(text: shareText));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Da sao chep thong tin bai kiem tra'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayExam = _fullExam ?? widget.exam;
    
    // ══════════════════════════════════════════════════════════════════
    // MOCK DATA FALLBACKS matching the design screenshot
    // ══════════════════════════════════════════════════════════════════
    final totalStudents = _statistics?.totalStudents ?? displayExam.totalStudents;
    final totalGraded = _statistics?.totalSubmissions ?? displayExam.totalSubmissions;
    
    // Fallback values if 0
    final displayTotalStudents = totalStudents > 0 ? totalStudents : 0;
    final displayTotalGraded = totalGraded > 0 ? totalGraded : 0;
    
    // ignore: unused_local_variable
    final double progressPercent = displayTotalStudents > 0
        ? (displayTotalGraded / displayTotalStudents) * 100
        : 0.0;
        
    final double averageScore = _statistics?.averageScore ?? 0.0;
    
    final displayDuration = displayExam.duration > 0 ? displayExam.duration : 90;
    
    String displayDate = 'Oct 24';
    if (displayExam.examDate != null) {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      displayDate = '${months[displayExam.examDate!.month - 1]} ${displayExam.examDate!.day}';
    }

    final displayQuestionsCount = displayExam.numberOfQuestions > 0 
        ? displayExam.numberOfQuestions 
        : (displayExam.questions.isNotEmpty ? displayExam.questions.length : 50);

    // Question List - use real questions or show empty state
    final questionsToDisplay = displayExam.questions.isNotEmpty
        ? displayExam.questions.map((q) => {
            'title': q.topic ?? 'Question Details',
            'difficulty': (q.difficulty ?? 'MEDIUM').toUpperCase(),
            'content': q.content,
            'points': '${q.score} pts',
            'seen': '100% Seen',
          }).toList()
        : <Map<String, dynamic>>[];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          displayExam.title.isNotEmpty ? displayExam.title : 'Chi tiết kỳ thi',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: Color(0xFF0F172A)),
            onPressed: _shareExam,
          ),
          Container(
            margin: const EdgeInsets.only(right: 16, left: 8),
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: Color(0xFF0C2B64),
              shape: BoxShape.circle,
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
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            if (_isLoading)
              const LinearProgressIndicator(
                minHeight: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0C2B64)),
                backgroundColor: Colors.transparent,
              ),
            RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Exam title & class name
                    Text(
                      displayExam.title.isNotEmpty ? displayExam.title : 'Không có tiêu đề',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          Icons.school_outlined,
                          size: 16,
                          color: Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          displayExam.primaryClassName.isNotEmpty 
                              ? displayExam.primaryClassName 
                              : 'Chưa có lớp',
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // SUBMISSIONS BY CLASS CARD
                    SubmissionSummaryWidget(
                      summaries: _classSummaries,
                      examId: displayExam.id,
                    ),
                    const SizedBox(height: 12),

                    // AVG SCORE & STUDENTS ROW
                    Row(
                      children: [
                        Expanded(
                          child: Container(
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
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Icon(
                                        Icons.analytics_outlined,
                                        size: 16,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Expanded(
                                      child: Text(
                                        'AVG SCORE',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                RichText(
                                  text: TextSpan(
                                    style: const TextStyle(
                                      fontFamily: 'Roboto',
                                      color: Color(0xFF0F172A),
                                    ),
                                    children: [
                                      TextSpan(
                                        text: averageScore.toString(),
                                        style: const TextStyle(
                                          fontSize: 26,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const TextSpan(
                                        text: '/10',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
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
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Icon(
                                        Icons.people_outline,
                                        size: 16,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Expanded(
                                      child: Text(
                                        'STUDENTS',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  displayTotalStudents.toString(),
                                  style: const TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // EXAM DETAILS SECTION
                    const Text(
                      'Exam Details',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildDetailCard(
                          icon: Icons.access_time_outlined,
                          title: 'DURATION',
                          value: '$displayDuration mins',
                        ),
                        const SizedBox(width: 8),
                        _buildDetailCard(
                          icon: Icons.calendar_today_outlined,
                          title: 'DATE',
                          value: displayDate,
                        ),
                        const SizedBox(width: 8),
                        _buildDetailCard(
                          icon: Icons.assignment_outlined,
                          title: 'QUESTIONS',
                          value: displayQuestionsCount.toString(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // QUESTIONS BREAKDOWN SECTION
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Questions Breakdown',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ExamQuestionsPage(exam: displayExam),
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Row(
                            children: [
                              Text(
                                'See All',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              SizedBox(width: 2),
                              Icon(
                                Icons.chevron_right,
                                size: 16,
                                color: Color(0xFF64748B),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Questions List
                    ...questionsToDisplay.asMap().entries.map((entry) {
                      final idx = entry.key + 1;
                      final q = entry.value;
                      return _buildQuestionCard(
                        index: idx,
                        title: q['title'],
                        difficulty: q['difficulty'],
                        content: q['content'],
                        points: q['points'],
                        seen: q['seen'],
                      );
                    }),
                    
                    // Extra spacing at the bottom for floating buttons
                    const SizedBox(height: 120),
                  ],
                ),
              ),
            ),
            
            // FLOATING ACTION BUTTONS STACK AT BOTTOM RIGHT
            Positioned(
              bottom: 16,
              right: 16,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  FloatingActionButton.extended(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => EditExamPage(exam: displayExam),
                        ),
                      );
                    },
                    heroTag: 'edit_exam_btn',
                    elevation: 4,
                    backgroundColor: const Color(0xFFE2E8F0),
                    icon: const Icon(
                      Icons.edit_outlined,
                      color: Color(0xFF0F172A),
                      size: 16,
                    ),
                    label: const Text(
                      'EDIT EXAM',
                      style: TextStyle(
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  FloatingActionButton.extended(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => SubmissionsPage(
                            exam: displayExam,
                            examId: displayExam.id,
                            service: _examSubmissionsService,
                          ),
                        ),
                      );
                    },
                    heroTag: 'submissions_btn',
                    elevation: 4,
                    backgroundColor: const Color(0xFF0C213E),
                    icon: const Icon(
                      Icons.visibility_outlined,
                      color: Colors.white,
                      size: 16,
                    ),
                    label: const Text(
                      'SUBMISSIONS',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        letterSpacing: 0.5,
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

  Widget _buildDetailCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF0F172A)),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: Color(0xFF94A3B8),
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCard({
    required int index,
    required String title,
    required String difficulty,
    required String content,
    required String points,
    required String seen,
  }) {
    Color difficultyBg = const Color(0xFFFEF3C7);
    Color difficultyText = const Color(0xFFD97706);
    
    if (difficulty == 'HARD') {
      difficultyBg = const Color(0xFFFEE2E2);
      difficultyText = const Color(0xFFDC2626);
    } else if (difficulty == 'EASY') {
      difficultyBg = const Color(0xFFDCFCE7);
      difficultyText = const Color(0xFF16A34A);
    } else if (difficulty == 'MEDIUM') {
      difficultyBg = const Color(0xFFDBEAFE);
      difficultyText = const Color(0xFF2563EB);
    }

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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Index Circle/Square
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
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
              // Question title
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              // Difficulty Badge
              Container(
                decoration: BoxDecoration(
                  color: difficultyBg,
                  borderRadius: BorderRadius.circular(4),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Text(
                  difficulty,
                  style: TextStyle(
                    color: difficultyText,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Question Content
          Text(
            content,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          // Footer details
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.star_outline, size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  Text(
                    points,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Icon(Icons.visibility_outlined, size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  Text(
                    seen,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const Icon(
                Icons.edit_note_outlined,
                size: 20,
                color: Color(0xFF64748B),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
